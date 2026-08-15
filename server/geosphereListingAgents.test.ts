import { describe, expect, it } from "vitest";
import { filterByImportedListingAgent, getImportedListingAgentOptions } from "../shared/geosphereListingAgents";

const listings = [
  { sourceData: JSON.stringify({ listingAgent: { name: "Avery Agent", email: "avery@example.com" } }) },
  { sourceData: JSON.stringify({ listingAgent: { name: "Avery Agent", email: "avery@example.com" } }) },
  { sourceData: JSON.stringify({ listingAgent: { name: "Blake Broker" } }) },
];

describe("imported GeoSphere listing agents", () => {
  it("builds alphabetical listing-agent options from saved source details", () => {
    expect(getImportedListingAgentOptions(listings)).toEqual([
      { key: "email:avery@example.com", name: "Avery Agent", email: "avery@example.com", listingCount: 2 },
      { key: "name:blake broker", name: "Blake Broker", email: "", listingCount: 1 },
    ]);
  });

  it("filters listings to the selected imported listing agent", () => {
    expect(filterByImportedListingAgent(listings, "email:avery@example.com")).toHaveLength(2);
    expect(filterByImportedListingAgent(listings, "name:blake broker")).toHaveLength(1);
  });
});
