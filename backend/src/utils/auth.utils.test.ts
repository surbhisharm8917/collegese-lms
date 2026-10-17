import { describe, it, expect, beforeAll } from "vitest";

// auth.utils reads JWT_SECRET and SMTP config at module load — provide test values
beforeAll(() => {
  process.env.JWT_SECRET ||= "test-secret-for-vitest-only";
  process.env.EMAIL_USER ||= "test";
  process.env.EMAIL_PASS ||= "test";
  process.env.EMAIL_HOST ||= "localhost";
  process.env.EMAIL_PORT ||= "587";
});

describe("hashToken", () => {
  it("produces a deterministic 64-char hex SHA-256 hash", async () => {
    const { hashToken } = await import("./auth.utils");
    const a = hashToken("my-token");
    const b = hashToken("my-token");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different inputs", async () => {
    const { hashToken } = await import("./auth.utils");
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });

  it("never returns the raw token", async () => {
    const { hashToken } = await import("./auth.utils");
    expect(hashToken("secret-token")).not.toContain("secret-token");
  });
});

describe("validatePasswordStrength", () => {
  it("returns null for a strong password", async () => {
    const { validatePasswordStrength } = await import("./auth.utils");
    expect(validatePasswordStrength("Abcd1234")).toBeNull();
  });

  it("rejects too-short passwords", async () => {
    const { validatePasswordStrength } = await import("./auth.utils");
    expect(validatePasswordStrength("Ab1")).toBeTypeOf("string");
  });

  it("rejects passwords missing required character classes", async () => {
    const { validatePasswordStrength } = await import("./auth.utils");
    expect(validatePasswordStrength("alllowercase1")).toBeTypeOf("string");
    expect(validatePasswordStrength("ALLUPPERCASE1")).toBeTypeOf("string");
    expect(validatePasswordStrength("NoNumbersHere")).toBeTypeOf("string");
  });

  it("rejects non-string input", async () => {
    const { validatePasswordStrength } = await import("./auth.utils");
    // @ts-expect-error testing runtime guard
    expect(validatePasswordStrength(undefined)).toBeTypeOf("string");
  });
});

describe("generateLearnerId", () => {
  it("produces a JECA-prefixed id of expected length", async () => {
    const { generateLearnerId } = await import("./auth.utils");
    const id = generateLearnerId();
    expect(id).toMatch(/^JECA-[A-Z0-9]{12}$/);
  });

  it("produces unique ids", async () => {
    const { generateLearnerId } = await import("./auth.utils");
    const ids = new Set(Array.from({ length: 50 }, () => generateLearnerId()));
    expect(ids.size).toBe(50);
  });
});
