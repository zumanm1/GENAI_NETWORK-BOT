import winston from "winston";
import { config } from "../config/config";

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""}`;
  }),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level}: ${message}`;
  }),
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: config.logFile,
      format: logFormat,
    }),

    // Separate file for errors
    new winston.transports.File({
      filename: "error.log",
      level: "error",
      format: logFormat,
    }),
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: "exceptions.log" }),
  ],

  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: "rejections.log" }),
  ],
});

// If we're not in production, log to the console with a simple format
if (config.nodeEnv !== "production") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    }),
  );
}
