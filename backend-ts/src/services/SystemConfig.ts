import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import { config } from "../config/config";
import { SystemConfigSettings } from "../types";

export class SystemConfig {
  private settings: SystemConfigSettings;
  private configListeners: Map<
    string,
    (settings: SystemConfigSettings) => void
  > = new Map();

  constructor() {
    // Initialize with default settings
    this.settings = {
      id: uuidv4(),
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),

      // Router Simulation Settings
      routerSimulation: {
        enabled: true,
        defaultModel: "CSR1000v",
        defaultIosVersion: "IOS-XE 17.3.1a",
        simulationFidelity: "high",
        commandTimeout: 5000,
        maxRouters: 10,
      },

      // Agent Settings
      agents: {
        defaultProvider: config.defaultLLMProvider || "groq",
        defaultModel: config.defaultLLMModel || "llama3-8b-8192",
        memoryEnabled: true,
        maxConcurrentTasks: 5,
        taskTimeout: 30000,
      },

      // RAG Settings
      rag: {
        enabled: true,
        maxDocumentSize: 1000000, // 1MB
        maxResults: 5,
        minRelevanceScore: 0.7,
      },

      // Pipeline Settings
      pipelines: {
        deploymentEnabled: true,
        retrievalEnabled: true,
        maxConcurrentPipelines: 3,
        pipelineTimeout: 300000, // 5 minutes
        autoSaveConfigs: true,
      },

      // Network Automation Settings
      networkAutomation: {
        bulkOperationsEnabled: true,
        maxBulkDevices: 20,
        complianceCheckEnabled: true,
        autoRollback: true,
      },

      // Security Settings
      security: {
        encryptConfigs: true,
        auditLoggingEnabled: true,
        maxLoginAttempts: 5,
        sessionTimeout: 3600, // 1 hour
      },

      // UI Settings
      ui: {
        theme: "system",
        defaultView: "dashboard",
        refreshInterval: 30, // seconds
        maxHistoryItems: 100,
      },
    };

    logger.info("System Configuration initialized");
  }

  public getSettings(): SystemConfigSettings {
    return { ...this.settings };
  }

  public async updateSettings(
    updates: Partial<SystemConfigSettings>,
  ): Promise<SystemConfigSettings> {
    // Merge updates with current settings
    this.settings = {
      ...this.settings,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };

    // Notify all listeners of the change
    this.notifyListeners();

    logger.info("System Configuration updated");
    return this.getSettings();
  }

  public async updateSection<K extends keyof SystemConfigSettings>(
    section: K,
    updates: Partial<SystemConfigSettings[K]>,
  ): Promise<SystemConfigSettings> {
    if (!(section in this.settings)) {
      throw new Error(`Invalid configuration section: ${String(section)}`);
    }

    // Merge updates with current section settings
    this.settings = {
      ...this.settings,
      [section]: {
        ...this.settings[section],
        ...updates,
      },
      lastUpdated: new Date().toISOString(),
    };

    // Notify all listeners of the change
    this.notifyListeners();

    logger.info(`System Configuration section ${String(section)} updated`);
    return this.getSettings();
  }

  public registerChangeListener(
    id: string,
    callback: (settings: SystemConfigSettings) => void,
  ): void {
    this.configListeners.set(id, callback);
  }

  public unregisterChangeListener(id: string): void {
    this.configListeners.delete(id);
  }

  private notifyListeners(): void {
    const settings = this.getSettings();
    for (const callback of this.configListeners.values()) {
      try {
        callback(settings);
      } catch (error) {
        logger.error(`Error in config change listener: ${error}`);
      }
    }
  }

  public async resetToDefaults(): Promise<SystemConfigSettings> {
    // Re-initialize with default settings but keep the same ID
    const currentId = this.settings.id;
    this.settings = new SystemConfig().settings;
    this.settings.id = currentId;
    this.settings.lastUpdated = new Date().toISOString();

    // Notify all listeners of the change
    this.notifyListeners();

    logger.info("System Configuration reset to defaults");
    return this.getSettings();
  }

  public async exportSettings(): Promise<string> {
    return JSON.stringify(this.settings, null, 2);
  }

  public async importSettings(
    settingsJson: string,
  ): Promise<SystemConfigSettings> {
    try {
      const importedSettings = JSON.parse(settingsJson);

      // Validate the imported settings
      if (!importedSettings || typeof importedSettings !== "object") {
        throw new Error("Invalid settings format");
      }

      // Keep the current ID but update everything else
      const currentId = this.settings.id;
      this.settings = {
        ...importedSettings,
        id: currentId,
        lastUpdated: new Date().toISOString(),
      };

      // Notify all listeners of the change
      this.notifyListeners();

      logger.info("System Configuration imported successfully");
      return this.getSettings();
    } catch (error) {
      logger.error(`Error importing settings: ${error}`);
      throw new Error(`Failed to import settings: ${error}`);
    }
  }
}
