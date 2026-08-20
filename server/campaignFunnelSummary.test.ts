import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(resolve(process.cwd(), "client/src/components/CampaignFunnelSummary.tsx"), "utf8");

describe("CampaignFunnelSummary attribution readiness", () => {
  it("uses every available UTM value to identify a tagged qualifying submission", () => {
    expect(componentSource).toContain("function isTaggedSubmission");
    expect(componentSource).toContain("lead.utmSource || lead.utmMedium || lead.utmCampaign || lead.utmContent || lead.utmTerm");
    expect(componentSource).toContain("const taggedSubmissionCount");
    expect(componentSource).toContain("const showFullAttribution = taggedSubmissionCount > 0");
  });

  it("replaces the full duplicated funnel with a compact tag-ready state until attribution exists", () => {
    expect(componentSource).toContain("if (!showFullAttribution)");
    expect(componentSource).toContain("No UTM-tagged Roadmap or completed chat submissions have arrived yet.");
    expect(componentSource).toContain("0</strong> tagged campaign submissions");
    expect(componentSource).toContain("The full campaign and calculator-cohort reports appear automatically");
  });

  it("retains UTM-tagging guidance for approved campaign links", () => {
    expect(componentSource).toContain("How to tag a campaign link");
    expect(componentSource).toContain('useState("facebook")');
    expect(componentSource).toContain('useState("firsthome")');
  });

  it("adds date-filtered tagged reporting controls and a CSV export", () => {
    expect(componentSource).toContain('type CampaignDateRange = "all" | "7d" | "30d" | "90d"');
    expect(componentSource).toContain("function isWithinDateRange");
    expect(componentSource).toContain('aria-label="Campaign date range"');
    expect(componentSource).toContain("Export tagged CSV");
    expect(componentSource).toContain("campaign-attribution-${dateRange}.csv");
  });

  it("provides an in-dashboard UTM link generator in the expandable guidance", () => {
    expect(componentSource).toContain("Generated UTM campaign link");
    expect(componentSource).toContain("Copy tagged link");
    expect(componentSource).toContain('url.searchParams.set("utm_source"');
    expect(componentSource).toContain('url.searchParams.set("utm_campaign"');
  });

  it("keeps standard Facebook, Google, and email presets available in the UTM generator", () => {
    expect(componentSource).toContain("const CAMPAIGN_PRESETS");
    expect(componentSource).toContain('label: "Facebook"');
    expect(componentSource).toContain('label: "Google"');
    expect(componentSource).toContain('label: "Email"');
    expect(componentSource).toContain("Standard presets");
  });

  it("keeps visual campaign comparison and private cost-per-lead reporting available", () => {
    expect(componentSource).toContain("Tagged campaign volume comparison");
    expect(componentSource).toContain("maxCampaignVolume");
    expect(componentSource).toContain("Campaign cost per tagged lead");
    expect(componentSource).toContain("CPL = spend ÷ tagged leads");
    expect(componentSource).toContain("trpc.campaignSpend.list.useQuery()");
    expect(componentSource).toContain("Add private spend");
  });

  it("keeps Google Ads and Facebook Ads budget and captured-outcome metrics comparable", () => {
    expect(componentSource).toContain("const AD_PLATFORM_PRESETS");
    expect(componentSource).toContain('label: "Google Ads"');
    expect(componentSource).toContain('label: "Facebook Ads"');
    expect(componentSource).toContain("Ad platform quick fill");
    expect(componentSource).toContain("Google Ads and Facebook Ads outcome comparison");
    expect(componentSource).toContain("ROI-style lead outcomes");
    expect(componentSource).toContain("Budget/spend:");
  });
});
