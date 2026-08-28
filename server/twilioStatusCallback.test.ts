import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ applyTwilioDeliveryStatusCallback: vi.fn(async () => ({ found: true, duplicate: false, textMessageRecipientId: 501 })) }));
vi.mock("./twilio", () => ({
  getTwilioReadiness: vi.fn(),
  parseTwilioCallbackStatus: vi.fn((value: unknown) => value === "delivered" ? "delivered" : null),
  validateTwilioStatusCallback: vi.fn(),
}));

import { applyTwilioDeliveryStatusCallback } from "./db";
import { getTwilioReadiness, validateTwilioStatusCallback } from "./twilio";
import { twilioStatusCallbackHandler } from "./twilioStatusCallback";

const getTwilioReadinessMock = vi.mocked(getTwilioReadiness);
const validateTwilioStatusCallbackMock = vi.mocked(validateTwilioStatusCallback);
const applyTwilioDeliveryStatusCallbackMock = vi.mocked(applyTwilioDeliveryStatusCallback);

function responseRecorder() {
  const result = { statusCode: 200, body: "", ended: false };
  const response = {
    status(code: number) { result.statusCode = code; return response; },
    send(body: string) { result.body = body; return response; },
    end() { result.ended = true; return response; },
  };
  return { response, result };
}

const CONFIGURED = { configured: true, mode: "twilio_from_number" as const, detail: "Configured", statusCallbackUrl: "https://firsttimehomebuyer.manus.space/api/twilio/status" };

describe("Twilio delivery status callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTwilioReadinessMock.mockReturnValue(CONFIGURED);
    validateTwilioStatusCallbackMock.mockReturnValue(true);
    applyTwilioDeliveryStatusCallbackMock.mockResolvedValue({ found: true, duplicate: false, textMessageRecipientId: 501 });
  });

  it("rejects an unsigned or invalid callback before any database write", async () => {
    validateTwilioStatusCallbackMock.mockReturnValue(false);
    const { response, result } = responseRecorder();
    await twilioStatusCallbackHandler({ body: { MessageSid: "SM123", MessageStatus: "delivered" }, header: () => undefined } as never, response as never);
    expect(result.statusCode).toBe(403);
    expect(applyTwilioDeliveryStatusCallbackMock).not.toHaveBeenCalled();
  });

  it("records a signed delivery update using the provider message ID", async () => {
    const { response, result } = responseRecorder();
    const sid = "SM0123456789abcdef0123456789abcdef";
    await twilioStatusCallbackHandler({ body: { MessageSid: sid, MessageStatus: "delivered" }, header: (name: string) => name === "X-Twilio-Signature" ? "valid-signature" : undefined } as never, response as never);
    expect(validateTwilioStatusCallbackMock).toHaveBeenCalledWith("valid-signature", { MessageSid: sid, MessageStatus: "delivered" });
    expect(applyTwilioDeliveryStatusCallbackMock).toHaveBeenCalledWith({ providerMessageId: sid, deliveryStatus: "delivered", deliveryDetail: "Twilio reported delivered." });
    expect(result.statusCode).toBe(204);
    expect(result.ended).toBe(true);
  });

  it("ignores signed unknown statuses and unknown provider IDs safely", async () => {
    const { response, result } = responseRecorder();
    await twilioStatusCallbackHandler({ body: { MessageSid: "SM999", MessageStatus: "read" }, header: (name: string) => name === "X-Twilio-Signature" ? "valid-signature" : undefined } as never, response as never);
    expect(result.statusCode).toBe(204);
    expect(applyTwilioDeliveryStatusCallbackMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized signature and ignores malformed provider IDs before database access", async () => {
    const { response: oversizedResponse, result: oversizedResult } = responseRecorder();
    await twilioStatusCallbackHandler({ body: { MessageSid: "SM0123456789abcdef0123456789abcdef", MessageStatus: "delivered" }, header: (name: string) => name === "X-Twilio-Signature" ? "x".repeat(257) : undefined } as never, oversizedResponse as never);
    expect(oversizedResult.statusCode).toBe(403);
    expect(applyTwilioDeliveryStatusCallbackMock).not.toHaveBeenCalled();

    const { response: malformedResponse, result: malformedResult } = responseRecorder();
    await twilioStatusCallbackHandler({ body: { MessageSid: "SM123", MessageStatus: "delivered" }, header: (name: string) => name === "X-Twilio-Signature" ? "valid-signature" : undefined } as never, malformedResponse as never);
    expect(malformedResult.statusCode).toBe(204);
    expect(applyTwilioDeliveryStatusCallbackMock).not.toHaveBeenCalled();
  });

  it("rejects non-form content and oversized callback fields before signature validation", async () => {
    const sid = "SM0123456789abcdef0123456789abcdef";
    const { response: jsonResponse, result: jsonResult } = responseRecorder();
    await twilioStatusCallbackHandler({ body: { MessageSid: sid, MessageStatus: "delivered" }, header: (name: string) => name === "Content-Type" ? "application/json" : "valid-signature" } as never, jsonResponse as never);
    expect(jsonResult.statusCode).toBe(415);
    expect(validateTwilioStatusCallbackMock).not.toHaveBeenCalled();

    const { response: oversizedResponse, result: oversizedResult } = responseRecorder();
    await twilioStatusCallbackHandler({ body: { MessageSid: sid, MessageStatus: "delivered", Extra: "x".repeat(8_001) }, header: (name: string) => name === "X-Twilio-Signature" ? "valid-signature" : undefined } as never, oversizedResponse as never);
    expect(oversizedResult.statusCode).toBe(403);
    expect(validateTwilioStatusCallbackMock).not.toHaveBeenCalled();
  });

  it("remains unavailable without complete protected configuration", async () => {
    getTwilioReadinessMock.mockReturnValue({ configured: false, mode: "provider_setup_required", detail: "Incomplete", statusCallbackUrl: "https://firsttimehomebuyer.manus.space/api/twilio/status" });
    const { response, result } = responseRecorder();
    await twilioStatusCallbackHandler({ body: { MessageSid: "SM123", MessageStatus: "delivered" }, header: () => "valid-signature" } as never, response as never);
    expect(result.statusCode).toBe(503);
    expect(validateTwilioStatusCallbackMock).not.toHaveBeenCalled();
  });
});
