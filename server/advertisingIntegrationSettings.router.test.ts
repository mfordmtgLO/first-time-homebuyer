import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listAdvertisingIntegrationSettings: vi.fn(async () => []),
    saveAdvertisingIntegrationSetting: vi.fn(async (input) => ({ id: 811, ...input, createdAt: new Date(), updatedAt: new Date() })),
    getAdvertisingIntegrationModuleVisibility: vi.fn(async () => ({ isVisible: true })),
    saveAdvertisingIntegrationModuleVisibility: vi.fn(async (input) => ({ isVisible: input.isVisible })),
    saveAdvertisingIntegrationChecklist: vi.fn(async (input) => ({ checklist: input.checklist })),
    saveAdvertisingIntegrationChecklistReminder: vi.fn(async () => ({ checklistReminderAt: new Date("2026-09-03T00:00:00.000Z") })),
    resetAdvertisingIntegrationChecklist: vi.fn(async () => ({ isVisible: true, checklist: {}, checklistReminderAt: null })),
  };
});

import { appRouter } from "./routers";
import { getAdvertisingIntegrationModuleVisibility, listAdvertisingIntegrationSettings, resetAdvertisingIntegrationChecklist, saveAdvertisingIntegrationChecklist, saveAdvertisingIntegrationChecklistReminder, saveAdvertisingIntegrationModuleVisibility, saveAdvertisingIntegrationSetting } from "./db";
import type { TrpcContext } from "./_core/context";

const listSettingsMock = vi.mocked(listAdvertisingIntegrationSettings);
const saveSettingsMock = vi.mocked(saveAdvertisingIntegrationSetting);
const getModuleVisibilityMock = vi.mocked(getAdvertisingIntegrationModuleVisibility);
const saveModuleVisibilityMock = vi.mocked(saveAdvertisingIntegrationModuleVisibility);
const saveChecklistMock = vi.mocked(saveAdvertisingIntegrationChecklist);
const saveChecklistReminderMock = vi.mocked(saveAdvertisingIntegrationChecklistReminder);
const resetChecklistMock = vi.mocked(resetAdvertisingIntegrationChecklist);

function context(role: "admin" | "team_member"): TrpcContext {
  return {
    user: { id: role === "admin" ? 9 : 18, openId: `ad-settings-${role}`, name: role === "admin" ? "Mike Ford" : "Team Officer", email: "team@example.com", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("advertising integration planning settings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows only the administrator to list and save non-secret Meta or Google planning state", async () => {
    const admin = appRouter.createCaller(context("admin"));
    await admin.adIntegrationSettings.list();
    expect(listSettingsMock).toHaveBeenCalledWith(9);
    await admin.adIntegrationSettings.save({
      provider: "meta",
      setupStage: "compliance_pending",
      accountReference: "Team Meta account ID",
      formReference: "First home form",
      internalNote: "Awaiting approved consent copy.",
    });
    expect(saveSettingsMock).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 9, provider: "meta", setupStage: "compliance_pending" }));
    await admin.adIntegrationSettings.moduleVisibility();
    expect(getModuleVisibilityMock).toHaveBeenCalledWith(9);
    await admin.adIntegrationSettings.setModuleVisibility({ isVisible: false });
    expect(saveModuleVisibilityMock).toHaveBeenCalledWith({ ownerUserId: 9, isVisible: false });
    await admin.adIntegrationSettings.saveChecklist({ accountCreated: true, complianceApproved: false, formMappingReady: false, secureKeyApproved: false, connectionReviewReady: false });
    expect(saveChecklistMock).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 9, checklist: expect.objectContaining({ accountCreated: true }) }));
    await admin.adIntegrationSettings.remindLater();
    expect(saveChecklistReminderMock).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 9, checklistReminderAt: expect.any(Date) }));
    await admin.adIntegrationSettings.resetChecklist();
    expect(resetChecklistMock).toHaveBeenCalledWith(9);
    await expect(appRouter.createCaller(context("team_member")).adIntegrationSettings.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(context("team_member")).adIntegrationSettings.save({ provider: "google_ads", setupStage: "details_saved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(context("team_member")).adIntegrationSettings.moduleVisibility()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(context("team_member")).adIntegrationSettings.setModuleVisibility({ isVisible: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(context("team_member")).adIntegrationSettings.saveChecklist({ accountCreated: false, complianceApproved: false, formMappingReady: false, secureKeyApproved: false, connectionReviewReady: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(context("team_member")).adIntegrationSettings.remindLater()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(context("team_member")).adIntegrationSettings.resetChecklist()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps key values outside the UI and retains credentials, webhooks, and lead imports as unavailable", async () => {
    const root = resolve(import.meta.dirname, "..");
    const source = await readFile(resolve(root, "client/src/components/AdvertisingIntegrationSettings.tsx"), "utf8");
    expect(source).toContain("No credentials, webhooks, or lead imports enabled");
    expect(source).toContain("Account ID (non-secret)");
    expect(source).toContain("API key values are never stored here, in GitHub, or in dashboard data.");
    expect(source).toContain("Once saved, no editing—delete and re-enter to change the API key.");
    expect(source).toContain('type="password"');
    expect(source).toContain("Inactive — Account ID missing");
    expect(source).toContain("Inactive — secure API key missing");
    expect(source).toContain("Ready to connect — still off");
    expect(source).toContain("Getting Started checklist");
    expect(source).toContain("Where to find {title} credentials");
    expect(source).toContain("developers.facebook.com/documentation/ads-commerce/marketing-api/get-started/authentication");
    expect(source).toContain("developers.google.com/google-ads/api/docs/oauth/overview");
    expect(source).toContain("Show advertising setup module");
    expect(source).toContain("setModuleVisibility");
    expect(source).toContain("Progress value={checklistProgress}");
    expect(source).toContain("Checklist progress");
    expect(source).toContain("Remind me later");
    expect(source).toContain("Reset checklist");
    expect(source).toContain("Watch tutorial");
    expect(source).toContain("Tutorial video placeholder");
    expect(source).toContain("Reset advertising checklist?");
    expect(source).toContain("Confirm reset");
    expect(source).toContain("Close tutorial");
    expect(source).toContain("Official setup references");
    expect(source).toContain("Meta Marketing API authentication guide");
    expect(source).toContain("Google Ads API OAuth guide");
    expect(source).toContain("Mark as watched");
    expect(source).toContain("Search Meta or Google guides");
    expect(source).toContain("Copy link");
    expect(source).toContain("checklistReminderDue");
    expect(source).toContain("saveChecklist");
    expect(source).toContain("motion-reduce:transition-none");
    const dashboardSource = await readFile(resolve(root, "client/src/pages/Leads.tsx"), "utf8");
    expect(dashboardSource).toContain("Ads module:");
    expect(dashboardSource).toContain('getElementById("advertising-integrations")?.scrollIntoView');
    expect(source).toContain("Test connection");
    expect(source).toContain("Revoke secure key");
    expect(source).toContain("disabled");
    expect(source).toContain("On hold");
  });

  it("offers a package download only when an HTTPS package URL is recorded", async () => {
    const root = resolve(import.meta.dirname, "..");
    const source = await readFile(resolve(root, "client/src/components/BackupManagementPanel.tsx"), "utf8");
    expect(source).toContain("getSecurePackageUrl");
    expect(source).toContain('url.protocol === "https:"');
    expect(source).toContain("Download package");
    expect(source).toContain("No secure package URL recorded");
  });
});
