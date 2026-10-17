import crypto from "crypto";
import { OtpPurpose } from "@generated/prisma/client";
import prisma from "../config/db";
import { OTP } from "../utils/constants";
import { hashToken } from "../utils/auth.utils";
import { logger } from "../utils/logger";
import { sendOtpEmail } from "./email.service";

/**
 * Email one-time-passcode challenges for registration confirmation and
 * two-step sign-in.
 *
 * Model:
 *  1. The caller proves something first (password check for login, account
 *     creation for registration).
 *  2. `issueOtpChallenge` emails a six digit code and returns an opaque
 *     `challengeToken` to the browser. The token binds step 2 to step 1, so
 *     knowing only an email address plus a leaked code is not enough to sign in.
 *  3. `verifyOtpChallenge` consumes the challenge on the first correct code.
 *
 * Only digests are stored (`challengeHash`, `codeHash`), so a database leak
 * yields nothing replayable.
 */

export type OtpChallenge = {
  challengeToken: string;
  expiresAt: Date;
  resendAvailableAt: Date;
  /** Masked address, safe to render in the UI ("ar•••@gmail.com"). */
  maskedEmail: string;
  /**
   * False when the provider rejected the hand-off. The challenge is still
   * valid, so the client can show a warning plus a retry button rather than
   * dropping the user into a dead end.
   */
  delivered: boolean;
};

export class OtpError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
    readonly code: string = "OTP_INVALID",
  ) {
    super(message);
    this.name = "OtpError";
  }
}

/**
 * Whether learners are offered "email me a code" as an alternative to typing
 * their password. Set LOGIN_OTP_ENABLED=false during an email provider outage
 * to hide the option; password sign-in is unaffected either way, and
 * registration codes are always sent.
 */
export const isLoginOtpEnabled = (): boolean => process.env.LOGIN_OTP_ENABLED !== "false";

/** Cryptographically uniform six digit code. Modulo bias avoided via rejection sampling. */
const generateNumericCode = (length: number = OTP.LENGTH): string => {
  const max = 10 ** length;
  const limit = Math.floor(0xff_ff_ff_ff / max) * max;
  let value = max;
  while (value >= limit) {
    value = crypto.randomBytes(4).readUInt32BE(0);
  }
  return String(value % max).padStart(length, "0");
};

export const maskEmail = (email: string): string => {
  const [local = "", domain = ""] = email.split("@");
  if (!domain) {
    return "your email address";
  }
  const visible = local.slice(0, local.length > 3 ? 2 : 1);
  return `${visible}${"•".repeat(Math.max(local.length - visible.length, 2))}@${domain}`;
};

/** Constant-time comparison so a wrong code cannot be narrowed down by timing. */
const digestsMatch = (a: string, b: string): boolean => {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

type IssueOptions = {
  userId: string;
  email: string;
  name?: string | null;
  purpose: OtpPurpose;
  ipAddress?: string;
  userAgent?: string;
};

/**
 * Creates a fresh challenge, emails the code, and returns the handle for the
 * client. Any earlier unconsumed challenge for the same user and purpose is
 * discarded so only the newest code ever works.
 */
export const issueOtpChallenge = async (options: IssueOptions): Promise<OtpChallenge> => {
  const { userId, email, name, purpose, ipAddress, userAgent } = options;

  const code = generateNumericCode();
  const challengeToken = crypto.randomBytes(OTP.CHALLENGE_BYTES).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP.EXPIRY_MS);

  await prisma.$transaction(async (tx) => {
    await tx.emailOtp.deleteMany({ where: { userId, purpose } });
    await tx.emailOtp.create({
      data: {
        userId,
        purpose,
        challengeHash: hashToken(challengeToken),
        codeHash: hashToken(code),
        expiresAt,
        lastSentAt: now,
        ipAddress,
        userAgent,
      },
    });
  });

  // The challenge row is committed before sending, so a delivery failure leaves
  // a usable challenge the client can retry against instead of a dead end.
  let delivered = true;
  try {
    await sendOtpEmail(email, code, purpose, name);
  } catch (error) {
    delivered = false;
    logger.error(`Failed to deliver ${purpose} OTP email`, error);
  }

  return {
    challengeToken,
    expiresAt,
    resendAvailableAt: new Date(now.getTime() + OTP.RESEND_COOLDOWN_MS),
    maskedEmail: maskEmail(email),
    delivered,
  };
};

