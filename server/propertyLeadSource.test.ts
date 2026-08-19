import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { formatPropertyActivityCount, formatPropertyPairingSummary, getPropertyStreetAddress } from "../shared/propertyLeadSource";

describe("compact property-page lead source helpers", () => {
  it("uses only the street portion of a property address in compact source cells", () => {
    expect(getPropertyStreetAddress("1094 Main St, Salem, OR 97301")).toBe("1094 Main St");
  });

  it("keeps the loan officer and agent readable in a single compact pairing line", () => {
    expect(formatPropertyPairingSummary("Mike Ford", "Kaandice McLean")).toBe("Mike Ford · Kaandice McLean");
    expect(formatPropertyPairingSummary(null, null)).toBe("LO not linked · Agent not linked");
  });

  it("formats property engagement counts with clear singular and plural labels", () => {
    expect(formatPropertyActivityCount(1)).toBe("1 activity");
    expect(formatPropertyActivityCount(8)).toBe("8 activities");
    expect(formatPropertyActivityCount(null)).toBe("0 activities");
  });

  it("keeps copy, thumbnail, and source-filter affordances in the shared dashboard treatment", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const sourceControl = readFileSync(path.join(projectRoot, "client/src/components/PropertyPageSourceSummary.tsx"), "utf8");
    const roadmapTable = readFileSync(path.join(projectRoot, "client/src/pages/Leads.tsx"), "utf8");
    const chatTable = readFileSync(path.join(projectRoot, "client/src/components/ChatIntakeLeads.tsx"), "utf8");

    expect(sourceControl).toContain("navigator.clipboard.writeText(value)");
    expect(sourceControl).toContain("getPropertyHeroMedia(snapshot)");
    expect(sourceControl).toContain("Copy pairing");
    expect(sourceControl).toContain("engagement timeline");
    expect(sourceControl).toContain("PROPERTY_ACTIVITY_RANGE_LABELS");
    expect(sourceControl).toContain("Export filtered CSV");
    expect(sourceControl).toContain("eventTypeFilter");
    expect(roadmapTable).toContain('value="single-property"');
    expect(chatTable).toContain('value="single-property"');
    expect(roadmapTable).toContain("propertyAddressFilter");
    expect(chatTable).toContain("propertyAddressFilter");
    expect(roadmapTable).toContain("activityRange");
    expect(chatTable).toContain("activityRange");
  });
});
