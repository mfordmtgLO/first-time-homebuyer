import { createHmac, timingSafeEqual } from "crypto";
import type { Express, Request, Response } from "express";
import { createPlatformLeadIfAbsent, getDashboardOwnerUserId } from "./db";
import { getPlatformLeadWebhookConfig } from "./platformLeadWebhookConfig";

type RawBodyRequest = Request & { rawBody?: Buffer };

type MetaLeadDetails = {
  id?: string;
  created_time?: string;
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  form_id?: string;
  field_data?: Array<{ name?: string; values?: string[] }>;
};

type GoogleLeadPayload = {
  lead_id?: string;
  google_key?: string;
  is_test?: boolean;
  form_id?: number | string;
  campaign_id?: number | string;
  adgroup_id?: number | string;
  creative_id?: number | string;
  gcl_id?: string;
  lead_submit_time?: string;
  user_column_data?: Array<{ column_id?: string; string_value?: string }>;
};

const MAX_PROVIDER_VALUE_LENGTH = 320;

function text(value: unknown, max = MAX_PROVIDER_VALUE_LENGTH) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalText(value: unknown, max = MAX_PROVIDER_VALUE_LENGTH) {
  const normalized = text(value, max);
  return normalized || null;
}

function parseProviderTime(value: unknown) {
  const parsed = typeof value === "string" ? new Date(value) : null;
  return parsed && Number.isFinite(parsed.getTime()) ? parsed : null;
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyMetaSignature(rawBody: Buffer | undefined, header: string | undefined, appSecret: string) {
  if (!rawBody || !header?.startsWith("sha256=") || !appSecret) return false;
  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  return safeEqual(expected, header);
}

function mapMetaFields(fieldData: MetaLeadDetails["field_data"]) {
  const fields = new Map<string, string>();
  for (const item of fieldData ?? []) {
    const key = text(item.name, 80).toLowerCase();
    const value = text(item.values?.[0]);
    if (key && value) fields.set(key, value);
  }
  const fullName = fields.get("full_name") ?? "";
  const firstName = fields.get("first_name") ?? fullName.split(/\s+/)[0] ?? "";
  const lastName = fields.get("last_name") ?? fullName.split(/\s+/).slice(1).join(" ");
  return {
    firstName: text(firstName, 120),
    lastName: text(lastName, 120),
    fullName: text(fullName || `${firstName} ${lastName}`.trim(), 240),
    email: text(fields.get("email"), 320),
    phone: text(fields.get("phone_number") ?? fields.get("phone"), 40),
  };
}

function mapGoogleFields(columns: GoogleLeadPayload["user_column_data"]) {
  const fields = new Map<string, string>();
  for (const item of columns ?? []) {
    const key = text(item.column_id, 80).toUpperCase();
    const value = text(item.string_value);
    if (key && value) fields.set(key, value);
  }
  const fullName = fields.get("FULL_NAME") ?? "";
  const firstName = fields.get("FIRST_NAME") ?? fullName.split(/\s+/)[0] ?? "";
  const lastName = fields.get("LAST_NAME") ?? fullName.split(/\s+/).slice(1).join(" ");
  return {
    firstName: text(firstName, 120),
    lastName: text(lastName, 120),
    fullName: text(fullName || `${firstName} ${lastName}`.trim(), 240),
    email: text(fields.get("EMAIL"), 320),
    phone: text(fields.get("PHONE_NUMBER"), 40),
  };
}

async function retrieveMetaLead(leadgenId: string, pageAccessToken: string) {
  const fields = "id,created_time,ad_id,adset_id,campaign_id,form_id,field_data";
  const url = `https://graph.facebook.com/${encodeURIComponent(leadgenId)}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(pageAccessToken)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Meta lead retrieval returned ${response.status}.`);
  return response.json() as Promise<MetaLeadDetails>;
}

