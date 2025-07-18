import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { logger } from "../utils/logger";
import { config } from "../config/config";
import {
  ApiKey,
  ConfigurationResult,
  UsageEntry,
  UsageStatistics,
  NetworkDevice,
} from "../types";

// Import LLM SDKs
let Groq: any;
let OpenAI: any;

try {
  Groq = require("groq-sdk").Groq;
} catch (error) {
  logger.warn("Groq SDK not available");
}

try {
  OpenAI = require("openai").OpenAI;
} catch (error) {
  logger.warn("OpenAI SDK not available");
}

export class LLMIntegration {
  private apiKeys: Map<string, ApiKey> = new Map();
  private usageHistory: UsageEntry[] = [];
  private groqClient: any = null;
  private openaiClient: any = null;

  constructor() {
    this.loadDemoKeys();
    this.initializeClients();
  }

  private loadDemoKeys(): void {
    const demoKeys: Omit<ApiKey, "id" | "createdAt">[] = [
      {
        name: "Groq Production",
        provider: "groq",
        key: "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        model: "llama3-8b-8192",
        isActive: true,
        lastUsed: "2 hours ago",
      },
      {
        name: "Ollama Local",
        provider: "ollama",
        key: "http://localhost:11434",
        model: "llama2",
        isActive: false,
        lastUsed: "1 day ago",
      },
    ];

    demoKeys.forEach((keyData, index) => {
      const apiKey: ApiKey = {
        ...keyData,
        id: (index + 1).toString(),
        createdAt: new Date().toISOString(),
      };
      this.apiKeys.set(apiKey.id, apiKey);
    });

    logger.info(`Loaded ${demoKeys.length} demo API keys`);
  }

  private initializeClients(): void {
    try {
      // Initialize Groq client
      if (Groq && config.groqApiKey) {
        this.groqClient = new Groq({ apiKey: config.groqApiKey });
        logger.info("Groq client initialized");
      }

      // Initialize OpenAI client
      if (OpenAI && config.openaiApiKey) {
        this.openaiClient = new OpenAI({ apiKey: config.openaiApiKey });
        logger.info("OpenAI client initialized");
      }
    } catch (error) {
      logger.error(`Error initializing LLM clients: ${error}`);
    }
  }

  getApiKeys(): ApiKey[] {
    return Array.from(this.apiKeys.values()).map((key) => ({
      ...key,
      key: this.maskKey(key.key),
    }));
  }

  addApiKey(keyData: Partial<ApiKey>): ApiKey {
    const apiKey: ApiKey = {
      id: keyData.id || uuidv4(),
      name: keyData.name || "",
      provider: keyData.provider || "groq",
      key: keyData.key || "",
      model: keyData.model || this.getDefaultModel(keyData.provider || "groq"),
      isActive: keyData.isActive ?? this.apiKeys.size === 0, // First key is active by default
      createdAt: keyData.createdAt || new Date().toISOString(),
      lastUsed: keyData.lastUsed,
    };

    this.apiKeys.set(apiKey.id, apiKey);

    // Reinitialize clients if this is an active key
    if (apiKey.isActive) {
      this.initializeClients();
    }

    logger.info(`Added API key: ${apiKey.name} (${apiKey.provider})`);

    return {
      ...apiKey,
      key: this.maskKey(apiKey.key),
    };
  }

  deleteApiKey(keyId: string): boolean {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) return false;

