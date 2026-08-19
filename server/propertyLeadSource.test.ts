import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { formatPropertyPairingSummary, getPropertyStreetAddress } from "../shared/propertyLeadSource";

describe("compact property-page lead source helpers", () => {
  it("uses only the street portion of a property address in compact source cells", () => {
    expect(getPropertyStreetAddress("1094 Main St, Salem, OR 97301")).toBe("1094 Main St");
  });

  it("keeps the loan officer and agent readable in a single compact pairing line", () => {
    expect(formatPropertyPairingSummary("Mike Ford", "Kaandice McLean")).toBe("Mike Ford · Kaandice McLean");
    expect(formatPropertyPairingSummary(null, null)).toBe("LO not linked · Agent not linked");
  });

  it("keeps copy, thumbnail, and source-filter affordances in the shared dashboard treatment", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const sourceControl = readFileSync(path.join(projectRoot, "client/src/components/PropertyPageSourceSummary.tsx"), "utf8");
    const roadmapTable = readFileSync(path.join(projectRoot, "client/src/pages/Leads.tsx"), "utf8");
    const chatTable = readFileSync(path.join(projectRoot, "client/src/components/ChatIntakeLeads.tsx"), "utf8");

    expect(sourceControl).toContain("navigator.clipboard.writeText(propertyUrl)");
    expect(sourceControl).toContain("getPropertyHeroMedia(snapshot)");
    expect(roadmapTable).toContain('value="single-property"');
    expect(chatTable).toContain('value="single-property"');
  });
});
