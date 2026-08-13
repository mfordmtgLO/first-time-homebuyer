import { describe, expect, it } from "vitest";
import { buildLeadWelcomeDraft } from "../shared/leadEmailDraft";

const BUYDOWN = {
  purchasePrice: 425000,
  downPayment: 21250,
  noteRate: 6.5,
  loanAmount: 403750,
  year1Payment: 2150,
  year2Payment: 2400,
  notePayment: 2650,
  year1MonthlySavings: 500,
  year2MonthlySavings: 250,
  totalSubsidy: 9000,
};

const COST_OF_WAITING = {
  waitYears: 2,
  monthlyRent: 1800,
  purchasePrice: 425000,
  downPayment: 21250,
  interestRate: 6.5,
  appreciationRate: 3,
  rentIncreaseRate: 4,
  monthlyPayment: 2650,
  totalRentPaid: 44928,
  equityGained: 37000,
  costOfWaiting: 81928,
};

describe("buildLeadWelcomeDraft", () => {
  it("builds a polished Roadmap welcome draft with both resource links and calculator summaries", () => {
    const draft = buildLeadWelcomeDraft({
      firstName: "Sarah",
      email: "sarah@example.com",
      scenarios: { buydown: BUYDOWN, costOfWaiting: COST_OF_WAITING },
      siteOrigin: "https://lowdownhousenow.manus.space",
    });

    expect(draft.subject).toBe("Your First-Time Homebuyer Roadmap, Sarah");
    expect(draft.body).toContain("Roadmap Homebuyer Guide + Checklist");
    expect(draft.body).toContain("Your Road Home Map — Click GREEN 𝗚𝗢");
    expect(draft.body).toContain(
      "https://lowdownhousenow.manus.space/manus-storage/Roadmap-Homebuyer-Guide-Checklist_3bca9bdc.pdf"
    );
    expect(draft.body).toContain(
      "https://lowdownhousenow.manus.space/manus-storage/YourRoadHomeMap_clickGREENGO_4d677174.pdf"
    );
    expect(draft.body).not.toContain("[ATTACH BEFORE SENDING");
    expect(draft.body).toContain("YOUR 2-1 BUYDOWN SNAPSHOT");
    expect(draft.body).toContain("$425,000");
    expect(draft.body).toContain("Estimated temporary buydown subsidy: $9,000 (100% seller funded)");
    expect(draft.body).toContain("YOUR COST-OF-WAITING SNAPSHOT");
    expect(draft.body).toContain("Estimated cost of waiting: $81,928");
    expect(draft.body).toContain("Roadmap to Homeownership");
    expect(draft.body).toContain(
      "Feel free to head back to the website to run more scenarios or learn more about home loan financing products here: https://lowdownhousenow.manus.space/"
    );
    expect(draft.mailto).toMatch(/^mailto:sarah%40example\.com\?subject=/);
  });

  it("includes streamlined co-marketing agent contact details and the co-branded link when supplied", () => {
    const draft = buildLeadWelcomeDraft({
      firstName: "Sarah",
      email: "sarah@example.com",
      scenarios: null,
      siteOrigin: "https://lowdownhousenow.manus.space",
      coMarketingAgent: {
        id: 7,
        name: "Jane Doe",
        slug: "jane-doe",
        email: "jane@realty.example",
        phone: "(541) 555-0123",
        bio: "A local agent who helps first-time buyers make confident decisions.",
        website: "https://janedoe.example",
        companyName: "Willamette Realty Group",
        headshotUrl: "/manus-storage/jane-headshot.jpg",
        companyLogoUrl: "/manus-storage/jane-logo.png",
      },
    });

    expect(draft.body).toContain("YOUR LOCAL REAL ESTATE PARTNER: Jane Doe");
    expect(draft.body).toContain("Company: Willamette Realty Group");
    expect(draft.body).toContain("Phone: (541) 555-0123");
    expect(draft.body).toContain("Email: jane@realty.example");
    expect(draft.body).toContain(
      "Feel free to head back to the website to run more scenarios or learn more about home loan financing products here: https://lowdownhousenow.manus.space/with/jane-doe"
    );
    expect(
      draft.body.match(/https:\/\/lowdownhousenow\.manus\.space\/with\/jane-doe/g)
    ).toHaveLength(1);
    expect(draft.body).not.toContain("About Jane Doe:");
    expect(draft.body).not.toContain("Headshot:");
    expect(draft.body).not.toContain("Company logo:");
    expect(draft.body).toContain("can also reach out to anytime");
  });

  it("does not add an agent section for a standard non-co-branded lead", () => {
    const draft = buildLeadWelcomeDraft({
      firstName: "Sam",
      email: "sam@example.com",
      scenarios: null,
      siteOrigin: "https://lowdownhousenow.manus.space",
    });
    expect(draft.body).not.toContain("YOUR LOCAL REAL ESTATE PARTNER:");
    expect(draft.body).toContain("https://lowdownhousenow.manus.space/");
    expect(draft.body).not.toContain("Headshot:");
  });
});
