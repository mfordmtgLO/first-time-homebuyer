import { describe, expect, it } from "vitest";
import { roadmapSuccessScrollOptions } from "../client/src/components/landing/LeadMagnet";

describe("Roadmap submission success view", () => {
  it("centers the confirmation after the submitted form is replaced", () => {
    expect(roadmapSuccessScrollOptions).toEqual({ behavior: "smooth", block: "center" });
  });
});
