import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import { RouterSimulator } from "./RouterSimulator";
import { BulkOperation, BulkOperationStatus, NetworkDevice } from "../types";

export class NetworkAutomation {
  private routerSimulator: RouterSimulator;
  private bulkOperations: Map<string, BulkOperation> = new Map();

  constructor(routerSimulator: RouterSimulator) {
    this.routerSimulator = routerSimulator;
    logger.info("Network Automation Framework initialized");
  }

  public async executeCommand(
    deviceId: string,
    command: string,
    sessionId: string,
  ): Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }> {
    try {
      // For simulated routers, use the router simulator
      return await this.routerSimulator.executeCommand(
        deviceId,
        command,
        sessionId,
      );
    } catch (error) {
      logger.error(`Error executing command on device ${deviceId}: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  public async applyConfiguration(
    deviceId: string,
    config: string,
    sessionId: string,
  ): Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }> {
    try {
      // For simulated routers, use the router simulator
      return await this.routerSimulator.applyConfiguration(
        deviceId,
        config,
        sessionId,
      );
    } catch (error) {
      logger.error(
        `Error applying configuration to device ${deviceId}: ${error}`,
      );
      return { success: false, error: String(error) };
    }
  }

  public async createBulkOperation(
    operationType: "command" | "configuration",
    deviceIds: string[],
    data: string,
    sessionId: string,
  ): Promise<BulkOperation> {
    const id = uuidv4();
    const operation: BulkOperation = {
      id,
      operationType,
      deviceIds,
      data,
      sessionId,
      status: "pending",
      progress: 0,
      results: {},
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      error: null,
    };

    this.bulkOperations.set(id, operation);
    logger.info(
      `Created bulk operation: ${id} for ${deviceIds.length} devices`,
    );

    // Start the operation asynchronously
    this.executeBulkOperation(id).catch((error) => {
      logger.error(`Error executing bulk operation ${id}: ${error}`);
    });

    return operation;
  }

  private async executeBulkOperation(operationId: string): Promise<void> {
    const operation = this.bulkOperations.get(operationId);
    if (!operation) return;

    try {
      operation.status = "running";
      operation.startedAt = new Date().toISOString();

      const totalDevices = operation.deviceIds.length;
      let completedDevices = 0;

      for (const deviceId of operation.deviceIds) {
        try {
          let result;
          if (operation.operationType === "command") {
            result = await this.executeCommand(
              deviceId,
              operation.data,
              operation.sessionId,
            );
          } else {
            result = await this.applyConfiguration(
              deviceId,
              operation.data,
              operation.sessionId,
            );
          }

          operation.results[deviceId] = result;
        } catch (error) {
          operation.results[deviceId] = {
            success: false,
            error: String(error),
          };
        }

        completedDevices++;
        operation.progress = Math.round(
          (completedDevices / totalDevices) * 100,
        );
      }

      operation.status = "completed";
      operation.completedAt = new Date().toISOString();
      logger.info(`Bulk operation ${operationId} completed`);
    } catch (error) {
      operation.status = "failed";
      operation.error = String(error);
      operation.completedAt = new Date().toISOString();
      logger.error(`Bulk operation ${operationId} failed: ${error}`);
    }
  }

  public getBulkOperation(operationId: string): BulkOperation | undefined {
    return this.bulkOperations.get(operationId);
  }

  public getBulkOperations(filter?: {
    status?: BulkOperationStatus;
  }): BulkOperation[] {
    let operations = Array.from(this.bulkOperations.values());

    if (filter?.status) {
      operations = operations.filter((op) => op.status === filter.status);
    }

    return operations;
  }

  public async validateConfiguration(config: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    try {
      // In a real implementation, this would use a tool like PyATS/Genie
      // For now, we'll do some basic validation
      const issues: string[] = [];

      // Check for common syntax errors
      if (
        config.includes("ip address") &&
        !config.match(/ip address [\d\.]+\s+[\d\.]+/)
      ) {
        issues.push("Invalid IP address format");
      }

      if (config.includes("interface") && !config.match(/interface [\w\/]+/)) {
        issues.push("Invalid interface format");
      }

      // Check for security best practices
      if (!config.includes("service password-encryption")) {
        issues.push("Password encryption not enabled");
      }

      if (
        config.includes("enable password") &&
        !config.includes("enable secret")
      ) {
        issues.push("Using 'enable password' instead of 'enable secret'");
      }

      if (
        config.includes("telnet") ||
        config.includes("transport input telnet")
      ) {
        issues.push("Telnet is enabled, which is insecure");
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      logger.error(`Error validating configuration: ${error}`);
      return {
        valid: false,
        issues: [String(error)],
      };
    }
  }

  public async generateComplianceReport(deviceIds: string[]): Promise<{
    compliant: boolean;
    deviceReports: Record<
      string,
      {
        compliant: boolean;
        issues: string[];
      }
    >;
  }> {
    const deviceReports: Record<
      string,
      { compliant: boolean; issues: string[] }
    > = {};
    let overallCompliant = true;

    for (const deviceId of deviceIds) {
      try {
        const router = this.routerSimulator.getRouter(deviceId);
        if (!router) {
          deviceReports[deviceId] = {
            compliant: false,
            issues: ["Device not found"],
          };
          overallCompliant = false;
          continue;
        }

        const config = router.runningConfig;
        const validationResult = await this.validateConfiguration(config);

        deviceReports[deviceId] = {
          compliant: validationResult.valid,
          issues: validationResult.issues,
        };

        if (!validationResult.valid) {
          overallCompliant = false;
        }
      } catch (error) {
        deviceReports[deviceId] = {
          compliant: false,
          issues: [String(error)],
        };
        overallCompliant = false;
      }
    }

    return {
      compliant: overallCompliant,
      deviceReports,
    };
  }
}
