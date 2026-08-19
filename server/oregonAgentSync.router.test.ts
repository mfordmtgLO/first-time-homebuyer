import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listSyncedTopAgents: vi.fn(async () => []),
    listSyncedAgentOutreachTemplates: vi.fn(async () => []),
    createSyncedAgentOutreachTemplate: vi.fn(async () => ({ id: 1, ownerUserId: 71, name: "Test", subjectTemplate: "Subject", bodyTemplate: "Body", createdAt: new Date(), updatedAt: new Date() })),
    upsertSyncedTopAgents: vi.fn(async () => ({ count: 1 })),
    getSyncedTopAgent: vi.fn(async () => undefined),
    markSyncedTopAgentCreated: vi.fn(async () => undefined),
  };
});

import { appRouter } from "./routers";
import { createSyncedAgentOutreachTemplate, listSyncedAgentOutreachTemplates, listSyncedTopAgents, upsertSyncedTopAgents } from "./db";
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
    await expect(caller.agentSync.outreachTemplates()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.agentSync.buildOutreachDraft({ syncedProfileIds: [1] })).rejects.toMatchObject({ code: "FORBIDDEN" });
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

  it("saves an outreach template under the signed-in owner only", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await caller.agentSync.createOutreachTemplate({ name: "Broker introduction", subjectTemplate: "Hello {{recipient_name}}", bodyTemplate: "A private introduction." });

    expect(createSyncedAgentOutreachTemplate).toHaveBeenCalledWith(expect.objectContaining({
      ownerUserId: 71,
      name: "Broker introduction",
    }));
  });

  it("builds a BCC draft for multiple selected owner-scoped Oregon profiles", async () => {
    vi.mocked(listSyncedTopAgents).mockResolvedValue([
      { id: 1, fullName: "Jane Agent", email: "jane@example.test", brokerage: "Example Realty", profileData: JSON.stringify({ recordType: "agent" }) },
      { id: 2, fullName: "Tiffany Johnson", email: "tiffany@example.test", brokerage: "RE/MAX Integrity", profileData: JSON.stringify({ recordType: "principal_broker", principalBrokerTitle: "Managing Principal Broker" }) },
      { id: 3, fullName: "No Email", email: null, brokerage: null, profileData: JSON.stringify({ recordType: "agent" }) },
    ] as never);
    vi.mocked(listSyncedAgentOutreachTemplates).mockResolvedValue([] as never);

    const caller = appRouter.createCaller(createContext("admin"));
    const draft = await caller.agentSync.buildOutreachDraft({ syncedProfileIds: [1, 2, 3] });

    expect(draft).toMatchObject({ selectedCount: 3, recipientCount: 2, skippedNoEmailCount: 1, bcc: true });
    expect(draft.mailto).toContain("mailto:?bcc=jane%40example.test%2Ctiffany%40example.test");
  });
});
