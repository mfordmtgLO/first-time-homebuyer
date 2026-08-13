import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getAgentBySlug: vi.fn(async () => undefined),
    getLoanOfficerBySlug: vi.fn(async () => undefined),
    insertLead: vi.fn(async () => undefined),
  };
});
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn(async () => true) }));

import { appRouter } from "./routers";
import { getAgentBySlug, getLoanOfficerBySlug, insertLead } from "./db";
import type { TrpcContext } from "./_core/context";

const getAgentBySlugMock = vi.mocked(getAgentBySlug);
const getLoanOfficerBySlugMock = vi.mocked(getLoanOfficerBySlug);
const insertLeadMock = vi.mocked(insertLead);

function context(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => {} } as unknown as TrpcContext["res"] };
}

beforeEach(() => {
  vi.clearAllMocks();
  getAgentBySlugMock.mockResolvedValue(undefined);
  getLoanOfficerBySlugMock.mockResolvedValue(undefined);
  insertLeadMock.mockResolvedValue(undefined as never);
});

describe("Roadmap LO-agent co-brand attribution", () => {
  it("stores both identities for a valid saved pair", async () => {
    getAgentBySlugMock.mockResolvedValue({ id: 17, name: "Kaandice", visible: 1 } as never);
    getLoanOfficerBySlugMock.mockResolvedValue({ id: 5, slug: "mike-ford", agentId: 17, visible: 1 } as never);
    const caller = appRouter.createCaller(context());
    await caller.leads.submit({ firstName: "Jordan", email: "jordan@example.com", agentSlug: "kaandice-mclean", loanOfficerSlug: "mike-ford" });
    expect(insertLeadMock).toHaveBeenCalledWith(expect.objectContaining({ agentId: 17, loanOfficerId: 5, agentSource: "link" }));
  });

  it("does not attribute an LO when a submitted agent is not that LO's selected partner", async () => {
    getAgentBySlugMock.mockResolvedValue({ id: 17, name: "Kaandice", visible: 1 } as never);
    getLoanOfficerBySlugMock.mockResolvedValue({ id: 5, slug: "mike-ford", agentId: 99, visible: 1 } as never);
    const caller = appRouter.createCaller(context());
    await caller.leads.submit({ firstName: "Jordan", email: "jordan@example.com", agentSlug: "kaandice-mclean", loanOfficerSlug: "mike-ford" });
    expect(insertLeadMock).toHaveBeenCalledWith(expect.objectContaining({ agentId: 17, loanOfficerId: undefined }));
  });
});
