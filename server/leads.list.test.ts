import { describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    insertLead: vi.fn(),
    listLeads: vi.fn(async () => [
      {
        id: 1,
        firstName: "Taylor",
        email: "taylor@example.com",
        source: "roadmap",
        loanOfficerName: "Mike Ford",
        loanOfficerSlug: "mike-ford",
        agentName: "Kaandice McLean",
        agentSlug: "kaandice-mclean",
        agentSource: "link",
        createdAt: new Date(),
      },
    ]),
  };
});

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

describe("leads.list", () => {
  it("returns leads for the admin owner", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.leads.list();
    expect(result).toHaveLength(1);
    expect(result[0]?.email).toBe("taylor@example.com");
    expect(result[0]).toMatchObject({
      loanOfficerName: "Mike Ford",
      agentName: "Kaandice McLean",
      agentSource: "link",
    });
  });

  it("rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.leads.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
