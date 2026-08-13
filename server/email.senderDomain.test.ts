import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildChatIntakeNotification,
  sendChatIntakeNotification,
  sendReferralEmail,
  type ChatIntakeNotificationInput,
  type ReferralEmailInput,
} from "./email";

const INPUT: ReferralEmailInput = {
  agentName: "Jane Doe",
  agentEmail: "jane@realty.example",
  leadFirstName: "Sarah",
  leadEmail: "sarah@example.com",
  leadSource: "roadmap",
  submittedAt: new Date("2026-07-01T12:00:00Z"),
  scenarioSummary: null,
  ownerName: "Mike Ford",
};

const CHAT_INPUT: ChatIntakeNotificationInput = {
  recipientName: "Mike Ford",
  recipientEmail: "mford@cfmtg.com",
  recipientRole: "loan_officer",
  fullName: "Sarah Chen",
  email: "sarah@example.com",
  phone: "(541) 555-0101",
  loanPurpose: "purchase",
  propertyType: "Single-Family",
  propertyValue: 450000,
  creditRange: "Good 660-719",
  annualIncome: 120000,
  downPayment: 45000,
  loanAmount: 405000,
  coBrandedAgentName: "Kaandice McLean",
};

function response(status: number, body: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as Response;
}

describe("sendReferralEmail sender-domain handling", () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;

  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "leads@oregon-home-loans.com";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.RESEND_API_KEY = originalKey;
    process.env.RESEND_FROM_EMAIL = originalFrom;
    vi.restoreAllMocks();
  });

  it("returns a recoverable unverified_domain result for Resend's domain-verification error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response(
        403,
        JSON.stringify({
          message: "The oregon-home-loans.com domain is not verified. Please add and verify it.",
        })
      )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(sendReferralEmail(INPUT)).resolves.toMatchObject({
      sent: false,
      reason: "unverified_domain",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns sent for a successful Resend delivery", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response(200, '{"id":"email_1"}')) as unknown as typeof fetch;
    await expect(sendReferralEmail(INPUT)).resolves.toEqual({ sent: true });
  });

  it("builds an actionable completed-intake summary with co-branded source context", () => {
    const draft = buildChatIntakeNotification(CHAT_INPUT);
    expect(draft.subject).toContain("Sarah Chen");
    expect(draft.text).toContain("(541) 555-0101");
    expect(draft.text).toContain("$450,000");
    expect(draft.text).toContain("$405,000");
    expect(draft.text).toContain("Kaandice McLean's homebuyer page");
  });

  it("returns a recoverable unverified-domain state for completed-intake notifications", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response(403, "The sender domain is not verified.")) as unknown as typeof fetch;
    await expect(sendChatIntakeNotification(CHAT_INPUT)).resolves.toMatchObject({ sent: false, reason: "unverified_domain" });
  });
});
