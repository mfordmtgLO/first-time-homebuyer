import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listCampaignSpendEntries: vi.fn(async () => []),
    createCampaignSpendEntry: vi.fn(async (input) => ({ id: 71, ...input, createdAt: new Date(), updatedAt: new Date() })),
    deleteCampaignSpendEntry: vi.fn(async () => undefined),
  };
});

import { appRouter } from "./routers";
import { createCampaignSpendEntry, deleteCampaignSpendEntry, listCampaignSpendEntries } from "./db";
import type { TrpcContext } from "./_core/context";

const listMock = vi.mocked(listCampaignSpendEntries);
const createMock = vi.mocked(createCampaignSpendEntry);
const deleteMock = vi.mocked(deleteCampaignSpendEntry);

function createContext(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: 64,
      openId: `campaign-${role}`,
      name: "Campaign User",
      email: "campaign@example.com",
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

describe("campaignSpend router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks non-admin access to private spend reporting", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.campaignSpend.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(listMock).not.toHaveBeenCalled();
  });

  it("scopes saved campaign spend to the signed-in dashboard owner", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await caller.campaignSpend.add({
      utmSource: "facebook",
      utmMedium: "paid_social",
      utmCampaign: "firsthome",
      spentOn: "2026-08-20",
      spendCents: 45000,
      notes: "Initial social budget",
    });
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      ownerUserId: 64,
      utmSource: "facebook",
      utmMedium: "paid_social",
      utmCampaign: "firsthome",
      spendCents: 45000,
      spentOn: expect.any(Date),
    }));

    await caller.campaignSpend.delete({ id: 71 });
    expect(deleteMock).toHaveBeenCalledWith({ id: 71, ownerUserId: 64 });
  });

  it("rejects zero-spend and incomplete UTM campaign inputs", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(caller.campaignSpend.add({ utmSource: "", utmMedium: "paid_social", utmCampaign: "firsthome", spentOn: "2026-08-20", spendCents: 100 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.campaignSpend.add({ utmSource: "facebook", utmMedium: "paid_social", utmCampaign: "firsthome", spentOn: "2026-08-20", spendCents: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
