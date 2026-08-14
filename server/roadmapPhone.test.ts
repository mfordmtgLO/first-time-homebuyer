import { describe, expect, it } from "vitest";
import { formatUsRoadmapPhone, hasUsableRoadmapPhone } from "../shared/roadmapPhone";

describe("Roadmap phone helpers", () => {
  it("formats a U.S. number as the visitor types", () => {
    expect(formatUsRoadmapPhone("541")).toBe("(541");
    expect(formatUsRoadmapPhone("541729")).toBe("(541) 729");
    expect(formatUsRoadmapPhone("5417290819")).toBe("(541) 729-0819");
  });

  it("accepts usable numbers and rejects common placeholder values", () => {
    expect(hasUsableRoadmapPhone("(541) 729-0819")).toBe(true);
    expect(hasUsableRoadmapPhone("555-555-5555")).toBe(false);
    expect(hasUsableRoadmapPhone("1111111111")).toBe(false);
    expect(hasUsableRoadmapPhone("541-729-081")).toBe(false);
  });
});
