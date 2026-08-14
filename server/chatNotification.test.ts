import { describe, expect, it } from "vitest";
import { buildChatIntakeNotification } from "./email";

describe("chat intake agent notification drafts", () => {
  it("uses the agent's first name and the branded co-marketing page URL", () => {
    const draft = buildChatIntakeNotification({
      recipientName: "Kaandice McLean",
      recipientEmail: "kaandice@example.com",
      recipientRole: "agent",
      fullName: "Sam Buyer",
      email: "sam@example.com",
      phone: "(541) 555-0101",
      loanPurpose: "purchase",
      propertyType: "Single-Family",
      propertyValue: 400000,
      creditRange: "Good 660-719",
      annualIncome: 100000,
      downPayment: 20000,
      loanAmount: 380000,
      lowDownPaymentHomeSearch: 0,
      searchAreaType: null,
      targetArea: null,
      coBrandedAgentName: "Kaandice McLean",
      coBrandedSourceUrl: "https://firsttimehomebuyer.manus.space/with/mford/kaandice-mclean",
    });

    expect(draft.text).toContain("Hi Kaandice,");
    expect(draft.text).not.toContain("Hi Kaandice McLean,");
    expect(draft.text).toContain("Co-branded source: https://firsttimehomebuyer.manus.space/with/mford/kaandice-mclean");
  });
});
