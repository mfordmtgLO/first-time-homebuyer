import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listEmailTemplateVersions: vi.fn(async () => []),
    getEmailTemplateVersion: vi.fn(async () => undefined),
    updateListingAgentEmailTemplate: vi.fn(async (input: { id: number; name: string; bodyTemplate: string }) => ({ ...input, isBuiltIn: 0, createdAt: new Date(), updatedAt: new Date() })),
    recordEmailTemplateVersion: vi.fn(async () => undefined),
  };
});

import { appRouter } from "./routers";
import { getEmailTemplateVersion, listEmailTemplateVersions, recordEmailTemplateVersion, updateListingAgentEmailTemplate } from "./db";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;
const snapshot = {
  id: 44,
  templateScope: "listing_agent" as const,
  templateId: 17,
  ownerUserId: 1,
  versionNumber: 2,
  name: "Updated outreach",
  subjectTemplate: null,
  bodyTemplate: "<p>Updated client-ready outreach copy.</p>",
  createdAt: new Date("2026-08-19T10:00:00.000Z"),
};

function createContext(role: "admin" | "user"): TrpcContext {
  const user: AuthenticatedUser = { id: 1, openId: `version-${role}`, email: `${role}@example.com`, name: "Template Owner", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => {} } as unknown as TrpcContext["res"] };
}

describe("template version history", () => {
  const listVersionsMock = vi.mocked(listEmailTemplateVersions);
  const getVersionMock = vi.mocked(getEmailTemplateVersion);
  const updateListingTemplateMock = vi.mocked(updateListingAgentEmailTemplate);
  const recordVersionMock = vi.mocked(recordEmailTemplateVersion);

  beforeEach(() => {
    vi.clearAllMocks();
    listVersionsMock.mockResolvedValue([snapshot] as never);
    getVersionMock.mockResolvedValue(snapshot as never);
  });

  it("lists only the current administrator's snapshots for the requested template", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(caller.templateVersions.list({ templateScope: "listing_agent", templateId: 17 })).resolves.toEqual([snapshot]);
    expect(listVersionsMock).toHaveBeenCalledWith({ templateScope: "listing_agent", templateId: 17, ownerUserId: 1 });
  });

  it("blocks non-administrators from viewing or restoring versions", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.templateVersions.list({ templateScope: "listing_agent", templateId: 17 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.templateVersions.restore({ id: 44 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(listVersionsMock).not.toHaveBeenCalled();
    expect(getVersionMock).not.toHaveBeenCalled();
  });

  it("restores the selected snapshot and records the restore as a new immutable revision", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await caller.templateVersions.restore({ id: 44 });
    expect(getVersionMock).toHaveBeenCalledWith({ id: 44, ownerUserId: 1 });
    expect(updateListingTemplateMock).toHaveBeenCalledWith({ id: 17, name: "Updated outreach", bodyTemplate: "<p>Updated client-ready outreach copy.</p>" });
    expect(recordVersionMock).toHaveBeenCalledWith(expect.objectContaining({ templateScope: "listing_agent", templateId: 17, ownerUserId: 1, name: "Updated outreach" }));
  });
});
