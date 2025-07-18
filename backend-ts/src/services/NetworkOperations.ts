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
  private dummyRouterConfigs: Map<string, string> = new Map();
  private configPushHistory: Array<{
    deviceId: string;
    deviceName: string;
    configuration: string;
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

  async pushConfigurationToDummyRouter(
    deviceId: string,
    configuration: string,
  ): Promise<{
    success: boolean;
    result?: string;
    error?: string;
    steps?: Array<any>;
  }> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return { success: false, error: "Device not found" };
    }

    if (!this.activeConnections.has(deviceId)) {
      return { success: false, error: "Device not connected" };
    }

    try {
      logger.info(`Pushing configuration to dummy router: ${device.name}`);

      // Simulate configuration push steps
      const steps = [
        {
          step: 1,
          action: "Connecting to device",
          status: "completed",
          timestamp: new Date().toISOString(),
        },
        {
          step: 2,
          action: "Entering configuration mode",
          status: "completed",
          timestamp: new Date().toISOString(),
        },
        {
          step: 3,
          action: "Applying configuration",
          status: "in-progress",
          timestamp: new Date().toISOString(),
        },
      ];

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 2000));

      steps[2].status = "completed";
      steps.push(
        {
          step: 4,
          action: "Saving configuration",
          status: "completed",
          timestamp: new Date().toISOString(),
        },
        {
          step: 5,
          action: "Verifying configuration",
          status: "completed",
          timestamp: new Date().toISOString(),
        },
      );

      // Store the configuration in dummy router
      this.dummyRouterConfigs.set(deviceId, configuration);

      // Log the push history
      this.configPushHistory.push({
        deviceId,
        deviceName: device.name,
        configuration: configuration.substring(0, 100) + "...",
        timestamp: new Date().toISOString(),
        success: true,
      });

      logger.info(
        `Configuration successfully pushed to dummy router: ${device.name}`,
      );

      return {
        success: true,
        result: "Configuration pushed successfully to dummy router",
        steps,
      };
    } catch (error) {
      const errorMsg = `Error pushing configuration to dummy router ${deviceId}: ${error}`;
      logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  async retrieveConfigurationFromDummyRouter(
    deviceId: string,
  ): Promise<{ success: boolean; configuration?: string; error?: string }> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return { success: false, error: "Device not found" };
    }

    if (!this.activeConnections.has(deviceId)) {
      return { success: false, error: "Device not connected" };
    }

    try {
      logger.info(`Retrieving configuration from dummy router: ${device.name}`);

      // Simulate retrieval delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const storedConfig = this.dummyRouterConfigs.get(deviceId);

      if (!storedConfig) {
        // Return a default configuration if none exists
        const defaultConfig = `! Current configuration for ${device.name}\n! Generated by AI Network Whisperer\n!\nhostname ${device.name}\n!\ninterface GigabitEthernet0/0\n description WAN Interface\n ip address ${device.ip} 255.255.255.0\n no shutdown\n!\nrouter ospf 1\n network ${device.ip.split(".").slice(0, 3).join(".")}.0 0.0.0.255 area 0\n!\nend`;

        return {
          success: true,
          configuration: defaultConfig,
        };
      }

      logger.info(`Configuration retrieved from dummy router: ${device.name}`);

      return {
        success: true,
        configuration: storedConfig,
      };
    } catch (error) {
      const errorMsg = `Error retrieving configuration from dummy router ${deviceId}: ${error}`;
      logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  getConfigPushHistory(): Array<any> {
    return this.configPushHistory.slice(-20); // Return last 20 entries
  }

  getDummyRouterStatus(deviceId: string): any {
    const device = this.devices.get(deviceId);
    const hasConfig = this.dummyRouterConfigs.has(deviceId);
    const isConnected = this.activeConnections.has(deviceId);

    return {
      deviceId,
      deviceName: device?.name || "Unknown",
      hasStoredConfig: hasConfig,
      connected: isConnected,
      configSize: hasConfig
        ? this.dummyRouterConfigs.get(deviceId)?.length || 0
        : 0,
    };
  }
}
