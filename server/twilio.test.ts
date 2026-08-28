import { describe, expect, it } from "vitest";
import twilio from "twilio";
import { getTwilioStatusCallbackUrl, normalizeUsPhoneToE164, parseTwilioCallbackStatus, validateTwilioStatusCallback } from "./twilio";

describe("Twilio messaging safeguards", () => {
  it("uses the fixed production callback URL and normalizes only valid U.S. destinations", () => {
    expect(getTwilioStatusCallbackUrl()).toBe("https://firsttimehomebuyer.manus.space/api/twilio/status");
    expect(normalizeUsPhoneToE164("(541) 729-0819")).toBe("+15417290819");
    expect(normalizeUsPhoneToE164("+15417290819")).toBe("+15417290819");
    expect(normalizeUsPhoneToE164("555-555-5555")).toBe("+15555555555");
    expect(normalizeUsPhoneToE164("not-a-phone")).toBeNull();
  });

  it("accepts a Twilio SDK signature for the full callback parameters and rejects altered data", () => {
    const token = process.env.TWILIO_AUTH_TOKEN;
    expect(token).toBeTruthy();
    const params = { MessageSid: "SM123", MessageStatus: "delivered", ErrorCode: "" };
    const signature = twilio.getExpectedTwilioSignature(token!, getTwilioStatusCallbackUrl(), params);
    expect(validateTwilioStatusCallback(signature, params)).toBe(true);
    expect(validateTwilioStatusCallback(signature, { ...params, MessageStatus: "failed" })).toBe(false);
  });

  it("limits persisted delivery states to queued, sent, delivered, failed, and undelivered", () => {
    expect(parseTwilioCallbackStatus("sent")).toBe("sent");
    expect(parseTwilioCallbackStatus("delivered")).toBe("delivered");
    expect(parseTwilioCallbackStatus("failed")).toBe("failed");
    expect(parseTwilioCallbackStatus("undelivered")).toBe("undelivered");
    expect(parseTwilioCallbackStatus("read")).toBeNull();
  });

  it("returns provider error codes only as a safe reference, never raw Twilio diagnostics", async () => {
    const { safeTwilioErrorMessage } = await import("./twilio");
    expect(safeTwilioErrorMessage({ code: 21408, message: "sensitive provider diagnostic" })).toBe("Twilio could not accept this message. Review the recipient’s consent, phone number, and approved Twilio sender (Twilio error code 21408).");
    expect(safeTwilioErrorMessage({ status: 401, message: "sensitive provider diagnostic" })).toBe("Twilio could not accept this message. Review the recipient’s consent, phone number, and approved Twilio sender (Twilio request status 401).");
  });
});
