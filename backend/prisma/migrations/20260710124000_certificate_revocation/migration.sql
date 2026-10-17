ALTER TABLE "Certificate"
ADD COLUMN "revokedAt" TIMESTAMP(3),
ADD COLUMN "revocationReason" TEXT;

CREATE INDEX "Certificate_userId_courseId_idx" ON "Certificate"("userId", "courseId");
