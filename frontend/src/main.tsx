import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import "./index.css";
import App from "./App";
import { UserProvider } from "./context/UserContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { API_ORIGIN, validateEnv } from "./lib/env";
import { installCsrfInterceptors } from "./lib/csrf";

// ---- Global Axios defaults ----
// Many components still import raw `axios` instead of the centralized `api` client.
// This ensures cookies are always sent with every request, regardless of import method.
axios.defaults.withCredentials = true;
installCsrfInterceptors(axios);

// In production the frontend and backend may run on separate Just Easy domains.
// are on different origins. Rewrite relative /api/ paths to the full backend URL
// so raw `axios.get("/api/v1/…")` calls work without editing every file.
if (API_ORIGIN) {
  axios.interceptors.request.use((config) => {
    if (config.url && config.url.startsWith("/api/")) {
      config.url = `${API_ORIGIN}${config.url}`;
    }
    return config;
  });
}

// Auth relies solely on the httpOnly auth_token cookie (withCredentials above).
// The JWT is deliberately never read from or written to localStorage (XSS hardening).

// Global 401 handler — clear tokens and redirect to login on any unauthorized response
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      localStorage.removeItem("user_id");
      localStorage.removeItem("user_role");
      if (
        window.location.pathname.startsWith("/dashboard") ||
        window.location.pathname.startsWith("/evaluate-attempt")
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// Validate environment variables on startup
validateEnv();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <BrowserRouter>
      <UserProvider>
        <App />
      </UserProvider>
    </BrowserRouter>
  </ErrorBoundary>,
);
