import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const homeSource = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");
const widgetSource = readFileSync(resolve(projectRoot, "client/src/components/landing/MortgagePaymentWidget.tsx"), "utf8");
const navSource = readFileSync(resolve(projectRoot, "client/src/components/landing/MobileBottomNav.tsx"), "utf8");
const leadMagnetSource = readFileSync(resolve(projectRoot, "client/src/components/landing/LeadMagnet.tsx"), "utf8");

describe("mobile public homepage enhancements", () => {
  it("mounts the payment widget and mobile navigation without touching dashboard routes", () => {
    expect(homeSource).toContain("<MortgagePaymentWidget />");
    expect(homeSource).toContain("<MobileBottomNav />");
    expect(homeSource).toContain("pb-20 md:pb-0");
  });

  it("keeps the payment widget mobile-only and uses the shared mortgage estimator", () => {
    expect(widgetSource).toContain('from "@shared/mortgageEstimator"');
    expect(widgetSource).toContain("estimateMortgagePlanning");
    expect(widgetSource).toContain('className="md:hidden');
    expect(widgetSource).toContain("not a loan offer, rate quote, APR, or promise of approval");
    expect(widgetSource).toContain('inputMode="numeric"');
    expect(widgetSource).toContain('inputMode="decimal"');
  });

  it("adds accessible loading and success feedback to the lead capture form", () => {
    expect(leadMagnetSource).toContain('aria-busy={submitLead.isPending}');
    expect(leadMagnetSource).toContain("Sending your Roadmap…");
    expect(leadMagnetSource).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(leadMagnetSource).toContain("Roadmap request received");
    expect(leadMagnetSource).toContain("submitLead.mutate({");
  });

  it("keeps bottom navigation mobile-only and exposes the main public anchors", () => {
    expect(navSource).toContain('aria-label="Mobile quick navigation"');
    expect(navSource).toContain("md:hidden");
    expect(navSource).toContain('id: "payment-estimate"');
    expect(navSource).toContain('id: "roadmap"');
    expect(navSource).toContain('id: "contact"');
    expect(navSource).toContain("safe-area-inset-bottom");
    expect(navSource).toContain("focus-visible:ring-2");
  });
});
