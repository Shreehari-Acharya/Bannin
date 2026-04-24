-- CreateEnum
CREATE TYPE "toolname" AS ENUM ('auditd');

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "sourceTool" "toolname" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "reportUrl" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "askedAnalysis" BOOLEAN NOT NULL DEFAULT false,
    "finished" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);
