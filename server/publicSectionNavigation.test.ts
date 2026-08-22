import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getActivePublicSectionId, getHorizontalSectionNavScrollAmount, publicSectionNavigationItems } from "../client/src/components/landing/PublicSectionNav";

describe("publicSectionNavigationItems", () => {
  it("keeps the principal educational and lead-capture destinations available", () => {
    expect(publicSectionNavigationItems.map((item) => item.id)).toEqual([
      "top",
      "cost-of-waiting",
      "programs",
      "buydown",
      "roadmap",
      "how-it-works",
      "about",
      "faq",
    ]);
  });

  it("does not define duplicate section targets", () => {
    const destinations = publicSectionNavigationItems.map((item) => item.id);
    expect(new Set(destinations).size).toBe(destinations.length);
  });

  it("provides explicit equal-size scroll increments in both horizontal menu directions", () => {
    expect(getHorizontalSectionNavScrollAmount("left")).toBe(-220);
    expect(getHorizontalSectionNavScrollAmount("right")).toBe(220);
  });

  it("selects the destination closest above the fixed-header offset, independent of menu order", () => {
    const positions = {
      "cost-of-waiting": -900,
      buydown: 160,
      programs: -280,
      roadmap: 900,
      "how-it-works": 1200,
      about: 1500,
      faq: 1800,
    };

    expect(getActivePublicSectionId(340, (id) => positions[id as keyof typeof positions])).toBe("buydown");
    expect(getActivePublicSectionId(40, (id) => positions[id as keyof typeof positions])).toBe("top");
  });

  it("keeps each shared public destination ID on its page-level wrapper only", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const buydownSource = readFileSync(path.join(projectRoot, "client/src/components/landing/Buydown.tsx"), "utf8");
    const roadmapSource = readFileSync(path.join(projectRoot, "client/src/components/landing/LeadMagnet.tsx"), "utf8");

    expect(buydownSource).not.toContain('id="buydown"');
    expect(roadmapSource).not.toContain('id="roadmap"');
  });

  it("does not expose a payment-estimate calculator on the public page", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const homeSource = readFileSync(path.join(projectRoot, "client/src/pages/Home.tsx"), "utf8");
    const navSource = readFileSync(path.join(projectRoot, "client/src/components/landing/PublicSectionNav.tsx"), "utf8");

    expect(homeSource).not.toContain("MortgageEstimator");
    expect(homeSource).not.toContain('id="mortgage-estimator"');
    expect(navSource).not.toContain("Payment Estimate");
  });
});
