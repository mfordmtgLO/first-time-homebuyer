import { describe, expect, it } from "vitest";
import { roadmapCohort } from "../shared/campaignCohorts";

describe("Roadmap campaign calculator cohorts", () => {
  it("classifies combined, individual, legacy, and malformed scenario payloads", () => {
    expect(roadmapCohort(JSON.stringify({ buydown: { purchasePrice: 450000 }, costOfWaiting: { costOfWaiting: 85000 } }))).toBe("both");
    expect(roadmapCohort(JSON.stringify({ buydown: { purchasePrice: 450000 } }))).toBe("buydown");
    expect(roadmapCohort(JSON.stringify({ costOfWaiting: { costOfWaiting: 85000 } }))).toBe("costOfWaiting");
    expect(roadmapCohort(JSON.stringify({ purchasePrice: 450000 }))).toBe("buydown");
    expect(roadmapCohort(null)).toBe("noCalculator");
    expect(roadmapCohort("not-json")).toBe("noCalculator");
  });
});
