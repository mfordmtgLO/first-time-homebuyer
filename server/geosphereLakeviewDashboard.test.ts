import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(new URL("../client/src/components/GeoSphereListings.tsx", import.meta.url), "utf8");

describe("GeoSphere Lakeview dashboard review filter", () => {
  it("keeps a dedicated saved-snapshot Lakeview review control with metadata-safe disabled state", () => {
    expect(componentSource).toContain("const [lakeviewOnly, setLakeviewOnly] = useState(false)");
    expect(componentSource).toContain("Lakeview National: review");
    expect(componentSource).toContain("isLakeviewNationalReviewMatch");
    expect(componentSource).toContain("lakeviewMetadataCount === 0");
  });

  it("retains property-screening-only disclosure, per-listing context, and export metadata", () => {
    expect(componentSource).toContain("Lakeview National review matches");
    expect(componentSource).toContain("not a borrower or property qualification");
    expect(componentSource).toContain("lakeviewNationalReviewLabel");
    expect(componentSource).toContain("lakeviewReview: isLakeviewNationalReviewMatch");
  });
});
