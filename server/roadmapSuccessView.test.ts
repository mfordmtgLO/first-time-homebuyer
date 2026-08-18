import { describe, expect, it } from "vitest";
import { getRoadmapSuccessReturnDestination, roadmapSuccessScrollOptions } from "../client/src/components/landing/LeadMagnet";

describe("Roadmap submission success view", () => {
  it("centers the confirmation after the submitted form is replaced", () => {
    expect(roadmapSuccessScrollOptions).toEqual({ behavior: "smooth", block: "center" });
  });

  it("offers the visitor a useful scenario-specific return destination", () => {
    expect(getRoadmapSuccessReturnDestination(true, true).id).toBe("buydown");
    expect(getRoadmapSuccessReturnDestination(false, true).id).toBe("cost-of-waiting");
    expect(getRoadmapSuccessReturnDestination(false, false).id).toBe("top");
  });
});
