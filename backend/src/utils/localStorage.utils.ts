import { promises as fs } from "fs";
import path from "path";
import { logger } from "./logger";
import crypto from "crypto";

/**
 * Local filesystem storage driver.
 *
 * Used for local development when AWS S3 / CloudFront are not available.
 * Files are written under `backend/uploads/<key>` and served by Express at
 * `${PUBLIC_BASE_URL}/uploads/<key>`.
 *
 * This mirrors the public API of the S3 utils so controllers can stay agnostic.
 */

// Root directory where uploaded files live (backend/uploads).
export const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

// Base URL the backend is reachable at, used to build absolute file URLs.
const PUBLIC_BASE_URL = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;

const sanitizeKey = (key: string): string => {
  // Prevent path traversal — keep the key relative and within UPLOAD_ROOT.
  const normalized = path.posix.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  return normalized.replace(/^\/+/, "");
};

const ensureDir = async (filePath: string): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

export const localWriteFile = async (fileBuffer: Buffer, key: string): Promise<string> => {
  const safeKey = sanitizeKey(key);
  const absPath = path.join(UPLOAD_ROOT, safeKey);
  await ensureDir(absPath);
  await fs.writeFile(absPath, fileBuffer);
  logger.debug(`[local-storage] wrote ${safeKey}`);
  return localPublicUrl(safeKey);
};

export const localPublicUrl = (key: string): string => {
  return `${PUBLIC_BASE_URL}/uploads/${sanitizeKey(key)}`;
};

/**
 * "Presigned" upload URL for the local driver: a PUT endpoint that accepts the
 * raw file body and stores it under the given key.
 */
export const localUploadUrl = (key: string): string => {
  const safeKey = sanitizeKey(key);
  const expires = Date.now() + 15 * 60 * 1000;
  const signature = signLocalUpload(safeKey, expires);
  return `${PUBLIC_BASE_URL}/api/v1/uploads/${safeKey}?expires=${expires}&signature=${signature}`;
};

const signLocalUpload = (key: string, expires: number): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required for local upload signing.");
  }
  return crypto.createHmac("sha256", secret).update(`${key}.${expires}`).digest("base64url");
};

export const validateLocalUploadSignature = (
  key: string,
  expiresValue: unknown,
  signatureValue: unknown,
): boolean => {
  const expires = Number(expiresValue);
  const signature = typeof signatureValue === "string" ? signatureValue : "";
  if (!Number.isFinite(expires) || expires <= Date.now() || !signature) {
    return false;
  }
  const expected = signLocalUpload(sanitizeKey(key), expires);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
};

export const localReadFile = async (key: string): Promise<Buffer> => {
  const absPath = path.join(UPLOAD_ROOT, sanitizeKey(key));
  return fs.readFile(absPath);
};

export const localObjectExists = async (key: string): Promise<boolean> => {
  try {
    await fs.access(path.join(UPLOAD_ROOT, sanitizeKey(key)));
    return true;
  } catch {
    return false;
  }
};

export const localObjectMetadata = async (
  key: string,
): Promise<{ size: number; contentType?: string }> => {
  const metadata = await fs.stat(path.join(UPLOAD_ROOT, sanitizeKey(key)));
  return { size: metadata.size };
};

export const localDeleteFile = async (key: string): Promise<void> => {
  const absPath = path.join(UPLOAD_ROOT, sanitizeKey(key));
  await fs.rm(absPath, { force: true });
};

/**
 * Given a stored file URL (local or S3-style), extract the storage key.
 * Handles both `${BASE}/uploads/<key>` and `https://bucket.s3.../<key>` forms.
 */
export const extractKeyFromUrl = (fileUrl: string): string => {
  try {
    const u = new URL(fileUrl);
    let p = u.pathname.replace(/^\/+/, "");
    if (p.startsWith("api/v1/uploads/")) {
      p = p.slice("api/v1/uploads/".length);
    } else if (p.startsWith("uploads/")) {
      p = p.slice("uploads/".length);
    }
    return p;
  } catch {
    return fileUrl.replace(/^\/+/, "");
  }
};
