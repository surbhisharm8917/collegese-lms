-- Existing Module rows are retained and presented as course subjects.
ALTER TABLE "Module"
ADD COLUMN "order" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 1,
    "moduleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RecordedLecture"
ADD COLUMN "chapterId" TEXT;

CREATE INDEX "Module_courseId_order_idx"
ON "Module"("courseId", "order");

CREATE UNIQUE INDEX "Chapter_moduleId_order_key"
ON "Chapter"("moduleId", "order");

CREATE INDEX "Chapter_moduleId_order_idx"
ON "Chapter"("moduleId", "order");

CREATE UNIQUE INDEX "RecordedLecture_chapterId_order_key"
ON "RecordedLecture"("chapterId", "order");

CREATE INDEX "RecordedLecture_courseId_moduleId_chapterId_order_idx"
ON "RecordedLecture"("courseId", "moduleId", "chapterId", "order");

ALTER TABLE "Chapter"
ADD CONSTRAINT "Chapter_moduleId_fkey"
FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecordedLecture"
ADD CONSTRAINT "RecordedLecture_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;