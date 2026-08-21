import { describe, expect, it } from "vitest";
import { buildLeadWelcomeDraft, buildListingAgentOutreachDraft, buildListingEmailDraft, formatListingTable } from "../shared/leadEmailDraft";
import { MIKE_FORD_EMAIL_SIGNATURE_TEXT } from "../shared/mikeFordEmailSignature";

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

  it("uses first-home financing language and a top-down question-and-response recap for chat-origin drafts", () => {
    const draft = buildLeadWelcomeDraft({
      firstName: "Sam",
      email: "sam@example.com",
      scenarios: null,
      siteOrigin: "https://firsttimehomebuyer.manus.space",
      draftSource: "chat",
      chatTranscript: [
        { role: "assistant", content: "Are you looking to purchase or refinance?" },
        { role: "user", content: "Purchase" },
        { role: "assistant", content: "What area are you considering?" },
        { role: "user", content: "Coos Bay" },
      ],
    });

    expect(draft.body).toContain("Thank you for your interest in home loan financing options for your first home purchase.");
    expect(draft.body).not.toContain("Thank you for requesting the First-Time Homebuyer Roadmap.");
    expect(draft.body).toContain("CHAT CONVERSATION RECAP");
    expect(draft.body).toContain("Mortgage Intake Specialist\nAre you looking to purchase or refinance?");
    expect(draft.body).toContain("Sam\nPurchase");
    expect(draft.body).toContain("Sam\nCoos Bay");
    expect(draft.body).toContain("Roadmap Homebuyer Guide + Checklist");
  });
});

