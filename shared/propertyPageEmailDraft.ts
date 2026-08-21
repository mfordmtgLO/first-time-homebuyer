import { propertyEligibilityLabel, propertyFinancingContext, type PropertyLandingSnapshot } from "./propertyLandingPage";
import { buildLoanOfficerEmailSignature, removeDuplicateMikeFordSignatureFromTemplateBody } from "./mikeFordEmailSignature";

type OfficerSignature = { name: string; email: string; phone: string; nmls: string; companyName: string };

export function buildPropertyPageAgentDraft(input: {
  templateBody?: string;
  propertyUrl: string;
  snapshot: PropertyLandingSnapshot;
  listingAgentName: string;
  listingAgentEmail: string;
  loanOfficer: OfficerSignature;
  /** Optional dashboard override; blank values retain the contextual default. */
  subject?: string | null;
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
  const templateBody = input.templateBody ? removeDuplicateMikeFordSignatureFromTemplateBody(input.templateBody, signature) : "";
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
  ].join("\n");
  const subject = input.subject?.trim() || `First-time buyer attraction idea — ${input.snapshot.address}`;
  return `mailto:${encodeURIComponent(input.listingAgentEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
