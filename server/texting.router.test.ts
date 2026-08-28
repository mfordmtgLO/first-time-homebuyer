import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listTextReadyRecipients: vi.fn(async () => []),
    createTextMessageDraft: vi.fn(async () => 201),
    createTextMessageForTwilioDelivery: vi.fn(async () => ({ textMessageId: 301, recipients: [] })),
    updateTextMessageRecipientDelivery: vi.fn(async () => undefined),
    updateTextMessageProviderMode: vi.fn(async () => undefined),
    recordTextChainEvent: vi.fn(async () => 401),
    listTextMessageDrafts: vi.fn(async () => []),
    listTextChainByLead: vi.fn(async () => []),
  };
});

vi.mock("./storage", () => ({ storagePut: vi.fn(async () => ({ key: "text-drafts/1/example.jpg", url: "/manus-storage/text-drafts/1/example.jpg" })) }));
vi.mock("./twilio", () => ({
  getTwilioReadiness: vi.fn(),
  sendTwilioTextMessage: vi.fn(),
  safeTwilioErrorMessage: vi.fn(() => "Twilio could not accept this message. Review the recipient’s consent, phone number, and approved Twilio sender."),
}));

import { appRouter } from "./routers";
import {
  createTextMessageDraft,
  createTextMessageForTwilioDelivery,
  listTextChainByLead,
  listTextReadyRecipients,
  recordTextChainEvent,
  updateTextMessageProviderMode,
  updateTextMessageRecipientDelivery,
} from "./db";
import { getTwilioReadiness, sendTwilioTextMessage } from "./twilio";
import type { TrpcContext } from "./_core/context";

const listTextReadyRecipientsMock = vi.mocked(listTextReadyRecipients);
const createTextMessageDraftMock = vi.mocked(createTextMessageDraft);
const createTextMessageForTwilioDeliveryMock = vi.mocked(createTextMessageForTwilioDelivery);
const updateTextMessageRecipientDeliveryMock = vi.mocked(updateTextMessageRecipientDelivery);
const updateTextMessageProviderModeMock = vi.mocked(updateTextMessageProviderMode);
const recordTextChainEventMock = vi.mocked(recordTextChainEvent);
const listTextChainByLeadMock = vi.mocked(listTextChainByLead);
const getTwilioReadinessMock = vi.mocked(getTwilioReadiness);
const sendTwilioTextMessageMock = vi.mocked(sendTwilioTextMessage);

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

const NOT_CONFIGURED = {
  configured: false,
  mode: "provider_setup_required" as const,
  detail: "Secure Twilio setup is incomplete. Text drafts may be saved, but no messages can be sent.",
  statusCallbackUrl: "https://firsttimehomebuyer.manus.space/api/twilio/status",
};

const CONFIGURED = {
  configured: true,
  mode: "twilio_from_number" as const,
  detail: "Twilio is configured for owner-confirmed one-to-one SMS/MMS delivery.",
  statusCallbackUrl: "https://firsttimehomebuyer.manus.space/api/twilio/status",
};

