import { Request, Response, NextFunction } from "express";
import { config } from "../config/config";
import { logger } from "../utils/logger";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore: Map<string, RateLimitEntry> = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute

export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const clientId = req.ip || "unknown";
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Clean up old entries
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < windowStart) {
      rateLimitStore.delete(key);
    }
  }

  // Get or create entry for this client
  let entry = rateLimitStore.get(clientId);
  if (!entry || entry.resetTime < windowStart) {
    entry = {
      count: 0,
      resetTime: now + WINDOW_MS,
    };
    rateLimitStore.set(clientId, entry);
  }

  // Increment request count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > config.rateLimitPerMinute) {
    logger.warn(`Rate limit exceeded for client: ${clientId}`);

    res.status(429).json({
      success: false,
      error: "Too many requests. Please try again later.",
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    });
    return;
  }

  // Add rate limit headers
  res.set({
    "X-RateLimit-Limit": config.rateLimitPerMinute.toString(),
    "X-RateLimit-Remaining": Math.max(
      0,
      config.rateLimitPerMinute - entry.count,
    ).toString(),
    "X-RateLimit-Reset": Math.ceil(entry.resetTime / 1000).toString(),
  });

  next();
};
