import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    insertLead: vi.fn(),
    getAgentBySlug: vi.fn(async () => undefined),
    getAgentLeadStats: vi.fn(async () => []),
  };
});

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

import { appRouter } from "./routers";
import { getAgentBySlug, getAgentLeadStats, insertLead } from "./db";
import type { TrpcContext } from "./_core/context";

const insertLeadMock = vi.mocked(insertLead);
const getAgentBySlugMock = vi.mocked(getAgentBySlug);
const getAgentLeadStatsMock = vi.mocked(getAgentLeadStats);

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: "admin" | "user" | null): TrpcContext {
  const user: AuthenticatedUser | null = role
    ? {
        id: 1,
        openId: `sample-${role}`,
        email: `${role}@example.com`,
        name: "Sample",
        loginMethod: "manus",
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }
    : null;
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const SAMPLE_AGENT = {
  id: 7,
  name: "Jane Doe",
  slug: "jane-doe",
  email: "jane@realty.com",
  phone: "",
  bio: "",
  website: "",
  companyName: "",
  headshotUrl: "",
  companyLogoUrl: "",
  visible: 1,
  featured: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  getAgentBySlugMock.mockResolvedValue(undefined);
  getAgentLeadStatsMock.mockResolvedValue([]);
});

describe("agent.stats", () => {
  it("returns per-agent counts to the admin", async () => {
    getAgentLeadStatsMock.mockResolvedValue([
      { agentId: 7, linkLeads: 5, assignedLeads: 8, referredLeads: 3 },
    ]);
    const caller = appRouter.createCaller(createContext("admin"));
    const stats = await caller.agent.stats();
    expect(stats).toEqual([
      { agentId: 7, linkLeads: 5, assignedLeads: 8, referredLeads: 3 },
    ]);
  });

  it("returns independent counts per agent with mixed lead data", async () => {
    // Simulates: agent 1 with 2 link + 1 manual lead (1 referred), agent 2 with
    // manual-only leads and none referred — counts must stay independent.
    getAgentLeadStatsMock.mockResolvedValue([
      { agentId: 1, linkLeads: 2, assignedLeads: 3, referredLeads: 1 },
      { agentId: 2, linkLeads: 0, assignedLeads: 2, referredLeads: 0 },
    ]);
    const caller = appRouter.createCaller(createContext("admin"));
    const stats = await caller.agent.stats();
    expect(stats).toHaveLength(2);
    const agent1 = stats.find((s) => s.agentId === 1);
    const agent2 = stats.find((s) => s.agentId === 2);
    expect(agent1).toEqual({ agentId: 1, linkLeads: 2, assignedLeads: 3, referredLeads: 1 });
    expect(agent2).toEqual({ agentId: 2, linkLeads: 0, assignedLeads: 2, referredLeads: 0 });
  });

  it("rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.agent.stats()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getAgentLeadStatsMock).not.toHaveBeenCalled();
  });

  it("rejects anonymous visitors", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.agent.stats()).rejects.toThrow();
  });
});

describe("leads.submit agentSource tagging", () => {
  it("stores agentSource='link' when submitted from a co-branded page", async () => {
    getAgentBySlugMock.mockResolvedValue(SAMPLE_AGENT);
    const caller = appRouter.createCaller(createContext(null));
    await caller.leads.submit({
      firstName: "Sarah",
      email: "sarah@example.com",
      phone: "(541) 555-0100",
      smsConsent: true,
      agentSlug: "jane-doe",
    });
    expect(insertLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 7, agentSource: "link" })
    );
  });

  it("stores no agentSource when submitted from the default page", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await caller.leads.submit({ firstName: "Sam", email: "sam@example.com", phone: "(541) 555-0100", smsConsent: true });
    expect(insertLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: undefined, agentSource: undefined })
    );
  });

  it("stores no agentSource when the slug doesn't match an agent", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await caller.leads.submit({
      firstName: "Sam",
      email: "sam@example.com",
      phone: "(541) 555-0100",
      smsConsent: true,
      agentSlug: "ghost-agent",
    });
    expect(insertLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: undefined, agentSource: undefined })
    );
  });
});
