import type { Request, Response } from "express";
import { getGeoSphereSyncSettingByTaskUid } from "./db";
import { syncGeoSphereSavedListings } from "./geosphere";
import { sdk } from "./_core/sdk";

/** Platform-only callback for the persisted GeoSphere weekly Heartbeat job. */
export async function runGeoSphereScheduledSync(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const setting = await getGeoSphereSyncSettingByTaskUid(user.taskUid);
    if (!setting) {
      return res.json({ ok: true, skipped: "orphan" });
    }

    const result = await syncGeoSphereSavedListings();
    return res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown GeoSphere schedule failure.";
    console.error("[GeoSphere] Scheduled sync failed:", error);
    return res.status(500).json({
      error: message,
      context: { url: req.originalUrl, taskUid: "unavailable" },
      timestamp: new Date().toISOString(),
    });
  }
}
