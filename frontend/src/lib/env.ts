/**
 * Environment configuration helper.
 * Centralizes all environment variable access with proper fallbacks.
 */

/** Whether the app is running in development mode */
export const isDev = import.meta.env.DEV;

/** Whether the app is running in production mode */
export const isProd = import.meta.env.PROD;

const runtimeConfig = window.__JECC_CONFIG__ ?? {};

/**
 * The backend API base URL (full origin, no path).
 * In dev, the Vite proxy handles /api/v1 → backend, so this is only
 * needed for socket connections and absolute-URL use cases.
 */
export const API_ORIGIN: string =
  runtimeConfig.API_URL?.replace(/\/$/, "") ||
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  (isDev ? "http://localhost:4000" : "");

export const RELEASE = runtimeConfig.RELEASE || "development";

/** Validate that required env vars are present in production */
export function validateEnv(): void {
  if (isProd && !API_ORIGIN) {
    console.warn("[env] API_URL is empty; API requests will use the frontend origin.");
  }
}
