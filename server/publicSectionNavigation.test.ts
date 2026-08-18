import { describe, expect, it } from "vitest";
import { getActivePublicSectionId, publicSectionNavigationItems } from "../client/src/components/landing/PublicSectionNav";

describe("publicSectionNavigationItems", () => {
  it("keeps the principal educational and lead-capture destinations available", () => {
    expect(publicSectionNavigationItems.map((item) => item.id)).toEqual([
      "top",
      "cost-of-waiting",
      "buydown",
      "programs",
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

  it("selects the last destination that has passed the fixed-header offset", () => {
    const positions = {
      "cost-of-waiting": 310,
      buydown: 142,
      programs: 610,
      roadmap: 900,
      "how-it-works": 1200,
      about: 1500,
      faq: 1800,
    };

    expect(getActivePublicSectionId(340, (id) => positions[id as keyof typeof positions])).toBe("buydown");
    expect(getActivePublicSectionId(40, (id) => positions[id as keyof typeof positions])).toBe("top");
  });
});
