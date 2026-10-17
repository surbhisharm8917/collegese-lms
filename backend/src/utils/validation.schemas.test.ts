import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  changePasswordSchema,
  forgotPasswordSchema,
} from "./validation.schemas";

describe("loginSchema", () => {
  it("accepts a valid email + password and lowercases/trims email", () => {
    const result = loginSchema.parse({ email: "  USER@Example.COM ", password: "anything" });
    expect(result.email).toBe("user@example.com");
    expect(result.password).toBe("anything");
  });

  it("rejects an invalid email", () => {
    expect(() => loginSchema.parse({ email: "not-an-email", password: "x" })).toThrow();
  });

  it("defaults to the password method", () => {
    const result = loginSchema.parse({ email: "user@example.com", password: "anything" });
    expect(result.method).toBe("PASSWORD");
  });

  it("rejects a missing password", () => {
    expect(() => loginSchema.parse({ email: "user@example.com" })).toThrow();
  });

  it("accepts the emailed-code method without a password", () => {
    const result = loginSchema.parse({ email: "user@example.com", method: "OTP" });
    expect(result.method).toBe("OTP");
    expect(result.password).toBeUndefined();
  });

  it("rejects an unknown sign-in method", () => {
    expect(() =>
      loginSchema.parse({ email: "user@example.com", password: "x", method: "MAGIC_LINK" }),
    ).toThrow();
  });
});

describe("registerSchema password strength", () => {
  const base = {
    name: "Jane",
    email: "jane@example.com",
    acceptTerms: true,
    acceptPrivacy: true,
    confirmAdult: true,
    courseName: "CA Foundation" as const,
  };

  it("accepts a strong password", () => {
    const result = registerSchema.parse({ ...base, password: "Abcd1234" });
    expect(result.password).toBe("Abcd1234");
  });

  it("accepts 120 name characters and rejects 121", () => {
    expect(
      registerSchema.safeParse({ ...base, name: "N".repeat(120), password: "Abcd1234" }).success,
    ).toBe(true);
    const result = registerSchema.safeParse({
      ...base,
      name: "N".repeat(121),
      password: "Abcd1234",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ["name"],
        message: "Name must be 120 characters or fewer.",
      });
    }
  });

  it("accepts 20 phone characters and rejects 21", () => {
    expect(
      registerSchema.safeParse({ ...base, phone: "1".repeat(20), password: "Abcd1234" }).success,
    ).toBe(true);
    const result = registerSchema.safeParse({
      ...base,
      phone: "1".repeat(21),
      password: "Abcd1234",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ["phone"],
        message: "Phone number must be 20 characters or fewer.",
      });
    }
  });

  it("accepts 128 password characters and rejects 129", () => {
    const password128 = `Aa1${"x".repeat(125)}`;
    expect(registerSchema.safeParse({ ...base, password: password128 }).success).toBe(true);
    const result = registerSchema.safeParse({ ...base, password: `${password128}x` });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ["password"],
        message: "Password must be at most 128 characters long.",
      });
    }
  });

  it("rejects a password shorter than 8 chars", () => {
    expect(() => registerSchema.parse({ ...base, password: "Ab1" })).toThrow();
  });

  it("rejects a password with no uppercase letter", () => {
    expect(() => registerSchema.parse({ ...base, password: "abcd1234" })).toThrow();
  });

  it("rejects a password with no number", () => {
    expect(() => registerSchema.parse({ ...base, password: "Abcdefgh" })).toThrow();
  });

  it("rejects unknown/privileged fields (strict) to prevent mass-assignment", () => {
    // Security: role / isVerified / arbitrary fields must NEVER be accepted at
    // self-registration. `.strict()` rejects any key outside the allowlist.
    expect(() =>
      registerSchema.parse({ ...base, password: "Abcd1234", role: "SUPER_ADMIN" }),
    ).toThrow();
    expect(() =>
      registerSchema.parse({ ...base, password: "Abcd1234", isVerified: true }),
    ).toThrow();
    expect(() =>
      registerSchema.parse({ ...base, password: "Abcd1234", department: "CS" }),
    ).toThrow();
  });
});

describe("resetPasswordSchema", () => {
  it("requires newPassword and confirmPassword to match", () => {
    expect(() =>
      resetPasswordSchema.parse({
        token: "t",
        newPassword: "Abcd1234",
        confirmPassword: "Different1",
      }),
    ).toThrow();
  });

  it("accepts matching strong passwords with a token", () => {
    const result = resetPasswordSchema.parse({
      token: "abc",
      newPassword: "Abcd1234",
      confirmPassword: "Abcd1234",
    });
    expect(result.token).toBe("abc");
  });

  it("rejects a missing token", () => {
    expect(() =>
      resetPasswordSchema.parse({ newPassword: "Abcd1234", confirmPassword: "Abcd1234" }),
    ).toThrow();
  });
});

describe("changePasswordSchema", () => {
  it("rejects mismatched passwords", () => {
    expect(() =>
      changePasswordSchema.parse({ newPassword: "Abcd1234", confirmPassword: "Zzzz9999" }),
    ).toThrow();
  });
});

describe("forgotPasswordSchema", () => {
  it("normalizes the email", () => {
    const result = forgotPasswordSchema.parse({ email: "Foo@Bar.com" });
    expect(result.email).toBe("foo@bar.com");
  });
});
