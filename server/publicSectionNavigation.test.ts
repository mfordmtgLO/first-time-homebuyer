import { describe, expect, it } from "vitest";
import { publicSectionNavigationItems } from "../client/src/components/landing/PublicSectionNav";

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
});
