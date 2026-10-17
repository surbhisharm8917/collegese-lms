CREATE TABLE "CourseAssistant" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseAssistant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseAssistant_courseId_assistantId_key"
ON "CourseAssistant"("courseId", "assistantId");

CREATE INDEX "CourseAssistant_assistantId_idx" ON "CourseAssistant"("assistantId");

ALTER TABLE "CourseAssistant"
ADD CONSTRAINT "CourseAssistant_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseAssistant"
ADD CONSTRAINT "CourseAssistant_assistantId_fkey"
FOREIGN KEY ("assistantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
