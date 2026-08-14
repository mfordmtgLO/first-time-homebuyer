import { describe, expect, it } from "vitest";
import { buildReferralEmail } from "./email";

describe("buildReferralEmail", () => {
  it("uses the agent's first name and includes the lead phone number", () => {
    const email = buildReferralEmail({
      agentName: "Jane Doe",
      agentEmail: "jane@example.com",
      leadFirstName: "Sarah",
      leadEmail: "sarah@example.com",
      leadPhone: "(541) 555-0199",
      leadSource: "roadmap+buydown",
      submittedAt: new Date("2026-08-13T19:00:00.000Z"),
      scenarioSummary: "- 2-1 buydown scenario: $425,000 purchase\n  - Year 1 monthly savings: $536",
      ownerName: "Mike Ford",
    });

    expect(email.text).toContain("Hi Jane,");
    expect(email.text).not.toContain("Hi Jane Doe,");
    expect(email.text).toContain("Phone: (541) 555-0199");
    expect(email.text).toContain("Year 1 monthly savings: $536");
    expect(email.text).not.toContain("Came in via:");
  });
});
