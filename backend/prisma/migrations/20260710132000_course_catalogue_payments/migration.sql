-- CreateEnum
CREATE TYPE "PaymentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Course"
ADD COLUMN "category" TEXT,
ADD COLUMN "priceInPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';

-- CreateTable
CREATE TABLE "CoursePaymentRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "screenshotObjectKey" TEXT NOT NULL,
    "screenshotContentType" TEXT NOT NULL,
    "screenshotSizeBytes" INTEGER NOT NULL,
    "amountInPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoursePaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoursePaymentRequest_screenshotObjectKey_key"
ON "CoursePaymentRequest"("screenshotObjectKey");

-- Only one unresolved or successful payment request may exist per student/course.
CREATE UNIQUE INDEX "CoursePaymentRequest_student_course_open_key"
ON "CoursePaymentRequest"("studentId", "courseId")
WHERE "status" IN ('PENDING', 'APPROVED');

CREATE INDEX "CoursePaymentRequest_studentId_createdAt_idx"
ON "CoursePaymentRequest"("studentId", "createdAt");

CREATE INDEX "CoursePaymentRequest_courseId_status_createdAt_idx"
ON "CoursePaymentRequest"("courseId", "status", "createdAt");

CREATE INDEX "CoursePaymentRequest_status_createdAt_idx"
ON "CoursePaymentRequest"("status", "createdAt");

CREATE INDEX "CoursePaymentRequest_reviewerId_idx"
ON "CoursePaymentRequest"("reviewerId");

-- AddForeignKey
ALTER TABLE "CoursePaymentRequest"
ADD CONSTRAINT "CoursePaymentRequest_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CoursePaymentRequest"
ADD CONSTRAINT "CoursePaymentRequest_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CoursePaymentRequest"
ADD CONSTRAINT "CoursePaymentRequest_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
