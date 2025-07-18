import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import { AIAgentSystem } from "./AIAgentSystem";
import { RouterSimulator } from "./RouterSimulator";
import { NetworkAutomation } from "./NetworkAutomation";
import { AgenticRAG } from "./AgenticRAG";
import { Pipeline, PipelineStage, PipelineStatus } from "../types";

export class PipelineManager {
  private aiAgentSystem: AIAgentSystem;
  private routerSimulator: RouterSimulator;
  private networkAutomation: NetworkAutomation;
  private agenticRAG: AgenticRAG;
  private pipelines: Map<string, Pipeline> = new Map();

  constructor(
    aiAgentSystem: AIAgentSystem,
    routerSimulator: RouterSimulator,
    networkAutomation: NetworkAutomation,
    agenticRAG: AgenticRAG,
  ) {
    this.aiAgentSystem = aiAgentSystem;
    this.routerSimulator = routerSimulator;
    this.networkAutomation = networkAutomation;
    this.agenticRAG = agenticRAG;
    logger.info("Pipeline Manager initialized");
  }

  public async createDeploymentPipeline(
    command: string,
    deviceIds: string[],
    sessionId: string,
  ): Promise<Pipeline> {
    const id = uuidv4();
    const pipeline: Pipeline = {
      id,
      type: "deployment",
      status: "pending",
      progress: 0,
      stages: [
        {
          id: "planning",
          name: "Configuration Planning",
          status: "pending",
          output: null,
        },
        {
          id: "generation",
          name: "Configuration Generation",
          status: "pending",
          output: null,
        },
        {
          id: "testing",
          name: "Pre-deployment Testing",
          status: "pending",
          output: null,
        },
        {
          id: "deployment",
          name: "Deployment Execution",
          status: "pending",
          output: null,
        },
      ],
      input: { command, deviceIds },
      output: null,
      sessionId,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      error: null,
    };

    this.pipelines.set(id, pipeline);
    logger.info(`Created deployment pipeline: ${id}`);

    // Start the pipeline asynchronously
    this.executeDeploymentPipeline(id).catch((error) => {
      logger.error(`Error executing deployment pipeline ${id}: ${error}`);
    });

    return pipeline;
  }

  public async createRetrievalPipeline(
    deviceIds: string[],
    sessionId: string,
  ): Promise<Pipeline> {
    const id = uuidv4();
    const pipeline: Pipeline = {
      id,
      type: "retrieval",
      status: "pending",
      progress: 0,
      stages: [
        {
          id: "discovery",
          name: "Discovery & Connection",
          status: "pending",
          output: null,
        },
        {
          id: "extraction",
          name: "Configuration Extraction",
          status: "pending",
          output: null,
        },
        {
          id: "analysis",
          name: "Analysis & Storage",
          status: "pending",
          output: null,
        },
      ],
      input: { deviceIds },
      output: null,
      sessionId,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      error: null,
    };

    this.pipelines.set(id, pipeline);
    logger.info(`Created retrieval pipeline: ${id}`);

    // Start the pipeline asynchronously
    this.executeRetrievalPipeline(id).catch((error) => {
      logger.error(`Error executing retrieval pipeline ${id}: ${error}`);
    });

    return pipeline;
  }

