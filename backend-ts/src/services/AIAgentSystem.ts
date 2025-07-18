import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";
import { config } from "../config/config";
import { LLMIntegration } from "./LLMIntegration";
import { MemoryManager } from "./MemoryManager";
import { AgentTask, AgentType, AgentMemory } from "../types";

export class AIAgentSystem {
  private llmIntegration: LLMIntegration;
  private memoryManager: MemoryManager;
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, AgentTask> = new Map();

  constructor(llmIntegration: LLMIntegration, memoryManager: MemoryManager) {
    this.llmIntegration = llmIntegration;
    this.memoryManager = memoryManager;
    this.initializeAgents();
    logger.info("AI Agent System initialized");
  }

  private initializeAgents(): void {
    // Create default agents
    this.createAgent("configuration", "Configuration Agent");
    this.createAgent("validation", "Validation Agent");
    this.createAgent("troubleshooting", "Troubleshooting Agent");
    this.createAgent("deployment", "Deployment Agent");
  }

  private createAgent(type: AgentType, name: string): Agent {
    const id = uuidv4();
    const agent = new Agent(
      id,
      type,
      name,
      this.llmIntegration,
      this.memoryManager,
    );
    this.agents.set(id, agent);
    return agent;
  }

  public getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  public getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  public getAgentByType(type: AgentType): Agent | undefined {
    return Array.from(this.agents.values()).find(
      (agent) => agent.type === type,
    );
  }

