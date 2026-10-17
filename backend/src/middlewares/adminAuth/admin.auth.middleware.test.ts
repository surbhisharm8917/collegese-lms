import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { isAdmin, isSuperAdmin, isTeacher, isAssistant, isStudent } from "./admin.auth.middleware";

type Role = "STUDENT" | "ASSISTANT" | "TEACHER" | "ADMIN" | "SUPER_ADMIN";

const makeCtx = (role?: Role) => {
  const req = {
    user: role ? { id: "u1", email: "e", role, forcePasswordChange: false } : undefined,
  } as unknown as Request;
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next, status, json };
};

const expectAllowed = (
  guard: (req: Request, res: Response, next: NextFunction) => void,
  role: Role | undefined,
) => {
  const { req, res, next, status } = makeCtx(role);
  guard(req, res, next);
  expect(next).toHaveBeenCalledOnce();
  expect(status).not.toHaveBeenCalled();
};

const expectForbidden = (
  guard: (req: Request, res: Response, next: NextFunction) => void,
  role: Role | undefined,
) => {
  const { req, res, next, status } = makeCtx(role);
  guard(req, res, next);
  expect(next).not.toHaveBeenCalled();
  expect(status).toHaveBeenCalledWith(403);
};

describe("isAdmin", () => {
  it("allows ADMIN and SUPER_ADMIN", () => {
    expectAllowed(isAdmin, "ADMIN");
    expectAllowed(isAdmin, "SUPER_ADMIN");
  });
  it("forbids TEACHER, ASSISTANT, STUDENT, and anonymous", () => {
    expectForbidden(isAdmin, "TEACHER");
    expectForbidden(isAdmin, "ASSISTANT");
    expectForbidden(isAdmin, "STUDENT");
    expectForbidden(isAdmin, undefined);
  });
});

describe("isSuperAdmin", () => {
  it("allows only SUPER_ADMIN", () => {
    expectAllowed(isSuperAdmin, "SUPER_ADMIN");
  });
  it("forbids everyone else", () => {
    expectForbidden(isSuperAdmin, "ADMIN");
    expectForbidden(isSuperAdmin, "TEACHER");
    expectForbidden(isSuperAdmin, "STUDENT");
    expectForbidden(isSuperAdmin, undefined);
  });
});

describe("isTeacher", () => {
  it("allows TEACHER, ADMIN, SUPER_ADMIN", () => {
    expectAllowed(isTeacher, "TEACHER");
    expectAllowed(isTeacher, "ADMIN");
    expectAllowed(isTeacher, "SUPER_ADMIN");
  });
  it("forbids ASSISTANT and STUDENT", () => {
    expectForbidden(isTeacher, "ASSISTANT");
    expectForbidden(isTeacher, "STUDENT");
  });
});

describe("isAssistant", () => {
  it("allows ASSISTANT, TEACHER, ADMIN, SUPER_ADMIN", () => {
    expectAllowed(isAssistant, "ASSISTANT");
    expectAllowed(isAssistant, "TEACHER");
    expectAllowed(isAssistant, "ADMIN");
    expectAllowed(isAssistant, "SUPER_ADMIN");
  });
  it("forbids STUDENT and anonymous", () => {
    expectForbidden(isAssistant, "STUDENT");
    expectForbidden(isAssistant, undefined);
  });
});

describe("isStudent", () => {
  it("allows only STUDENT", () => {
    expectAllowed(isStudent, "STUDENT");
  });
  it("forbids staff roles", () => {
    expectForbidden(isStudent, "ASSISTANT");
    expectForbidden(isStudent, "ADMIN");
    expectForbidden(isStudent, "SUPER_ADMIN");
  });
});
