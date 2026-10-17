import crypto from "crypto";

export type UploadReceipt = {
  key: string;
  ownerId: string;
  purpose: string;
  contentType: string;
  size: number;
  expiresAt: number;
};

const secret = (): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required for upload receipts.");
  }
  return process.env.JWT_SECRET;
};

const sign = (payload: string): string =>
  crypto.createHmac("sha256", secret()).update(payload).digest("base64url");

export const createUploadReceipt = (
  input: Omit<UploadReceipt, "expiresAt">,
  ttlMs = 15 * 60 * 1000,
): string => {
  const payload = Buffer.from(JSON.stringify({ ...input, expiresAt: Date.now() + ttlMs })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
};

export const verifyUploadReceipt = (
  token: unknown,
  expected: { key: string; ownerId: string; purpose: string },
): UploadReceipt | null => {
  if (typeof token !== "string") {
    return null;
  }
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(sign(payload));
  if (actual.length !== wanted.length || !crypto.timingSafeEqual(actual, wanted)) {
    return null;
  }

  try {
    const receipt = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as UploadReceipt;
    if (
      receipt.expiresAt <= Date.now() ||
      receipt.key !== expected.key ||
      receipt.ownerId !== expected.ownerId ||
      receipt.purpose !== expected.purpose ||
      !Number.isFinite(receipt.size) ||
      receipt.size <= 0
    ) {
      return null;
    }
    return receipt;
  } catch {
    return null;
  }
};

export const uploadMatchesReceipt = (
  receipt: UploadReceipt,
  metadata: { size: number; contentType?: string },
): boolean =>
  metadata.size === receipt.size &&
  (!metadata.contentType ||
    metadata.contentType.toLowerCase() === receipt.contentType.toLowerCase());
export const verifyOwnedUploadReceipt = (
  token: unknown,
  expected: { ownerId: string; purpose: string },
): UploadReceipt | null => {
  if (typeof token !== "string") {
    return null;
  }
  const [payload] = token.split(".");
  if (!payload) {
    return null;
  }
  try {
    const candidate = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      key?: unknown;
    };
    if (typeof candidate.key !== "string" || candidate.key.length === 0) {
      return null;
    }
    return verifyUploadReceipt(token, { ...expected, key: candidate.key });
  } catch {
    return null;
  }
};
