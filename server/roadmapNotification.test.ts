import { describe, expect, it } from "vitest";
import { buildRoadmapNotificationContent } from "./routers";

describe("automatic Roadmap lead notification content", () => {
  it("starts with lead contact details and mirrors the detailed referral scenario summary", () => {
    const content = buildRoadmapNotificationContent({
      firstName: "Sam",
      phone: "(541) 555-0100",
      email: "sam@example.com",
      agentName: "Kaandice McLean",
      scenario: JSON.stringify({
        buydown: { purchasePrice: 425000, downPayment: 21250, noteRate: 6.5, year1MonthlySavings: 536, year2MonthlySavings: 275, totalSubsidy: 9730 },
        costOfWaiting: { purchasePrice: 400000, monthlyRent: 1800, waitYears: 3, costOfWaiting: 105578 },
      }),
    });

    expect(content).toContain("Lead name: Sam\nLead phone: (541) 555-0100\nLead email: sam@example.com");
    expect(content).toContain("Year 1 monthly savings: $536");
    expect(content).toContain("Year 2 monthly savings: $275");
    expect(content).toContain("Total seller-paid buydown interest subsidy: $9,730 (2.29% of sales price)");
    expect(content).toContain("resulting in $105,578 cost of waiting.");
    expect(content).not.toContain("source:");
  });
});
