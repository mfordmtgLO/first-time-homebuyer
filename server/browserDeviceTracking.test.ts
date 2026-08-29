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
});
