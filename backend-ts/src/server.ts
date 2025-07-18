import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { logger } from "./utils/logger";
import { config } from "./config/config";
import { deviceRoutes } from "./routes/devices";
import { apiKeyRoutes } from "./routes/apiKeys";
import { setupSocketHandlers } from "./socket/socketHandlers";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = createServer(app);

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: config.corsOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: config.nodeEnv,
  });
});

// API Routes
app.use("/api/devices", deviceRoutes);
app.use("/api/api-keys", apiKeyRoutes);

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = config.port;
const HOST = config.host;

server.listen(PORT, HOST, () => {
  logger.info("=".repeat(50));
  logger.info("AI Network Whisperer Backend (TypeScript) Starting...");
  logger.info(`Host: ${HOST}`);
  logger.info(`Port: ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`CORS Origins: ${config.corsOrigins.join(", ")}`);
  logger.info("=".repeat(50));
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

export { app, server, io };