describe("GeoSphere property-list email drafts", () => {
  const LISTINGS = [
    {
      address: "123 Example Avenue, Portland, OR 97205",
      price: 425000,
      bedrooms: "3",
      bathrooms: "2",
      squareFootage: 1650,
      propertyType: "Single Family",
      isLmi: true,
      isUsda: false,
    },
    {
      address: "456 Rural Road, Eugene, OR 97401",
      price: 385000,
      bedrooms: "2",
      bathrooms: "2.5",
      squareFootage: 1420,
      propertyType: "Townhouse",
      isLmi: false,
      isUsda: true,
    },
  ];

  it("formats a readable fixed-width spreadsheet-style table with persisted overlay flags", () => {
    const table = formatListingTable(LISTINGS);
    expect(table).toContain("Address");
    expect(table).toContain("Price");
    expect(table).toContain("123 Example Avenue, Portland, OR");
    expect(table).toContain("$425,000");
    expect(table).toContain("Yes");
    expect(table).toContain("USDA");
  });

  it("opens a reviewable property-list draft for the selected lead", () => {
    const draft = buildListingEmailDraft({
      firstName: "Taylor",
      email: "taylor@example.com",
      areaLabel: "Portland · OR",
      overlayLabel: "LMI + USDA RD",
      listings: [{
        ...LISTINGS[0],
        listingAgentName: "Avery Agent",
        listingAgentEmail: "avery@example.com",
        listingAgentPhone: "(541) 555-0119",
        zillowUrl: "https://www.zillow.com/homedetails/example-home/123_zpid/",
        propertyTaxes: 2400,
        units: "2",
        hoaDues: 125,
      }],
    });
    expect(draft.subject).toBe("Properties to consider in Portland · OR, Taylor");
    expect(draft.body).toContain("PROPERTY LIST — LMI + USDA RD");
    expect(draft.body).toContain("This is a starting point for a conversation—not a pre-approval");
    expect(draft.body).toContain("PROPERTY 1 OF 1");
    expect(draft.body).toContain("PROPERTY 1 OF 1\n\n\n123 Example Avenue, Portland, OR");
    expect(draft.body).toContain("123 Example Avenue, Portland, OR");
    expect(draft.body).toContain("LISTING AGENT CONTACT");
    expect(draft.body).toContain("Name: Avery Agent");
    expect(draft.body).toContain("Phone: (541) 555-0119");
    expect(draft.body).toContain("Email: avery@example.com");
    expect(draft.body).toContain("Zillow listing: https://www.zillow.com/homedetails/example-home/123_zpid/");
    expect(draft.body).toContain("Saved annual property taxes: $2,400");
    expect(draft.body).toContain("Units: 2");
    expect(draft.body).toContain("Saved HOA dues: $125/month");
    expect(draft.body).toContain("check its current status and current price");
    expect(draft.body).toContain("ask the agent any other questions");
    expect(draft.body).toContain("connect you with a great local buyer’s agent");
    expect(draft.body).toContain("dial in your custom home-search criteria");
    expect(draft.mailto).toMatch(/^mailto:taylor%40example\.com\?subject=/);
  });

  it("uses BCC and a neutral greeting when a property list is selected for multiple leads", () => {
    const draft = buildListingEmailDraft({
      firstName: "Taylor",
      email: "taylor@example.com",
      recipientEmails: ["taylor@example.com", "jamie@example.com"],
      areaLabel: "Coos Bay · OR",
      overlayLabel: "USDA RD",
      listings: [LISTINGS[1]],
    });
    expect(draft.body.startsWith("Hi there,")).toBe(true);
    expect(draft.mailto).toMatch(/^mailto:\?bcc=taylor%40example\.com%2Cjamie%40example\.com&subject=/);
    expect(draft.mailto).not.toContain("mailto:taylor%40example.com?");
  });

  it("uses focused buyer-facing copy for short update, USDA RD, and OHCS Flex Lending templates", () => {
    const shared = {
      firstName: "Taylor",
      email: "taylor@example.com",
      areaLabel: "Coos Bay · OR",
      overlayLabel: "All saved listings",
      listings: [LISTINGS[0]],
    };
    expect(buildListingEmailDraft({ ...shared, template: "short_property_update" }).body).toContain("I wanted to send you a quick update");
    const usdaDraft = buildListingEmailDraft({ ...shared, template: "usda_rd_focused_list" });
    expect(usdaDraft.subject).toBe("USDA RD-focused homes to consider in Coos Bay · OR, Taylor");
    expect(usdaDraft.body).toContain("USDA Rural Development financing");
    const flexDraft = buildListingEmailDraft({ ...shared, template: "ohcs_flex_lending_focused_list" });
    expect(flexDraft.subject).toBe("OHCS Flex Lending-focused homes to consider in Coos Bay · OR, Taylor");
    expect(flexDraft.body).toContain("OHCS Flex Lending and low-down-payment first-home options");
  });

  it("composes a saved custom property introduction with every automatic detail section", () => {
    const draft = buildListingEmailDraft({
      firstName: "Taylor",
      email: "taylor@example.com",
      areaLabel: "Coos Bay · OR",
      overlayLabel: "USDA RD",
      customTemplateName: "Weekend favorites",
      customBodyTemplate: "Here are a few homes I thought might be worth a closer look this weekend.",
      listings: [{
        ...LISTINGS[0],
        listingAgentName: "Avery Agent",
        listingAgentEmail: "avery@example.com",
        zillowUrl: "https://www.zillow.com/homedetails/example-home/123_zpid/",
      }],
    });
    expect(draft.body).toContain("Here are a few homes I thought might be worth a closer look this weekend.");
    expect(draft.body).toContain("Weekend favorites — USDA RD");
    expect(draft.body).toContain("Zillow listing: https://www.zillow.com/homedetails/example-home/123_zpid/");
    expect(draft.body).toContain("LISTING AGENT CONTACT");
    expect(draft.body).toContain("connect you with a great local buyer’s agent");
    expect(draft.body).toContain("Mike Ford");
  });

  it("builds a cautious buyer-attraction outreach draft for the listing agent", () => {
    const draft = buildListingAgentOutreachDraft({
      agentName: "Jamie Listing Agent",
      agentEmail: "jamie@example.com",
      areaLabel: "Coos Bay, OR",
      listings: [LISTINGS[0]],
    });
    expect(draft.body).toContain("Hi Jamie,");
    expect(draft.body).toContain("Saved program option: OHCS Flex Lending");
    expect(draft.body).not.toContain("Saved program option: USDA RD");
    expect(draft.body).toContain("not a program approval or a guarantee");
    expect(draft.body).toContain("123 Example Avenue, Portland, OR");
    expect(draft.mailto).toContain("jamie%40example.com");
  });

  it("uses BCC and a neutral greeting for all-selected listing-agent outreach", () => {
    const draft = buildListingAgentOutreachDraft({
      agentName: "Jamie Listing Agent",
      agentEmail: "jamie@example.com",
      recipientEmails: ["avery@example.com", "jamie@example.com"],
      areaLabel: "Coos Bay, OR",
      listings: [LISTINGS[0], { ...LISTINGS[1], address: "456 Coastal Drive" }],
    });
    expect(draft.body).toContain("Hi there,");
    expect(draft.body).toContain("123 Example Avenue, Portland, OR");
    expect(draft.body).toContain("456 Coastal Drive");
    expect(draft.mailto).toContain("mailto:?bcc=");
    expect(draft.mailto).toContain("jamie%40example.com");
    expect(draft.mailto).toContain("avery%40example.com");
  });

  it("maps USDA-only and dual flags to their exact saved program options", () => {
    const draft = buildListingAgentOutreachDraft({
      agentName: "Jamie Listing Agent",
      agentEmail: "jamie@example.com",
      areaLabel: "Coos Bay, OR",
      listings: [
        { ...LISTINGS[1], address: "USDA Only", isLmi: false, isUsda: true },
        { ...LISTINGS[0], address: "Both Options", isLmi: true, isUsda: true },
      ],
    });
    expect(draft.body).toContain("USDA Only — $385,000\n  Saved program option: USDA RD");
    expect(draft.body).toContain("Both Options — $425,000\n  Saved program option: OHCS Flex Lending or USDA RD");
  });

  it("composes custom outreach body copy with automatic recipient, property labels, and disclosure without a duplicate mail client signature", () => {
    const draft = buildListingAgentOutreachDraft({
      agentName: "Jamie Listing Agent",
      agentEmail: "jamie@example.com",
      areaLabel: "Coos Bay, OR",
      bodyTemplate: "I would love to discuss a custom buyer-attraction campaign for these homes.",
      listings: [LISTINGS[0]],
    });
    expect(draft.body).toContain("Hi Jamie,");
    expect(draft.body).toContain("I would love to discuss a custom buyer-attraction campaign for these homes.");
    expect(draft.body).toContain("SELECTED PROPERTY DETAILS");
    expect(draft.body).toContain("Saved program option: OHCS Flex Lending");
    expect(draft.body).toContain("not a program approval or a guarantee");
    expect(draft.body).not.toContain(MIKE_FORD_EMAIL_SIGNATURE_TEXT);
    expect(draft.body).not.toContain("17850 Pilkington Rd");
    expect(draft.mailto).toContain("jamie%40example.com");
  });

  it("removes a duplicated legacy Mike Ford contact block from Saved qualified listings outreach body copy", () => {
    const draft = buildListingAgentOutreachDraft({
      agentName: "Jamie Listing Agent",
      agentEmail: "jamie@example.com",
      areaLabel: "Coos Bay, OR",
      bodyTemplate: `I would love to discuss a custom buyer-attraction campaign for these homes.\n\nThanks,\n${MIKE_FORD_EMAIL_SIGNATURE_TEXT}`,
      listings: [LISTINGS[0]],
    });

    expect(draft.body).toContain("I would love to discuss a custom buyer-attraction campaign for these homes.");
    expect(draft.body).not.toContain("17850 Pilkington Rd");
    expect(draft.body).not.toContain("NMLS #288455");
    expect(draft.body).not.toContain("Experience.com Reviews");
  });
});
