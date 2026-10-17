import { PrismaClient } from "@generated/prisma/client";
import { logger } from "../utils/logger";

declare global {
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === "test" ? ["error"] : ["warn", "error"],
  });
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ["query", "info", "warn", "error"],
    });
  }
  prisma = global.prisma;
}

export const connectDatabase = async () => {
  try {
    logger.info("Attempting to connect to PostgreSQL...");

    await prisma.$connect();

    logger.info("=".repeat(50));
    logger.info("Database Status: CONNECTED");
    logger.info("Database Type: PostgreSQL");
    logger.info("Connection: Established successfully");
    logger.info("=".repeat(50));
  } catch (error) {
    logger.error("=".repeat(50));
    logger.error("Database Status: CONNECTION FAILED");
    logger.error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    logger.error("=".repeat(50));

    throw new Error("Database connection failed. Cannot start server.");
  }
};

export const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    logger.info("Database disconnected");
  } catch (error) {
    logger.error("Error disconnecting database", error);
  }
};

export default prisma;
