import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getPlatformLeadWebhookConfig } from "./platformLeadWebhookConfig";
import { verifyMetaSignature } from "./platformLeadWebhooks";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const inboxSource = readFileSync(resolve(process.cwd(), "client/src/components/PlatformLeadInbox.tsx"), "utf8");

describe("native platform lead receiver and manual-entry safeguards", () => {
  it("keeps both native receiver integrations disabled until their complete server-only credential sets exist", () => {
    const disabled = getPlatformLeadWebhookConfig({});
    expect(disabled.meta.enabled).toBe(false);
    expect(disabled.google.enabled).toBe(false);

    const configured = getPlatformLeadWebhookConfig({
      META_LEAD_WEBHOOK_VERIFY_TOKEN: "verify-token",
      META_APP_SECRET: "app-secret",
      META_PAGE_ACCESS_TOKEN: "page-token",
      GOOGLE_LEAD_WEBHOOK_KEY: "google-key",
    });
    expect(configured.meta.enabled).toBe(true);
    expect(configured.google.enabled).toBe(true);
  });

  it("accepts only a matching Meta HMAC SHA-256 signature for the exact raw request body", () => {
    const rawBody = Buffer.from('{"object":"page"}', "utf8");
    const secret = "app-secret";
    const signature = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
    expect(verifyMetaSignature(rawBody, signature, secret)).toBe(true);
    expect(verifyMetaSignature(rawBody, "sha256=bad", secret)).toBe(false);
    expect(verifyMetaSignature(Buffer.from("different"), signature, secret)).toBe(false);
  });

  it("provides an owner-protected manual lead procedure that stores explicit manual provenance", () => {
    expect(routerSource).toContain("createManual: protectedProcedure");
    expect(routerSource).toContain('ingestionMethod: "manual"');
    expect(routerSource).toContain('provider: "manual"');
    expect(routerSource).toContain('leadSource: z.enum(["facebook", "google_ads", "organic"])');
    expect(routerSource).toContain("manual-${nanoid(16)}");
    expect(routerSource).toContain("Enter an email address or phone number.");
  });

  it("provides a private inbox form that labels manual entries and separates them from website funnel results", () => {
    expect(inboxSource).toContain("Add manual lead");
    expect(inboxSource).toContain("Manual entry");
    expect(inboxSource).toContain("will not be counted as a website Roadmap or chat submission");
    expect(inboxSource).toContain("Do not assume SMS consent");
    expect(inboxSource).toContain("Lead ID");
    expect(inboxSource).toContain("Lead ID: {lead.externalFormId");
  });

  it("offers Facebook, Google Ads, and Organic source selection plus searchable assignment management", () => {
    expect(inboxSource).toContain("Lead Source");
    expect(inboxSource).toContain('<SelectItem value="facebook">Facebook</SelectItem>');
    expect(inboxSource).toContain('<SelectItem value="google_ads">Google Ads</SelectItem>');
    expect(inboxSource).toContain('<SelectItem value="organic">Organic</SelectItem>');
    expect(inboxSource).toContain("Search name, email, phone, source, Lead ID, or campaign");
    expect(inboxSource).toContain("All assignments");
    expect(inboxSource).toContain("Loan officer assignment");
    expect(inboxSource).toContain("Co-branded agent assignment");
    expect(inboxSource).toContain("platformLeads.updateAssignments");
    expect(routerSource).toContain("updateAssignments: protectedProcedure");
  });

  it("keeps archived leads searchable and supports editable, selected lifecycle actions", () => {
    expect(routerSource).toContain("update: protectedProcedure");
    expect(routerSource).toContain("setArchivedBulk: protectedProcedure");
    expect(routerSource).toContain("permanentDelete: protectedProcedure");
    expect(routerSource).toContain("deletePlatformLeads");
    expect(inboxSource).toContain("Edit platform lead");
    expect(inboxSource).toContain("Archived leads");
    expect(inboxSource).toContain("Select all visible");
    expect(inboxSource).toContain("Restore {selectedArchivedIds.length}");
    expect(inboxSource).toContain("Permanently delete selected leads?");
    expect(inboxSource).toContain("This action cannot be undone.");
  });
});
