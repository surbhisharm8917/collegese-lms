UPDATE "Quiz" SET "status" = UPPER("status");
ALTER TABLE "Quiz" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Quiz"
ALTER COLUMN "status" TYPE "QuizStatus" USING ("status"::"QuizStatus");
ALTER TABLE "Quiz" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "Quiz"
ADD COLUMN "availableFrom" TIMESTAMP(3),
ADD COLUMN "dueDate" TIMESTAMP(3),
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 1;

UPDATE "QuizSubmission" SET "status" = UPPER("status");
ALTER TABLE "QuizSubmission" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "QuizSubmission"
ALTER COLUMN "status" TYPE "SubmissionStatus" USING ("status"::"SubmissionStatus");
ALTER TABLE "QuizSubmission" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
ALTER TABLE "QuizSubmission" ALTER COLUMN "submittedAt" DROP DEFAULT;
ALTER TABLE "QuizSubmission" ALTER COLUMN "submittedAt" DROP NOT NULL;
ALTER TABLE "QuizSubmission" ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1;

DROP INDEX "QuizSubmission_userId_quizId_key";
CREATE UNIQUE INDEX "QuizSubmission_userId_quizId_attemptNumber_key"
ON "QuizSubmission"("userId", "quizId", "attemptNumber");
CREATE INDEX "QuizSubmission_userId_quizId_idx" ON "QuizSubmission"("userId", "quizId");
