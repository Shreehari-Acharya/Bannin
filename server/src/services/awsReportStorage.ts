import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("storage.aws");

const awsRegion = env.awsRegion;
const awsBucket = env.awsBucket;
const signedUrlTtlSeconds = env.reportUrlTtlSeconds;

const s3Client =
  awsRegion && awsBucket
    ? new S3Client({
        region: awsRegion,
      })
    : null;

const getS3Context = (): { client: S3Client; bucket: string } => {
  if (!s3Client || !awsBucket) {
    throw new Error("AWS S3 is not configured. Set AWS_REGION and AWS_S3_BUCKET.");
  }
  return {
    client: s3Client,
    bucket: awsBucket,
  };
};

const toS3Key = (storedPath: string): string => {
  if (!storedPath) return "";

  if (storedPath.startsWith("s3://")) {
    const withoutScheme = storedPath.slice("s3://".length);
    const firstSlash = withoutScheme.indexOf("/");
    if (firstSlash <= 0) return "";

    const bucket = withoutScheme.slice(0, firstSlash);
    const key = withoutScheme.slice(firstSlash + 1);
    if (bucket !== awsBucket) return "";
    return key;
  }

  return storedPath;
};

export const uploadThreatReportPdf = async (eventId: string, pdfBuffer: Buffer): Promise<string> => {
  const { client, bucket } = getS3Context();

  const safeTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const objectKey = `threat-reports/${eventId}/analysis-${safeTimestamp}.pdf`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: pdfBuffer,
      ContentType: "application/pdf",
      ContentDisposition: `inline; filename="${eventId}.pdf"`,
      CacheControl: "private, max-age=0, no-cache",
    }),
  );

  const storedPath = `s3://${bucket}/${objectKey}`;
  logger.debug("uploaded report", { eventId, storedPath });
  return storedPath;
};

export const getSignedThreatReportUrl = async (storedPath: string): Promise<string> => {
  try {
    const { client, bucket } = getS3Context();
    const objectKey = toS3Key(storedPath);
    if (!objectKey) return "";

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ResponseContentType: "application/pdf",
      ResponseContentDisposition: "inline",
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn: signedUrlTtlSeconds });
    logger.debug("signed report url", {
      ttlSeconds: signedUrlTtlSeconds,
      storedPath,
    });
    return signedUrl;
  } catch {
    logger.error("failed to sign report url", { storedPath });
    return "";
  }
};
