CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ExamAttemptStatus" AS ENUM (
  'IN_PROGRESS',
  'SUBMITTED',
  'PENDING_EVALUATION',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED'
);

ALTER TABLE "Exam"
ADD COLUMN "createdById" TEXT,
ADD COLUMN "status" "ExamStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN "availableFrom" TIMESTAMP(3),
ADD COLUMN "dueDate" TIMESTAMP(3),
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Exam" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "ExamAttempt"
ADD COLUMN "attemptNumber" INTEGER,
ADD COLUMN "status" "ExamAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
ADD COLUMN "resultsSentAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3);

WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "userId", "examId" ORDER BY "startedAt", "id"
  ) AS number
  FROM "ExamAttempt"
)
UPDATE "ExamAttempt"
SET "attemptNumber" = numbered.number
FROM numbered
WHERE "ExamAttempt"."id" = numbered."id";

UPDATE "ExamAttempt"
SET "status" = CASE
  WHEN "completedAt" IS NULL THEN 'IN_PROGRESS'::"ExamAttemptStatus"
  WHEN "evaluationStatus" = 'PENDING_EVALUATION' THEN 'PENDING_EVALUATION'::"ExamAttemptStatus"
  ELSE 'COMPLETED'::"ExamAttemptStatus"
END;

ALTER TABLE "ExamAttempt" ALTER COLUMN "attemptNumber" SET NOT NULL;
ALTER TABLE "ExamAttempt" ALTER COLUMN "attemptNumber" SET DEFAULT 1;

CREATE UNIQUE INDEX "ExamAttempt_userId_examId_attemptNumber_key"
ON "ExamAttempt"("userId", "examId", "attemptNumber");
CREATE INDEX "ExamAttempt_userId_examId_idx" ON "ExamAttempt"("userId", "examId");
CREATE INDEX "ExamAttempt_examId_status_idx" ON "ExamAttempt"("examId", "status");

ALTER TABLE "Exam"
ADD CONSTRAINT "Exam_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
