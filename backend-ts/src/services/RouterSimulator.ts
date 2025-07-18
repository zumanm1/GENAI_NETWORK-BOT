import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import { LLMIntegration } from "./LLMIntegration";
import { SimulatedRouter, RouterInterface, RouterConfig } from "../types";

export class RouterSimulator {
  private routers: Map<string, SimulatedRouter> = new Map();
  private llmIntegration: LLMIntegration;
  private activeConnections: Map<string, string> = new Map(); // sessionId -> routerId

  constructor(llmIntegration: LLMIntegration) {
    this.llmIntegration = llmIntegration;
    this.initializeDefaultTopology();
    logger.info("Router Simulator initialized");
  }

  private initializeDefaultTopology(): void {
    // Create 4 simulated routers in a typical topology
    const r1 = this.createRouter("R1", "Core Router 1", "192.168.1.1");
    const r2 = this.createRouter("R2", "Core Router 2", "192.168.1.2");
    const r3 = this.createRouter("R3", "Distribution Router 1", "192.168.1.3");
    const r4 = this.createRouter("R4", "Distribution Router 2", "192.168.1.4");

    // Set up basic interfaces and connections
    this.addInterface(r1.id, {
      name: "GigabitEthernet0/0",
      ipAddress: "10.0.0.1",
      subnetMask: "255.255.255.0",
      status: "up",
    });
    this.addInterface(r1.id, {
      name: "GigabitEthernet0/1",
      ipAddress: "10.0.1.1",
      subnetMask: "255.255.255.0",
      status: "up",
    });

    this.addInterface(r2.id, {
      name: "GigabitEthernet0/0",
      ipAddress: "10.0.0.2",
      subnetMask: "255.255.255.0",
      status: "up",
    });
    this.addInterface(r2.id, {
      name: "GigabitEthernet0/1",
      ipAddress: "10.0.2.1",
      subnetMask: "255.255.255.0",
      status: "up",
    });

    this.addInterface(r3.id, {
      name: "GigabitEthernet0/0",
      ipAddress: "10.0.1.2",
      subnetMask: "255.255.255.0",
      status: "up",
    });
    this.addInterface(r3.id, {
      name: "GigabitEthernet0/1",
      ipAddress: "10.0.3.1",
      subnetMask: "255.255.255.0",
      status: "up",
    });

    this.addInterface(r4.id, {
      name: "GigabitEthernet0/0",
      ipAddress: "10.0.2.2",
      subnetMask: "255.255.255.0",
      status: "up",
    });
    this.addInterface(r4.id, {
      name: "GigabitEthernet0/1",
      ipAddress: "10.0.4.1",
      subnetMask: "255.255.255.0",
      status: "up",
    });

    // Add basic configurations
    const basicConfig = `!
hostname {hostname}
!
interface GigabitEthernet0/0
 description Main Interface
 ip address {mainIp} 255.255.255.0
 no shutdown
!
interface GigabitEthernet0/1
 description Secondary Interface
 ip address {secondaryIp} 255.255.255.0
 no shutdown
!
ip route 0.0.0.0 0.0.0.0 {gateway}
!
line con 0
 exec-timeout 0 0
 logging synchronous
!
line vty 0 4
 login local
 transport input ssh
!
end`;

    this.updateRunningConfig(
      r1.id,
      basicConfig
        .replace("{hostname}", "R1")
        .replace("{mainIp}", "10.0.0.1")
        .replace("{secondaryIp}", "10.0.1.1")
        .replace("{gateway}", "10.0.0.2"),
    );

    this.updateRunningConfig(
      r2.id,
      basicConfig
        .replace("{hostname}", "R2")
        .replace("{mainIp}", "10.0.0.2")
        .replace("{secondaryIp}", "10.0.2.1")
        .replace("{gateway}", "10.0.0.1"),
    );

    this.updateRunningConfig(
      r3.id,
      basicConfig
        .replace("{hostname}", "R3")
        .replace("{mainIp}", "10.0.1.2")
        .replace("{secondaryIp}", "10.0.3.1")
        .replace("{gateway}", "10.0.1.1"),
    );

    this.updateRunningConfig(
      r4.id,
      basicConfig
        .replace("{hostname}", "R4")
        .replace("{mainIp}", "10.0.2.2")
        .replace("{secondaryIp}", "10.0.4.1")
        .replace("{gateway}", "10.0.2.1"),
    );

    logger.info("Default router topology initialized with 4 routers");
  }

