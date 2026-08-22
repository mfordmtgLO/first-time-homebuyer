import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getTeamLoanOfficerWorkspaceForMember: vi.fn(async () => ({ id: 71, adminUserId: 9, loanOfficerId: 12, status: "active", loanOfficerName: "Taylor Jones", loanOfficerSlug: "taylor-jones" })),
    listLeads: vi.fn(async () => []),
    listChatIntakeLeads: vi.fn(async () => []),
    getLeadById: vi.fn(async () => ({ id: 301, loanOfficerId: 12, firstName: "Jordan" })),
    updateLeadStatus: vi.fn(async () => undefined),
    updateLeadNotes: vi.fn(async () => undefined),
  };
});

import { appRouter } from "./routers";
import { getLeadById, listChatIntakeLeads, listLeads, updateLeadStatus } from "./db";
import type { TrpcContext } from "./_core/context";

const getLeadMock = vi.mocked(getLeadById);
const listChatMock = vi.mocked(listChatIntakeLeads);
const listLeadsMock = vi.mocked(listLeads);
const updateStatusMock = vi.mocked(updateLeadStatus);

function context(role: "admin" | "team_member"): TrpcContext {
  return {
    user: { id: role === "admin" ? 9 : 18, openId: `lead-scope-${role}`, name: role, email: `${role}@example.com`, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("team workspace Roadmap lead scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLeadMock.mockResolvedValue({ id: 301, loanOfficerId: 12, firstName: "Jordan" } as never);
  });

  it("filters team member lead lists to the active assigned loan-officer profile", async () => {
    await appRouter.createCaller(context("team_member")).leads.list({ activityRange: "all" });
    expect(listLeadsMock).toHaveBeenCalledWith(expect.objectContaining({ loanOfficerId: 12 }));
  });

  it("keeps Mike Ford admin lead visibility unrestricted", async () => {
    await appRouter.createCaller(context("admin")).leads.list({ activityRange: "all" });
    expect(listLeadsMock).toHaveBeenCalledWith(expect.objectContaining({ loanOfficerId: undefined }));
  });

  it("filters team member Mortgage Chat lists to the active assigned loan-officer profile", async () => {
    await appRouter.createCaller(context("team_member")).chat.list({ activityRange: "all" });
    expect(listChatMock).toHaveBeenCalledWith(expect.objectContaining({ loanOfficerId: 12 }));
  });

  it("rejects a team member update for a lead outside the assigned workspace", async () => {
    getLeadMock.mockResolvedValueOnce({ id: 302, loanOfficerId: 99, firstName: "Other officer lead" } as never);
    await expect(appRouter.createCaller(context("team_member")).leads.updateStatus({ id: 302, status: "contacted" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(updateStatusMock).not.toHaveBeenCalled();
  });
});
