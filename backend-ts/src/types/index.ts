export interface NetworkDevice {
  id: string;
  name: string;
  ip: string;
  deviceType: string;
  username?: string;
  password?: string;
  enablePassword?: string;
  port?: number;
  status: "online" | "offline" | "warning";
  lastSeen: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  provider: string;
  key: string;
  model?: string;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
}

export interface ConnectionInfo {
  connectedAt: string;
  connectionType: "ssh" | "telnet" | "simulated";
  deviceInfo: NetworkDevice;
}

export interface ConfigurationResult {
  success: boolean;
  configuration?: string;
  provider?: string;
  model?: string;
  error?: string;
}

export interface DeviceConnectionResult {
  success: boolean;
  message?: string;
  connectionType?: string;
  deviceInfo?: string;
  error?: string;
}

export interface UsageEntry {
  timestamp: string;
  provider: string;
  command: string;
  success: boolean;
}

export interface UsageStatistics {
  totalRequests: number;
  successfulRequests: number;
  successRate: number;
  providers: Record<
    string,
    {
      requests: number;
      successes: number;
      successRate: number;
    }
  >;
  recentActivity: UsageEntry[];
}

// Agent System Types
export interface Agent {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
  status: "idle" | "working" | "error";
  lastAction?: AgentAction;
}

export interface AgentAction {
  id: string;
  agentId: string;
  actionType: string;
  input: any;
  output?: any;
  status: "pending" | "completed" | "failed";
  timestamp: string;
  error?: string;
}

// Memory Manager Types
export interface Memory {
  id: string;
  type: "short_term" | "long_term" | "episodic";
  content: any;
  metadata: Record<string, any>;
  timestamp: string;
  expiresAt?: string;
}

export interface MemorySearchResult {
  memories: Memory[];
  relevanceScores: number[];
}

// Router Simulator Types
export interface SimulatedRouter {
  id: string;
  name: string;
  model: string;
  interfaces: RouterInterface[];
  runningConfig: string;
  startupConfig: string;
  status: "running" | "stopped" | "error";
}

export interface RouterInterface {
  name: string;
  ipAddress?: string;
  subnetMask?: string;
  status: "up" | "down" | "administratively down";
  description?: string;
}

export interface SimulationResult {
  success: boolean;
  output?: string;
  error?: string;
  routerState?: SimulatedRouter;
}

// Network Automation Types
export interface AutomationTask {
  id: string;
  name: string;
  description?: string;
  deviceIds: string[];
  commands: string[];
  schedule?: {
    type: "once" | "recurring";
    startTime: string;
    interval?: string; // for recurring tasks
  };
  status: "pending" | "running" | "completed" | "failed";
  result?: AutomationResult;
}

export interface AutomationResult {
  taskId: string;
  startTime: string;
  endTime?: string;
  deviceResults: Record<
    string,
    {
      success: boolean;
      output?: string;
      error?: string;
    }
  >;
  overallSuccess: boolean;
}

// Pipeline Types
export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  stages: PipelineStage[];
  status: "idle" | "running" | "completed" | "failed";
  createdAt: string;
  lastRun?: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  type: "rag" | "agent" | "llm" | "network" | "custom";
  config: Record<string, any>;
  dependsOn: string[];
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
}

