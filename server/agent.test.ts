import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    insertLead: vi.fn(),
    listLeads: vi.fn(async () => []),
    updateLeadStatus: vi.fn(async () => undefined),
    updateLeadNotes: vi.fn(async () => undefined),
    updateLeadAgent: vi.fn(async () => undefined),
    markLeadSentToAgent: vi.fn(async () => undefined),
    getLeadById: vi.fn(async () => undefined),
    listAgents: vi.fn(async () => []),
    getAgentById: vi.fn(async () => undefined),
    getAgentBySlug: vi.fn(async () => undefined),
    getFeaturedAgent: vi.fn(async () => undefined),
    slugTaken: vi.fn(async () => false),
    createAgent: vi.fn(async () => 1),
    updateAgent: vi.fn(async () => undefined),
    deleteAgent: vi.fn(async () => undefined),
    setFeaturedAgent: vi.fn(async () => undefined),
  };
});

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(async (key: string) => ({
    key,
    url: `https://storage.example.com/${key}`,
  })),
}));

vi.mock("./email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./email")>();
  return {
    ...actual,
    sendReferralEmail: vi.fn(async () => ({ sent: true })),
  };
});

import { appRouter } from "./routers";
import {
  createAgent,
  deleteAgent,
  getAgentById,
  getAgentBySlug,
  getFeaturedAgent,
  getLeadById,
  markLeadSentToAgent,
  setFeaturedAgent,
  slugTaken,
  updateAgent,
  updateLeadAgent,
} from "./db";
import { sendReferralEmail } from "./email";
import { storagePut } from "./storage";
import type { TrpcContext } from "./_core/context";

const createAgentMock = vi.mocked(createAgent);
const updateAgentMock = vi.mocked(updateAgent);
const deleteAgentMock = vi.mocked(deleteAgent);
const getAgentByIdMock = vi.mocked(getAgentById);
const getAgentBySlugMock = vi.mocked(getAgentBySlug);
const getFeaturedAgentMock = vi.mocked(getFeaturedAgent);
const slugTakenMock = vi.mocked(slugTaken);
const setFeaturedAgentMock = vi.mocked(setFeaturedAgent);
const getLeadByIdMock = vi.mocked(getLeadById);
const updateLeadAgentMock = vi.mocked(updateLeadAgent);
const markLeadSentToAgentMock = vi.mocked(markLeadSentToAgent);
const sendReferralEmailMock = vi.mocked(sendReferralEmail);
const storagePutMock = vi.mocked(storagePut);

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
  phone: "(541) 555-0123",
  bio: "Local agent bio",
  website: "https://www.example.com",
  companyName: "Willamette Realty Group",
  headshotUrl: "https://storage.example.com/agent/headshot.jpg",
  companyLogoUrl: "https://storage.example.com/agent/logo.png",
  visible: 1,
  featured: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const SAMPLE_LEAD = {
  id: 42,
  firstName: "Sarah",
  email: "sarah@example.com",
  phone: "(541) 555-0199",
  source: "roadmap+buydown",
  status: "new" as const,
  notes: null,
  scenario: JSON.stringify({
    buydown: {
      purchasePrice: 425000,
      downPayment: 21250,
      noteRate: 6.5,
      year1MonthlySavings: 536,
      year2MonthlySavings: 275,
      totalSubsidy: 9730,
    },
    costOfWaiting: {
      purchasePrice: 400000,
      monthlyRent: 1800,
      waitYears: 3,
      costOfWaiting: 105578,
    },
  }),
  agentId: 7,
  sentToAgentAt: null,
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  slugTakenMock.mockResolvedValue(false);
  getAgentByIdMock.mockResolvedValue(undefined);
  getAgentBySlugMock.mockResolvedValue(undefined);
  getFeaturedAgentMock.mockResolvedValue(undefined);
  getLeadByIdMock.mockResolvedValue(undefined);
  sendReferralEmailMock.mockResolvedValue({ sent: true });
});

