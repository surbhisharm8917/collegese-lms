#!/usr/bin/env node

import vm from "node:vm";

const appUrl = process.env.APP_URL?.replace(/\/$/, "");
const apiUrl = process.env.API_URL?.replace(/\/$/, "");
const expectedRelease = process.env.EXPECTED_RELEASE;

if (!appUrl || !apiUrl) {
  throw new Error("APP_URL and API_URL are required.");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function eventually(label, check) {
  let lastError;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await check();
      process.stdout.write(`ok - ${label}\n`);
      return;
    } catch (error) {
      lastError = error;
      process.stdout.write(`waiting - ${label} (${attempt}/30)\n`);
      await sleep(10_000);
    }
  }
  throw lastError;
}

const requireStatus = async (url, expected = 200, options = {}) => {
  const response = await fetch(url, { redirect: "manual", ...options });
  if (response.status !== expected) {
    throw new Error(`${url} returned ${response.status}, expected ${expected}`);
  }
  return response;
};

await eventually("frontend health", async () => {
  await requireStatus(`${appUrl}/healthz`);
});

await eventually("backend live health", async () => {
  const response = await requireStatus(`${apiUrl}/health/live`);
  const body = await response.json();
  if (body.status !== "ok") throw new Error("Backend liveness payload is invalid.");
});

await eventually("backend dependencies", async () => {
  const response = await requireStatus(`${apiUrl}/health/ready`);
  const body = await response.json();
  if (body.status !== "ready") throw new Error(`Backend is not ready: ${JSON.stringify(body)}`);
});

await eventually("frontend runtime configuration", async () => {
  const response = await requireStatus(`${appUrl}/runtime-config.js`);
  const body = await response.text();
  const sandbox = { window: {} };
  vm.runInNewContext(body, sandbox, { timeout: 1_000 });
  const runtimeConfig = sandbox.window.__JECC_CONFIG__;
  if (!runtimeConfig || runtimeConfig.API_URL !== apiUrl) {
    throw new Error("Runtime configuration does not contain the expected API_URL.");
  }
  if (expectedRelease && runtimeConfig.RELEASE !== expectedRelease) {
    throw new Error("Runtime configuration does not contain the expected release.");
  }
  if (!/no-store|no-cache/i.test(response.headers.get("cache-control") || "")) {
    throw new Error("Runtime configuration is cacheable.");
  }
});

await eventually("public application and security headers", async () => {
  const response = await requireStatus(`${appUrl}/home`);
  const html = await response.text();
  if (!html.includes("Just Easy CA Classes")) throw new Error("Brand title was not rendered.");
  if (!response.headers.get("content-security-policy")) throw new Error("CSP header is missing.");
  if (response.headers.get("x-content-type-options") !== "nosniff") {
    throw new Error("X-Content-Type-Options is missing.");
  }
});

await eventually("CSRF bootstrap and CORS", async () => {
  const response = await requireStatus(`${apiUrl}/api/v1/auth/csrf`, 200, {
    headers: { Origin: appUrl, Accept: "application/json" },
  });
  const body = await response.json();
  if (!body.csrfToken) throw new Error("CSRF token is missing.");
  if (!response.headers.get("set-cookie")?.includes("jecc_csrf")) {
    throw new Error("CSRF cookie is missing.");
  }
  if (response.headers.get("access-control-allow-origin") !== appUrl && appUrl !== apiUrl) {
    throw new Error("CORS origin is not configured for the application.");
  }
});

process.stdout.write("Production smoke checks passed.\n");
