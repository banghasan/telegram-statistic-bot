import pino from "pino";
import config from "./config";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: config.bot.mode === "webhook" ? "info" : "debug", // Adjust level based on mode or add explicit config
  transport: !isProduction
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "SYS:standard",
        },
      }
    : undefined,
  base: isProduction ? undefined : { pid: process.pid }, // Remove pid/hostname in prod if strict JSON needed, or keep it.
});

// Helper to create child logger with context
export const createLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};
