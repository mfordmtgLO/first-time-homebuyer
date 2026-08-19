import { describe, expect, it } from "vitest";
import { buildSyncedAgentOutreachDraft } from "../shared/syncedAgentOutreachDraft";

describe("buildSyncedAgentOutreachDraft", () => {
  it("uses a direct recipient and a complete loan-officer signature for one Oregon profile", () => {
    const draft = buildSyncedAgentOutreachDraft({
      recipients: [{ fullName: "Tiffany Johnson", email: "tiffany@example.test", brokerage: "RE/MAX Integrity", recordType: "principal_broker", principalBrokerTitle: "Managing Principal Broker" }],
    });

    expect(draft.bcc).toBe(false);
    expect(draft.mailto).toMatch(/^mailto:tiffany%40example\.test\?subject=/);
    expect(draft.body).toContain("Hi Tiffany,");
    expect(draft.body).toContain("Mike Ford\nLoan Officer | NMLS #288455\nCornerstone First Mortgage | Company NMLS #173855\n(541) 729-0819");
  });

  it("uses BCC, deduplicates addresses, and merges generic copy for a multi-profile draft", () => {
    const draft = buildSyncedAgentOutreachDraft({
      recipients: [
        { fullName: "Jane Agent", email: "jane@example.test", brokerage: "Example Realty", recordType: "agent" },
        { fullName: "Tiffany Johnson", email: "TIFFANY@example.test", brokerage: "RE/MAX Integrity", recordType: "principal_broker" },
        { fullName: "Duplicate Tiffany", email: "tiffany@example.test", brokerage: null, recordType: "principal_broker" },
      ],
      template: {
        subjectTemplate: "A note for {{recipient_count}} Oregon contacts",
        bodyTemplate: "Hello {{recipient_name}} at {{brokerage}} — I’d welcome a conversation with each {{recipient_type}}.",
      },
    });

    expect(draft.bcc).toBe(true);
    expect(draft.recipientCount).toBe(2);
    expect(draft.subject).toBe("A note for 2 Oregon contacts");
    expect(draft.body).toContain("Hello there at your brokerage");
    expect(draft.mailto).toContain("mailto:?bcc=jane%40example.test%2Ctiffany%40example.test");
  });

  it("rejects a selection with no usable email address", () => {
    expect(() => buildSyncedAgentOutreachDraft({
      recipients: [{ fullName: "No Email", email: "", brokerage: null, recordType: "agent" }],
    })).toThrow("Select at least one Oregon profile with an email address.");
  });
});
