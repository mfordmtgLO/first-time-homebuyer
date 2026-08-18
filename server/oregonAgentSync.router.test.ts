import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listSyncedTopAgents: vi.fn(async () => []),
    upsertSyncedTopAgents: vi.fn(async () => ({ count: 1 })),
    getSyncedTopAgent: vi.fn(async () => undefined),
    markSyncedTopAgentCreated: vi.fn(async () => undefined),
  };
});

import { appRouter } from "./routers";
import { upsertSyncedTopAgents } from "./db";
import type { TrpcContext } from "./_core/context";

function createContext(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: 71,
      openId: `oregon-sync-${role}`,
      name: "Oregon Sync User",
      email: "sync@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("agentSync router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OREGON_AGENT_SYNC_TOKEN = "test-shared-token";
  });

  afterEach(() => vi.unstubAllGlobals());

  it("blocks non-admin access to private synced source profiles", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.agentSync.list({ state: "Oregon" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.agentSync.syncOregon()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("imports the authorized Oregon payload only under the signed-in owner", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      version: 1,
      source: "oregon-agent-leads",
      state: "Oregon",
      exportedAt: "2026-08-18T20:00:00.000Z",
      count: 1,
      agents: [{
        sourceAgentId: 812,
        fullName: "Oregon Profile",
        state: "Oregon",
        brokerage: "Example Brokerage",
        cityArea: "Salem",
        phone: "541-555-0123",
        email: "profile@example.com",
        websiteBioUrl: "https://example.com/profile",
        zillowUrl: "https://example.com/zillow",
        headshotUrl: "https://example.com/headshot.jpg",
        realtrendsRank: 7,
        sourceUpdatedAt: "2026-08-18T19:00:00.000Z",
      }],
    }), { status: 200 })));

    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.agentSync.syncOregon();

    expect(result).toMatchObject({ count: 1, source: "oregon-agent-leads", state: "Oregon" });
    expect(upsertSyncedTopAgents).toHaveBeenCalledWith(71, [expect.objectContaining({
      sourceAgentId: 812,
      state: "Oregon",
      fullName: "Oregon Profile",
      sourceRank: 7,
      sourceUpdatedAt: new Date("2026-08-18T19:00:00.000Z"),
    })]);
  });
});
