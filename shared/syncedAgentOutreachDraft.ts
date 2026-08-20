import { richEmailTemplateToText } from "./emailTemplateText";

export type SyncedAgentOutreachRecipient = {
  fullName: string;
  email: string;
  brokerage: string | null;
  recordType: "agent" | "principal_broker";
  principalBrokerTitle?: string | null;
};

export type SyncedAgentOutreachTemplateInput = {
  subjectTemplate: string;
  bodyTemplate: string;
};

export type SyncedAgentOutreachDraft = {
  subject: string;
  body: string;
  mailto: string;
  recipientCount: number;
  bcc: boolean;
};

const DEFAULT_SUBJECT = "Oregon first-time homebuyer outreach opportunity";

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "there";
}

function mergeTemplate(value: string, recipient: SyncedAgentOutreachRecipient | null, recipientCount: number) {
  const multiRecipient = recipientCount > 1;
  const recipientType = recipient?.recordType === "principal_broker"
    ? (recipient.principalBrokerTitle?.trim() || "Principal Broker")
    : "Real Estate Professional";
  return value
    .replaceAll("{{recipient_name}}", multiRecipient ? "there" : firstName(recipient?.fullName ?? "there"))
    .replaceAll("{{brokerage}}", multiRecipient ? "your brokerage" : (recipient?.brokerage?.trim() || "your brokerage"))
    .replaceAll("{{recipient_type}}", multiRecipient ? "real estate professional" : recipientType)
    .replaceAll("{{recipient_count}}", String(recipientCount));
}

/**
 * Produces an owner-reviewed mailto draft. A single recipient is placed in To;
 * multiple selected profiles are placed in BCC so recipient addresses remain private.
 */
export function buildSyncedAgentOutreachDraft(input: {
  recipients: SyncedAgentOutreachRecipient[];
  template?: SyncedAgentOutreachTemplateInput | null;
}) : SyncedAgentOutreachDraft {
  const recipients = Array.from(new Map(
    input.recipients
      .map((recipient) => ({ ...recipient, email: recipient.email.trim() }))
      .filter((recipient) => recipient.email)
      .map((recipient) => [recipient.email.toLowerCase(), recipient])
  ).values());
  if (!recipients.length) throw new Error("Select at least one Oregon profile with an email address.");

  const recipient = recipients[0] ?? null;
  const recipientCount = recipients.length;
  const greeting = recipientCount > 1 ? "Hi there," : `Hi ${firstName(recipient.fullName)},`;
  const defaultBody = `I’m Mike Ford with Cornerstone First Mortgage. I’m reaching out because I’m building practical first-time homebuyer resources and would welcome a conversation about ways we may be able to support buyers in your Oregon market.

If it makes sense, I’d be glad to share the buyer education tools and co-branded lead-capture options available through my First-Time Homebuyer site, then hear what would be most helpful for your office and clients.`;
  const subject = mergeTemplate(input.template?.subjectTemplate?.trim() || DEFAULT_SUBJECT, recipient, recipientCount);
  const introduction = mergeTemplate(input.template?.bodyTemplate?.trim() ? richEmailTemplateToText(input.template.bodyTemplate) : defaultBody, recipient, recipientCount);
  const body = `${greeting}

${introduction}

Thank you,

Mike Ford
Loan Officer | NMLS #288455
Cornerstone First Mortgage | Company NMLS #173855
(541) 729-0819`;
  const bcc = recipientCount > 1;
  const recipientEmails = recipients.map((item) => item.email);
  const mailto = bcc
    ? `mailto:?bcc=${encodeURIComponent(recipientEmails.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : `mailto:${encodeURIComponent(recipientEmails[0]!)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { subject, body, mailto, recipientCount, bcc };
}
