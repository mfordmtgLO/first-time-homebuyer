import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { refreshOregonTopAgentsForOwner } from "./routers";

/**
 * JSON-only fallback for the private Oregon refresh control. It intentionally
 * bypasses tRPC response transformation while reusing the exact guarded import.
 */
export function registerOregonSyncHttp(app: Express) {
  app.post("/api/oregon-sync-refresh", async (req: Request, res: Response) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Sign in again before syncing Oregon source profiles." });
      return;
    }
    if (!user) {
      res.status(401).json({ error: "Sign in again before syncing Oregon source profiles." });
      return;
    }
    try {
      if (user.role !== "admin") {
        res.status(403).json({ error: "Only the dashboard owner can sync Oregon source profiles." });
        return;
      }
      await refreshOregonTopAgentsForOwner(user.id);
      res.status(200).json({ refreshed: true });
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : "Oregon agent sync could not be completed.";
      res.status(502).json({ error: message });
    }
  });
}
