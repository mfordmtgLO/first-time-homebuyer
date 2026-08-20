import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const propertyPageSource = readFileSync(resolve(process.cwd(), "client/src/pages/PropertyLandingPage.tsx"), "utf8");

describe("public single-property co-branding", () => {
  it("renders both assigned dashboard profiles as full contact cards", () => {
    expect(propertyPageSource).toContain("function PropertyTeamBranding");
    expect(propertyPageSource).toContain("function TeamProfileCard");
    expect(propertyPageSource).toContain("<PropertyTeamBranding officer={officer} agent={agent} />");
    expect(propertyPageSource).toContain("Your loan officer");
    expect(propertyPageSource).toContain("Your co-marketing real estate agent");
  });

  it("uses dashboard-managed headshots, company branding, and direct contact details", () => {
    expect(propertyPageSource).toContain("profile.headshotUrl");
    expect(propertyPageSource).toContain("profile.companyLogoUrl");
    expect(propertyPageSource).toContain("profile.companyName");
    expect(propertyPageSource).toContain("href={`tel:${profile.phone");
    expect(propertyPageSource).toContain("href={`mailto:${profile.email}");
    expect(propertyPageSource).toContain("Visit profile");
  });

  it("keeps an explicit guard for legacy pages that are missing a complete pairing", () => {
    expect(propertyPageSource).toContain("Co-branded team profile pending");
    expect(propertyPageSource).toContain("active dashboard loan-officer and agent pairing");
  });
});
