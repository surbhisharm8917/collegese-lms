#!/usr/bin/env node

/**
 * Just Easy CA Classes - first-time project setup
 *
 * Run once after cloning:
 *   pnpm setup        (from project root)
 *   node scripts/setup.mjs
 *
 * What it does:
 *  1. Copies the root .env.example to backend/.env when it does not exist
 *  2. Installs dependencies in both directories
 *  3. Generates the Prisma client
 */

import { existsSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const log = (msg) => console.log(`\x1b[36m[setup]\x1b[0m ${msg}`);
const warn = (msg) => console.log(`\x1b[33m[setup]\x1b[0m ${msg}`);
const ok = (msg) => console.log(`\x1b[32m[setup]\x1b[0m ${msg}`);

function copyEnvIfMissing(dir, label, example) {
  const envFile = resolve(dir, ".env");

  if (existsSync(envFile)) {
    warn(`${label}/.env already exists — skipping.`);
    return;
  }

  if (!existsSync(example)) {
    warn(`${label}/.env.example not found — skipping.`);
    return;
  }

  copyFileSync(example, envFile);
  ok(`Created ${label}/.env from .env.example — edit it with your values.`);
}

function run(cmd, cwd) {
  log(`Running: ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

// ── 1. Copy .env files ────────────────────────────────────────
log("Checking environment files...");
copyEnvIfMissing(resolve(root, "backend"), "backend", resolve(root, ".env.example"));

// ── 2. Install dependencies ──────────────────────────────────
log("Installing backend dependencies...");
run("pnpm install", resolve(root, "backend"));

log("Installing frontend dependencies...");
run("pnpm install", resolve(root, "frontend"));

// ── 3. Generate Prisma client ────────────────────────────────
log("Generating Prisma client...");
run("npx prisma generate", resolve(root, "backend"));

// ── Done ─────────────────────────────────────────────────────
console.log("");
ok("=".repeat(50));
ok("Setup complete!");
ok("");
ok("Next steps:");
ok("  1. Edit backend/.env with your DATABASE_URL, JWT_SECRET, etc.");
ok("  2. Start local LiveKit: pnpm infra:local:up");
ok("  3. Apply migrations: pnpm --dir backend db:migrate:deploy");
ok("  4. Run: pnpm dev");
ok("=".repeat(50));
