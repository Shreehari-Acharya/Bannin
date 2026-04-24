import { env } from "../config/env.js";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

const debugEnabled = env.debugLogs || env.nodeEnv !== "production";

const formatMeta = (meta?: LogMeta): string => {
  if (!meta) return "";
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return " [meta-unserializable]";
  }
};

const emit = (level: LogLevel, scope: string, message: string, meta?: LogMeta): void => {
  if (level === "debug" && !debugEnabled) return;

  const line = `[${new Date().toISOString()}] [${level}] [${scope}] ${message}${formatMeta(meta)}`;
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
};

export const logDebug = (scope: string, message: string, meta?: LogMeta): void =>
  emit("debug", scope, message, meta);

export const logInfo = (scope: string, message: string, meta?: LogMeta): void =>
  emit("info", scope, message, meta);

export const logWarn = (scope: string, message: string, meta?: LogMeta): void =>
  emit("warn", scope, message, meta);

export const logError = (scope: string, message: string, meta?: LogMeta): void =>
  emit("error", scope, message, meta);

export const createLogger = (scope: string) => ({
  debug: (message: string, meta?: LogMeta): void => logDebug(scope, message, meta),
  info: (message: string, meta?: LogMeta): void => logInfo(scope, message, meta),
  warn: (message: string, meta?: LogMeta): void => logWarn(scope, message, meta),
  error: (message: string, meta?: LogMeta): void => logError(scope, message, meta),
});

