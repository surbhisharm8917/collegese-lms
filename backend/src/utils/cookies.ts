import type { CookieOptions } from "express";
import { AUTH } from "./constants";

const getSameSite = (): CookieOptions["sameSite"] => {
  const configured = process.env.COOKIE_SAME_SITE?.toLowerCase();
  if (configured === "none" || configured === "strict" || configured === "lax") {
    return configured;
  }
  return "lax";
};

export const getAuthCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: getSameSite(),
  maxAge: AUTH.COOKIE_MAX_AGE_MS,
  path: "/",
});

export const getClearAuthCookieOptions = (): CookieOptions => {
  const { maxAge: _maxAge, ...options } = getAuthCookieOptions();
  return options;
};

export const getCsrfCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: getSameSite(),
  maxAge: AUTH.CSRF_TOKEN_EXPIRY_MS,
  path: "/",
});
