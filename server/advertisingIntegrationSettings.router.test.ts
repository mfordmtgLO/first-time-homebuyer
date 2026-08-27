import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listAdvertisingIntegrationSettings: vi.fn(async () => []),
    saveAdvertisingIntegrationSetting: vi.fn(async (input) => ({ id: 811, ...input, createdAt: new Date(), updatedAt: new Date() })),
  };
});

import { appRouter } from "./routers";
import { listAdvertisingIntegrationSettings, saveAdvertisingIntegrationSetting } from "./db";
import type { TrpcContext } from "./_core/context";

const listSettingsMock = vi.mocked(listAdvertisingIntegrationSettings);
const saveSettingsMock = vi.mocked(saveAdvertisingIntegrationSetting);

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
    await expect(appRouter.createCaller(context("team_member")).adIntegrationSettings.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(context("team_member")).adIntegrationSettings.save({ provider: "google_ads", setupStage: "details_saved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps credentials, webhooks, and lead imports explicitly unavailable in planning-only UI", async () => {
    const root = resolve(import.meta.dirname, "..");
    const source = await readFile(resolve(root, "client/src/components/AdvertisingIntegrationSettings.tsx"), "utf8");
    expect(source).toContain("No credentials, webhooks, or lead imports enabled");
    expect(source).toContain("Account reference (non-secret)");
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