const loadChallenge = async (challengeToken: string) => {
  const record = await prisma.emailOtp.findUnique({
    where: { challengeHash: hashToken(challengeToken) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          isVerified: true,
          isSuspended: true,
          isDeleted: true,
        },
      },
    },
  });

  if (!record || record.consumedAt) {
    throw new OtpError(
      "This verification session is no longer valid. Please start again.",
      400,
      "OTP_CHALLENGE_UNKNOWN",
    );
  }
  if (record.user.isSuspended || record.user.isDeleted) {
    throw new OtpError(
      "This account is not available. Please contact support.",
      403,
      "OTP_ACCOUNT_UNAVAILABLE",
    );
  }
  return record;
};

export type VerifiedOtp = {
  userId: string;
  purpose: OtpPurpose;
  email: string;
};

/**
 * Validates a submitted code. Increments the attempt counter on every miss and
 * burns the challenge once `OTP.MAX_ATTEMPTS` is reached, which caps an online
 * guessing attack at 5 tries out of 1,000,000 per issued code.
 */
export const verifyOtpChallenge = async (
  challengeToken: string,
  code: string,
): Promise<VerifiedOtp> => {
  const record = await loadChallenge(challengeToken);

  if (record.expiresAt.getTime() <= Date.now()) {
    await prisma.emailOtp.delete({ where: { id: record.id } }).catch(() => undefined);
    throw new OtpError("That code has expired. Please request a new one.", 400, "OTP_EXPIRED");
  }

  if (record.attempts >= OTP.MAX_ATTEMPTS) {
    await prisma.emailOtp.delete({ where: { id: record.id } }).catch(() => undefined);
    throw new OtpError(
      "Too many incorrect codes. Please request a new one.",
      429,
      "OTP_ATTEMPTS_EXCEEDED",
    );
  }

  if (!digestsMatch(record.codeHash, hashToken(code))) {
    const updated = await prisma.emailOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    const remaining = Math.max(OTP.MAX_ATTEMPTS - updated.attempts, 0);

    if (remaining === 0) {
      await prisma.emailOtp.delete({ where: { id: record.id } }).catch(() => undefined);
      throw new OtpError(
        "Too many incorrect codes. Please request a new one.",
        429,
        "OTP_ATTEMPTS_EXCEEDED",
      );
    }
    throw new OtpError(
      `That code is not correct. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`,
      400,
      "OTP_INCORRECT",
    );
  }

  // Single-use: delete rather than flag, so a replay finds nothing at all.
  await prisma.emailOtp.delete({ where: { id: record.id } });

  return { userId: record.user.id, purpose: record.purpose, email: record.user.email };
};

/**
 * Issues a replacement code for an in-flight challenge. Enforces a cooldown and
 * a per-challenge cap so this endpoint cannot be used to flood someone's inbox
 * (which would also damage our sending reputation).
 */
export const resendOtpChallenge = async (challengeToken: string): Promise<OtpChallenge> => {
  const record = await loadChallenge(challengeToken);

  const nextAllowedAt = record.lastSentAt.getTime() + OTP.RESEND_COOLDOWN_MS;
  if (Date.now() < nextAllowedAt) {
    const waitSeconds = Math.ceil((nextAllowedAt - Date.now()) / 1000);
    throw new OtpError(
      `Please wait ${waitSeconds} more ${waitSeconds === 1 ? "second" : "seconds"} before requesting another code.`,
      429,
      "OTP_RESEND_COOLDOWN",
    );
  }

  if (record.resendCount >= OTP.MAX_RESENDS) {
    throw new OtpError(
      "You have requested too many codes. Please start again in a few minutes.",
      429,
      "OTP_RESEND_LIMIT",
    );
  }

  const code = generateNumericCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP.EXPIRY_MS);

  await prisma.emailOtp.update({
    where: { id: record.id },
    data: {
      codeHash: hashToken(code),
      expiresAt,
      lastSentAt: now,
      attempts: 0,
      resendCount: { increment: 1 },
    },
  });

  // An explicit "send it again" deserves an explicit failure, so this one throws.
  try {
    await sendOtpEmail(record.user.email, code, record.purpose, record.user.name);
  } catch (error) {
    logger.error(`Failed to resend ${record.purpose} OTP email`, error);
    throw new OtpError(
      "We could not send the email just now. Please try again in a moment.",
      502,
      "OTP_DELIVERY_FAILED",
    );
  }

  return {
    // The handle stays stable across resends so the client keeps one session.
    challengeToken,
    expiresAt,
    resendAvailableAt: new Date(now.getTime() + OTP.RESEND_COOLDOWN_MS),
    maskedEmail: maskEmail(record.user.email),
    delivered: true,
  };
};

/** Housekeeping for expired rows. Safe to call from a cron job. */
export const purgeExpiredOtps = async (): Promise<number> => {
  const { count } = await prisma.emailOtp.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  if (count > 0) {
    logger.info(`Purged ${count} expired email OTP challenge(s).`);
  }
  return count;
};
