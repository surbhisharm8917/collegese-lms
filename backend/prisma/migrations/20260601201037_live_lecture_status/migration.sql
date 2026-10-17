-- AlterTable
ALTER TABLE "LiveLecture" ADD COLUMN     "actualStartTime" TIMESTAMP(3),
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'SCHEDULED';
