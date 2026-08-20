import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(resolve(process.cwd(), "client/src/components/GeoSphereListings.tsx"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const publicPageSource = readFileSync(resolve(process.cwd(), "client/src/pages/PropertyLandingPage.tsx"), "utf8");

describe("single-property dashboard metadata editor", () => {
  it("accepts optional annual tax and unit inputs when a saved property page is created", () => {
    expect(workspaceSource).toContain('htmlFor="property-page-taxes"');
    expect(workspaceSource).toContain('htmlFor="property-page-units"');
    expect(workspaceSource).toContain("propertyTaxes: Number(propertyPageTaxes)");
    expect(workspaceSource).toContain("units: propertyPageUnits.trim()");
    expect(routerSource).toContain("propertyTaxes: z.number().finite().min(0).max(10_000_000).nullable().optional()");
    expect(routerSource).toContain("units: z.string().trim().max(80).nullable().optional()");
  });

  it("keeps saved tax and unit details visible on the public property page", () => {
    expect(publicPageSource).toContain("snapshot.units ?? \"Not in saved snapshot\"");
    expect(publicPageSource).toContain("money(snapshot.propertyTaxes)");
  });
});