  private async executeDeploymentPipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline || pipeline.type !== "deployment") return;

    try {
      pipeline.status = "running";
      pipeline.startedAt = new Date().toISOString();
      pipeline.progress = 0;

      const { command, deviceIds } = pipeline.input as {
        command: string;
        deviceIds: string[];
      };

      // Stage 1: Configuration Planning
      await this.updatePipelineStage(pipeline, "planning", "running");

      // Get device info for the first device (for context)
      let deviceInfo = null;
      if (deviceIds.length > 0) {
        const router = this.routerSimulator.getRouter(deviceIds[0]);
        if (router) {
          deviceInfo = {
            name: router.name,
            model: router.model,
            iosVersion: router.iosVersion,
            interfaces: router.interfaces,
          };
        }
      }

      // Use the AI agent system for planning
      const planResult = await this.aiAgentSystem.createTask("configuration", {
        input: command,
        context: deviceInfo ? JSON.stringify(deviceInfo) : undefined,
        metadata: { stage: "planning" },
        priority: 3,
      });

      const planTask = await this.aiAgentSystem.executeTask(planResult.id);

      if (planTask.status !== "completed" || !planTask.output) {
        throw new Error("Configuration planning failed");
      }

      await this.updatePipelineStage(
        pipeline,
        "planning",
        "completed",
        planTask.output,
      );
      pipeline.progress = 25;

      // Stage 2: Configuration Generation
      await this.updatePipelineStage(pipeline, "generation", "running");

      // Parse the plan
      let plan;
      try {
        plan = JSON.parse(planTask.output).plan;
      } catch (error) {
        logger.error(`Error parsing plan: ${error}`);
        plan = ["Generate configuration based on command"];
      }

      // Use the AI agent system for generation
      const generateResult = await this.aiAgentSystem.createTask(
        "configuration",
        {
          input: JSON.stringify({
            command,
            plan,
            deviceInfo,
          }),
          metadata: { stage: "generation" },
          priority: 4,
        },
      );

      const generateTask = await this.aiAgentSystem.executeTask(
        generateResult.id,
      );

      if (generateTask.status !== "completed" || !generateTask.output) {
        throw new Error("Configuration generation failed");
      }

      let configuration;
      try {
        configuration = JSON.parse(generateTask.output).configuration;
      } catch (error) {
        logger.error(`Error parsing configuration: ${error}`);
        configuration = generateTask.output;
      }

      await this.updatePipelineStage(
        pipeline,
        "generation",
        "completed",
        configuration,
      );
      pipeline.progress = 50;

      // Stage 3: Pre-deployment Testing
      await this.updatePipelineStage(pipeline, "testing", "running");

      // Validate the configuration
      const validationResult =
        await this.networkAutomation.validateConfiguration(configuration);

      if (!validationResult.valid) {
        await this.updatePipelineStage(
          pipeline,
          "testing",
          "failed",
          JSON.stringify(validationResult),
        );
        throw new Error(
          `Validation failed: ${validationResult.issues.join(", ")}`,
        );
      }

      await this.updatePipelineStage(
        pipeline,
        "testing",
        "completed",
        JSON.stringify(validationResult),
      );
      pipeline.progress = 75;

      // Stage 4: Deployment Execution
      await this.updatePipelineStage(pipeline, "deployment", "running");

      // Apply the configuration to all devices
      const deploymentResults: Record<string, any> = {};

      for (const deviceId of deviceIds) {
        try {
          const result = await this.networkAutomation.applyConfiguration(
            deviceId,
            configuration,
            pipeline.sessionId,
          );

          deploymentResults[deviceId] = result;

          if (!result.success) {
            logger.error(
              `Deployment failed for device ${deviceId}: ${result.error}`,
            );
          }
        } catch (error) {
          logger.error(`Error deploying to device ${deviceId}: ${error}`);
          deploymentResults[deviceId] = {
            success: false,
            error: String(error),
          };
        }
      }

      const allSuccessful = Object.values(deploymentResults).every(
        (result: any) => result.success,
      );

      if (!allSuccessful) {
        await this.updatePipelineStage(
          pipeline,
          "deployment",
          "failed",
          JSON.stringify(deploymentResults),
        );
        throw new Error("Deployment failed for one or more devices");
      }

      await this.updatePipelineStage(
        pipeline,
        "deployment",
        "completed",
        JSON.stringify(deploymentResults),
      );

      // Complete the pipeline
      pipeline.status = "completed";
      pipeline.progress = 100;
      pipeline.completedAt = new Date().toISOString();
      pipeline.output = { configuration, deploymentResults };

      logger.info(`Deployment pipeline ${pipelineId} completed successfully`);
    } catch (error) {
      pipeline.status = "failed";
      pipeline.error = String(error);
      pipeline.completedAt = new Date().toISOString();
      logger.error(`Deployment pipeline ${pipelineId} failed: ${error}`);
    }
  }

  private async executeRetrievalPipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline || pipeline.type !== "retrieval") return;

    try {
      pipeline.status = "running";
      pipeline.startedAt = new Date().toISOString();
      pipeline.progress = 0;

      const { deviceIds } = pipeline.input as { deviceIds: string[] };

      // Stage 1: Discovery & Connection
      await this.updatePipelineStage(pipeline, "discovery", "running");

      const deviceInfoMap: Record<string, any> = {};

      for (const deviceId of deviceIds) {
        const router = this.routerSimulator.getRouter(deviceId);
        if (router) {
          deviceInfoMap[deviceId] = {
            id: router.id,
            name: router.name,
            model: router.model,
            iosVersion: router.iosVersion,
            managementIp: router.managementIp,
            status: router.status,
          };
        } else {
          deviceInfoMap[deviceId] = { error: "Device not found" };
        }
      }

      await this.updatePipelineStage(
        pipeline,
        "discovery",
        "completed",
        JSON.stringify(deviceInfoMap),
      );
      pipeline.progress = 33;

      // Stage 2: Configuration Extraction
      await this.updatePipelineStage(pipeline, "extraction", "running");

      const configMap: Record<string, any> = {};

      for (const deviceId of deviceIds) {
        try {
          const routerConfig = this.routerSimulator.getRouterConfig(deviceId);
          if (routerConfig) {
            configMap[deviceId] = routerConfig;
          } else {
            configMap[deviceId] = { error: "Failed to retrieve configuration" };
          }
        } catch (error) {
          logger.error(
            `Error extracting config from device ${deviceId}: ${error}`,
          );
          configMap[deviceId] = { error: String(error) };
        }
      }

      await this.updatePipelineStage(
        pipeline,
        "extraction",
        "completed",
        JSON.stringify(configMap),
      );
      pipeline.progress = 66;

      // Stage 3: Analysis & Storage
      await this.updatePipelineStage(pipeline, "analysis", "running");

      const analysisResults: Record<string, any> = {};

      for (const deviceId of deviceIds) {
        try {
          const config = configMap[deviceId]?.runningConfig;
          if (!config) continue;

          // Store in RAG system
          const documentId = await this.agenticRAG.addDocument({
            title: `Configuration for ${deviceInfoMap[deviceId]?.name || deviceId}`,
            content: config,
            metadata: {
              deviceId,
              deviceName: deviceInfoMap[deviceId]?.name,
              timestamp: new Date().toISOString(),
              type: "router_configuration",
            },
          });

          // Generate insights using AI
          const insightsTask = await this.aiAgentSystem.createTask(
            "configuration",
            {
              input: `Analyze the following router configuration and provide insights:\n\n${config}`,
              priority: 2,
            },
          );

          const insightsResult = await this.aiAgentSystem.executeTask(
            insightsTask.id,
          );

          analysisResults[deviceId] = {
            documentId,
            insights: insightsResult.output,
          };
        } catch (error) {
          logger.error(
            `Error analyzing config for device ${deviceId}: ${error}`,
          );
          analysisResults[deviceId] = { error: String(error) };
        }
      }

      await this.updatePipelineStage(
        pipeline,
        "analysis",
        "completed",
        JSON.stringify(analysisResults),
      );

      // Complete the pipeline
      pipeline.status = "completed";
      pipeline.progress = 100;
      pipeline.completedAt = new Date().toISOString();
      pipeline.output = { deviceInfoMap, configMap, analysisResults };

      logger.info(`Retrieval pipeline ${pipelineId} completed successfully`);
    } catch (error) {
      pipeline.status = "failed";
      pipeline.error = String(error);
      pipeline.completedAt = new Date().toISOString();
      logger.error(`Retrieval pipeline ${pipelineId} failed: ${error}`);
    }
  }

  private async updatePipelineStage(
    pipeline: Pipeline,
    stageId: string,
    status: PipelineStage["status"],
    output: string | null = null,
  ): Promise<void> {
    const stage = pipeline.stages.find((s) => s.id === stageId);
    if (stage) {
      stage.status = status;
      stage.output = output;
      logger.info(
        `Pipeline ${pipeline.id} stage ${stageId} updated to ${status}`,
      );
    }
  }

  public getPipeline(pipelineId: string): Pipeline | undefined {
    return this.pipelines.get(pipelineId);
  }

  public getPipelines(filter?: {
    type?: string;
    status?: PipelineStatus;
  }): Pipeline[] {
    let pipelines = Array.from(this.pipelines.values());

    if (filter?.type) {
      pipelines = pipelines.filter((p) => p.type === filter.type);
    }

    if (filter?.status) {
      pipelines = pipelines.filter((p) => p.status === filter.status);
    }

    return pipelines;
  }
}
