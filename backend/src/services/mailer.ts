import nodemailer from "nodemailer";
import crypto from "crypto";
import { logger } from "../utils/logger";

/**
 * Single outbound mail transport for the whole platform.
 *
 * Resend's HTTP API is preferred when RESEND_API_KEY is configured: it gives us
 * per-message ids, bounce/complaint handling, and avoids long-lived SMTP sockets
 * that container platforms frequently sever. SMTP (nodemailer) stays as a
 * fallback so a missing/failed key never silently drops platform notifications.
 *
 * The exported `sendMail` accepts the same option subset the codebase already
 * used with nodemailer, so call sites did not have to change.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;

export type MailMessage = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  /**
   * Plain-text alternative. Always send one: a multipart/alternative message
   * scores materially better with spam filters than HTML-only mail, and it is
   * what screen readers and text-only clients fall back to.
   */
  text?: string;
  replyTo?: string;
  /** Extra SMTP headers (e.g. X-Entity-Ref-ID to stop Gmail threading). */
  headers?: Record<string, string>;
  /** Resend tags, used for per-category delivery analytics. */
  tags?: { name: string; value: string }[];
};

const resendApiKey = (): string => process.env.RESEND_API_KEY?.trim() ?? "";

export const isResendConfigured = (): boolean => resendApiKey().length > 0;

let smtpTransporter: nodemailer.Transporter | null = null;

const getSmtpTransporter = (): nodemailer.Transporter => {
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: { minVersion: "TLSv1.2" },
    });
  }
  return smtpTransporter;
};

/**
 * Derives a readable plain-text part from an HTML body. Not a full HTML
 * renderer: it strips non-content elements, keeps link targets, and collapses
 * whitespace, which is enough for the transactional templates we send.
 */
export const htmlToPlainText = (html: string): string =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const sendViaResend = async (message: MailMessage, text: string): Promise<void> => {
  const payload: Record<string, unknown> = {
    from: message.from,
    to: Array.isArray(message.to) ? message.to : [message.to],
    subject: message.subject,
    html: message.html,
    text,
  };
  if (message.replyTo) {
    payload.reply_to = message.replyTo;
  }
  if (message.headers) {
    payload.headers = message.headers;
  }
  if (message.tags) {
    payload.tags = message.tags;
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey()}`,
          "Content-Type": "application/json",
          // Makes retries safe: Resend de-duplicates repeated keys.
          "Idempotency-Key": crypto
            .createHash("sha256")
            .update(`${JSON.stringify(payload)}`)
            .digest("hex"),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.ok) {
        return;
      }

      const detail = await response.text().catch(() => "");
      // 4xx other than 429 are permanent (bad from-address, unverified domain,
      // invalid recipient) — retrying only delays the caller.
      const retryable = response.status === 429 || response.status >= 500;
      lastError = new Error(`Resend responded ${response.status}: ${detail.slice(0, 300)}`);
      if (!retryable) {
        break;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown Resend transport error");
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(attempt * 400);
    }
  }

  throw lastError ?? new Error("Failed to send email via Resend.");
};

/**
 * Sends one transactional email. Throws when delivery could not be handed off,
 * so callers can decide whether the failure is fatal (login OTP) or should be
 * swallowed (best-effort notifications).
 */
export const sendMail = async (message: MailMessage): Promise<void> => {
  const text = message.text?.trim() || htmlToPlainText(message.html);

  if (isResendConfigured()) {
    try {
      await sendViaResend(message, text);
      return;
    } catch (error) {
      // Only fall through to SMTP if SMTP is actually configured with
      // credentials that are not just the Resend SMTP bridge.
      if (!process.env.EMAIL_HOST?.trim() || !process.env.EMAIL_PASS?.trim()) {
        throw error;
      }
      logger.error("Resend delivery failed; falling back to SMTP", error);
    }
  }

  await getSmtpTransporter().sendMail({
    from: message.from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text,
    replyTo: message.replyTo,
    headers: message.headers,
  });
};

/** Nodemailer-compatible shim so existing `transporter.sendMail(...)` call sites keep working. */
export const transporter = { sendMail };
