import { logger } from "@utils/logger";

const required = (keys: readonly string[], missing: string[]): void => {
  for (const key of keys) {
    if (!process.env[key]?.trim()) {
      missing.push(key);
    }
  }
};

const isHttpsUrl = (value: string | undefined): boolean => {
  try {
    return new URL(value ?? "").protocol === "https:";
  } catch {
    return false;
  }
};

const isEmail = (value: string | undefined): boolean =>
  Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

const fail = (problems: string[]): never => {
  logger.error("FATAL: Invalid runtime configuration", undefined, { problems });
  throw new Error(`Invalid runtime configuration: ${problems.join("; ")}`);
};

export function validateEnv(): void {
  const production = process.env.NODE_ENV === "production";
  const missing: string[] = [];
  const problems: string[] = [];

  required(["DATABASE_URL", "JWT_SECRET", "APP_URL", "CORS_ORIGINS"], missing);

  if (production) {
    required(
      [
        "API_BASE_URL",
        "RESEND_API_KEY",
        "RESEND_FROM_EMAIL",
        "SUPPORT_EMAIL",
        "GRIEVANCE_EMAIL",
        "STORAGE_DRIVER",
        "LIVEKIT_API_URL",
        "LIVEKIT_WS_URL",
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET",
      ],
      missing,
    );
  }

  const jwtSecret = process.env.JWT_SECRET ?? "";
  if (production && jwtSecret.length < 48) {
    problems.push("JWT_SECRET must contain at least 48 characters");
  }
  if (/replace|change|secret/i.test(jwtSecret) && production) {
    problems.push("JWT_SECRET must not contain a placeholder value");
  }

  if (production && !isHttpsUrl(process.env.APP_URL)) {
    problems.push("APP_URL must be an HTTPS URL in production");
  }
  if (production && !isHttpsUrl(process.env.API_BASE_URL)) {
    problems.push("API_BASE_URL must be an HTTPS URL in production");
  }
  if (production && !isHttpsUrl(process.env.LIVEKIT_API_URL)) {
    problems.push("LIVEKIT_API_URL must be an HTTPS URL in production");
  }

  try {
    const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
    if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
      problems.push("DATABASE_URL must use PostgreSQL");
    }
    if (production && databaseUrl.searchParams.get("sslmode") !== "require") {
      problems.push("DATABASE_URL must set sslmode=require in production");
    }
  } catch {
    problems.push("DATABASE_URL is invalid");
  }

  // SMTP is now an optional fallback behind the Resend HTTP API, so its settings
  // are only validated when a host has actually been configured.
  if (process.env.EMAIL_HOST?.trim()) {
    const emailPort = Number(process.env.EMAIL_PORT);
    if (!Number.isInteger(emailPort) || emailPort < 1 || emailPort > 65535) {
      problems.push("EMAIL_PORT must be a valid TCP port when EMAIL_HOST is set");
    }
    required(["EMAIL_USER", "EMAIL_PASS"], missing);
  }

  // The From address must sit on the domain verified in Resend (SPF/DKIM/DMARC),
  // otherwise every send is rejected and nobody can register or sign in.
  const emailFrom =
    process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER;
  if (production && !isEmail(emailFrom)) {
    problems.push("RESEND_FROM_EMAIL must be a valid email address on your verified domain");
  }
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey && !resendKey.startsWith("re_")) {
    problems.push("RESEND_API_KEY does not look like a Resend key (expected a re_ prefix)");
  }
  for (const key of ["SUPPORT_EMAIL", "GRIEVANCE_EMAIL"] as const) {
    if (production && !isEmail(process.env[key])) {
      problems.push(`${key} must be a valid email address`);
    }
  }

  const proxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 1);
  if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 5) {
    problems.push("TRUST_PROXY_HOPS must be an integer from 0 to 5");
  }

  const origins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.includes("*")) {
    problems.push("CORS_ORIGINS cannot contain a wildcard");
  }
  for (const origin of origins) {
    try {
      const parsed = new URL(origin);
      if (production && parsed.protocol !== "https:") {
        problems.push(`CORS origin must use HTTPS: ${origin}`);
      }
    } catch {
      problems.push(`invalid CORS origin: ${origin}`);
    }
  }

  const sameSite = (process.env.COOKIE_SAME_SITE ?? "lax").toLowerCase();
  if (!["lax", "strict", "none"].includes(sameSite)) {
    problems.push("COOKIE_SAME_SITE must be lax, strict, or none");
  }

  const storageDriver = (process.env.STORAGE_DRIVER ?? (production ? "" : "local")).toLowerCase();
  if (!["local", "azure", "s3"].includes(storageDriver)) {
    problems.push("STORAGE_DRIVER must be local, azure, or s3");
  }
  if (production && storageDriver === "local") {
    problems.push("local storage is not allowed in production");
  }
  if (storageDriver === "azure") {
    required(
      [
        "AZURE_STORAGE_ACCOUNT",
        "AZURE_STORAGE_KEY",
        "AZURE_PUBLIC_CONTAINER",
        "AZURE_PRIVATE_CONTAINER",
      ],
      missing,
    );
    if (process.env.AZURE_PUBLIC_CONTAINER === process.env.AZURE_PRIVATE_CONTAINER) {
      problems.push("Azure public and private containers must be different");
    }
  }
  if (storageDriver === "s3") {
    required(["AWS_REGION", "AWS_PUBLIC_S3_BUCKET_NAME", "AWS_PRIVATE_S3_BUCKET_NAME"], missing);
  }

  if (process.env.LIVEKIT_API_SECRET && process.env.LIVEKIT_API_SECRET.length < 32 && production) {
    problems.push("LIVEKIT_API_SECRET must contain at least 32 characters");
  }
  if (
    production &&
    process.env.LIVEKIT_WS_URL &&
    !process.env.LIVEKIT_WS_URL.startsWith("wss://")
  ) {
    problems.push("LIVEKIT_WS_URL must use wss:// in production");
  }

  if (missing.length > 0) {
    problems.push(`missing ${[...new Set(missing)].join(", ")}`);
  }
  if (problems.length > 0) {
    fail([...new Set(problems)]);
  }

  if (!production && storageDriver === "local") {
    logger.warn("Local filesystem storage is active. Do not use it for production.");
  }
  if (!production && !process.env.LIVEKIT_API_KEY) {
    logger.warn("LiveKit is not configured; live classrooms will return 503.");
  }
}
