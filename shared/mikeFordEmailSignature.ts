export const MIKE_FORD_EMAIL_SIGNATURE_TEXT = `Mike Ford
Loan Officer
Cornerstone First Mortgage
17850 Pilkington Rd | Lake Oswego, OR 97035
C: (541) 729-0819
Website: https://cfmtg.com/mford/
vCard: https://manage.dynasend.net/d/vcf/de71d86c-fc78-446a-b45b-9d44c83b9cd1?signature=8024fabb145cdf22dbc4a0e199902601cb93432d3a0953fb6390b283a816661c
Email: mford@cfmtg.com
Apply Now: https://portal.myhometrac.com/borrower/signup/mford@cfmtg.com
Experience.com Reviews: https://www.experience.com/reviews/mike-ford-457768

For complete licensing information, please click: NMLS #288455: http://www.nmlsconsumeraccess.org/EntityDetails.aspx/INDIVIDUAL/288455 | Company NMLS #173855: https://www.nmlsconsumeraccess.org/EntityDetails.aspx/COMPANY/173855`;

export function isMikeFordSignature(profile: { name?: string | null; nmls?: string | null }) {
  return profile.name?.trim().toLowerCase() === "mike ford" || profile.nmls?.replace(/\D/g, "") === "288455";
}

/**
 * Legacy saved templates may contain the old Mike Ford contact block. All
 * current outreach builders append the standardized signature themselves, so
 * strip the legacy block from their body copy before that final append.
 */
export function removeDuplicateMikeFordSignatureFromTemplateBody(templateBody: string, signature = MIKE_FORD_EMAIL_SIGNATURE_TEXT) {
  const normalized = templateBody.replace(/\r\n/g, "\n");
  const escapedSignature = signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withoutCurrentSignature = normalized.replace(
    new RegExp(`(?:^|\\n)\\s*(?:Thanks|Best|Sincerely),?\\s*\\n\\s*${escapedSignature}`, "gi"),
    "",
  );
  return withoutCurrentSignature
    .replace(
      /(?:^|\n)\s*(?:Thanks|Best|Sincerely),?\s*\n\s*(?:Mike\s+)?Ford\s*\n\s*Loan Officer\s*\n\s*Cornerstone First Mortgage\s*\n[\s\S]*?Company NMLS #173855:\s*https:\/\/www\.nmlsconsumeraccess\.org\/EntityDetails\.aspx\/COMPANY\/173855(?=\s*$|\n)/gi,
      "\n",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildLoanOfficerEmailSignature(profile: { name: string; email: string; phone: string; nmls: string; companyName: string; title?: string | null }) {
  if (isMikeFordSignature(profile)) return MIKE_FORD_EMAIL_SIGNATURE_TEXT;
  return `${profile.name}\n${profile.title || "Loan Officer"}${profile.nmls ? ` | NMLS #${profile.nmls}` : ""}\n${profile.companyName}\n${profile.phone}${profile.email ? ` | ${profile.email}` : ""}`;
}
