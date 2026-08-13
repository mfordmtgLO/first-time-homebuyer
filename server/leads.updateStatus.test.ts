import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    insertLead: vi.fn(),
    listLeads: vi.fn(async () => []),
    updateLeadStatus: vi.fn(async () => undefined),
  };
});

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

import { appRouter } from "./routers";
import { updateLeadStatus } from "./db";
import type { TrpcContext } from "./_core/context";

const updateLeadStatusMock = vi.mocked(updateLeadStatus);

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: "admin" | "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: `sample-${role}`,
    email: `${role}@example.com`,
    name: "Sample",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("leads.updateStatus", () => {
  beforeEach(() => {
    updateLeadStatusMock.mockClear();
  });

  it("lets the admin owner update a lead's status", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.leads.updateStatus({ id: 1, status: "contacted" });
    expect(result).toEqual({ success: true });
    expect(updateLeadStatusMock).toHaveBeenCalledWith(1, "contacted");
  });

  it("rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(
      caller.leads.updateStatus({ id: 1, status: "booked" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(updateLeadStatusMock).not.toHaveBeenCalled();
  });

  it("rejects invalid status values", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(
      // @ts-expect-error intentionally invalid status
      caller.leads.updateStatus({ id: 1, status: "closed" })
    ).rejects.toThrow();
    expect(updateLeadStatusMock).not.toHaveBeenCalled();
  });
});
