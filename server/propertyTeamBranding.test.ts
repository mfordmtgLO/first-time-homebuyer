import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const propertyPageSource = readFileSync(resolve(process.cwd(), "client/src/pages/PropertyLandingPage.tsx"), "utf8");
const loanOfficerSettingsSource = readFileSync(resolve(process.cwd(), "client/src/components/LoanOfficerSettings.tsx"), "utf8");
const agentSettingsSource = readFileSync(resolve(process.cwd(), "client/src/components/AgentSettings.tsx"), "utf8");

describe("public single-property co-branding", () => {
  it("renders both assigned dashboard profiles in a compact expandable contact drawer", () => {
    expect(propertyPageSource).toContain("function PropertyTeamBranding");
    expect(propertyPageSource).toContain("function TeamProfileCard");
    expect(propertyPageSource).toContain("<PropertyTeamBranding officer={officer} agent={agent} onCalendarClick=");
    expect(propertyPageSource).toContain('id="property-team-drawer"');
    expect(propertyPageSource).toContain("aria-expanded={isOpen}");
    expect(propertyPageSource).toContain("Meet your team");
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
    expect(propertyPageSource).not.toContain("profile.bio");
  });

  it("keeps an explicit guard for legacy pages that are missing a complete pairing", () => {
    expect(propertyPageSource).toContain("Co-branded team profile pending");
    expect(propertyPageSource).toContain("active dashboard loan-officer and agent pairing");
  });

  it("shows a loan-officer appointment action only when the profile provides a safe scheduling URL", () => {
    expect(propertyPageSource).toContain("calendlyUrl?: string");
    expect(propertyPageSource).toContain("const calendlyUrl = publicHttpUrl(profile.calendlyUrl)");
    expect(propertyPageSource).toContain("showNmls && calendlyUrl");
    expect(propertyPageSource).toContain("Schedule a call");
    expect(loanOfficerSettingsSource).toContain("Calendly scheduling link");
    expect(loanOfficerSettingsSource).toContain("Leave blank to hide it.");
  });

  it("renders agent social icons only for saved optional dashboard profile links", () => {
    expect(propertyPageSource).toContain("facebookUrl?: string");
    expect(propertyPageSource).toContain("instagramUrl?: string");
    expect(propertyPageSource).toContain("linkedinUrl?: string");
    expect(propertyPageSource).toContain("Social:");
    expect(agentSettingsSource).toContain("agent-facebook");
    expect(agentSettingsSource).toContain("agent-instagram");
    expect(agentSettingsSource).toContain("agent-linkedin");
  });

  it("tracks calendar actions and clearly labels optional third-party listing links without importing their content", () => {
    expect(propertyPageSource).toContain('eventType: "calendar_click"');
    expect(propertyPageSource).toContain('detail: "loan_officer_calendly"');
    expect(propertyPageSource).toContain("externalListingUrl");
    expect(propertyPageSource).toContain("View live listing page");
  });

  it("uses a restrained scroll-only engagement cue and honors reduced-motion preferences", () => {
    expect(propertyPageSource).toContain("setIsScrolling(true)");
    expect(propertyPageSource).toContain("property-team-tab-bump");
    expect(propertyPageSource).toContain("prefers-reduced-motion");
    expect(propertyPageSource).toContain("setIsScrolling(false)");
  });
});
