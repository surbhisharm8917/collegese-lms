import axios from "axios";
import { installCsrfInterceptors } from "./csrf";
import { API_ORIGIN } from "./env";

/**
 * Centralized Axios instance for all API calls.
 * - In dev, Vite proxy forwards /api/v1 → localhost:4000 (relative path works)
 * - In production, VITE_API_URL points to the backend origin (e.g. https://api.justeasycaclasses.com)
 * - Credentials (cookies) are always included
 * - Global interceptors handle 401 redirects and error normalization
 */
const api = axios.create({
  baseURL: `${API_ORIGIN}/api/v1`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

installCsrfInterceptors(api);

// Auth uses the httpOnly `auth_token` cookie (sent automatically via
// withCredentials). The JWT is intentionally NOT stored in localStorage or
// attached as a Bearer header, to prevent XSS token theft.

// Response interceptor: handle auth expiration globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Auth expired — clear local data, redirect to login
      const currentPath = window.location.pathname;
      if (currentPath.startsWith("/dashboard") || currentPath.startsWith("/evaluate-attempt")) {
        localStorage.removeItem("user");
        localStorage.removeItem("user_role");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_id");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
