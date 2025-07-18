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
  error: (data: { message: string }) => void;
}
