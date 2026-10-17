import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { AUTH } from "../utils/constants";
import { getCsrfCookieOptions } from "../utils/cookies";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const sign = (payload: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required for CSRF protection.");
  }
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
};

const safelyEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

export const createCsrfToken = (): string => {
  const random = crypto.randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + AUTH.CSRF_TOKEN_EXPIRY_MS;
  const payload = `${random}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
};

export const validateCsrfToken = (token: string): boolean => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [random, expiresAtValue, signature] = parts;
  const expiresAt = Number(expiresAtValue);
  if (!random || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  return safelyEqual(signature, sign(`${random}.${expiresAtValue}`));
};

export const issueCsrfToken = (_req: Request, res: Response) => {
  const token = createCsrfToken();
  res.cookie(AUTH.CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
  return res.status(200).json({ success: true, csrfToken: token });
};

/**
 * Signed double-submit CSRF protection. The browser receives the token in both a
 * secure cookie and the endpoint response, then echoes the response value in a header.
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next();
  }
  // Local-development direct uploads carry a short-lived HMAC in their URL.
  if (req.path.startsWith("/uploads/")) {
    return next();
  }

  // Explicit bearer tokens are not ambient browser credentials and are not CSRF-prone.
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return next();
  }

  const cookieToken = req.cookies?.[AUTH.CSRF_COOKIE_NAME];
  const header = req.headers["x-csrf-token"];
  const headerToken = Array.isArray(header) ? header[0] : header;

  if (
    typeof cookieToken !== "string" ||
    typeof headerToken !== "string" ||
    !safelyEqual(cookieToken, headerToken) ||
    !validateCsrfToken(headerToken)
  ) {
    return res.status(403).json({
      success: false,
      code: "CSRF_INVALID",
      message: "Security token is missing or expired. Please retry the request.",
    });
  }

  return next();
};
