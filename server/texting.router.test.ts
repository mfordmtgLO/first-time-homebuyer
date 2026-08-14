import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listTextReadyRecipients: vi.fn(async () => []),
    createTextMessageDraft: vi.fn(async () => 201),
    listTextMessageDrafts: vi.fn(async () => []),
    listTextChainByLead: vi.fn(async () => []),
  };
});

vi.mock("./storage", () => ({ storagePut: vi.fn(async () => ({ key: "text-drafts/1/example.jpg", url: "/manus-storage/text-drafts/1/example.jpg" })) }));

import { appRouter } from "./routers";
import { createTextMessageDraft, listTextChainByLead, listTextReadyRecipients } from "./db";
import type { TrpcContext } from "./_core/context";

const listTextReadyRecipientsMock = vi.mocked(listTextReadyRecipients);
const createTextMessageDraftMock = vi.mocked(createTextMessageDraft);
const listTextChainByLeadMock = vi.mocked(listTextChainByLead);

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: { id: 1, openId: role, email: `${role}@example.com`, name: role, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const CONSENTED_RECIPIENT = {
  sourceType: "roadmap" as const,
  sourceLeadId: 44,
  name: "Sarah",
  phone: "(541) 729-0819",
  email: "sarah@example.com",
  consentedAt: new Date("2026-08-14T00:00:00Z"),
  createdAt: new Date("2026-08-14T00:00:00Z"),
};

describe("provider-ready texting workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTextReadyRecipientsMock.mockResolvedValue([CONSENTED_RECIPIENT]);
    createTextMessageDraftMock.mockResolvedValue(201 as never);
    listTextChainByLeadMock.mockResolvedValue([]);
  });

  it("exposes an explicit no-provider state and only returns text-ready recipients", async () => {
    listTextReadyRecipientsMock.mockResolvedValue([CONSENTED_RECIPIENT, { ...CONSENTED_RECIPIENT, sourceLeadId: 45, phone: "555-555-5555" }]);
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.texting.status()).resolves.toMatchObject({ providerConfigured: false, mode: "provider_setup_required" });
    await expect(caller.texting.recipients()).resolves.toEqual([expect.objectContaining({ sourceLeadId: 44, sourceType: "roadmap" })]);
  });

  it("saves individual recipient records as a draft and never exposes a sending procedure", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.texting.saveDraft({
      body: "Hi Sarah — thank you for requesting your Roadmap.",
      recipients: [{ sourceType: "roadmap", sourceLeadId: 44 }],
      attachments: [{ storageKey: "text-drafts/1/example.jpg", url: "/manus-storage/text-drafts/1/example.jpg", fileName: "roadmap.jpg", mimeType: "image/jpeg", sizeBytes: 1234 }],
    })).resolves.toMatchObject({ messageId: 201, providerConfigured: false, deliveryMode: "provider_setup_required" });
    expect(createTextMessageDraftMock).toHaveBeenCalledWith(expect.objectContaining({
      createdByUserId: 1,
      recipients: [expect.objectContaining({ sourceLeadId: 44, phone: "(541) 729-0819" })],
    }));
  });

  it("returns a consented lead's Text Chain history only to the dashboard owner", async () => {
    const chain = [{ id: "draft-1", direction: "outgoing" as const, body: "Review this website: https://firsttimehomebuyer.manus.space", status: "provider_setup_required", senderLabel: "Mike Ford", occurredAt: new Date("2026-08-14T12:00:00Z"), attachments: [], providerName: null }];
    listTextChainByLeadMock.mockResolvedValue(chain);
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.texting.chain({ sourceType: "roadmap", sourceLeadId: 44 })).resolves.toEqual(chain);
    expect(listTextChainByLeadMock).toHaveBeenCalledWith({ sourceType: "roadmap", sourceLeadId: 44 });
    const nonAdmin = appRouter.createCaller(context("user"));
    await expect(nonAdmin.texting.chain({ sourceType: "roadmap", sourceLeadId: 44 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects recipient selections that no longer satisfy the text-ready rule", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.texting.saveDraft({
      body: "A future message",
      recipients: [{ sourceType: "chat", sourceLeadId: 99 }],
      attachments: [],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("keeps texting workspace records restricted to the dashboard owner", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.texting.status()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
