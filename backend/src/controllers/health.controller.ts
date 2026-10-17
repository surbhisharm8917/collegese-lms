import type { Request, Response } from "express";
import prisma from "@config/db";
import { checkLiveKitHealth } from "@services/livekit.service";
import { checkStorageHealth, STORAGE_DRIVER } from "@utils/s3.utils";

const checkWithTimeout = async (work: Promise<void>, timeoutMs = 4_000): Promise<void> => {
  let timeout: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("dependency check timed out")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

const release = () => ({
  version: process.env.APP_VERSION ?? "development",
  commit: process.env.GIT_SHA ?? "local",
});

export const liveHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: "ok",
    service: "just-easy-ca-api",
    uptimeSeconds: Math.floor(process.uptime()),
    ...release(),
  });
};

export const readyHealth = async (_req: Request, res: Response): Promise<void> => {
  const checks = await Promise.allSettled([
    checkWithTimeout(prisma.$queryRaw`SELECT 1`.then(() => undefined)),
    checkWithTimeout(checkStorageHealth()),
  ]);
  const names = ["database", `storage:${STORAGE_DRIVER}`];
  const dependencies = Object.fromEntries(
    checks.map((result, index) => [
      names[index],
      result.status === "fulfilled" ? "ok" : "unavailable",
    ]),
  );
  const ready = checks.every((result) => result.status === "fulfilled");

  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not_ready",
    dependencies,
    ...release(),
  });
};

export const dependencyHealth = async (_req: Request, res: Response): Promise<void> => {
  const checks = await Promise.allSettled([
    checkWithTimeout(prisma.$queryRaw`SELECT 1`.then(() => undefined)),
    checkWithTimeout(checkStorageHealth()),
    checkWithTimeout(checkLiveKitHealth()),
  ]);
  const names = ["database", `storage:${STORAGE_DRIVER}`, "livekit"];
  const dependencies = Object.fromEntries(
    checks.map((result, index) => [
      names[index],
      result.status === "fulfilled" ? "ok" : "unavailable",
    ]),
  );
  const healthy = checks.every((result) => result.status === "fulfilled");

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "healthy" : "degraded",
    dependencies,
    ...release(),
  });
};
