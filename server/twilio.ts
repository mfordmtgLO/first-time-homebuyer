import twilio from "twilio";
import { PUBLIC_SITE_ORIGIN, publicSiteUrl } from "../shared/publicSiteUrl";
import { ENV } from "./_core/env";
import type { TwilioDeliveryStatus } from "./db";

export const TWILIO_STATUS_CALLBACK_PATH = "/api/twilio/status";

export function getTwilioStatusCallbackUrl() {
  return publicSiteUrl(TWILIO_STATUS_CALLBACK_PATH);
}

export function normalizeUsPhoneToE164(value: string) {
  const trimmed = value.trim();
  if (/^\+1\d{10}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (/^1\d{10}$/.test(digits)) return `+${digits}`;
  if (/^\d{10}$/.test(digits)) return `+1${digits}`;
  return null;
}

export function getTwilioReadiness() {
  const accountSid = ENV.twilioAccountSid.trim();
  const authToken = ENV.twilioAuthToken.trim();
  const fromNumber = normalizeUsPhoneToE164(ENV.twilioFromNumber);
  const configured = Boolean(/^AC[0-9a-f]{32}$/i.test(accountSid) && authToken && fromNumber);
  return {
    configured,
    mode: configured ? ("twilio_from_number" as const) : ("provider_setup_required" as const),
    detail: configured
      ? "Twilio is configured for owner-confirmed one-to-one SMS/MMS delivery. Each send rechecks recorded consent and a usable phone number."
      : "Secure Twilio setup is incomplete. Text drafts may be saved, but no messages can be sent.",
    statusCallbackUrl: getTwilioStatusCallbackUrl(),
  };
}

export function toTwilioMediaUrl(url: string) {
  if (url.startsWith("/")) return `${PUBLIC_SITE_ORIGIN}${url}`;
  return url;
}

export function mapTwilioStatus(value: string | null | undefined): TwilioDeliveryStatus {
  switch (value?.toLowerCase()) {
    case "sent": return "sent";
    case "delivered": return "delivered";
    case "failed": return "failed";
    case "undelivered": return "undelivered";
    case "queued":
    case "accepted":
    case "sending":
    default: return "queued";
  }
}

export function parseTwilioCallbackStatus(value: unknown): TwilioDeliveryStatus | null {
  if (typeof value !== "string") return null;
  switch (value.toLowerCase()) {
    case "queued":
    case "accepted":
    case "sending": return "queued";
    case "sent": return "sent";
    case "delivered": return "delivered";
    case "failed": return "failed";
    case "undelivered": return "undelivered";
    default: return null;
  }
}

export function safeTwilioErrorMessage(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? Number((error as { code?: unknown }).code) : null;
  const status = typeof error === "object" && error !== null && "status" in error ? Number((error as { status?: unknown }).status) : null;
  if (code === 21608) return "Twilio trial accounts can send only to Twilio-verified destination numbers.";
  if (code === 21606) return "The configured Twilio sender cannot send this SMS/MMS message.";
  if (code === 21211) return "The recipient phone number could not be accepted by Twilio.";
  const reference = Number.isFinite(code) && code && code > 0
    ? ` (Twilio error code ${code})`
    : Number.isFinite(status) && status && status >= 100
      ? ` (Twilio request status ${status})`
      : "";
  return `Twilio could not accept this message. Review the recipient’s consent, phone number, and approved Twilio sender${reference}.`;
}

export async function sendTwilioTextMessage(input: { to: string; body: string; attachmentUrls: string[] }) {
  const readiness = getTwilioReadiness();
  if (!readiness.configured) throw new Error("Twilio texting is not securely configured.");
  const to = normalizeUsPhoneToE164(input.to);
  if (!to) throw new Error("This lead’s phone number cannot be sent as a U.S. E.164 SMS/MMS destination.");

  const message = await twilio(ENV.twilioAccountSid.trim(), ENV.twilioAuthToken.trim()).messages.create({
    to,
    from: normalizeUsPhoneToE164(ENV.twilioFromNumber)!,
    body: input.body,
    ...(input.attachmentUrls.length ? { mediaUrl: input.attachmentUrls.map(toTwilioMediaUrl) } : {}),
    statusCallback: readiness.statusCallbackUrl,
  });
  return { providerMessageId: message.sid, deliveryStatus: mapTwilioStatus(message.status) };
}

export function validateTwilioStatusCallback(signature: string | undefined, params: Record<string, string>) {
  if (!signature || !ENV.twilioAuthToken.trim()) return false;
  return twilio.validateRequest(ENV.twilioAuthToken.trim(), signature, getTwilioStatusCallbackUrl(), params);
}