// RAG System Types
export interface Document {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  chunks?: DocumentChunk[];
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

export interface RAGQuery {
  id: string;
  query: string;
  results: RAGResult[];
  timestamp: string;
  pipelineId?: string;
}

export interface RAGResult {
  content: string;
  sourceDocuments: {
    id: string;
    title: string;
    content: string;
    metadata: Record<string, any>;
  }[];
  relevanceScore: number;
}

// System Config Types
export interface SystemConfig {
  id: string;
  name: string;
  llmProviders: LLMProviderConfig[];
  ragConfig: RAGConfig;
  agentConfig: AgentConfig;
  networkConfig: NetworkConfig;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface LLMProviderConfig {
  provider: string;
  apiKey?: string;
  models: string[];
  baseUrl?: string;
  defaultModel: string;
  priority: number;
  timeout: number;
  maxTokens: number;
}

export interface RAGConfig {
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  retrievalTopK: number;
  similarityThreshold: number;
  rerankerEnabled: boolean;
  rerankerModel?: string;
}

export interface AgentConfig {
  maxAgents: number;
  defaultAgents: string[];
  memoryConfig: {
    shortTermTTL: number;
    longTermThreshold: number;
  };
}

export interface NetworkConfig {
  connectionTimeout: number;
  retryAttempts: number;
  simulationEnabled: boolean;
  defaultDeviceType: string;
}

export interface SocketEvents {
  // Client to Server
  select_device: (data: { device_id: string }) => void;
  connect_device: (data: { device_id: string; device_info?: any }) => void;
  disconnect_device: (data: { device_id: string }) => void;
  generate_config: (data: {
    command: string;
    provider: string;
    device_id?: string;
  }) => void;
  apply_config: (data: { configuration: string; device_id: string }) => void;
  get_device_status: (data: { device_id: string }) => void;
  push_config_to_dummy: (data: {
    configuration: string;
    device_id: string;
  }) => void;
  retrieve_config_from_dummy: (data: { device_id: string }) => void;
  get_dummy_router_status: (data: { device_id: string }) => void;
  run_pipeline: (data: { pipelineId: string; input: any }) => void;
  query_rag: (data: { query: string; pipelineId?: string }) => void;
  execute_agent_action: (data: {
    agentId: string;
    action: string;
    input: any;
  }) => void;

  // Server to Client
  connected: (data: { session_id: string; message: string }) => void;
  device_selected: (data: {
    success: boolean;
    device_id: string;
    message: string;
  }) => void;
  device_connected: (data: {
    success: boolean;
    device_id: string;
    connection_info: any;
  }) => void;
  device_connection_failed: (data: {
    success: boolean;
    device_id: string;
    error: string;
  }) => void;
  device_disconnected: (data: {
    success: boolean;
    device_id: string;
    message: string;
  }) => void;
  config_generation_started: (data: {
    message: string;
    provider: string;
  }) => void;
  config_generated: (data: {
    success: boolean;
    configuration: string;
    provider: string;
    command: string;
    device_id?: string;
  }) => void;
  config_generation_failed: (data: {
    success: boolean;
    error: string;
    provider: string;
  }) => void;
  config_application_started: (data: {
    message: string;
    device_id: string;
  }) => void;
  config_applied: (data: {
    success: boolean;
    device_id: string;
    result: string;
    message: string;
  }) => void;
  config_application_failed: (data: {
    success: boolean;
    device_id: string;
    error: string;
  }) => void;
  device_status: (data: {
    device_id: string;
    status: any;
    connected: boolean;
  }) => void;
  config_push_started: (data: { message: string; device_id: string }) => void;
  config_pushed_to_dummy: (data: {
    success: boolean;
    device_id: string;
    result: string;
    steps: Array<any>;
    message: string;
  }) => void;
  config_push_failed: (data: {
    success: boolean;
    device_id: string;
    error: string;
  }) => void;
  config_retrieval_started: (data: {
    message: string;
    device_id: string;
  }) => void;
  config_retrieved_from_dummy: (data: {
    success: boolean;
    device_id: string;
    configuration: string;
    message: string;
  }) => void;
  config_retrieval_failed: (data: {
    success: boolean;
    device_id: string;
    error: string;
  }) => void;
  dummy_router_status: (data: { device_id: string; status: any }) => void;
  pipeline_started: (data: { pipelineId: string; message: string }) => void;
  pipeline_stage_completed: (data: {
    pipelineId: string;
    stageId: string;
    result: any;
  }) => void;
  pipeline_completed: (data: { pipelineId: string; result: any }) => void;
  pipeline_failed: (data: { pipelineId: string; error: string }) => void;
  rag_query_started: (data: { queryId: string; message: string }) => void;
  rag_query_completed: (data: {
    queryId: string;
    results: RAGResult[];
  }) => void;
  rag_query_failed: (data: { queryId: string; error: string }) => void;
  agent_action_started: (data: {
    agentId: string;
    actionId: string;
    message: string;
  }) => void;
  agent_action_completed: (data: {
    agentId: string;
    actionId: string;
    result: any;
  }) => void;
  agent_action_failed: (data: {
    agentId: string;
    actionId: string;
    error: string;
  }) => void;
  error: (data: { message: string }) => void;
}
