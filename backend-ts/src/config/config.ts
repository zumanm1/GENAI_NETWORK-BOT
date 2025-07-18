import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Server configuration
  host: process.env.HOST || "0.0.0.0",
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  secretKey:
    process.env.SECRET_KEY ||
    "ai-network-whisperer-secret-key-change-in-production",

  // Database configuration (for future use)
  databaseUrl: process.env.DATABASE_URL || "sqlite:///network_whisperer.db",

  // LLM Provider configurations
  groqApiKey: process.env.GROQ_API_KEY || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  claudeApiKey: process.env.CLAUDE_API_KEY || "",

  // Ollama configuration
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "llama2",

  // Network device default credentials
  defaultSshUsername: process.env.DEFAULT_SSH_USERNAME || "admin",
  defaultSshPassword: process.env.DEFAULT_SSH_PASSWORD || "",
  defaultEnablePassword: process.env.DEFAULT_ENABLE_PASSWORD || "",

  // Security settings
  sshTimeout: parseInt(process.env.SSH_TIMEOUT || "30", 10),
  maxConcurrentConnections: parseInt(
    process.env.MAX_CONCURRENT_CONNECTIONS || "10",
    10,
  ),

  // Logging configuration
  logLevel: process.env.LOG_LEVEL || "info",
  logFile: process.env.LOG_FILE || "network_whisperer.log",

  // CORS settings
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["*"],

  // Rate limiting
  rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || "60", 10),

  // JWT settings
  jwtSecret: process.env.JWT_SECRET || "jwt-secret-key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
};

export const validateConfig = (): string[] => {
  const warnings: string[] = [];

  if (
    config.secretKey === "ai-network-whisperer-secret-key-change-in-production"
  ) {
    warnings.push(
      "WARNING: Using default SECRET_KEY. Change this in production!",
    );
  }

  if (!config.groqApiKey && !config.openaiApiKey && !config.claudeApiKey) {
    warnings.push(
      "WARNING: No LLM API keys configured. LLM features will not work.",
    );
  }

  if (config.nodeEnv === "development" && config.host === "0.0.0.0") {
    warnings.push(
      "WARNING: Running in development mode with public host. This may be insecure!",
    );
  }

  return warnings;
};
