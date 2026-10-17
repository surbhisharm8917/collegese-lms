#!/usr/bin/env node

import { lstat, opendir, rm } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DELETE_OPTIONS = {
  recursive: true,
  force: true,
  maxRetries: 3,
  retryDelay: 100,
};

const VALID_FLAGS = new Set(["--dry-run", "--help"]);
const FLAGS = new Set(process.argv.slice(2));

if (FLAGS.has("--help")) {
  console.log("Usage: pnpm clean [--dry-run] [--help]");
  console.log("");
  console.log(
    "Removes local dependency folders, build outputs, caches, logs, and generated files.",
  );
  console.log("Keeps source files, lockfiles, .env files, Docker files, and git history intact.");
  process.exit(0);
}

for (const flag of FLAGS) {
  if (!VALID_FLAGS.has(flag)) {
    throw new Error(`Unknown option: ${flag}`);
  }
}

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const isDryRun = FLAGS.has("--dry-run");

const PRUNE_DIRS = new Set([
  ".git",
  "node_modules",
  ".pnpm-store",
  "dist",
  "build",
  ".next",
  "out",
  "coverage",
  ".nyc_output",
  ".cache",
  ".vite",
  ".turbo",
  ".swc",
  "logs",
  "pids",
  "test-results",
  "playwright-report",
  "tmp",
  "temp",
  "generated",
]);

const DELETE_DIR_NAMES = new Set([
  "node_modules",
  ".pnpm-store",
  "dist",
  "build",
  ".next",
  "out",
  "coverage",
  ".nyc_output",
  ".cache",
  ".vite",
  ".turbo",
  ".swc",
  "logs",
  "pids",
  "test-results",
  "playwright-report",
  "tmp",
  "temp",
]);

const PROJECT_SPECIFIC_TARGETS = ["backend/generated"];

const DELETE_FILE_NAMES = new Set([".eslintcache", ".prettiercache"]);

const DELETE_FILE_PATTERNS = [
  /^.*\.log$/,
  /^.*\.pid$/,
  /^.*\.seed$/,
  /^.*\.pid\.lock$/,
  /^.*\.tmp$/,
  /^.*\.temp$/,
  /^.*\.tsbuildinfo$/,
  /^npm-debug\.log.*$/,
  /^pnpm-debug\.log.*$/,
  /^yarn-debug\.log.*$/,
  /^yarn-error\.log.*$/,
  /^lerna-debug\.log.*$/,
  /^report\.\d+\.\d+\.\d+\.\d+\.json$/,
  /^\.DS_Store$/,
  /^Thumbs\.db$/,
];

const KEEP_RELATIVE_PATHS = new Set([
  ".env",
  "backend/.env",
  "frontend/.env",
  ".env.example",
  "backend/.env.example",
  "frontend/.env.example",
  "pnpm-lock.yaml",
  "backend/pnpm-lock.yaml",
  "frontend/pnpm-lock.yaml",
  "package.json",
  "backend/package.json",
  "frontend/package.json",
]);

const toSafeRelativePath = (target) => {
  const absoluteTarget = resolve(PROJECT_ROOT, target);
  const relativeTarget = relative(PROJECT_ROOT, absoluteTarget);

  if (
    relativeTarget === "" ||
    relativeTarget === ".." ||
    relativeTarget.startsWith("../") ||
    relativeTarget.startsWith("..\\") ||
    isAbsolute(relativeTarget)
  ) {
    throw new Error(`Refusing to delete unsafe path: ${target}`);
  }

  return { absoluteTarget, relativeTarget };
};

const pathExists = async (target) => {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }

    throw error;
  }
};

const shouldDeleteFile = (name) =>
  DELETE_FILE_NAMES.has(name) || DELETE_FILE_PATTERNS.some((pattern) => pattern.test(name));

const collectTargets = async () => {
  const targets = new Set(PROJECT_SPECIFIC_TARGETS);

  const walk = async (directory) => {
    const dir = await opendir(directory);

    for await (const entry of dir) {
      const absoluteEntry = resolve(directory, entry.name);
      const relativeEntry = relative(PROJECT_ROOT, absoluteEntry);

      if (KEEP_RELATIVE_PATHS.has(relativeEntry)) {
        continue;
      }

      if (entry.isDirectory()) {
        if (DELETE_DIR_NAMES.has(entry.name)) {
          targets.add(relativeEntry);
          continue;
        }

        if (PRUNE_DIRS.has(entry.name)) {
          continue;
        }

        await walk(absoluteEntry);
        continue;
      }

      if (entry.isFile() && shouldDeleteFile(entry.name)) {
        targets.add(relativeEntry);
      }
    }
  };

  await walk(PROJECT_ROOT);
  return [...targets].sort();
};

const targets = await collectTargets();
let removedCount = 0;

for (const target of targets) {
  const { absoluteTarget, relativeTarget } = toSafeRelativePath(target);

  if (!(await pathExists(absoluteTarget))) {
    continue;
  }

  if (!isDryRun) {
    await rm(absoluteTarget, DELETE_OPTIONS);
  }

  removedCount += 1;
  console.log(`${isDryRun ? "would remove" : "removed"} ${relativeTarget}`);
}

if (removedCount === 0) {
  console.log(`${isDryRun ? "No matching files to remove." : "Already clean."}`);
} else {
  console.log(
    `${isDryRun ? "Would remove" : "Removed"} ${removedCount} item${removedCount === 1 ? "" : "s"}.`,
  );
}
