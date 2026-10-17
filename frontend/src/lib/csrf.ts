import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { API_ORIGIN } from "./env";

const apiOrigin = API_ORIGIN;
const mutatingMethods = new Set(["post", "put", "patch", "delete"]);

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

const targetsBackendApi = (config: InternalAxiosRequestConfig): boolean => {
  const url = config.url || "";
  if (/^https?:\/\//i.test(url)) {
    return Boolean(apiOrigin) && url.startsWith(`${apiOrigin}/api/`);
  }
  return url.startsWith("/api/") || Boolean(config.baseURL?.includes("/api/v1"));
};

const fetchCsrfToken = async (force = false): Promise<string> => {
  if (!force && csrfToken) return csrfToken;
  if (!force && csrfRequest) return csrfRequest;

  csrfRequest = fetch(`${apiOrigin}/api/v1/auth/csrf`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("Unable to initialize request security.");
      const data = (await response.json()) as { csrfToken?: string };
      if (!data.csrfToken) throw new Error("Security token was not returned by the server.");
      csrfToken = data.csrfToken;
      return data.csrfToken;
    })
    .finally(() => {
      csrfRequest = null;
    });

  return csrfRequest;
};

const setCsrfHeader = (config: InternalAxiosRequestConfig, token: string) => {
  if (typeof config.headers.set === "function") {
    config.headers.set("X-CSRF-Token", token);
  } else {
    config.headers["X-CSRF-Token"] = token;
  }
};

type RetryableConfig = InternalAxiosRequestConfig & { _csrfRetried?: boolean };

export const installCsrfInterceptors = (client: AxiosInstance) => {
  client.interceptors.request.use(async (config) => {
    const method = (config.method || "get").toLowerCase();
    if (mutatingMethods.has(method) && targetsBackendApi(config)) {
      setCsrfHeader(config, await fetchCsrfToken());
    }
    return config;
  });

  client.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    const data = error.response?.data as { code?: string } | undefined;
    if (config && data?.code === "CSRF_INVALID" && !config._csrfRetried) {
      config._csrfRetried = true;
      csrfToken = null;
      setCsrfHeader(config, await fetchCsrfToken(true));
      return client.request(config);
    }
    return Promise.reject(error);
  });
};
