import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { logger } from "../utils/logger";

const deviceSchema = Joi.object({
  id: Joi.string().optional(),
  name: Joi.string().required().min(1).max(100),
  ip: Joi.string().ip().required(),
  deviceType: Joi.string()
    .valid(
      "Router",
      "Switch",
      "Firewall",
      "Access Point",
      "cisco_ios",
      "cisco_asa",
      "cisco_wlc",
    )
    .required(),
  username: Joi.string().optional().allow(""),
  password: Joi.string().optional().allow(""),
  enablePassword: Joi.string().optional().allow(""),
  port: Joi.number().integer().min(1).max(65535).optional(),
  status: Joi.string().valid("online", "offline", "warning").optional(),
  lastSeen: Joi.string().optional(),
  createdAt: Joi.string().optional(),
});

const apiKeySchema = Joi.object({
  id: Joi.string().optional(),
  name: Joi.string().required().min(1).max(100),
  provider: Joi.string().valid("groq", "openai", "claude", "ollama").required(),
  key: Joi.string().required().min(1),
  model: Joi.string().optional().allow(""),
  isActive: Joi.boolean().optional(),
  createdAt: Joi.string().optional(),
  lastUsed: Joi.string().optional().allow(null),
});

export const validateDevice = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { error } = deviceSchema.validate(req.body);

  if (error) {
    logger.warn(`Device validation error: ${error.details[0].message}`);
    res.status(400).json({
      success: false,
      error: `Validation error: ${error.details[0].message}`,
    });
    return;
  }

  next();
};

export const validateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { error } = apiKeySchema.validate(req.body);

  if (error) {
    logger.warn(`API key validation error: ${error.details[0].message}`);
    res.status(400).json({
      success: false,
      error: `Validation error: ${error.details[0].message}`,
    });
    return;
  }

  next();
};

export const validateSocketData = (
  schema: Joi.ObjectSchema,
  data: any,
): { error?: string; value?: any } => {
  const { error, value } = schema.validate(data);

  if (error) {
    return { error: error.details[0].message };
  }

  return { value };
};
