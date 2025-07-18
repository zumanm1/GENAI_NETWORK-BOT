import { v4 as uuidv4 } from "uuid";
import { NodeSSH } from "node-ssh";
import { logger } from "../utils/logger";
import { config } from "../config/config";
import {
  NetworkDevice,
  ConnectionInfo,
  DeviceConnectionResult,
} from "../types";

export class NetworkOperations {
  private devices: Map<string, NetworkDevice> = new Map();
  private activeConnections: Map<
    string,
    ConnectionInfo & { connection?: NodeSSH }
  > = new Map();
  private connectionHistory: Array<{
    deviceId: string;
    deviceName: string;
    action: "connect" | "disconnect";
    timestamp: string;
    success: boolean;
  }> = [];

  constructor() {
    this.loadDemoDevices();
  }

  private loadDemoDevices(): void {
    const demoDevices: Omit<NetworkDevice, "id" | "createdAt">[] = [
      {
        name: "Core-Switch-01",
        ip: "192.168.1.10",
        deviceType: "cisco_ios",
        status: "online",
        lastSeen: "2 min ago",
      },
      {
        name: "Router-WAN-01",
        ip: "192.168.1.1",
        deviceType: "cisco_ios",
        status: "online",
        lastSeen: "1 min ago",
      },
      {
        name: "Access-Switch-02",
        ip: "192.168.1.20",
        deviceType: "cisco_ios",
        status: "warning",
        lastSeen: "15 min ago",
      },
      {
        name: "Firewall-01",
        ip: "192.168.1.5",
        deviceType: "cisco_asa",
        status: "offline",
        lastSeen: "2 hours ago",
      },
    ];

    demoDevices.forEach((deviceData, index) => {
      const device: NetworkDevice = {
        ...deviceData,
        id: (index + 1).toString(),
        createdAt: new Date().toISOString(),
      };
      this.devices.set(device.id, device);
    });

    logger.info(`Loaded ${demoDevices.length} demo devices`);
  }

  getAllDevices(): NetworkDevice[] {
    return Array.from(this.devices.values()).map((device) => ({
      ...device,
      password: device.password ? "*".repeat(device.password.length) : "",
      enablePassword: device.enablePassword
        ? "*".repeat(device.enablePassword.length)
        : "",
    }));
  }

  getDeviceInfo(deviceId: string): NetworkDevice | null {
    const device = this.devices.get(deviceId);
    if (!device) return null;

    return {
      ...device,
      password: device.password ? "*".repeat(device.password.length) : "",
      enablePassword: device.enablePassword
        ? "*".repeat(device.enablePassword.length)
        : "",
    };
  }

  addDevice(deviceData: Partial<NetworkDevice>): NetworkDevice {
    const typeMapping: Record<string, string> = {
      Router: "cisco_ios",
      Switch: "cisco_ios",
      Firewall: "cisco_asa",
      "Access Point": "cisco_wlc",
    };

    const device: NetworkDevice = {
      id: deviceData.id || uuidv4(),
      name: deviceData.name || "",
      ip: deviceData.ip || "",
      deviceType:
        typeMapping[deviceData.deviceType || ""] ||
        deviceData.deviceType ||
        "cisco_ios",
      username: deviceData.username || config.defaultSshUsername,
      password: deviceData.password || config.defaultSshPassword,
      enablePassword: deviceData.enablePassword || config.defaultEnablePassword,
      port: deviceData.port || 22,
      status: deviceData.status || "offline",
      lastSeen: deviceData.lastSeen || "Never",
      createdAt: deviceData.createdAt || new Date().toISOString(),
    };

    this.devices.set(device.id, device);
    logger.info(`Added device: ${device.name} (${device.ip})`);

    return {
      ...device,
      password: device.password ? "*".repeat(device.password.length) : "",
      enablePassword: device.enablePassword
        ? "*".repeat(device.enablePassword.length)
        : "",
    };
  }

  deleteDevice(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    // Disconnect if connected
    if (this.activeConnections.has(deviceId)) {
      this.disconnectFromDevice(deviceId);
    }

    this.devices.delete(deviceId);
    logger.info(`Deleted device: ${device.name}`);
    return true;
  }

