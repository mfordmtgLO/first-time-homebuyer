import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getAgentById: vi.fn(async () => undefined),
    getAgentBySlug: vi.fn(async () => undefined),
    getFeaturedLoanOfficer: vi.fn(async () => undefined),
    getLoanOfficerBySlug: vi.fn(async () => undefined),
    getChatLeadBySession: vi.fn(async () => undefined),
    createChatLead: vi.fn(async () => 91),
    addChatTranscript: vi.fn(async () => undefined),
    loanOfficerSlugTaken: vi.fn(async () => false),
    createLoanOfficer: vi.fn(async () => 42),
  };
});

import { appRouter } from "./routers";
import {
  addChatTranscript,
  createChatLead,
  createLoanOfficer,
  getAgentById,
  getAgentBySlug,
  getChatLeadBySession,
  getLoanOfficerBySlug,
  loanOfficerSlugTaken,
} from "./db";
import type { TrpcContext } from "./_core/context";

const AGENT = {
  id: 17, name: "Kaandice McLean", slug: "kaandice-mclean", email: "kaandice@example.com", phone: "(541) 555-0117",
  bio: "", website: "", companyName: "Cooley Real Estate Group", headshotUrl: "", companyLogoUrl: "", visible: 1, featured: 0,
  createdAt: new Date(), updatedAt: new Date(),
};
const OFFICER = {
  id: 5, name: "Mike Ford", slug: "mike-ford", email: "mford@cfmtg.com", phone: "(541) 729-0819", nmls: "288455",
  title: "Loan Officer", companyName: "Cornerstone First Mortgage", bio: "", website: "", headshotUrl: "", companyLogoUrl: "",
  agentId: 17, visible: 1, featured: 1, createdAt: new Date(), updatedAt: new Date(),
};

function context(role: "admin" | "user" | null): TrpcContext {
  return {
    user: role ? { id: 1, openId: `test-${role}`, email: `${role}@example.com`, name: "Tester", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const getAgentBySlugMock = vi.mocked(getAgentBySlug);
const getAgentByIdMock = vi.mocked(getAgentById);
const getLoanOfficerBySlugMock = vi.mocked(getLoanOfficerBySlug);
const getChatLeadBySessionMock = vi.mocked(getChatLeadBySession);
const createChatLeadMock = vi.mocked(createChatLead);
const addChatTranscriptMock = vi.mocked(addChatTranscript);
const createLoanOfficerMock = vi.mocked(createLoanOfficer);
const loanOfficerSlugTakenMock = vi.mocked(loanOfficerSlugTaken);

beforeEach(() => {
  vi.clearAllMocks();
  getAgentBySlugMock.mockResolvedValue(undefined);
  getAgentByIdMock.mockResolvedValue(undefined);
  getLoanOfficerBySlugMock.mockResolvedValue(undefined);
  getChatLeadBySessionMock.mockResolvedValue(undefined);
  createChatLeadMock.mockResolvedValue(91 as never);
  addChatTranscriptMock.mockResolvedValue(undefined as never);
  createLoanOfficerMock.mockResolvedValue(42 as never);
  loanOfficerSlugTakenMock.mockResolvedValue(false);
});

describe("loan officer and agent co-marketing pairs", () => {
  it("returns a public pair only when the LO selected that exact visible agent", async () => {
    getAgentBySlugMock.mockResolvedValue(AGENT as never);
    getLoanOfficerBySlugMock.mockResolvedValue(OFFICER as never);
    const caller = appRouter.createCaller(context(null));
    await expect(caller.loanOfficer.getPair({ loanOfficerSlug: "mike-ford", agentSlug: "kaandice-mclean" }))
      .resolves.toMatchObject({ officer: { id: 5, slug: "mike-ford" }, agent: { id: 17, slug: "kaandice-mclean" } });

    getLoanOfficerBySlugMock.mockResolvedValue({ ...OFFICER, agentId: 18 } as never);
    await expect(caller.loanOfficer.getPair({ loanOfficerSlug: "mike-ford", agentSlug: "kaandice-mclean" })).resolves.toBeNull();
  });

  it("returns a visible standalone loan officer by slug without requiring an agent", async () => {
    getLoanOfficerBySlugMock.mockResolvedValue({ ...OFFICER, agentId: null } as never);
    const caller = appRouter.createCaller(context(null));

    await expect(caller.loanOfficer.getBySlug({ slug: "mike-ford" }))
      .resolves.toMatchObject({ id: 5, slug: "mike-ford", name: "Mike Ford" });

    getLoanOfficerBySlugMock.mockResolvedValue({ ...OFFICER, visible: 0 } as never);
    await expect(caller.loanOfficer.getBySlug({ slug: "mike-ford" })).resolves.toBeNull();
  });

  it("saves a paired chat session with both the selected LO and agent IDs", async () => {
    getAgentBySlugMock.mockResolvedValue(AGENT as never);
    getLoanOfficerBySlugMock.mockResolvedValue(OFFICER as never);
    const caller = appRouter.createCaller(context(null));
    const result = await caller.chat.start({ sessionId: "paired-session-1234567890", loanOfficerSlug: "mike-ford", agentSlug: "kaandice-mclean" });
    expect(result.officer.name).toBe("Mike Ford");
    expect(result.agent?.name).toBe("Kaandice McLean");
    expect(createChatLeadMock).toHaveBeenCalledWith(expect.objectContaining({ loanOfficerId: 5, agentId: 17 }));
  });

  it("saves a loan-officer-only chat session without assigning an agent", async () => {
    getLoanOfficerBySlugMock.mockResolvedValue({ ...OFFICER, agentId: null } as never);
    const caller = appRouter.createCaller(context(null));

    const result = await caller.chat.start({ sessionId: "officer-only-session-123456", loanOfficerSlug: "mike-ford" });

    expect(result.officer.name).toBe("Mike Ford");
    expect(result.agent).toBeNull();
    expect(createChatLeadMock).toHaveBeenCalledWith(expect.objectContaining({ loanOfficerId: 5, agentId: undefined }));
  });

  it("keeps LO profile creation admin-only and persists the selected agent partner", async () => {
    const userCaller = appRouter.createCaller(context("user"));
    await expect(userCaller.loanOfficer.create({ name: "Taylor Jones", email: "taylor@example.com", phone: "(541) 555-0199", agentId: 17 })).rejects.toMatchObject({ code: "FORBIDDEN" });

    getAgentByIdMock.mockResolvedValue(AGENT as never);
    const adminCaller = appRouter.createCaller(context("admin"));
    await expect(adminCaller.loanOfficer.create({ name: "Taylor Jones", email: "taylor@example.com", phone: "(541) 555-0199", agentId: 17 }))
      .resolves.toMatchObject({ id: 42, slug: "taylor-jones" });
    expect(createLoanOfficerMock).toHaveBeenCalledWith(expect.objectContaining({ slug: "taylor-jones", agentId: 17 }));
  });
});
