CREATE TABLE "LiveWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "lectureId" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LiveWebhookEvent_processedAt_idx" ON "LiveWebhookEvent"("processedAt");
