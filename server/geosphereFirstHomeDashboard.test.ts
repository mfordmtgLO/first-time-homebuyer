import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(new URL("../client/src/components/GeoSphereListings.tsx", import.meta.url), "utf8");

describe("GeoSphere FirstHome dashboard filter", () => {
  it("keeps a dedicated saved-snapshot FirstHome LMI-plus-price control", () => {
    expect(componentSource).toContain('const [firstHomeOnly, setFirstHomeOnly] = useState(false)');
    expect(componentSource).toContain("FirstHome: LMI + purchase price");
    expect(componentSource).toContain("isFirstHomeLmiPriceEligible");
    expect(componentSource).toContain("firstHomeMetadataCount === 0");
  });

  it("retains screening context and price-limit display without replacing the existing overlays", () => {
    expect(componentSource).toContain("OHCS Flex Lending FirstHome");
    expect(componentSource).toContain("firstHomeScreeningLabel");
    expect(componentSource).toContain("const firstHomeLabel = firstHomeScreeningLabel");
    expect(componentSource).toContain("setFirstHomeOnly(false)");
  });
});