/** Registers public, server-only native platform lead receivers before tRPC/static routing. */
export function registerPlatformLeadWebhooks(app: Express) {
  app.get("/api/webhooks/meta/leadgen", (req, res) => {
    const config = getPlatformLeadWebhookConfig();
    if (!config.meta.enabled) {
      res.status(503).json({ error: "Meta Lead Ads webhook is not configured." });
      return;
    }
    const mode = text(req.query["hub.mode"]);
    const token = text(req.query["hub.verify_token"]);
    const challenge = text(req.query["hub.challenge"], 1024);
    if (mode === "subscribe" && challenge && safeEqual(token, config.meta.verifyToken)) {
      res.status(200).send(challenge);
      return;
    }
    res.status(403).json({ error: "Webhook verification failed." });
  });

  app.post("/api/webhooks/meta/leadgen", async (req: RawBodyRequest, res: Response) => {
    const config = getPlatformLeadWebhookConfig();
    if (!config.meta.enabled) {
      res.status(503).json({ error: "Meta Lead Ads webhook is not configured." });
      return;
    }
    const signature = req.header("x-hub-signature-256") ?? undefined;
    if (!verifyMetaSignature(req.rawBody, signature, config.meta.appSecret)) {
      res.status(403).json({ error: "Invalid webhook signature." });
      return;
    }
    try {
      const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];
      const changes = entries.flatMap((entry: { changes?: unknown }) => Array.isArray(entry.changes) ? entry.changes : []);
      const leadEvents = changes
        .filter((change: { field?: unknown; value?: unknown }) => change?.field === "leadgen" && typeof change.value === "object" && change.value)
        .map((change: { value: { leadgen_id?: unknown; page_id?: unknown } }) => ({
          leadgenId: text(change.value.leadgen_id, 255),
          pageId: optionalText(change.value.page_id, 80),
        }))
        .filter((event: { leadgenId: string }) => Boolean(event.leadgenId));
      if (leadEvents.length === 0) {
        res.status(200).json({ received: true, stored: 0 });
        return;
      }
      const ownerUserId = await getDashboardOwnerUserId();
      let stored = 0;
      for (const event of leadEvents) {
        const details = await retrieveMetaLead(event.leadgenId, config.meta.pageAccessToken);
        const contact = mapMetaFields(details.field_data);
        const result = await createPlatformLeadIfAbsent({
          ownerUserId,
          provider: "meta",
          externalLeadId: event.leadgenId,
          status: "new",
          ingestionMethod: "webhook",
          leadSource: "facebook",
          ...contact,
          consentText: null,
          externalPageId: event.pageId,
          externalFormId: optionalText(details.form_id, 80),
          externalCampaignId: optionalText(details.campaign_id, 80),
          externalAdSetId: optionalText(details.adset_id, 80),
          externalAdId: optionalText(details.ad_id, 80),
          externalCreativeId: null,
          googleClickId: null,
          assignedLoanOfficerId: null,
          assignedAgentId: null,
          providerSubmittedAt: parseProviderTime(details.created_time),
        });
        if (result.created) stored += 1;
      }
      res.status(200).json({ received: true, stored });
    } catch (error) {
      console.error("[MetaLeadWebhook] Processing failed:", error instanceof Error ? error.message : "Unknown error");
      res.status(502).json({ error: "Meta lead processing failed." });
    }
  });

  app.post("/api/webhooks/google/lead-form", async (req: Request, res: Response) => {
    const config = getPlatformLeadWebhookConfig();
    if (!config.google.enabled) {
      res.status(503).json({ error: "Google lead-form webhook is not configured." });
      return;
    }
    const payload = (req.body ?? {}) as GoogleLeadPayload;
    if (!safeEqual(text(payload.google_key), config.google.webhookKey)) {
      res.status(403).json({ error: "Invalid webhook key." });
      return;
    }
    const leadId = text(payload.lead_id, 255);
    if (!leadId) {
      res.status(400).json({ error: "Missing lead ID." });
      return;
    }
    try {
      const ownerUserId = await getDashboardOwnerUserId();
      const contact = mapGoogleFields(payload.user_column_data);
      const result = await createPlatformLeadIfAbsent({
        ownerUserId,
        provider: "google",
        externalLeadId: leadId,
        status: payload.is_test ? "test" : "new",
        ingestionMethod: "webhook",
        leadSource: "google_ads",
        ...contact,
        consentText: null,
        externalPageId: null,
        externalFormId: optionalText(payload.form_id, 80),
        externalCampaignId: optionalText(payload.campaign_id, 80),
        externalAdSetId: optionalText(payload.adgroup_id, 80),
        externalAdId: null,
        externalCreativeId: optionalText(payload.creative_id, 80),
        googleClickId: optionalText(payload.gcl_id, 255),
        assignedLoanOfficerId: null,
        assignedAgentId: null,
        providerSubmittedAt: parseProviderTime(payload.lead_submit_time),
      });
      res.status(200).json({ received: true, stored: result.created ? 1 : 0, test: payload.is_test === true });
    } catch (error) {
      console.error("[GoogleLeadWebhook] Processing failed:", error instanceof Error ? error.message : "Unknown error");
      res.status(500).json({ error: "Google lead processing failed." });
    }
  });
}
