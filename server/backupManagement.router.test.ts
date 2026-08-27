import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listBackupHistoryEvents: vi.fn(async () => []),
    createBackupHistoryEvent: vi.fn(async (input) => ({ id: 601, ...input, createdAt: new Date() })),
  };
});

import { appRouter } from "./routers";
import { createBackupHistoryEvent, listBackupHistoryEvents } from "./db";
import type { TrpcContext } from "./_core/context";

const listHistoryMock = vi.mocked(listBackupHistoryEvents);
const createHistoryMock = vi.mocked(createBackupHistoryEvent);

function context(role: "admin" | "team_member" | "user"): TrpcContext {
  return {
    user: { id: role === "admin" ? 9 : 18, openId: `backup-${role}`, name: role === "admin" ? "Mike Ford" : "Team Member", email: "member@example.com", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("backup management", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps backup history search and date filters administrator-only", async () => {
    const admin = appRouter.createCaller(context("admin"));
    const startDate = new Date("2026-08-01T00:00:00.000Z");
    const endDate = new Date("2026-08-31T23:59:59.999Z");
    await admin.backupManagement.list({ query: "all tasks", startDate, endDate, limit: 30 });
    expect(listHistoryMock).toHaveBeenCalledWith({ ownerUserId: 9, query: "all tasks", startDate, endDate, limit: 30 });
    await expect(appRouter.createCaller(context("team_member")).backupManagement.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("records only administrator-confirmed backup and restoration events", async () => {
    const occurredAt = new Date("2026-08-27T12:00:00.000Z");
    await appRouter.createCaller(context("admin")).backupManagement.recordEvent({
      eventType: "restore_confirmed",
      label: "Official restore completed",
      packageReference: "all-tasks-2026-08-27",
      notes: "Verified in official restore portal.",
      occurredAt,
    });
    expect(createHistoryMock).toHaveBeenCalledWith({
      ownerUserId: 9,
      eventType: "restore_confirmed",
      label: "Official restore completed",
      packageReference: "all-tasks-2026-08-27",
      notes: "Verified in official restore portal.",
      occurredAt,
    });
    await expect(appRouter.createCaller(context("user")).backupManagement.recordEvent({ eventType: "backup_created", label: "Unauthorized", occurredAt })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an inverted backup-history date range", async () => {
    await expect(appRouter.createCaller(context("admin")).backupManagement.list({ startDate: new Date("2026-09-01"), endDate: new Date("2026-08-01") })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("uses confirmation and owner-recorded feedback instead of claiming an automatic restore", async () => {
    const root = resolve(import.meta.dirname, "..");
    const source = await readFile(resolve(root, "client/src/components/BackupManagementPanel.tsx"), "utf8");
    expect(source).toContain("Open official restore portal");
    expect(source).toContain("AlertDialog");
    expect(source).toContain("Restoration completion recorded.");
    expect(source).toContain("Search backup history");
    expect(source).toContain("This dashboard cannot restore data");
  });
});