  public async createTask(
    agentType: AgentType,
    taskData: {
      input: string;
      context?: string;
      priority?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<AgentTask> {
    const agent = this.getAgentByType(agentType);
    if (!agent) {
      throw new Error(`No agent found for type: ${agentType}`);
    }

    const task: AgentTask = {
      id: uuidv4(),
      agentId: agent.id,
      agentType,
      status: "pending",
      input: taskData.input,
      context: taskData.context || "",
      priority: taskData.priority || 1,
      metadata: taskData.metadata || {},
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      output: null,
      error: null,
    };

    this.tasks.set(task.id, task);
    logger.info(`Task created: ${task.id} for agent: ${agent.name}`);

    // If priority is high, execute immediately
    if (task.priority >= 5) {
      this.executeTask(task.id);
    }

    return task;
  }

  public async executeTask(taskId: string): Promise<AgentTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const agent = this.agents.get(task.agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${task.agentId}`);
    }

    try {
      task.status = "running";
      task.startedAt = new Date().toISOString();

      logger.info(`Executing task: ${taskId} with agent: ${agent.name}`);

      // Execute the task with the agent
      const result = await agent.executeTask(task);

      // Update task with results
      task.output = result;
      task.status = "completed";
      task.completedAt = new Date().toISOString();

      logger.info(`Task completed: ${taskId}`);
      return task;
    } catch (error) {
      task.status = "failed";
      task.error = String(error);
      task.completedAt = new Date().toISOString();

      logger.error(`Task failed: ${taskId} - ${error}`);
      return task;
    }
  }

  public getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  public getTasks(filter?: { agentId?: string; status?: string }): AgentTask[] {
    let tasks = Array.from(this.tasks.values());

    if (filter?.agentId) {
      tasks = tasks.filter((task) => task.agentId === filter.agentId);
    }

    if (filter?.status) {
      tasks = tasks.filter((task) => task.status === filter.status);
    }

    return tasks;
  }

  public async orchestrateConfigurationPipeline(
    command: string,
    deviceInfo?: any,
  ): Promise<{
    success: boolean;
    configuration?: string;
    validationResults?: any;
    error?: string;
  }> {
    try {
      // Step 1: Configuration Planning with Configuration Agent
      const planTask = await this.createTask("configuration", {
        input: command,
        context: JSON.stringify(deviceInfo || {}),
        priority: 3,
        metadata: { stage: "planning" },
      });

      await this.executeTask(planTask.id);

      if (planTask.status !== "completed" || !planTask.output) {
        throw new Error("Configuration planning failed");
      }

      const planOutput = JSON.parse(planTask.output);

      // Step 2: Configuration Generation
      const generateTask = await this.createTask("configuration", {
        input: JSON.stringify({
          command,
          plan: planOutput.plan,
          deviceInfo,
        }),
        priority: 4,
        metadata: { stage: "generation" },
      });

      await this.executeTask(generateTask.id);

      if (generateTask.status !== "completed" || !generateTask.output) {
        throw new Error("Configuration generation failed");
      }

      const generationOutput = JSON.parse(generateTask.output);
      const configuration = generationOutput.configuration;

      // Step 3: Configuration Validation
      const validateTask = await this.createTask("validation", {
        input: configuration,
        context: JSON.stringify(deviceInfo || {}),
        priority: 3,
        metadata: { stage: "validation" },
      });

      await this.executeTask(validateTask.id);

      if (validateTask.status !== "completed" || !validateTask.output) {
        throw new Error("Configuration validation failed");
      }

      const validationOutput = JSON.parse(validateTask.output);

      if (!validationOutput.valid) {
        return {
          success: false,
          error: `Validation failed: ${validationOutput.issues.join(", ")}`,
        };
      }

      return {
        success: true,
        configuration,
        validationResults: validationOutput,
      };
    } catch (error) {
      logger.error(`Configuration pipeline error: ${error}`);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  public async troubleshootConfiguration(
    configuration: string,
    errorMessage: string,
    deviceInfo?: any,
  ): Promise<{
    success: boolean;
    diagnosis?: string;
    suggestedFix?: string;
    error?: string;
  }> {
    try {
      const troubleshootTask = await this.createTask("troubleshooting", {
        input: JSON.stringify({
          configuration,
          errorMessage,
          deviceInfo,
        }),
        priority: 4,
      });

      await this.executeTask(troubleshootTask.id);

      if (troubleshootTask.status !== "completed" || !troubleshootTask.output) {
        throw new Error("Troubleshooting failed");
      }

      const output = JSON.parse(troubleshootTask.output);

      return {
        success: true,
        diagnosis: output.diagnosis,
        suggestedFix: output.suggestedFix,
      };
    } catch (error) {
      logger.error(`Troubleshooting error: ${error}`);
      return {
        success: false,
        error: String(error),
      };
    }
  }
}

class Agent {
  public id: string;
  public type: AgentType;
  public name: string;
  private llmIntegration: LLMIntegration;
  private memoryManager: MemoryManager;
  private memory: AgentMemory = {
    shortTerm: [],
    longTerm: [],
  };

  constructor(
    id: string,
    type: AgentType,
    name: string,
    llmIntegration: LLMIntegration,
    memoryManager: MemoryManager,
  ) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.llmIntegration = llmIntegration;
    this.memoryManager = memoryManager;
  }

  public async executeTask(task: AgentTask): Promise<string> {
    // Get relevant memories for context
    const memories = await this.memoryManager.retrieveMemories(
      this.id,
      task.input,
    );

    // Build the prompt based on agent type
    const prompt = this.buildPrompt(task, memories);

    // Use LLM to process the task
    const result = await this.processWithLLM(prompt, task);

    // Store the interaction in memory
    await this.memoryManager.storeMemory(this.id, {
      input: task.input,
      output: result,
      timestamp: new Date().toISOString(),
      metadata: task.metadata,
    });

    return result;
  }

  private buildPrompt(task: AgentTask, memories: any[]): string {
    let prompt = "";

    // Add agent-specific instructions
    switch (this.type) {
      case "configuration":
        prompt = `You are a Cisco IOS Configuration Expert. Your task is to generate optimal, secure, and efficient network configurations.
\n\nTask: ${task.input}\n\n`;
        if (task.metadata?.stage === "planning") {
          prompt +=
            "Create a detailed plan for implementing this configuration. Return your response as a JSON object with a 'plan' property containing an array of steps.";
        } else if (task.metadata?.stage === "generation") {
          prompt +=
            "Generate the complete Cisco IOS configuration based on the provided plan and requirements. Return your response as a JSON object with a 'configuration' property containing the full configuration as a string.";
        }
        break;

      case "validation":
        prompt = `You are a Cisco IOS Configuration Validator. Your task is to validate network configurations for syntax errors, security issues, and best practices.
\n\nConfiguration to validate:\n${task.input}\n\nValidate this configuration and return your response as a JSON object with properties: 'valid' (boolean), 'issues' (array of strings), and 'suggestions' (array of strings).`;
        break;

      case "troubleshooting":
        prompt = `You are a Network Troubleshooting Expert. Your task is to diagnose and fix issues in network configurations.
\n\nInput: ${task.input}\n\nAnalyze the configuration and error message. Return your response as a JSON object with properties: 'diagnosis' (string) and 'suggestedFix' (string).`;
        break;

      case "deployment":
        prompt = `You are a Network Deployment Specialist. Your task is to plan and execute the deployment of network configurations.
\n\nInput: ${task.input}\n\nCreate a deployment plan and return your response as a JSON object with properties: 'steps' (array of deployment steps), 'rollbackPlan' (array of rollback steps), and 'verificationSteps' (array of verification steps).`;
        break;
    }

    // Add context if available
    if (task.context) {
      prompt += `\n\nContext: ${task.context}`;
    }

    // Add relevant memories for context
    if (memories.length > 0) {
      prompt += "\n\nRelevant past interactions:";
      memories.forEach((memory, index) => {
        prompt += `\n${index + 1}. Input: ${memory.input}\n   Output: ${memory.output}`;
      });
    }

    return prompt;
  }

  private async processWithLLM(
    prompt: string,
    task: AgentTask,
  ): Promise<string> {
    try {
      // Use the LLM integration to process the prompt
      const provider = config.defaultLLMProvider || "groq";
      const result = await this.llmIntegration.generateConfiguration(
        prompt,
        provider,
      );

      if (!result.success || !result.configuration) {
        throw new Error(result.error || "Failed to process with LLM");
      }

      return result.configuration;
    } catch (error) {
      logger.error(`Agent ${this.name} LLM processing error: ${error}`);
      throw error;
    }
  }
}