describe("agent.getFeatured / agent.getBySlug (public)", () => {
  it("returns null when no featured agent exists", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.agent.getFeatured()).resolves.toBeNull();
  });

  it("returns the featured agent to anonymous visitors", async () => {
    getFeaturedAgentMock.mockResolvedValue({ ...SAMPLE_AGENT, featured: 1 });
    const caller = appRouter.createCaller(createContext(null));
    const agent = await caller.agent.getFeatured();
    expect(agent).toMatchObject({ name: "Jane Doe", featured: 1 });
  });

  it("returns an agent by slug for co-branded pages", async () => {
    getAgentBySlugMock.mockResolvedValue(SAMPLE_AGENT);
    const caller = appRouter.createCaller(createContext(null));
    const agent = await caller.agent.getBySlug({ slug: "jane-doe" });
    expect(agent).toMatchObject({ slug: "jane-doe" });
  });

  it("hides invisible agents from slug lookups", async () => {
    getAgentBySlugMock.mockResolvedValue({ ...SAMPLE_AGENT, visible: 0 });
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.agent.getBySlug({ slug: "jane-doe" })).resolves.toBeNull();
  });

  it("returns null for a malformed slug without querying", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.agent.getBySlug({ slug: "bad_slug!" })).resolves.toBeNull();
    expect(getAgentBySlugMock).not.toHaveBeenCalled();
  });
});

describe("agent.create", () => {
  it("creates an agent with an auto-generated slug from the name", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.agent.create({ name: "Jane O'Doe", visible: true });
    expect(result).toEqual({ id: 1, slug: "jane-odoe" });
    expect(createAgentMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Jane O'Doe", slug: "jane-odoe", visible: 1 })
    );
  });

  it("appends a numeric suffix when the slug is taken", async () => {
    slugTakenMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.agent.create({ name: "Jane Doe", visible: true });
    expect(result.slug).toBe("jane-doe-2");
  });

  it("respects a custom slug", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.agent.create({
      name: "Jane Doe",
      slug: "eugene-jane",
      visible: true,
    });
    expect(result.slug).toBe("eugene-jane");
  });

  it("rejects invalid slug characters", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(
      caller.agent.create({ name: "Jane", slug: "Bad Slug!", visible: true })
    ).rejects.toThrow();
    expect(createAgentMock).not.toHaveBeenCalled();
  });

  it("rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(
      caller.agent.create({ name: "Sneaky", visible: true })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(createAgentMock).not.toHaveBeenCalled();
  });

  it("requires a name", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(caller.agent.create({ name: "", visible: true })).rejects.toThrow();
  });
});

describe("agent.update / agent.delete / agent.setFeatured", () => {
  it("updates an existing agent and keeps its slug", async () => {
    getAgentByIdMock.mockResolvedValue(SAMPLE_AGENT);
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.agent.update({
      id: 7,
      name: "Jane Doe",
      slug: "",
      visible: true,
    });
    expect(result).toMatchObject({ success: true, slug: "jane-doe" });
    expect(updateAgentMock).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ slug: "jane-doe" })
    );
  });

  it("404s when updating a missing agent", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(
      caller.agent.update({ id: 99, name: "Ghost", visible: true })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deletes an agent as admin", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(caller.agent.delete({ id: 7 })).resolves.toEqual({ success: true });
    expect(deleteAgentMock).toHaveBeenCalledWith(7);
  });

  it("blocks non-admin delete", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.agent.delete({ id: 7 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("sets the featured agent when it exists", async () => {
    getAgentByIdMock.mockResolvedValue(SAMPLE_AGENT);
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(caller.agent.setFeatured({ id: 7 })).resolves.toEqual({ success: true });
    expect(setFeaturedAgentMock).toHaveBeenCalledWith(7);
  });

  it("clears the featured agent with null", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await caller.agent.setFeatured({ id: null });
    expect(setFeaturedAgentMock).toHaveBeenCalledWith(null);
  });
});

