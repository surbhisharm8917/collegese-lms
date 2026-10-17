-- Prevent concurrent submissions from creating more than one pending request
-- for the same student and course. Rejected requests remain retryable.
CREATE UNIQUE INDEX "CoursePaymentRequest_one_pending_per_course"
ON "CoursePaymentRequest" ("studentId", "courseId")
WHERE "status" = 'PENDING';