  public createRouter(
    name: string,
    description: string,
    managementIp: string,
  ): SimulatedRouter {
    const id = uuidv4();
    const router: SimulatedRouter = {
      id,
      name,
      description,
      managementIp,
      status: "online",
      model: "CSR1000v",
      iosVersion: "IOS-XE 17.3.1a",
      interfaces: [],
      runningConfig: "",
      startupConfig: "",
      routingTable: [],
      arpTable: [],
      cpuUsage: 5,
      memoryUsage: 30,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    this.routers.set(id, router);
    logger.info(`Created simulated router: ${name} (${id})`);
    return router;
  }

  public getRouter(routerId: string): SimulatedRouter | undefined {
    return this.routers.get(routerId);
  }

  public getAllRouters(): SimulatedRouter[] {
    return Array.from(this.routers.values());
  }

  public deleteRouter(routerId: string): boolean {
    const router = this.routers.get(routerId);
    if (!router) return false;

    this.routers.delete(routerId);
    logger.info(`Deleted simulated router: ${router.name} (${routerId})`);
    return true;
  }

  public addInterface(
    routerId: string,
    interfaceData: RouterInterface,
  ): boolean {
    const router = this.routers.get(routerId);
    if (!router) return false;

    // Check if interface already exists
    const existingIndex = router.interfaces.findIndex(
      (i) => i.name === interfaceData.name,
    );
    if (existingIndex >= 0) {
      router.interfaces[existingIndex] = interfaceData;
    } else {
      router.interfaces.push(interfaceData);
    }

    router.lastModified = new Date().toISOString();
    logger.info(
      `Added/updated interface ${interfaceData.name} on router ${router.name}`,
    );
    return true;
  }

  public updateRunningConfig(routerId: string, config: string): boolean {
    const router = this.routers.get(routerId);
    if (!router) return false;

    router.runningConfig = config;
    router.lastModified = new Date().toISOString();
    logger.info(`Updated running config for router ${router.name}`);
    return true;
  }

  public saveRunningConfigToStartup(routerId: string): boolean {
    const router = this.routers.get(routerId);
    if (!router) return false;

    router.startupConfig = router.runningConfig;
    router.lastModified = new Date().toISOString();
    logger.info(`Saved running config to startup for router ${router.name}`);
    return true;
  }

  public async executeCommand(
    routerId: string,
    command: string,
    sessionId: string,
  ): Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }> {
    const router = this.routers.get(routerId);
    if (!router) {
      return { success: false, error: "Router not found" };
    }

    try {
      // Record the connection
      this.activeConnections.set(sessionId, routerId);

      // Process the command using LLM
      const prompt = this.buildCommandPrompt(router, command);
      const result = await this.llmIntegration.generateConfiguration(
        prompt,
        "groq",
      );

      if (!result.success || !result.configuration) {
        return {
          success: false,
          error: result.error || "Failed to process command",
        };
      }

      // Handle configuration commands
      if (
        command.trim().toLowerCase().startsWith("conf t") ||
        command.trim().toLowerCase().startsWith("configure terminal")
      ) {
        // Enter configuration mode
        return {
          success: true,
          output:
            "Enter configuration commands, one per line. End with CNTL/Z.",
        };
      }

      // Handle show commands
      if (command.trim().toLowerCase().startsWith("show")) {
        // For show running-config, return the actual config
        if (command.trim().toLowerCase().includes("running-config")) {
          return { success: true, output: router.runningConfig };
        }

        // For show startup-config, return the startup config
        if (command.trim().toLowerCase().includes("startup-config")) {
          return {
            success: true,
            output: router.startupConfig || "startup-config is not set",
          };
        }

        // For show interfaces, return interface info
        if (command.trim().toLowerCase().includes("interfaces")) {
          let output = "";
          router.interfaces.forEach((iface) => {
            output += `${iface.name} is ${iface.status}\n`;
            output += `  Internet address is ${iface.ipAddress}/${iface.subnetMask}\n`;
          });
          return { success: true, output };
        }
      }

      // For write memory or copy running-config startup-config
      if (
        command.trim().toLowerCase() === "write memory" ||
        command.trim().toLowerCase() === "copy running-config startup-config"
      ) {
        this.saveRunningConfigToStartup(routerId);
        return { success: true, output: "Building configuration...\n[OK]" };
      }

      // Return the LLM-generated response for other commands
      return { success: true, output: result.configuration };
    } catch (error) {
      logger.error(
        `Error executing command on router ${router.name}: ${error}`,
      );
      return { success: false, error: String(error) };
    }
  }

