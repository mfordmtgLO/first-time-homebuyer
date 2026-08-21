import { richEmailTemplateToText } from "./emailTemplateText";

export type DirectoryOutreachAudience = "agent" | "loan_officer";

export type DirectoryOutreachRecipient = {
  name: string;
  email: string;
  companyName?: string | null;
  title?: string | null;
};

export type DirectoryOutreachTemplate = {
  subjectTemplate: string;
  bodyTemplate: string;
};

const defaults: Record<DirectoryOutreachAudience, DirectoryOutreachTemplate> = {
  agent: {
    subjectTemplate: "First-time homebuyer outreach idea",
    bodyTemplate: "Hi {{recipient_first_name}},\n\nI’m reaching out because I value the work you do with buyers in our market. I would welcome a conversation about practical first-time homebuyer resources and ways we may be able to help more qualified buyers explore their options.\n\nIf you are open to it, please let me know a good time to connect.",
  },
  loan_officer: {
    subjectTemplate: "First-time homebuyer outreach idea",
    bodyTemplate: "Hi {{recipient_first_name}},\n\nI’m reaching out to introduce a practical first-time homebuyer outreach idea. I would welcome a conversation about buyer education resources and ways we may be able to support more qualified buyers in our market.\n\nIf you are open to it, please let me know a good time to connect.",
  },
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name.trim();
}

export function applyDirectoryOutreachMergeFields(input: { text: string; audience: DirectoryOutreachAudience; recipient: DirectoryOutreachRecipient }) {
  const role = input.audience === "agent" ? "co-branded agent" : "loan officer";
  return input.text
    .replaceAll("{{recipient_first_name}}", firstName(input.recipient.name))
    .replaceAll("{{recipient_name}}", input.recipient.name)
    .replaceAll("{{company_name}}", input.recipient.companyName?.trim() || "your company")
    .replaceAll("{{recipient_role}}", input.recipient.title?.trim() || role);
}

export function buildDirectoryOutreachDraft(input: { audience: DirectoryOutreachAudience; recipient: DirectoryOutreachRecipient; template?: DirectoryOutreachTemplate | null }) {
  const template = input.template ?? defaults[input.audience];
  const subject = applyDirectoryOutreachMergeFields({ text: template.subjectTemplate, audience: input.audience, recipient: input.recipient });
  const body = applyDirectoryOutreachMergeFields({ text: richEmailTemplateToText(template.bodyTemplate), audience: input.audience, recipient: input.recipient });
  return { subject, body, mailto: `mailto:${encodeURIComponent(input.recipient.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
}

export function getDirectoryOutreachDefaultTemplate(audience: DirectoryOutreachAudience) {
  return defaults[audience];
}
