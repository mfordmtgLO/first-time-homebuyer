import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listTeamLoanOfficerWorkspaces: vi.fn(async () => []),
    createTeamLoanOfficerWorkspace: vi.fn(async () => 71),
    activateTeamLoanOfficerWorkspace: vi.fn(async () => 71),
    updateTeamLoanOfficerWorkspaceStatus: vi.fn(async (input) => ({ ...input, loanOfficerId: 12, invitedEmail: "loanofficer@example.com" })),
    getTeamLoanOfficerWorkspaceForMember: vi.fn(async () => ({ id: 71, adminUserId: 9, loanOfficerId: 12, loanOfficerName: "Taylor Jones", loanOfficerSlug: "taylor-jones", status: "active" })),
    getTeamLoanOfficerWorkspaceForAdminMember: vi.fn(async () => ({ id: 71, adminUserId: 9, memberUserId: 18, loanOfficerId: 12, loanOfficerName: "Taylor Jones", status: "active" })),
    getLoanOfficerById: vi.fn(async () => ({ id: 12, name: "Taylor Jones" })),
    listLeads: vi.fn(async () => [{ id: 101 }]),
    listChatIntakeLeads: vi.fn(async () => [{ id: 201 }]),
    listPlatformLeads: vi.fn(async () => [{ id: 301 }]),
    listMortgagePaymentQuotes: vi.fn(async () => [{ id: 401 }]),
    listCampaignSpendEntries: vi.fn(async () => [{ id: 501 }]),
    listPropertyLandingPages: vi.fn(async () => []),
    listLoAgentSpendTrackers: vi.fn(async () => []),
    createPlatformLeadIfAbsent: vi.fn(async () => ({ id: 91, created: true })),
    listTeamTemplateLibrary: vi.fn(async () => []),
    createTeamTemplateLibraryEntry: vi.fn(async () => 88),
    updateTeamTemplateLibraryEntry: vi.fn(async () => undefined),
    deleteTeamTemplateLibraryEntry: vi.fn(async () => undefined),
  };
});

import { appRouter } from "./routers";
import { activateTeamLoanOfficerWorkspace, createPlatformLeadIfAbsent, createTeamLoanOfficerWorkspace, listCampaignSpendEntries, listLoAgentSpendTrackers, listMortgagePaymentQuotes, listPlatformLeads, listPropertyLandingPages, listTeamTemplateLibrary, updateTeamLoanOfficerWorkspaceStatus } from "./db";
import type { TrpcContext } from "./_core/context";

const activateMock = vi.mocked(activateTeamLoanOfficerWorkspace);
const createPlatformLeadMock = vi.mocked(createPlatformLeadIfAbsent);
const createWorkspaceMock = vi.mocked(createTeamLoanOfficerWorkspace);
const listCampaignSpendMock = vi.mocked(listCampaignSpendEntries);
const listSpendTrackersMock = vi.mocked(listLoAgentSpendTrackers);
const listMortgageQuoteMock = vi.mocked(listMortgagePaymentQuotes);
const listPlatformLeadsMock = vi.mocked(listPlatformLeads);
const listPropertyPagesMock = vi.mocked(listPropertyLandingPages);
const listTemplatesMock = vi.mocked(listTeamTemplateLibrary);
const updateStatusMock = vi.mocked(updateTeamLoanOfficerWorkspaceStatus);

