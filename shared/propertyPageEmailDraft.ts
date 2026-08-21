import { propertyEligibilityLabel, propertyFinancingContext, type PropertyLandingSnapshot } from "./propertyLandingPage";
import { buildLoanOfficerEmailSignature } from "./mikeFordEmailSignature";

type OfficerSignature = { name: string; email: string; phone: string; nmls: string; companyName: string };

function removeDuplicateMikeFordSignature(templateBody: string, signature: string) {
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

export function buildPropertyPageAgentDraft(input: {
  templateBody?: string;
  propertyUrl: string;
  snapshot: PropertyLandingSnapshot;
  listingAgentName: string;
  listingAgentEmail: string;
  loanOfficer: OfficerSignature;
}) {
  const firstName = input.listingAgentName.trim().split(/\s+/)[0] || "there";
  const program = propertyEligibilityLabel(input.snapshot);
  const financingContext = propertyFinancingContext(input.snapshot);
  const facts = [
    `Address: ${input.snapshot.address}`,
    input.snapshot.price ? `Saved snapshot price: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(input.snapshot.price)}` : null,
    input.snapshot.bedrooms ? `Beds: ${input.snapshot.bedrooms}` : null,
    input.snapshot.bathrooms ? `Baths: ${input.snapshot.bathrooms}` : null,
    input.snapshot.squareFootage ? `Square footage: ${input.snapshot.squareFootage.toLocaleString("en-US")}` : null,
    `Screening context: ${program}`,
  ].filter(Boolean).join("\n");
  const signature = buildLoanOfficerEmailSignature(input.loanOfficer);
  const templateBody = input.templateBody ? removeDuplicateMikeFordSignature(input.templateBody, signature) : "";
  const body = [
    `Hi ${firstName},`,
    "",
    templateBody || "I created a co-branded first-time-buyer property page around this saved listing so we can explore thoughtful buyer-attraction opportunities together.",
    "",
    `Property campaign page: ${input.propertyUrl}`,
    "",
    facts,
    "",
    financingContext,
    financingContext ? "" : null,
    "The property information above is based on a saved snapshot and is not a live listing feed. Before sharing current availability, price, or program fit with a buyer, please help us confirm the latest property details.",
    "",
    "If you are open to it, I would enjoy strategizing about first-time-buyer attraction for this property and helping interested buyers understand their next financing and home-search questions.",
    "",
    `Thanks,\n${signature}`,
  ].join("\n");
  const subject = `First-time buyer attraction idea — ${input.snapshot.address}`;
  return `mailto:${encodeURIComponent(input.listingAgentEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
