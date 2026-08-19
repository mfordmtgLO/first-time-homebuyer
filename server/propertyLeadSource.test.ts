import { describe, expect, it } from "vitest";
import { formatPropertyPairingSummary, getPropertyStreetAddress } from "../shared/propertyLeadSource";

describe("compact property-page lead source helpers", () => {
  it("uses only the street portion of a property address in compact source cells", () => {
    expect(getPropertyStreetAddress("1094 Main St, Salem, OR 97301")).toBe("1094 Main St");
  });

  it("keeps the loan officer and agent readable in a single compact pairing line", () => {
    expect(formatPropertyPairingSummary("Mike Ford", "Kaandice McLean")).toBe("Mike Ford · Kaandice McLean");
    expect(formatPropertyPairingSummary(null, null)).toBe("LO not linked · Agent not linked");
  });
});