function context(role: "admin" | "team_member" | "user", email = "loanofficer@example.com"): TrpcContext {
  return {
    user: { id: role === "admin" ? 9 : 18, openId: `team-${role}`, name: role === "admin" ? "Mike Ford" : "Taylor Jones", email, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("team loan-officer workspaces", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows only Mike Ford admin to assign and suspend loan-officer workspaces", async () => {
    const admin = appRouter.createCaller(context("admin"));
    await expect(admin.teamWorkspace.createInvite({ loanOfficerId: 12, invitedEmail: "LOANOFFICER@example.com" })).resolves.toEqual({ id: 71 });
    expect(createWorkspaceMock).toHaveBeenCalledWith({ adminUserId: 9, loanOfficerId: 12, invitedEmail: "loanofficer@example.com" });
    await admin.teamWorkspace.setStatus({ id: 71, status: "suspended" });
    expect(updateStatusMock).toHaveBeenCalledWith({ adminUserId: 9, id: 71, status: "suspended" });
    await expect(appRouter.createCaller(context("team_member")).teamWorkspace.createInvite({ loanOfficerId: 12, invitedEmail: "another@example.com" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires an authenticated invited user to activate their own workspace", async () => {
    const member = appRouter.createCaller(context("user", "loanofficer@example.com"));
    await expect(member.teamWorkspace.activateMyWorkspace()).resolves.toEqual({ id: 71, success: true });
    expect(activateMock).toHaveBeenCalledWith({ memberUserId: 18, memberEmail: "loanofficer@example.com" });
  });

  it("returns only team-approved library content to an active team member while admin retains private visibility", async () => {
    const member = appRouter.createCaller(context("team_member"));
    await member.teamTemplates.list();
    expect(listTemplatesMock).toHaveBeenCalledWith({ adminUserId: 9, includePrivate: false });
    const admin = appRouter.createCaller(context("admin"));
    await admin.teamTemplates.list();
    expect(listTemplatesMock).toHaveBeenCalledWith({ adminUserId: 9, includePrivate: true });
    await expect(member.teamTemplates.create({ channel: "text", name: "Test", bodyTemplate: "Hello", availability: "team_read_only" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows only Mike Ford admin to retrieve a team member's cross-section shadow snapshot", async () => {
    const admin = appRouter.createCaller(context("admin"));
    await expect(admin.teamWorkspace.shadowSnapshot({ memberUserId: 18 })).resolves.toMatchObject({
      workspace: { loanOfficerId: 12 },
      roadmapLeads: [{ id: 101 }],
      chatIntakes: [{ id: 201 }],
      platformLeads: [{ id: 301 }],
      quotes: [{ id: 401 }],
      spendEntries: [{ id: 501 }],
    });
    await expect(appRouter.createCaller(context("team_member")).teamWorkspace.shadowSnapshot({ memberUserId: 18 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps a team member's platform lead inbox owned by their user account and pinned to their assigned loan-officer profile", async () => {
    const member = appRouter.createCaller(context("team_member"));
    await member.platformLeads.list();
    expect(listPlatformLeadsMock).toHaveBeenCalledWith(18, undefined);
    await member.platformLeads.createManual({ leadSource: "organic", fullName: "Jordan Buyer", email: "jordan@example.com" });
    expect(createPlatformLeadMock).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 18, assignedLoanOfficerId: 12 }));
  });

  it("keeps saved quotes and campaign spend owned by the active team member account", async () => {
    const member = appRouter.createCaller(context("team_member"));
    await member.mortgageQuotes.list();
    await member.campaignSpend.list();
    expect(listMortgageQuoteMock).toHaveBeenCalledWith(18);
    expect(listCampaignSpendMock).toHaveBeenCalledWith(18);
  });

  it("filters team member property-page inventory to the assigned loan-officer profile", async () => {
    await appRouter.createCaller(context("team_member")).propertyPages.list();
    expect(listPropertyPagesMock).toHaveBeenCalledWith(12);
  });

  it("retrieves a co-branded partner only through the active assigned loan-officer profile", async () => {
    await expect(appRouter.createCaller(context("team_member")).teamWorkspace.partnerProfile()).resolves.toMatchObject({ officer: { id: 12 } });
  });

  it("keeps the private spend tracker owned by the active team member account", async () => {
    await appRouter.createCaller(context("team_member")).pairingSpendTracker.list();
    expect(listSpendTrackersMock).toHaveBeenCalledWith(18);
  });
});
