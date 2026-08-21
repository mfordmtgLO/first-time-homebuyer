import { describe, expect, it } from "vitest";
import { buildDirectoryOutreachDraft, getDirectoryOutreachDefaultTemplate } from "../shared/directoryOutreachEmailDraft";

describe("directory outreach email drafts", () => {
  it("merges an agent recipient into a rich reusable template without adding an app signature", () => {
    const draft = buildDirectoryOutreachDraft({
      audience: "agent",
      recipient: { name: "Kaandice McLean", email: "kaandice@example.com", companyName: "Coastal Homes", title: "Principal Broker" },
      template: {
        subjectTemplate: "Hello {{recipient_first_name}} at {{company_name}}",
        bodyTemplate: "<p>Hi {{recipient_name}},</p><p>Your {{recipient_role}} profile is ready.</p>",
      },
    });

    expect(draft.subject).toBe("Hello Kaandice at Coastal Homes");
    expect(draft.body).toContain("Hi Kaandice McLean,");
    expect(draft.body).toContain("Principal Broker profile is ready.");
    expect(draft.body).not.toContain("Mike Ford");
    expect(draft.mailto).toContain("mailto:kaandice%40example.com");
  });

  it("provides a signature-free default loan-officer outreach draft", () => {
    const draft = buildDirectoryOutreachDraft({
      audience: "loan_officer",
      recipient: { name: "Jordan Lee", email: "jordan@example.com", companyName: "Cornerstone First Mortgage", title: "Loan Officer" },
      template: getDirectoryOutreachDefaultTemplate("loan_officer"),
    });

    expect(draft.subject).toBe("First-time homebuyer outreach idea");
    expect(draft.body).toContain("Hi Jordan,");
    expect(draft.body).not.toContain("Mike Ford");
  });
});
