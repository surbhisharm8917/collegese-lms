import prisma from "../config/db";
import { logger } from "../utils/logger";

const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export const runDataRetention = async (): Promise<void> => {
  const now = new Date();
  const [sessions, webhookEvents, resetTokens, verificationTokens] = await prisma.$transaction([
    prisma.session.deleteMany({ where: { expiresAt: { lte: daysAgo(7) } } }),
    prisma.liveWebhookEvent.deleteMany({ where: { processedAt: { lte: daysAgo(30) } } }),
    prisma.user.updateMany({
      where: { passwordResetExpiresAt: { lte: now } },
      data: { passwordResetToken: null, passwordResetExpiresAt: null },
    }),
    prisma.user.updateMany({
      where: { isVerified: false, verificationTokenExpiresAt: { lte: now } },
      data: { verificationToken: null, verificationTokenExpiresAt: null },
    }),
  ]);

  logger.info("Data retention cleanup completed", {
    expiredSessions: sessions.count,
    webhookEvents: webhookEvents.count,
    resetTokens: resetTokens.count,
    verificationTokens: verificationTokens.count,
  });
};
