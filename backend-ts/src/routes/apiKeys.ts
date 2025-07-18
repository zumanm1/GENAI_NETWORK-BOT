import { Router, Request, Response } from "express";
import { LLMIntegration } from "../services/LLMIntegration";
import { logger } from "../utils/logger";
import { validateApiKey } from "../middleware/validation";

const router = Router();
const llmIntegration = new LLMIntegration();

// GET /api/api-keys - Get all API keys (masked)
router.get("/", (req: Request, res: Response) => {
  try {
    const keys = llmIntegration.getApiKeys();
    res.json({ success: true, keys });
  } catch (error) {
    logger.error(`Error getting API keys: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// POST /api/api-keys - Add a new API key
router.post("/", validateApiKey, (req: Request, res: Response) => {
  try {
    const keyData = req.body;
    const key = llmIntegration.addApiKey(keyData);
    res.json({ success: true, key });
  } catch (error) {
    logger.error(`Error adding API key: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// DELETE /api/api-keys/:keyId - Delete an API key
router.delete("/:keyId", (req: Request, res: Response) => {
  try {
    const { keyId } = req.params;
    const success = llmIntegration.deleteApiKey(keyId);
    res.json({ success });
  } catch (error) {
    logger.error(`Error deleting API key: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// GET /api/api-keys/usage - Get usage statistics
router.get("/usage", (req: Request, res: Response) => {
  try {
    const statistics = llmIntegration.getUsageStatistics();
    res.json({ success: true, statistics });
  } catch (error) {
    logger.error(`Error getting usage statistics: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// GET /api/api-keys/models/:provider - Get available models for a provider
router.get("/models/:provider", (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const models = llmIntegration.getAvailableModels(provider);
    res.json({ success: true, models });
  } catch (error) {
    logger.error(
      `Error getting models for provider ${req.params.provider}: ${error}`,
    );
    res.status(500).json({ success: false, error: String(error) });
  }
});

export { router as apiKeyRoutes };
