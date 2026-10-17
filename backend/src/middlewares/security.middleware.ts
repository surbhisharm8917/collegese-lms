/**
 * Centralized security middleware setup.
 * Applies rate limiting. Security headers are handled by Helmet in server.ts.
 */
import { Express } from "express";
import rateLimit from "express-rate-limit";
import { RATE_LIMIT } from "../utils/constants";

// ─── Rate Limiters ──────────────────────────────────────────

// Auth limiter: strict limits for login/register
export const authLimiter = rateLimit({
  windowMs: RATE_LIMIT.AUTH_WINDOW_MS,
  limit: RATE_LIMIT.AUTH_MAX_REQUESTS,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: "Too many login attempts, please try again later",
  },
});

// Login limiter: very strict limits for credential endpoints (login, forgot/reset password)
// to mitigate brute-force, credential-stuffing, and email-spam attacks.
// Counts all requests (no skipSuccessfulRequests) so forgot-password — which always
// returns 200 to avoid user enumeration — is still throttled.
export const loginLimiter = rateLimit({
  windowMs: RATE_LIMIT.AUTH_WINDOW_MS,
  limit: RATE_LIMIT.LOGIN_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later.",
  },
});

// OTP limiter: guards the second sign-in step. Slightly looser than the login
// limiter because one legitimate sign-in can cost several requests (submit a
// code, mistype it, ask for a new one). Per-challenge attempt caps in
// otp.service.ts are the real brute-force defence; this only bounds IP-level abuse.
export const otpLimiter = rateLimit({
  windowMs: RATE_LIMIT.AUTH_WINDOW_MS,
  limit: RATE_LIMIT.OTP_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many verification attempts. Please try again later.",
  },
});

// Status limiter: looser limits for health checks
export const statusLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  limit: RATE_LIMIT.STATUS_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
});

export const supportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: RATE_LIMIT.SUPPORT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many support requests. Please try again later.",
  },
});

// Global limiter: general API protection
const globalLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  limit: RATE_LIMIT.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});

export const applySecurityMiddleware = (app: Express): void => {
  // Apply global rate limiter
  app.use(globalLimiter);
};
