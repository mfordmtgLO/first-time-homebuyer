import { describe, expect, it } from "vitest";

const sourceUrl = "https://oregonleads-bqkuz5cc.manus.space/api/sync/agents?state=Oregon";

describe("Oregon agent direct-sync connection", () => {
  it("uses the configured bearer token to retrieve a versioned Oregon agent export", async () => {
    const token = process.env.OREGON_AGENT_SYNC_TOKEN;
    expect(token, "OREGON_AGENT_SYNC_TOKEN must be configured").toBeTruthy();

    const response = await fetch(sourceUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status, "The source export endpoint must return HTTP 200").toBe(200);
    expect(response.headers.get("content-type"), "The source export endpoint must return JSON").toContain("application/json");

    const payload = await response.json() as { source?: string; state?: string; agents?: unknown[] };
    expect(payload.source).toBe("oregon-agent-leads");
    expect(payload.state).toBe("Oregon");
    expect(Array.isArray(payload.agents)).toBe(true);
  }, 15_000);
});
