/**
 * Inactive SMS upgrade path for future use.
 *
 * This module deliberately performs no provider calls, reads no SMS credentials,
 * and sends no text messages. When the business elects to activate SMS alerts,
 * implement a provider adapter here and gate it behind explicit configuration,
 * recipient consent, and TCPA-compliant messaging practices.
 */
export const SMS_INTAKE_ALERTS_ENABLED = false;

export type FutureSmsIntakeAlert = {
  recipientPhone: string;
  recipientName: string;
  leadName: string;
  loanPurpose: "purchase" | "refinance" | null;
  leadPhone: string;
  leadEmail: string;
};

export function buildFutureSmsIntakeAlert(input: FutureSmsIntakeAlert) {
  const purpose = input.loanPurpose === "refinance" ? "refinance" : "purchase";
  return `New completed ${purpose} intake: ${input.leadName}. Phone: ${input.leadPhone}; email: ${input.leadEmail}. Follow up within one business day.`;
}
