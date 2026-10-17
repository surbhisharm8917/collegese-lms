/**
 * Centralized logger utility.
 * Replaces scattered console.log/console.error calls with structured logging.
 * Can be extended later to write to files, external services (Datadog, Sentry, etc.)
 */
import chalk from "chalk";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG);

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

const write = (
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
  error?: unknown,
): void => {
  if (!shouldLog(level)) {
    return;
  }

  const errorDetails =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error
        ? { raw: String(error) }
        : undefined;

  if (process.env.NODE_ENV === "production") {
    const output = JSON.stringify({
      timestamp: formatTimestamp(),
      level,
      message,
      ...(meta ?? {}),
      ...(errorDetails ? { error: errorDetails } : {}),
    });
    if (level === LogLevel.ERROR) {
      console.error(output);
    } else if (level === LogLevel.WARN) {
      console.warn(output);
    } else {
      console.log(output);
    }
    return;
  }

  const color =
    level === LogLevel.ERROR
      ? chalk.red
      : level === LogLevel.WARN
        ? chalk.yellow
        : level === LogLevel.INFO
          ? chalk.blue
          : chalk.gray;
  const details = { ...(meta ?? {}), ...(errorDetails ? { error: errorDetails } : {}) };
  const suffix = Object.keys(details).length > 0 ? ` ${JSON.stringify(details)}` : "";
  const line = color(`[${formatTimestamp()}] [${level}] ${message}${suffix}`);
  if (level === LogLevel.ERROR) {
    console.error(line);
  } else if (level === LogLevel.WARN) {
    console.warn(line);
  } else {
    console.log(line);
  }
};

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    write(LogLevel.DEBUG, message, meta);
  },

  info(message: string, meta?: Record<string, unknown>): void {
    write(LogLevel.INFO, message, meta);
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    write(LogLevel.WARN, message, meta);
  },

  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    write(LogLevel.ERROR, message, meta, error);
  },
};
