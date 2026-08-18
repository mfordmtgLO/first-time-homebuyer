import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listLoAgentSpendTrackers: vi.fn(async () => []),
    getLoAgentSpendPairingForOwner: vi.fn(async () => undefined),
    createLoAgentSpendPairing: vi.fn(async (input) => ({ id: 91, ...input, createdAt: new Date(), updatedAt: new Date() })),
    addLoAgentSpendEntry: vi.fn(async (input) => ({ id: 44, ...input, createdAt: new Date() })),
    deleteLoAgentSpendEntry: vi.fn(async () => undefined),
    deleteLoAgentSpendPairing: vi.fn(async () => undefined),
    getLoanOfficerById: vi.fn(async () => ({ id: 4, name: "Mike Ford" })),
    getAgentById: vi.fn(async () => ({ id: 9, name: "Partner Agent" })),
  };
});

import { appRouter } from "./routers";
import { addLoAgentSpendEntry, createLoAgentSpendPairing, listLoAgentSpendTrackers } from "./db";
import type { TrpcContext } from "./_core/context";

const listMock = vi.mocked(listLoAgentSpendTrackers);
const createMock = vi.mocked(createLoAgentSpendPairing);
const addMock = vi.mocked(addLoAgentSpendEntry);

function createContext(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: 52,
      openId: `tracker-${role}`,
      name: "Tracker User",
      email: "tracker@example.com",
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

describe("pairingSpendTracker router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks non-admin users from reading the private internal ledger", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.pairingSpendTracker.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(listMock).not.toHaveBeenCalled();
  });

  it("scopes new pairings and expense rows to the signed-in dashboard owner", async () => {
    const caller = appRouter.createCaller(createContext("admin"));

    await caller.pairingSpendTracker.createPairing({ loanOfficerId: 4, agentId: 9 });
    expect(createMock).toHaveBeenCalledWith({ ownerUserId: 52, loanOfficerId: 4, agentId: 9 });

    vi.mocked((await import("./db")).getLoAgentSpendPairingForOwner).mockResolvedValueOnce({ id: 91, ownerUserId: 52, loanOfficerId: 4, agentId: 9, createdAt: new Date(), updatedAt: new Date() } as never);
    await caller.pairingSpendTracker.addEntry({ pairingId: 91, spentOn: "2026-08-18", category: "ad_spend", description: "Search campaign", loanOfficerCents: 15000, agentCents: 15000 });
    expect(addMock).toHaveBeenCalledWith(expect.objectContaining({ pairingId: 91, loanOfficerCents: 15000, agentCents: 15000, spentOn: expect.any(Date) }));
  });
});