  async connectToDevice(
    deviceId: string,
    deviceInfo?: any,
  ): Promise<DeviceConnectionResult> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return { success: false, error: "Device not found" };
    }

    // Check if already connected
    if (this.activeConnections.has(deviceId)) {
      const connectionInfo = this.activeConnections.get(deviceId)!;
      return {
        success: true,
        message: "Already connected",
        connectionType: connectionInfo.connectionType,
      };
    }

    try {
      // For demo purposes, simulate connection
      logger.info(`Simulating connection to ${device.name} (${device.ip})`);

      // Simulate connection delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const connectionInfo: ConnectionInfo = {
        connectedAt: new Date().toISOString(),
        connectionType: "simulated",
        deviceInfo: device,
      };

      this.activeConnections.set(deviceId, connectionInfo);

      // Update device status
      device.status = "online";
      device.lastSeen = "Just now";

      // Log connection history
      this.connectionHistory.push({
        deviceId,
        deviceName: device.name,
        action: "connect",
        timestamp: new Date().toISOString(),
        success: true,
      });

      logger.info(
        `Successfully connected to device: ${device.name} (${device.ip})`,
      );

      return {
        success: true,
        message: "Connected successfully (simulated)",
        connectionType: "simulated",
      };
    } catch (error) {
      const errorMsg = `Connection failed to ${device.name}: ${error}`;
      logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  disconnectFromDevice(deviceId: string): {
    success: boolean;
    message: string;
  } {
    if (!this.activeConnections.has(deviceId)) {
      return { success: true, message: "Device not connected" };
    }

    const connectionInfo = this.activeConnections.get(deviceId)!;

    // Close real connection if it exists
    if (connectionInfo.connection) {
      try {
        connectionInfo.connection.dispose();
      } catch (error) {
        logger.warn(`Error closing connection: ${error}`);
      }
    }

    // Remove from active connections
    this.activeConnections.delete(deviceId);

    // Update device status
    const device = this.devices.get(deviceId);
    if (device) {
      device.status = "offline";
      device.lastSeen = "Just now";
    }

    // Log connection history
    this.connectionHistory.push({
      deviceId,
      deviceName: device?.name || "Unknown",
      action: "disconnect",
      timestamp: new Date().toISOString(),
      success: true,
    });

    logger.info(`Disconnected from device: ${deviceId}`);

    return {
      success: true,
      message: "Disconnected successfully",
    };
  }

  getDeviceStatus(deviceId: string): any {
    const device = this.devices.get(deviceId);
    if (!device) {
      return { status: "unknown", error: "Device not found" };
    }

    const isConnected = this.activeConnections.has(deviceId);
    const connectionInfo = this.activeConnections.get(deviceId);

    return {
      status: device.status,
      lastSeen: device.lastSeen,
      connected: isConnected,
      connectionTime: connectionInfo?.connectedAt,
      connectionType: connectionInfo?.connectionType,
    };
  }

  async applyConfiguration(
    deviceId: string,
    configuration: string,
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    if (!this.activeConnections.has(deviceId)) {
      return { success: false, error: "Device not connected" };
    }

    const device = this.devices.get(deviceId);
    if (!device) {
      return { success: false, error: "Device not found" };
    }

    const connectionInfo = this.activeConnections.get(deviceId)!;

    try {
      // For simulated connections
      if (connectionInfo.connectionType === "simulated") {
        logger.info(`Simulating configuration application to ${device.name}`);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate processing time

        return {
          success: true,
          result: "Configuration applied successfully (simulated)",
        };
      }

      // Real configuration application would go here
      // For now, return simulated success
      return {
        success: true,
        result: "Configuration applied successfully",
      };
    } catch (error) {
      const errorMsg = `Error applying configuration to ${deviceId}: ${error}`;
      logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  getConnectionHistory(): Array<any> {
    return this.connectionHistory.slice(-50); // Return last 50 entries
  }

  getActiveConnections(): Record<string, any> {
    const result: Record<string, any> = {};

    this.activeConnections.forEach((info, deviceId) => {
      const device = this.devices.get(deviceId);
      result[deviceId] = {
        connectedAt: info.connectedAt,
        connectionType: info.connectionType,
        deviceName: device?.name || "Unknown",
      };
    });

    return result;
  }
}
