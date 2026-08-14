/**
 * Lead referral email — sends the assigned co-marketing agent an intro email
 * when the owner clicks "Send to agent" in the /leads dashboard.
 *
 * Uses Resend when RESEND_API_KEY is configured. Returns a structured result
 * so the UI can fall back to a prefilled mailto: link when email sending is
 * not configured.
 */

export type ReferralEmailInput = {
  agentName: string;
  agentEmail: string;
  leadFirstName: string;
  leadEmail: string;
  leadPhone?: string | null;
  leadSource: string;
  submittedAt: Date;
  scenarioSummary: string | null;
  ownerName: string;
};

export type ReferralEmailResult =
  | { sent: true }
  | {
      sent: false;
      reason: "not_configured" | "unverified_domain" | "send_failed";
      detail?: string;
    };

export function buildReferralEmail(input: ReferralEmailInput) {
  const agentFirstName = input.agentName.trim().split(/\s+/)[0] || "there";
  const subject = `New buyer lead from ${input.ownerName}: ${input.leadFirstName}`;
  const scenarioBlock = input.scenarioSummary
    ? `\n\nWhat they explored on the site:\n${input.scenarioSummary}`
    : "";
  const text = `Hi ${agentFirstName},

I'd like to connect you with a buyer lead from my First-Time Homebuyer landing page.

Name: ${input.leadFirstName}
Email: ${input.leadEmail}
Phone: ${input.leadPhone || "Not provided"}
Submitted: ${input.submittedAt.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} (Pacific)${scenarioBlock}

They're working with me on financing — please reach out and introduce yourself when you get a chance.

Thanks,
${input.ownerName}
Cornerstone First Mortgage
(541) 729-0819`;
  return { subject, text };
}

export async function sendReferralEmail(
  input: ReferralEmailInput
): Promise<ReferralEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, reason: "not_configured" };
  }
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const { subject, text } = buildReferralEmail(input);
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Mike Ford <${from}>`,
        to: [input.agentEmail],
        subject,
        text,
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error("[Email] Resend rejected referral email:", resp.status, detail);
      // Resend correctly blocks external delivery until the selected sender domain
      // is verified. Return a specific, recoverable result so the dashboard can
      // open a prefilled mail draft rather than showing a generic failure.
      if (resp.status === 403 && /domain is not verified/i.test(detail)) {
        return { sent: false, reason: "unverified_domain", detail };
      }
      return { sent: false, reason: "send_failed", detail: `Resend error ${resp.status}` };
    }
    return { sent: true };
  } catch (error) {
    console.error("[Email] Failed to send referral email:", error);
    return { sent: false, reason: "send_failed", detail: String(error) };
  }
}

export type ChatIntakeNotificationInput = {
  recipientName: string;
  recipientEmail: string;
  recipientRole: "loan_officer" | "agent";
  fullName: string;
  email: string;
  phone: string;
  loanPurpose: "purchase" | "refinance" | null;
  propertyType: string | null;
  propertyValue: number | null;
  creditRange: string | null;
  annualIncome: number | null;
  downPayment: number | null;
  loanAmount: number | null;
  lowDownPaymentHomeSearch: number | null;
  searchAreaType: string | null;
  targetArea: string | null;
  coBrandedAgentName?: string | null;
  coBrandedSourceUrl?: string | null;
};

export type ChatIntakeNotificationResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "unverified_domain" | "send_failed"; detail?: string };

const intakeMoney = (value: number | null) =>
  value === null
    ? "Not provided"
    : value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function buildChatIntakeNotification(input: ChatIntakeNotificationInput) {
  const roleLabel = input.recipientRole === "loan_officer" ? "selected loan officer" : "co-marketing agent";
  const recipientFirstName = input.recipientName.trim().split(/\s+/)[0] || "there";
  const subject = `New completed mortgage intake: ${input.fullName}`;
  const coBrandContext = input.coBrandedSourceUrl
    ? `\nCo-branded source: ${input.coBrandedSourceUrl}`
    : input.coBrandedAgentName
      ? `\nCo-branded source: ${input.coBrandedAgentName}'s homebuyer page`
    : "";
  const financingDetails = input.loanPurpose === "purchase"
    ? `Down payment: ${intakeMoney(input.downPayment)}\nEstimated loan amount: ${intakeMoney(input.loanAmount)}`
    : `Estimated current loan balance: ${intakeMoney(input.loanAmount)}`;
  const homeSearchDetails = input.lowDownPaymentHomeSearch === 1
    ? `\nHome search request: Please prepare potential low- or no-down-payment qualifying properties${input.targetArea ? ` for the requested ${input.searchAreaType?.toLowerCase() ?? "area"} of ${input.targetArea}, Oregon` : " in Oregon"} to forward to this visitor's email soon.`
    : "";
  const text = `Hi ${recipientFirstName},

A visitor completed the Mortgage Intake Specialist chat. You are receiving this message as the ${roleLabel}.

Contact
Name: ${input.fullName}
Email: ${input.email}
Phone: ${input.phone}

Planning snapshot
Purpose: ${input.loanPurpose === "refinance" ? "Refinance" : "Purchase"}
Property type: ${input.propertyType || "Not provided"}
Estimated property value: ${intakeMoney(input.propertyValue)}
Credit range: ${input.creditRange || "Not provided"}
Annual household income: ${intakeMoney(input.annualIncome)}
  ${financingDetails}${homeSearchDetails}${coBrandContext}

Please follow up within one business day. This intake is an educational starting point and is not a loan approval.

Mike Ford
Cornerstone First Mortgage
(541) 729-0819`;
  return { subject, text };
}

export async function sendChatIntakeNotification(input: ChatIntakeNotificationInput): Promise<ChatIntakeNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "not_configured" };
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const { subject, text } = buildChatIntakeNotification(input);
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `Mike Ford <${from}>`, to: [input.recipientEmail], subject, text }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error("[Email] Resend rejected completed-intake notification:", resp.status, detail);
      return { sent: false, reason: resp.status === 403 && /domain is not verified/i.test(detail) ? "unverified_domain" : "send_failed", detail };
    }
    return { sent: true };
  } catch (error) {
    console.error("[Email] Failed to send completed-intake notification:", error);
    return { sent: false, reason: "send_failed", detail: String(error) };
  }
}