  public async applyConfiguration(
    routerId: string,
    config: string,
    sessionId: string,
  ): Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }> {
    const router = this.routers.get(routerId);
    if (!router) {
      return { success: false, error: "Router not found" };
    }

    try {
      // Record the connection
      this.activeConnections.set(sessionId, routerId);

      // Validate the configuration using LLM
      const validationPrompt = `You are a Cisco IOS configuration validator. Validate the following configuration for syntax errors and security issues:\n\n${config}\n\nRespond with a JSON object with properties: 'valid' (boolean), 'issues' (array of strings).`;
      const validationResult = await this.llmIntegration.generateConfiguration(
        validationPrompt,
        "groq",
      );

      if (!validationResult.success || !validationResult.configuration) {
        return {
          success: false,
          error: validationResult.error || "Failed to validate configuration",
        };
      }

      try {
        const validation = JSON.parse(validationResult.configuration);
        if (!validation.valid) {
          return {
            success: false,
            error: `Configuration validation failed: ${validation.issues.join(", ")}`,
          };
        }
      } catch (e) {
        logger.warn(`Could not parse validation result: ${e}`);
        // Continue anyway as this is just a validation step
      }

      // Update the running configuration
      this.updateRunningConfig(routerId, config);

      // Update router state based on configuration
      this.updateRouterStateFromConfig(routerId, config);

      return {
        success: true,
        output: "Configuration applied successfully",
      };
    } catch (error) {
      logger.error(
        `Error applying configuration to router ${router.name}: ${error}`,
      );
      return { success: false, error: String(error) };
    }
  }

  private updateRouterStateFromConfig(routerId: string, config: string): void {
    const router = this.routers.get(routerId);
    if (!router) return;

    // Extract hostname
    const hostnameMatch = config.match(/hostname\s+([\w-]+)/);
    if (hostnameMatch && hostnameMatch[1]) {
      router.name = hostnameMatch[1];
    }

    // Extract interfaces
    const interfaceBlocks = config.split(/interface\s+([\w\/]+)/i);
    for (let i = 1; i < interfaceBlocks.length; i += 2) {
      if (i + 1 < interfaceBlocks.length) {
        const interfaceName = interfaceBlocks[i].trim();
        const interfaceConfig = interfaceBlocks[i + 1].trim();

        // Extract IP address
        const ipMatch = interfaceConfig.match(
          /ip\s+address\s+([\d\.]+)\s+([\d\.]+)/,
        );
        let ipAddress = "";
        let subnetMask = "";
        if (ipMatch && ipMatch.length >= 3) {
          ipAddress = ipMatch[1];
          subnetMask = ipMatch[2];
        }

        // Determine status
        const status = interfaceConfig.includes("shutdown") ? "down" : "up";

        // Update or add interface
        this.addInterface(routerId, {
          name: interfaceName,
          ipAddress,
          subnetMask,
          status,
        });
      }
    }

    // Update last modified timestamp
    router.lastModified = new Date().toISOString();
  }

  private buildCommandPrompt(router: SimulatedRouter, command: string): string {
    return `You are simulating a Cisco IOS router with the following configuration:\n\nHostname: ${router.name}\nIOS Version: ${router.iosVersion}\nModel: ${router.model}\n\nInterfaces:\n${router.interfaces.map((i) => `- ${i.name}: ${i.ipAddress}/${i.subnetMask} (${i.status})`).join("\n")}\n\nThe user has entered the following command:\n${command}\n\nProvide the exact output that would be shown on a real Cisco router. Be accurate and concise, matching the format of real Cisco IOS output. Do not include any explanations or notes outside of the router output.`;
  }

  public getRouterConfig(routerId: string): RouterConfig | undefined {
    const router = this.routers.get(routerId);
    if (!router) return undefined;

    return {
      runningConfig: router.runningConfig,
      startupConfig: router.startupConfig,
    };
  }

  public getActiveConnections(): Map<string, string> {
    return new Map(this.activeConnections);
  }

  public disconnectSession(sessionId: string): boolean {
    return this.activeConnections.delete(sessionId);
  }
}
