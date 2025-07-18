import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import { NetworkOperations } from "../services/NetworkOperations";
import { LLMIntegration } from "../services/LLMIntegration";

interface ActiveSession {
  sessionId: string;
  connectedAt: string;
  selectedDevice: string | null;
}

const activeSessions: Map<string, ActiveSession> = new Map();
const networkOps = new NetworkOperations();
const llmIntegration = new LLMIntegration();

export const setupSocketHandlers = (io: Server): void => {
  io.on("connection", (socket: Socket) => {
    const sessionId = uuidv4();
    activeSessions.set(socket.id, {
      sessionId,
      connectedAt: new Date().toISOString(),
      selectedDevice: null,
    });

    logger.info(`Client connected: ${socket.id}`);

    socket.emit("connected", {
      session_id: sessionId,
      message: "Connected to AI Network Whisperer Backend (TypeScript)",
    });

    // Handle device selection
    socket.on("select_device", (data: { device_id: string }) => {
      try {
        const { device_id } = data;
        const session = activeSessions.get(socket.id);

        if (session) {
          session.selectedDevice = device_id;
        }

        socket.emit("device_selected", {
          success: true,
          device_id,
          message: `Device ${device_id} selected`,
        });

        logger.info(`Device ${device_id} selected by ${socket.id}`);
      } catch (error) {
        logger.error(`Error selecting device: ${error}`);
        socket.emit("error", { message: String(error) });
      }
    });

    // Handle device connection
    socket.on(
      "connect_device",
      async (data: { device_id: string; device_info?: any }) => {
        try {
          const { device_id, device_info } = data;

          const connectionResult = await networkOps.connectToDevice(
            device_id,
            device_info,
          );

          if (connectionResult.success) {
            socket.emit("device_connected", {
              success: true,
              device_id,
              connection_info: connectionResult,
            });
          } else {
            socket.emit("device_connection_failed", {
              success: false,
              device_id,
              error: connectionResult.error || "Unknown error",
            });
          }

          logger.info(
            `Device connection attempt for ${device_id}: ${connectionResult.success}`,
          );
        } catch (error) {
          logger.error(`Error connecting to device: ${error}`);
          socket.emit("error", { message: String(error) });
        }
      },
    );

    // Handle device disconnection
    socket.on("disconnect_device", (data: { device_id: string }) => {
      try {
        const { device_id } = data;

        const disconnectResult = networkOps.disconnectFromDevice(device_id);

        socket.emit("device_disconnected", {
          success: disconnectResult.success,
          device_id,
          message: disconnectResult.message,
        });

        logger.info(`Device ${device_id} disconnected`);
      } catch (error) {
        logger.error(`Error disconnecting device: ${error}`);
        socket.emit("error", { message: String(error) });
      }
    });

    // Handle configuration generation
    socket.on(
      "generate_config",
      async (data: {
        command: string;
        provider: string;
        device_id?: string;
      }) => {
        try {
          const { command, provider, device_id } = data;

          if (!command.trim()) {
            socket.emit("error", { message: "Command cannot be empty" });
            return;
          }

          // Get device info if available
          let deviceInfo;
          if (device_id) {
            deviceInfo = networkOps.getDeviceInfo(device_id);
          }

          // Generate configuration using LLM
          socket.emit("config_generation_started", {
            message: "Generating configuration...",
            provider,
          });

          const configResult = await llmIntegration.generateConfiguration(
            command,
            provider,
            deviceInfo || undefined,
          );

          if (configResult.success) {
            socket.emit("config_generated", {
              success: true,
              configuration: configResult.configuration,
              provider,
              command,
              device_id,
            });
          } else {
            socket.emit("config_generation_failed", {
              success: false,
              error: configResult.error || "Failed to generate configuration",
              provider,
            });
          }

          logger.info(
            `Configuration generation for command '${command}' using ${provider}: ${configResult.success}`,
          );
        } catch (error) {
          logger.error(`Error generating configuration: ${error}`);
          socket.emit("error", { message: String(error) });
        }
      },
    );

    // Handle configuration application
    socket.on(
      "apply_config",
      async (data: { configuration: string; device_id: string }) => {
        try {
          const { configuration, device_id } = data;

          if (!device_id) {
            socket.emit("error", { message: "No device selected" });
            return;
          }

          // Apply configuration to device
          socket.emit("config_application_started", {
            message: "Applying configuration to device...",
            device_id,
          });

          const applyResult = await networkOps.applyConfiguration(
            device_id,
            configuration,
          );

          if (applyResult.success) {
            socket.emit("config_applied", {
              success: true,
              device_id,
              result: applyResult.result,
              message: "Configuration applied successfully",
            });
          } else {
            socket.emit("config_application_failed", {
              success: false,
              device_id,
              error: applyResult.error || "Failed to apply configuration",
            });
          }

          logger.info(
            `Configuration application to device ${device_id}: ${applyResult.success}`,
          );
        } catch (error) {
          logger.error(`Error applying configuration: ${error}`);
          socket.emit("error", { message: String(error) });
        }
      },
    );

    // Handle device status request
    socket.on("get_device_status", (data: { device_id: string }) => {
      try {
        const { device_id } = data;

        if (!device_id) {
          socket.emit("error", { message: "Device ID required" });
          return;
        }

        const status = networkOps.getDeviceStatus(device_id);

        socket.emit("device_status", {
          device_id,
          status,
          connected: status.connected,
        });
      } catch (error) {
        logger.error(`Error getting device status: ${error}`);
        socket.emit("error", { message: String(error) });
      }
    });

    // Handle configuration push to dummy router
    socket.on(
      "push_config_to_dummy",
      async (data: { configuration: string; device_id: string }) => {
        try {
          const { configuration, device_id } = data;

          if (!device_id) {
            socket.emit("error", { message: "No device selected" });
            return;
          }

          if (!configuration.trim()) {
            socket.emit("error", { message: "Configuration cannot be empty" });
            return;
          }

          // Start push process
          socket.emit("config_push_started", {
            message: "Pushing configuration to dummy router...",
            device_id,
          });

          const pushResult = await networkOps.pushConfigurationToDummyRouter(
            device_id,
            configuration,
          );

          if (pushResult.success) {
            socket.emit("config_pushed_to_dummy", {
              success: true,
              device_id,
              result: pushResult.result,
              steps: pushResult.steps,
              message: "Configuration pushed successfully to dummy router",
            });
          } else {
            socket.emit("config_push_failed", {
              success: false,
              device_id,
              error: pushResult.error || "Failed to push configuration",
            });
          }

          logger.info(
            `Configuration push to dummy router ${device_id}: ${pushResult.success}`,
          );
        } catch (error) {
          logger.error(`Error pushing configuration to dummy router: ${error}`);
          socket.emit("error", { message: String(error) });
        }
      },
    );

    // Handle configuration retrieval from dummy router
    socket.on(
      "retrieve_config_from_dummy",
      async (data: { device_id: string }) => {
        try {
          const { device_id } = data;

          if (!device_id) {
            socket.emit("error", { message: "No device selected" });
            return;
          }

          // Start retrieval process
          socket.emit("config_retrieval_started", {
            message: "Retrieving configuration from dummy router...",
            device_id,
          });

          const retrievalResult =
            await networkOps.retrieveConfigurationFromDummyRouter(device_id);

          if (retrievalResult.success) {
            socket.emit("config_retrieved_from_dummy", {
              success: true,
              device_id,
              configuration: retrievalResult.configuration,
              message: "Configuration retrieved successfully from dummy router",
            });
          } else {
            socket.emit("config_retrieval_failed", {
              success: false,
              device_id,
              error:
                retrievalResult.error || "Failed to retrieve configuration",
            });
          }

          logger.info(
            `Configuration retrieval from dummy router ${device_id}: ${retrievalResult.success}`,
          );
        } catch (error) {
          logger.error(
            `Error retrieving configuration from dummy router: ${error}`,
          );
          socket.emit("error", { message: String(error) });
        }
      },
    );

    // Handle dummy router status request
    socket.on("get_dummy_router_status", (data: { device_id: string }) => {
      try {
        const { device_id } = data;

        if (!device_id) {
          socket.emit("error", { message: "Device ID required" });
          return;
        }

        const dummyStatus = networkOps.getDummyRouterStatus(device_id);

        socket.emit("dummy_router_status", {
          device_id,
          status: dummyStatus,
        });
      } catch (error) {
        logger.error(`Error getting dummy router status: ${error}`);
        socket.emit("error", { message: String(error) });
      }
    });

    // Handle client disconnection
    socket.on("disconnect", () => {
      activeSessions.delete(socket.id);
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
};
