import { Router, Request, Response } from "express";
import { NetworkOperations } from "../services/NetworkOperations";
import { logger } from "../utils/logger";
import { validateDevice } from "../middleware/validation";

const router = Router();
const networkOps = new NetworkOperations();

// GET /api/devices - Get all devices
router.get("/", (req: Request, res: Response) => {
  try {
    const devices = networkOps.getAllDevices();
    res.json({ success: true, devices });
  } catch (error) {
    logger.error(`Error getting devices: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// POST /api/devices - Add a new device
router.post("/", validateDevice, (req: Request, res: Response) => {
  try {
    const deviceData = req.body;
    const device = networkOps.addDevice(deviceData);
    res.json({ success: true, device });
  } catch (error) {
    logger.error(`Error adding device: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// DELETE /api/devices/:deviceId - Delete a device
router.delete("/:deviceId", (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const success = networkOps.deleteDevice(deviceId);
    res.json({ success });
  } catch (error) {
    logger.error(`Error deleting device: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// GET /api/devices/:deviceId - Get device info
router.get("/:deviceId", (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const device = networkOps.getDeviceInfo(deviceId);

    if (!device) {
      return res
        .status(404)
        .json({ success: false, error: "Device not found" });
    }

    res.json({ success: true, device });
  } catch (error) {
    logger.error(`Error getting device info: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// GET /api/devices/:deviceId/status - Get device status
router.get("/:deviceId/status", (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const status = networkOps.getDeviceStatus(deviceId);
    res.json({ success: true, status });
  } catch (error) {
    logger.error(`Error getting device status: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

export { router as deviceRoutes };
