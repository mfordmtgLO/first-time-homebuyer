import express, { type Express, type Request, type Response } from "express";
import { applyTwilioDeliveryStatusCallback } from "./db";
import { getTwilioReadiness, parseTwilioCallbackStatus, validateTwilioStatusCallback } from "./twilio";

function formParams(body: unknown): Record<string, string> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const entries = Object.entries(body as Record<string, unknown>);
  if (entries.length === 0 || entries.length > 50) return null;
  if (entries.some(([key, value]) => key.length === 0 || key.length > 160 || typeof value !== "string" || value.length > 8_000)) return null;
  return Object.fromEntries(entries) as Record<string, string>;
}

function deliveryDetail(status: "queued" | "sent" | "delivered" | "failed" | "undelivered", errorCode: string | undefined) {
  const safeErrorCode = errorCode && /^\d{1,10}$/.test(errorCode) ? errorCode : undefined;
  if (status === "failed" || status === "undelivered") return safeErrorCode ? `Twilio reported ${status} (error code ${safeErrorCode}).` : `Twilio reported ${status}.`;
  return `Twilio reported ${status}.`;
}

/** Public endpoint: accepts only signed Twilio status callbacks; inbound SMS is intentionally not processed here. */
export async function twilioStatusCallbackHandler(req: Request, res: Response) {
  const readiness = getTwilioReadiness();
  if (!readiness.configured) return res.status(503).send("Twilio callback unavailable");
  const contentType = req.header("Content-Type");
  if (contentType && !contentType.toLowerCase().startsWith("application/x-www-form-urlencoded")) return res.status(415).send("Unsupported callback content type");
  const params = formParams(req.body);
  const signature = req.header("X-Twilio-Signature");
  if (!params || !signature || signature.length > 256 || !validateTwilioStatusCallback(signature, params)) return res.status(403).send("Invalid Twilio signature");

  const providerMessageId = params.MessageSid;
  const status = parseTwilioCallbackStatus(params.MessageStatus);
  if (!providerMessageId || !/^SM[a-f0-9]{32}$/i.test(providerMessageId) || !status) return res.status(204).end();

  try {
    const result = await applyTwilioDeliveryStatusCallback({
      providerMessageId,
      deliveryStatus: status,
      deliveryDetail: deliveryDetail(status, params.ErrorCode),
    });
    return result.found ? res.status(204).end() : res.status(204).end();
  } catch {
    return res.status(500).send("Unable to record Twilio delivery status");
  }
}

export function registerTwilioStatusCallback(app: Express) {
  app.post("/api/twilio/status", express.urlencoded({ extended: false, limit: "16kb", parameterLimit: 50 }), twilioStatusCallbackHandler);
}
