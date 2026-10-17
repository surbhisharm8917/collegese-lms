import cron from "node-cron";
import { Prisma } from "@generated/prisma/client";
import prisma from "../config/db";
import { AssessmentReminderService } from "../services/assessmentReminder.service";
import { runDataRetention } from "../services/dataRetention.service";
import { logger } from "./logger";

const acquireJobLease = async (job: string, leaseMs: number): Promise<boolean> => {
  const key = `scheduler:${job}`;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + leaseMs).toISOString();
  const rows = await prisma.$queryRaw<Array<{ key: string }>>(Prisma.sql`
    INSERT INTO "SystemSetting" ("id", "key", "value", "createdAt", "updatedAt")
    VALUES (${`scheduler-${job}`}, ${key}, ${expiresAt}, NOW(), NOW())
    ON CONFLICT ("key") DO UPDATE
      SET "value" = EXCLUDED."value", "updatedAt" = NOW()
      WHERE "SystemSetting"."value" < ${now}
    RETURNING "key"
  `);
  return rows.length === 1;
};

const runLeasedJob = async (job: string, leaseMs: number, work: () => Promise<void>) => {
  try {
    if (!(await acquireJobLease(job, leaseMs))) {
      logger.debug(`Scheduler lease is held by another replica: ${job}`);
      return;
    }
    await work();
  } catch (error) {
    logger.error(`Scheduled job failed: ${job}`, error);
  }
};

export const initCronJobs = () => {
  const timezone = process.env.CRON_TIMEZONE || "Asia/Kolkata";

  cron.schedule(
    "0 * * * *",
    () =>
      void runLeasedJob("assessment-reminders", 55 * 60 * 1000, async () => {
        logger.info("Running assessment reminder check");
        await AssessmentReminderService.sendDueReminders();
      }),
    { timezone },
  );

  cron.schedule(
    "15 2 * * *",
    () => void runLeasedJob("data-retention", 23 * 60 * 60 * 1000, runDataRetention),
    { timezone },
  );

  logger.info("Background scheduler initialized", { timezone });
};