describe("controlled Twilio texting workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTextReadyRecipientsMock.mockResolvedValue([CONSENTED_RECIPIENT]);
    createTextMessageDraftMock.mockResolvedValue(201 as never);
    createTextMessageForTwilioDeliveryMock.mockImplementation(async (input) => ({ textMessageId: 301, recipients: input.recipients.map((recipient, index) => ({ ...recipient, id: 501 + index })) }));
    listTextChainByLeadMock.mockResolvedValue([]);
    getTwilioReadinessMock.mockReturnValue(NOT_CONFIGURED);
  });

  it("exposes a non-secret no-provider state and only returns text-ready recipients", async () => {
    listTextReadyRecipientsMock.mockResolvedValue([CONSENTED_RECIPIENT, { ...CONSENTED_RECIPIENT, sourceLeadId: 45, phone: "555-555-5555" }]);
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.texting.status()).resolves.toMatchObject({ providerConfigured: false, mode: "provider_setup_required" });
    await expect(caller.texting.recipients()).resolves.toEqual([expect.objectContaining({ sourceLeadId: 44, sourceType: "roadmap" })]);
  });

  it("saves individual recipient records as a draft without provider delivery", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.texting.saveDraft({
      body: "Hi Sarah — thank you for requesting your Roadmap.",
      recipients: [{ sourceType: "roadmap", sourceLeadId: 44 }],
      attachments: [{ storageKey: "text-drafts/1/example.jpg", url: "/manus-storage/text-drafts/1/example.jpg", fileName: "roadmap.jpg", mimeType: "image/jpeg", sizeBytes: 1234 }],
    })).resolves.toMatchObject({ messageId: 201, providerConfigured: false, deliveryMode: "provider_setup_required" });
    expect(createTextMessageDraftMock).toHaveBeenCalledWith(expect.objectContaining({ createdByUserId: 1, recipients: [expect.objectContaining({ sourceLeadId: 44, phone: "(541) 729-0819" })] }));
    expect(sendTwilioTextMessageMock).not.toHaveBeenCalled();
  });

  it("rejects text attachments that were not uploaded under the current administrator’s storage prefix", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.texting.saveDraft({
      body: "Hi Sarah — thank you for requesting your Roadmap.",
      recipients: [{ sourceType: "roadmap", sourceLeadId: 44 }],
      attachments: [{ storageKey: "text-drafts/999/other.jpg", url: "/manus-storage/text-drafts/999/other.jpg", fileName: "roadmap.jpg", mimeType: "image/jpeg", sizeBytes: 1234 }],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(createTextMessageDraftMock).not.toHaveBeenCalled();
  });

  it("rejects unowned MMS attachments before a confirmed delivery attempt", async () => {
    getTwilioReadinessMock.mockReturnValue(CONFIGURED);
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.texting.sendConfirmed({
      confirmation: true,
      body: "Hi Sarah — thank you for your request.",
      recipients: [{ sourceType: "roadmap", sourceLeadId: 44 }],
      attachments: [{ storageKey: "text-drafts/999/other.jpg", url: "/manus-storage/text-drafts/999/other.jpg", fileName: "roadmap.jpg", mimeType: "image/jpeg", sizeBytes: 1234 }],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(createTextMessageForTwilioDeliveryMock).not.toHaveBeenCalled();
    expect(sendTwilioTextMessageMock).not.toHaveBeenCalled();
  });

  it("rejects non-JPEG upload bytes even when a caller labels them as a JPG", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.texting.uploadJpg({ fileName: "not-a-jpeg.jpg", dataBase64: Buffer.from("not a jpeg").toString("base64") })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("sends only after an administrator makes an explicit confirmation and records the provider message ID", async () => {
    getTwilioReadinessMock.mockReturnValue(CONFIGURED);
    sendTwilioTextMessageMock.mockResolvedValue({ providerMessageId: "SM123", deliveryStatus: "queued" });
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.texting.sendConfirmed({
      confirmation: true,
      body: "Hi Sarah — thank you for your request.",
      recipients: [{ sourceType: "roadmap", sourceLeadId: 44 }],
      attachments: [],
    })).resolves.toMatchObject({ messageId: 301, sentCount: 1, failedCount: 0, outcomes: [expect.objectContaining({ status: "queued", sent: true })] });
    expect(createTextMessageForTwilioDeliveryMock).toHaveBeenCalledWith(expect.objectContaining({ createdByUserId: 1, recipients: [expect.objectContaining({ sourceLeadId: 44 })] }));
    expect(sendTwilioTextMessageMock).toHaveBeenCalledWith(expect.objectContaining({ to: "(541) 729-0819" }));
    expect(updateTextMessageRecipientDeliveryMock).toHaveBeenCalledWith(expect.objectContaining({ textMessageRecipientId: 501, providerMessageId: "SM123", deliveryStatus: "queued" }));
    expect(recordTextChainEventMock).toHaveBeenCalledWith(expect.objectContaining({ providerName: "twilio", providerMessageId: "SM123", eventStatus: "queued" }));
  });

  it("records a safe failed audit status without a retry when Twilio rejects an individual recipient", async () => {
    getTwilioReadinessMock.mockReturnValue(CONFIGURED);
    sendTwilioTextMessageMock.mockRejectedValue(new Error("provider diagnostic must not reach the dashboard"));
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.texting.sendConfirmed({
      confirmation: true,
      body: "Hi Sarah — thank you for your request.",
      recipients: [{ sourceType: "roadmap", sourceLeadId: 44 }],
      attachments: [],
    })).resolves.toMatchObject({ sentCount: 0, failedCount: 1, outcomes: [expect.objectContaining({ sent: false, status: "failed", detail: "Twilio could not accept this message. Review the recipient’s consent, phone number, and approved Twilio sender." })] });
    expect(updateTextMessageRecipientDeliveryMock).toHaveBeenCalledWith(expect.objectContaining({ textMessageRecipientId: 501, deliveryStatus: "failed" }));
    expect(recordTextChainEventMock).toHaveBeenCalledWith(expect.objectContaining({ providerName: "twilio", eventStatus: "failed" }));
    expect(updateTextMessageProviderModeMock).toHaveBeenCalledWith({ textMessageId: 301, providerMode: "failed" });
    expect(sendTwilioTextMessageMock).toHaveBeenCalledTimes(1);
  });

  it("does not permit a live send when secure Twilio configuration is absent", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.texting.sendConfirmed({ confirmation: true, body: "A text", recipients: [{ sourceType: "roadmap", sourceLeadId: 44 }], attachments: [] })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(createTextMessageForTwilioDeliveryMock).not.toHaveBeenCalled();
  });

  it("rechecks current consent and valid phone values immediately before sending", async () => {
    listTextReadyRecipientsMock.mockResolvedValue([]);
    getTwilioReadinessMock.mockReturnValue(CONFIGURED);
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.texting.sendConfirmed({ confirmation: true, body: "A text", recipients: [{ sourceType: "roadmap", sourceLeadId: 44 }], attachments: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(createTextMessageForTwilioDeliveryMock).not.toHaveBeenCalled();
    expect(sendTwilioTextMessageMock).not.toHaveBeenCalled();
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
    await expect(caller.texting.saveDraft({ body: "A future message", recipients: [{ sourceType: "chat", sourceLeadId: 99 }], attachments: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("keeps live texting and stored workspace records restricted to the dashboard owner", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.texting.status()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.texting.sendConfirmed({ confirmation: true, body: "A text", recipients: [{ sourceType: "roadmap", sourceLeadId: 44 }], attachments: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(updateTextMessageProviderModeMock).not.toHaveBeenCalled();
  });
});
