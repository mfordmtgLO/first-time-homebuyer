import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getCaptureDevice } from "../client/src/lib/captureDevice";

describe("browser capture classification", () => {
  it("uses desktop as the safe server-side fallback", () => {
    expect(getCaptureDevice()).toBe("desktop");
  });

  it("classifies a narrow viewport as mobile", () => {
    vi.stubGlobal("window", { matchMedia: vi.fn(() => ({ matches: true })) });
    expect(getCaptureDevice()).toBe("mobile");
    vi.unstubAllGlobals();
  });

  it("classifies a wide viewport as desktop", () => {
    vi.stubGlobal("window", { matchMedia: vi.fn(() => ({ matches: false })) });
    expect(getCaptureDevice()).toBe("desktop");
    vi.unstubAllGlobals();
  });
});

describe("dashboard browser tools assumptions", () => {
  const source = readFileSync(resolve(process.cwd(), "client/src/components/DashboardBrowserTools.tsx"), "utf8");

  it("includes the requested program DTI and minimum credit screens", () => {
    expect(source).toContain("dti: 0.50, minScore: 680");
    expect(source).toContain("dti: 0.57, minScore: 580");
    expect(source).toContain("dti: 0.445, minScore: 680");
    expect(source).toContain("dti: 0.64, minScore: 620");
    expect(source).toContain("dti: 0.43, minScore: 700");
  });

  it("keeps the tracker and affordability tool labeled for internal planning", () => {
    expect(source).toContain("BrowserLeadTracker");
    expect(source).toContain("How much house can I afford?");
    expect(source).toContain("not an approval, underwriting decision");
  });

  it("includes timeframe, clickable source filtering, trend, and draft-email affordances", () => {
    expect(source).toContain("Last 30 days");
    expect(source).toContain("This year");
    expect(source).toContain("onLeadSourceSelect?.(String(entry.name))");
    expect(source).toContain("Daily incoming leads");
    expect(source).toContain("Save Quote");
    expect(source).toContain("saveAffordabilityQuote");
  });

  it("supports saved quote naming, borrower/program search, and max-price filtering", () => {
    const sidebarSource = readFileSync(resolve(process.cwd(), "client/src/components/DashboardWorkdaySidebar.tsx"), "utf8");
    expect(sidebarSource).toContain("Saved quote loan program");
    expect(sidebarSource).toContain("Search saved quotes by first name");
    expect(sidebarSource).toContain("Search saved quotes by last name");
    expect(sidebarSource).toContain("Maximum saved quote purchase price");
    expect(sidebarSource).toContain("filteredSavedQuotes");
    expect(sidebarSource).toContain("maxPurchasePriceResultCents");
  });

  it("supports exact-day trend tooltips, source-filter reset, and result copying", () => {
    expect(source).toContain("incoming leads");
    expect(source).toContain("Clear Filters");
    expect(source).toContain("aria-label=\"Copy affordability results to clipboard\"");
    expect(source).toContain("navigator.clipboard.writeText(resultsSummary)");
    expect(source).toContain("onClearFilters");
    expect(source).toContain("onLeadSourceSelect?.(source)");
    expect(source).not.toContain("Email Results");
    expect(source).not.toContain("mailto:");
  });
});
