export const MIKE_FORD_EMAIL_SIGNATURE_TEXT = `Mike Ford
Loan Officer
Cornerstone First Mortgage
17850 Pilkington Rd | Lake Oswego, OR 97035
C: (541) 729-2097
Website: https://cfmtg.com/mford/
vCard: https://manage.dynasend.net/d/vcf/de71d86c-fc78-446a-b45b-9d44c83b9cd1?signature=8024fabb145cdf22dbc4a0e199902601cb93432d3a0953fb6390b283a816661c
Email: mford@cfmtg.com
Apply Now: https://portal.myhometrac.com/borrower/signup/mford@cfmtg.com
Experience.com Reviews: https://www.experience.com/reviews/mike-ford-457768

For complete licensing information, please click: NMLS #288455: http://www.nmlsconsumeraccess.org/EntityDetails.aspx/INDIVIDUAL/288455 | Company NMLS #173855: https://www.nmlsconsumeraccess.org/EntityDetails.aspx/COMPANY/173855`;

export function isMikeFordSignature(profile: { name?: string | null; nmls?: string | null }) {
  return profile.name?.trim().toLowerCase() === "mike ford" || profile.nmls?.replace(/\D/g, "") === "288455";
}

export function buildLoanOfficerEmailSignature(profile: { name: string; email: string; phone: string; nmls: string; companyName: string; title?: string | null }) {
  if (isMikeFordSignature(profile)) return MIKE_FORD_EMAIL_SIGNATURE_TEXT;
  return `${profile.name}\n${profile.title || "Loan Officer"}${profile.nmls ? ` | NMLS #${profile.nmls}` : ""}\n${profile.companyName}\n${profile.phone}${profile.email ? ` | ${profile.email}` : ""}`;
}
