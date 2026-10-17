ALTER TABLE "User" RENAME COLUMN "collegese_lms_id" TO "learnerId";
ALTER INDEX "User_collegese_lms_id_key" RENAME TO "User_learnerId_key";
