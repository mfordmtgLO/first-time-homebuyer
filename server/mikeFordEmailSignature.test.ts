import { describe, expect, it } from "vitest";
import { buildLoanOfficerEmailSignature, MIKE_FORD_EMAIL_SIGNATURE_TEXT } from "../shared/mikeFordEmailSignature";
import { getEmailTemplateMergeFields } from "../client/src/components/UniversalEmailTemplateEditor";

describe("Mike Ford default email signature", () => {
  it("preserves the uploaded contact, action, review, and licensing details", () => {
    expect(MIKE_FORD_EMAIL_SIGNATURE_TEXT).toContain("17850 Pilkington Rd | Lake Oswego, OR 97035");
    expect(MIKE_FORD_EMAIL_SIGNATURE_TEXT).toContain("C: (541) 729-2097");
    expect(MIKE_FORD_EMAIL_SIGNATURE_TEXT).toContain("Apply Now: https://portal.myhometrac.com/borrower/signup/mford@cfmtg.com");
    expect(MIKE_FORD_EMAIL_SIGNATURE_TEXT).toContain("Experience.com Reviews: https://www.experience.com/reviews/mike-ford-457768");
    expect(MIKE_FORD_EMAIL_SIGNATURE_TEXT).toContain("Company NMLS #173855");
  });

  it("uses the supplied signature for Mike Ford while preserving a generic signature for another loan officer", () => {
    expect(buildLoanOfficerEmailSignature({ name: "Mike Ford", email: "legacy@example.test", phone: "(541) 729-0819", nmls: "288455", companyName: "Cornerstone First Mortgage" })).toBe(MIKE_FORD_EMAIL_SIGNATURE_TEXT);
    expect(buildLoanOfficerEmailSignature({ name: "Alex Officer", email: "alex@example.test", phone: "(541) 555-0199", nmls: "999", companyName: "Example Mortgage" })).toContain("Alex Officer");
  });
});

describe("workflow-specific template merge fields", () => {
  it("shows buyer tokens only in buyer templates and Oregon recipient tokens only in Oregon outreach", () => {
    expect(getEmailTemplateMergeFields("property_page_buyer").map((field) => field.token)).toEqual(["{{client_name}}", "{{property_address}}", "{{property_url}}", "{{loan_officer_signature}}", "{{agent_signature}}"]);
    expect(getEmailTemplateMergeFields("oregon_outreach").map((field) => field.token)).toEqual(["{{recipient_name}}", "{{brokerage}}", "{{recipient_type}}", "{{recipient_count}}"]);
    expect(getEmailTemplateMergeFields("listing_agent")).toEqual([]);
    expect(getEmailTemplateMergeFields("property_list")).toEqual([]);
    expect(getEmailTemplateMergeFields("property_page_agent")).toEqual([]);
  });
});