    this.apiKeys.delete(keyId);
    logger.info(`Deleted API key: ${apiKey.name}`);
    return true;
  }

  private getActiveKeyForProvider(provider: string): ApiKey | null {
    for (const key of this.apiKeys.values()) {
      if (key.provider === provider && key.isActive) {
        return key;
      }
    }
    return null;
  }

  private maskKey(key: string): string {
    if (key.length <= 8) return "*".repeat(key.length);
    return key.substring(0, 4) + "*".repeat(key.length - 8) + key.slice(-4);
  }

  private getDefaultModel(provider: string): string {
    const defaultModels: Record<string, string> = {
      groq: "llama3-8b-8192",
      openai: "gpt-3.5-turbo",
      claude: "claude-3-haiku-20240307",
      ollama: "llama2",
    };
    return defaultModels[provider] || "";
  }

  getAvailableModels(provider: string): string[] {
    const models: Record<string, string[]> = {
      groq: [
        "llama3-8b-8192",
        "llama3-70b-8192",
        "mixtral-8x7b-32768",
        "gemma-7b-it",
        "gemma2-9b-it",
      ],
      openai: [
        "gpt-3.5-turbo",
        "gpt-4",
        "gpt-4-turbo",
        "gpt-4o",
        "gpt-4o-mini",
      ],
      claude: [
        "claude-3-haiku-20240307",
        "claude-3-sonnet-20240229",
        "claude-3-opus-20240229",
      ],
      ollama: [
        "llama2",
        "llama3",
        "codellama",
        "mistral",
        "mixtral",
        "neural-chat",
        "starling-lm",
        "dolphin-mixtral",
      ],
    };
    return models[provider] || [];
  }

  async generateConfiguration(
    command: string,
    provider: string = "groq",
    deviceInfo?: NetworkDevice,
  ): Promise<ConfigurationResult> {
    try {
      // Get the appropriate API key
      const apiKey = this.getActiveKeyForProvider(provider);

      if (!apiKey) {
        return {
          success: false,
          error: `No active API key found for provider: ${provider}`,
        };
      }

      // Prepare the prompt
      const prompt = this.buildConfigurationPrompt(command, deviceInfo);

      let result: ConfigurationResult;

      // Generate configuration based on provider
      switch (provider) {
        case "groq":
          result = await this.generateWithGroq(prompt, apiKey);
          break;
        case "openai":
          result = await this.generateWithOpenAI(prompt, apiKey);
          break;
        case "ollama":
          result = await this.generateWithOllama(prompt, apiKey);
          break;
        default:
          result = this.generateDemoResponse(command, deviceInfo);
      }

      // Log usage
      this.logUsage(provider, command, result.success);

      // Update last used timestamp
      apiKey.lastUsed = new Date().toISOString();

      return result;
    } catch (error) {
      const errorMsg = `Error generating configuration: ${error}`;
      logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  private buildConfigurationPrompt(
    command: string,
    deviceInfo?: NetworkDevice,
  ): string {
    let prompt = `You are a network engineer expert in Cisco IOS configuration. 
Generate a complete, production-ready Cisco IOS configuration based on the following natural language command:

Command: ${command}

`;

    if (deviceInfo) {
      prompt += `Device Information:
- Name: ${deviceInfo.name}
- IP: ${deviceInfo.ip}
- Type: ${deviceInfo.deviceType}

`;
    }

    prompt += `Requirements:
1. Generate only valid Cisco IOS commands
2. Include appropriate comments using '!' character
3. Follow Cisco best practices
4. Include error handling where applicable
5. Ensure configuration is complete and ready to apply

Generate the configuration:`;

    return prompt;
  }

  private async generateWithGroq(
    prompt: string,
    apiKey: ApiKey,
  ): Promise<ConfigurationResult> {
    try {
      let client = this.groqClient;

      if (!client && Groq) {
        client = new Groq({ apiKey: apiKey.key });
      }

      if (!client) {
        return this.generateDemoResponse(prompt);
      }

      const response = await client.chat.completions.create({
        model: apiKey.model || "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content:
              "You are a network engineer expert in Cisco IOS configuration.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      });

      const configuration = response.choices[0].message.content.trim();

      return {
        success: true,
        configuration,
        provider: "groq",
        model: apiKey.model || "llama3-8b-8192",
      };
    } catch (error) {
      logger.error(`Groq API error: ${error}`);
      return this.generateDemoResponse(prompt);
    }
  }

  private async generateWithOpenAI(
    prompt: string,
    apiKey: ApiKey,
  ): Promise<ConfigurationResult> {
    try {
      let client = this.openaiClient;

      if (!client && OpenAI) {
        client = new OpenAI({ apiKey: apiKey.key });
      }

      if (!client) {
        return this.generateDemoResponse(prompt);
      }

      const response = await client.chat.completions.create({
        model: apiKey.model || "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a network engineer expert in Cisco IOS configuration.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      });

      const configuration = response.choices[0].message.content.trim();

      return {
        success: true,
        configuration,
        provider: "openai",
        model: apiKey.model || "gpt-3.5-turbo",
      };
    } catch (error) {
      logger.error(`OpenAI API error: ${error}`);
      return this.generateDemoResponse(prompt);
    }
  }

  private async generateWithOllama(
    prompt: string,
    apiKey: ApiKey,
  ): Promise<ConfigurationResult> {
    try {
      const ollamaUrl = apiKey.key.startsWith("http")
        ? apiKey.key
        : config.ollamaBaseUrl;

      const response = await axios.post(
        `${ollamaUrl}/api/generate`,
        {
          model: apiKey.model || config.ollamaModel,
          prompt,
          stream: false,
        },
        { timeout: 30000 },
      );

      if (response.status === 200) {
        const configuration = response.data.response?.trim() || "";

        return {
          success: true,
          configuration,
          provider: "ollama",
          model: apiKey.model || config.ollamaModel,
        };
      } else {
        logger.error(`Ollama API error: ${response.status}`);
        return this.generateDemoResponse(prompt);
      }
    } catch (error) {
      logger.error(`Ollama API error: ${error}`);
      return this.generateDemoResponse(prompt);
    }
  }

  private generateDemoResponse(
    command: string,
    deviceInfo?: NetworkDevice,
  ): ConfigurationResult {
    logger.info("Generating demo configuration response");

    const demoConfigs: Record<string, string> = {
      interface: `! Interface Configuration
interface GigabitEthernet0/1
 description WAN Connection
 ip address 192.168.1.1 255.255.255.0
 no shutdown
!
interface GigabitEthernet0/2
 description LAN Connection
 ip address 10.0.1.1 255.255.255.0
 no shutdown
!`,
      routing: `! OSPF Routing Configuration
router ospf 1
 network 192.168.1.0 0.0.0.255 area 0
 network 10.0.1.0 0.0.0.255 area 0
!
ip route 0.0.0.0 0.0.0.0 192.168.1.254
!`,
      vlan: `! VLAN Configuration
vlan 10
 name USERS
vlan 20
 name SERVERS
vlan 30
 name MANAGEMENT
!
interface vlan 10
 ip address 10.0.10.1 255.255.255.0
 no shutdown
!`,
      acl: `! Access Control List
ip access-list extended BLOCK_TELNET
 deny tcp any any eq 23
 permit ip any any
!
interface GigabitEthernet0/1
 ip access-group BLOCK_TELNET in
!`,
    };

    const commandLower = command.toLowerCase();
    let config: string;

    if (
      commandLower.includes("interface") ||
      commandLower.includes("ip address")
    ) {
      config = demoConfigs.interface;
    } else if (
      commandLower.includes("routing") ||
      commandLower.includes("ospf") ||
      commandLower.includes("route")
    ) {
      config = demoConfigs.routing;
    } else if (commandLower.includes("vlan")) {
      config = demoConfigs.vlan;
    } else if (
      commandLower.includes("acl") ||
      commandLower.includes("access-list")
    ) {
      config = demoConfigs.acl;
    } else {
      config = `! Generated Configuration for: ${command}
! Device: ${deviceInfo?.name || "Unknown"}
!
interface GigabitEthernet0/1
 description Generated Interface
 ip address 192.168.1.1 255.255.255.0
 no shutdown
!
router ospf 1
 network 192.168.1.0 0.0.0.255 area 0
!
ip route 0.0.0.0 0.0.0.0 192.168.1.254
!`;
    }

    return {
      success: true,
      configuration: config,
      provider: "demo",
      model: "demo-generator",
    };
  }

  private logUsage(provider: string, command: string, success: boolean): void {
    const usageEntry: UsageEntry = {
      timestamp: new Date().toISOString(),
      provider,
      command:
        command.length > 100 ? command.substring(0, 100) + "..." : command,
      success,
    };

    this.usageHistory.push(usageEntry);

    // Keep only last 100 entries
    if (this.usageHistory.length > 100) {
      this.usageHistory = this.usageHistory.slice(-100);
    }
  }

  getUsageStatistics(): UsageStatistics {
    if (this.usageHistory.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        successRate: 0,
        providers: {},
        recentActivity: [],
      };
    }

    const totalRequests = this.usageHistory.length;
    const successfulRequests = this.usageHistory.filter(
      (entry) => entry.success,
    ).length;
    const successRate = (successfulRequests / totalRequests) * 100;

    // Provider statistics
    const providers: Record<
      string,
      { requests: number; successes: number; successRate: number }
    > = {};

    this.usageHistory.forEach((entry) => {
      if (!providers[entry.provider]) {
        providers[entry.provider] = {
          requests: 0,
          successes: 0,
          successRate: 0,
        };
      }
      providers[entry.provider].requests++;
      if (entry.success) {
        providers[entry.provider].successes++;
      }
    });

    // Calculate success rates for each provider
    Object.values(providers).forEach((providerStats) => {
      providerStats.successRate =
        providerStats.requests > 0
          ? (providerStats.successes / providerStats.requests) * 100
          : 0;
    });

    return {
      totalRequests,
      successfulRequests,
      successRate: Math.round(successRate * 100) / 100,
      providers,
      recentActivity: this.usageHistory.slice(-10),
    };
  }
}