describe("leads.assignAgent", () => {
  it("assigns an existing agent to a lead", async () => {
    getAgentByIdMock.mockResolvedValue(SAMPLE_AGENT);
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(caller.leads.assignAgent({ id: 42, agentId: 7 })).resolves.toEqual({
      success: true,
    });
    expect(updateLeadAgentMock).toHaveBeenCalledWith(42, 7);
  });

  it("clears an assignment with null", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await caller.leads.assignAgent({ id: 42, agentId: null });
    expect(updateLeadAgentMock).toHaveBeenCalledWith(42, null);
  });

  it("404s when assigning a missing agent", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(
      caller.leads.assignAgent({ id: 42, agentId: 99 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(updateLeadAgentMock).not.toHaveBeenCalled();
  });

  it("blocks non-admin users", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(
      caller.leads.assignAgent({ id: 42, agentId: 7 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("leads.sendToAgent", () => {
  it("emails the assigned agent and stamps sentToAgentAt", async () => {
    getLeadByIdMock.mockResolvedValue(SAMPLE_LEAD);
    getAgentByIdMock.mockResolvedValue(SAMPLE_AGENT);
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.leads.sendToAgent({ id: 42 });
    expect(result).toEqual({ sent: true });
    expect(sendReferralEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentEmail: "jane@realty.com",
        leadFirstName: "Sarah",
        leadEmail: "sarah@example.com",
        leadPhone: "(541) 555-0199",
        scenarioSummary: expect.stringContaining("$425,000"),
      })
    );
    expect(markLeadSentToAgentMock).toHaveBeenCalledWith(42);
  });

  it("returns a mailto fallback when email isn't configured", async () => {
    getLeadByIdMock.mockResolvedValue(SAMPLE_LEAD);
    getAgentByIdMock.mockResolvedValue(SAMPLE_AGENT);
    sendReferralEmailMock.mockResolvedValue({ sent: false, reason: "not_configured" });
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.leads.sendToAgent({ id: 42 });
    expect(result.sent).toBe(false);
    if (!result.sent) {
      expect(result.mailto).toContain("mailto:jane@realty.com");
      const draft = decodeURIComponent(result.mailto);
      expect(draft).toContain("Hi Jane,");
      expect(draft).toContain("Phone: (541) 555-0199");
      expect(draft).toContain("Submitted:");
      expect(draft).toContain("Year 1 monthly savings: $536");
      expect(draft).toContain("Year 2 monthly savings: $275");
      expect(draft).toContain("$9,730 (2.29% of sales price)");
      expect(draft).toContain("resulting in $105,578 cost of waiting.");
      expect(draft).toContain("introduce yourself when you get a chance.");
      expect(draft).not.toContain("Came in via:");
    }
    expect(markLeadSentToAgentMock).not.toHaveBeenCalled();
  });

  it("returns a mailto fallback when the Resend sender domain is unverified", async () => {
    getLeadByIdMock.mockResolvedValue(SAMPLE_LEAD);
    getAgentByIdMock.mockResolvedValue(SAMPLE_AGENT);
    sendReferralEmailMock.mockResolvedValue({
      sent: false,
      reason: "unverified_domain",
    });
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.leads.sendToAgent({ id: 42 });
    expect(result).toMatchObject({ sent: false, reason: "unverified_domain" });
    if (!result.sent) {
      expect(result.mailto).toContain("mailto:jane@realty.com");
    }
    expect(markLeadSentToAgentMock).not.toHaveBeenCalled();
  });

  it("rejects when the lead has no assigned agent", async () => {
    getLeadByIdMock.mockResolvedValue({ ...SAMPLE_LEAD, agentId: null });
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(caller.leads.sendToAgent({ id: 42 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(sendReferralEmailMock).not.toHaveBeenCalled();
  });

  it("rejects when the agent has no email on file", async () => {
    getLeadByIdMock.mockResolvedValue(SAMPLE_LEAD);
    getAgentByIdMock.mockResolvedValue({ ...SAMPLE_AGENT, email: "" });
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(caller.leads.sendToAgent({ id: 42 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("404s on a missing lead", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(caller.leads.sendToAgent({ id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("blocks non-admin users", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.leads.sendToAgent({ id: 42 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("surfaces a send failure as INTERNAL_SERVER_ERROR", async () => {
    getLeadByIdMock.mockResolvedValue(SAMPLE_LEAD);
    getAgentByIdMock.mockResolvedValue(SAMPLE_AGENT);
    sendReferralEmailMock.mockResolvedValue({ sent: false, reason: "send_failed" });
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(caller.leads.sendToAgent({ id: 42 })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
    expect(markLeadSentToAgentMock).not.toHaveBeenCalled();
  });
});

describe("agent.uploadImage", () => {
  const PNG_BASE64 = Buffer.from("fake-png-bytes").toString("base64");

  it("uploads a PNG headshot and returns the storage URL", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.agent.uploadImage({
      kind: "headshot",
      mimeType: "image/png",
      dataBase64: PNG_BASE64,
    });
    expect(result.url).toMatch(/^https:\/\/storage\.example\.com\/agent\/headshot-\d+\.png$/);
  });

  it("rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(
      caller.agent.uploadImage({ kind: "logo", mimeType: "image/png", dataBase64: PNG_BASE64 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(storagePutMock).not.toHaveBeenCalled();
  });

  it("rejects disallowed MIME types with BAD_REQUEST", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(
      caller.agent.uploadImage({
        kind: "logo",
        mimeType: "application/pdf",
        dataBase64: PNG_BASE64,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
