import { describe, expect, it } from "vitest";
import { formatUsRoadmapPhone, getUsLocalRoadmapPhoneDigits, hasUsableRoadmapPhone } from "../shared/roadmapPhone";

describe("Roadmap phone helpers", () => {
  it("formats a U.S. number as the visitor types", () => {
    expect(formatUsRoadmapPhone("541")).toBe("(541");
    expect(formatUsRoadmapPhone("541729")).toBe("(541) 729");
    expect(formatUsRoadmapPhone("5417290819")).toBe("(541) 729-0819");
  });

  it("removes a leading U.S. country code before preserving the local format", () => {
    expect(getUsLocalRoadmapPhoneDigits("+1 (505) 555-5555")).toBe("5055555555");
    expect(formatUsRoadmapPhone("15055555555")).toBe("(505) 555-5555");
    expect(hasUsableRoadmapPhone("+1 (505) 555-5555")).toBe(true);
  });

  it("accepts usable numbers and rejects common placeholder values", () => {
    expect(hasUsableRoadmapPhone("(541) 729-0819")).toBe(true);
    expect(hasUsableRoadmapPhone("555-555-5555")).toBe(false);
    expect(hasUsableRoadmapPhone("1111111111")).toBe(false);
    expect(hasUsableRoadmapPhone("541-729-081")).toBe(false);
  });
});
