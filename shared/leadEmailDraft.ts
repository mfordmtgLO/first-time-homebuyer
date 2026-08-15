/**
 * Builds the first-touch email that Mike opens manually from the lead dashboard.
 * This stays client-side by design: a `mailto:` draft lets Mike review each
 * message before sending. Supporting PDFs are included as stable download links.
 */

export type LeadEmailBuydownScenario = {
  purchasePrice: number;
  downPayment: number;
  noteRate: number;
  loanAmount: number;
  year1Payment: number;
  year2Payment: number;
  notePayment: number;
  year1MonthlySavings: number;
  year2MonthlySavings: number;
  totalSubsidy: number;
};

export type LeadEmailCostOfWaitingScenario = {
  waitYears: number;
  monthlyRent: number;
  purchasePrice: number;
  downPayment: number;
  interestRate: number;
  appreciationRate: number;
  rentIncreaseRate?: number;
  monthlyPayment: number;
  totalRentPaid: number;
  equityGained: number;
  costOfWaiting: number;
};

export type LeadEmailAgent = {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string;
  bio: string | null;
  website: string;
  companyName: string;
  headshotUrl: string;
  companyLogoUrl: string;
};

export type LeadWelcomeDraftInput = {
  firstName: string;
  email: string;
  scenarios: {
    buydown: LeadEmailBuydownScenario | null;
    costOfWaiting: LeadEmailCostOfWaitingScenario | null;
  } | null;
  /** Present only when the submission came through /with/:slug, not a manual assignment. */
  coMarketingAgent?: LeadEmailAgent | null;
  siteOrigin: string;
  /** Identifies a Chat Intake origin even if no transcript messages have been saved yet. */
  draftSource?: "roadmap" | "chat";
  /** Present for a manual email draft opened from a Mortgage Chat Intake row. */
  chatTranscript?: Array<{ role: "assistant" | "user" | "system"; content: string }>;
};

export type ListingEmailRow = {
  address: string;
  price: number | null;
  bedrooms: string | null;
  bathrooms: string | null;
  squareFootage: number | null;
  propertyType: string | null;
  isLmi: boolean;
  isUsda: boolean;
  listingAgentName?: string;
  listingAgentEmail?: string;
  listingAgentPhone?: string;
  zillowUrl?: string;
};

export type PropertyEmailTemplateKey =
  | "property_shortlist_with_agent_follow_up"
  | "short_property_update"
  | "usda_rd_focused_list"
  | "ohcs_flex_lending_focused_list";

export type ListingEmailDraftInput = {
  firstName: string;
  email: string;
  /** Additional recipients are composed in BCC to preserve lead privacy. */
  recipientEmails?: string[];
  areaLabel: string;
  overlayLabel: string;
  listings: ListingEmailRow[];
  template?: PropertyEmailTemplateKey;
};

export type ListingAgentOutreachDraftInput = {
  agentName: string;
  agentEmail: string;
  areaLabel: string;
  listings: ListingEmailRow[];
  /** Reusable program or custom body copy. The builder always appends the listing variables and signature. */
  bodyTemplate?: string | null;
};

const money = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const ROADMAP_RESOURCES = [
  {
    title: "Roadmap Homebuyer Guide + Checklist",
    path: "/manus-storage/Roadmap-Homebuyer-Guide-Checklist_3bca9bdc.pdf",
  },
  {
    // `mailto:` bodies are plain text, so Unicode bold provides reliable visual
    // emphasis for GO across common mail clients without HTML markup appearing
    // literally in the recipient's draft.
    title: "Your Road Home Map — Click GREEN 𝗚𝗢",
    path: "/manus-storage/YourRoadHomeMap_clickGREENGO_4d677174.pdf",
  },
] as const;

function absoluteUrl(value: string, siteOrigin: string) {
  if (!value) return "";
  try {
    return new URL(value, siteOrigin).toString();
  } catch {
    return value;
  }
}

function formatBuydown(s: LeadEmailBuydownScenario) {
  const downPaymentPct = ((s.downPayment / Math.max(s.purchasePrice, 1)) * 100).toFixed(1);
  return `YOUR 2-1 BUYDOWN SNAPSHOT
• Home price: ${money(s.purchasePrice)}
• Down payment: ${money(s.downPayment)} (${downPaymentPct}%)
• Loan amount: ${money(s.loanAmount)} at a ${s.noteRate}% note rate
• Estimated principal & interest: ${money(s.year1Payment)}/month in Year 1 (about ${money(s.year1MonthlySavings)}/month below the note-rate payment)
• Estimated principal & interest: ${money(s.year2Payment)}/month in Year 2 (about ${money(s.year2MonthlySavings)}/month below the note-rate payment)
• Estimated note-rate principal & interest: ${money(s.notePayment)}/month
• Estimated temporary buydown subsidy: ${money(s.totalSubsidy)} (100% seller funded)

These are planning estimates only. We can review the loan program, qualification, taxes, insurance, and seller contribution options together before you make any decisions.`;
}

function formatCostOfWaiting(s: LeadEmailCostOfWaitingScenario) {
  const downPaymentPct = ((s.downPayment / Math.max(s.purchasePrice, 1)) * 100).toFixed(1);
  const rentGrowth =
    s.rentIncreaseRate === undefined ? "" : `, assuming ${s.rentIncreaseRate}% annual rent growth`;
  return `YOUR COST-OF-WAITING SNAPSHOT
• Current rent: ${money(s.monthlyRent)}/month
• Home price explored: ${money(s.purchasePrice)} with ${money(s.downPayment)} down (${downPaymentPct}%)
• Planning horizon: ${s.waitYears} ${s.waitYears === 1 ? "year" : "years"}${rentGrowth}
• Assumptions used: ${s.interestRate}% interest rate and ${s.appreciationRate}% annual appreciation
• Estimated rent paid while waiting: ${money(s.totalRentPaid)}
• Estimated equity you may not build during that time: ${money(s.equityGained)}
• Estimated cost of waiting: ${money(s.costOfWaiting)}

This illustration is designed to start a conversation—not to pressure you. We can adjust every assumption around your timing, budget, and goals.`;
}

function formatAgent(agent: LeadEmailAgent, siteOrigin: string) {
  const profile = [
    `YOUR LOCAL REAL ESTATE PARTNER: ${agent.name}`,
    agent.companyName ? `Company: ${agent.companyName}` : "",
    agent.phone ? `Phone: ${agent.phone}` : "",
    agent.email ? `Email: ${agent.email}` : "",
    agent.website ? `Website: ${absoluteUrl(agent.website, siteOrigin)}` : "",
  ].filter(Boolean);

  return `${profile.join("\n")}\n\n${agent.name} is a local real estate professional you can also reach out to anytime with questions, home-search scenarios, or ideas about the right next step.`;
}

function formatRoadmapResources(siteOrigin: string) {
  return `Please see the two Roadmap resources included below—save them for your homebuying journey:

• ${ROADMAP_RESOURCES[0].title}
  Open or download: ${new URL(ROADMAP_RESOURCES[0].path, siteOrigin).toString()}

• ${ROADMAP_RESOURCES[1].title}
  Open or download: ${new URL(ROADMAP_RESOURCES[1].path, siteOrigin).toString()}`;
}

function formatChatConversationRecap(
  transcript: Array<{ role: "assistant" | "user" | "system"; content: string }> | undefined,
  firstName: string
) {
  const visibleMessages = (transcript ?? []).filter((message) => message.role !== "system" && message.content.trim());
  if (visibleMessages.length === 0) {
    return `CHAT CONVERSATION RECAP

No saved chat messages were available when this draft was opened. Please review the intake record in the dashboard before sending.`;
  }

  return `CHAT CONVERSATION RECAP
${visibleMessages.map((message) => {
    const speaker = message.role === "assistant" ? "Mortgage Intake Specialist" : firstName;
    return `${speaker}
${message.content.trim()}`;
  }).join("\n\n")}`;
}

function compact(value: string, width: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= width ? normalized.padEnd(width) : `${normalized.slice(0, Math.max(width - 1, 1))}…`;
}

/** A fixed-width, spreadsheet-style table that remains readable in plain-text mail clients. */
export function formatListingTable(listings: ListingEmailRow[]) {
  const displayed = listings.slice(0, 25);
  const header = [
    compact("Address", 34),
    compact("Price", 11),
    compact("Beds", 5),
    compact("Baths", 5),
    compact("Sq Ft", 8),
    compact("Type", 14),
    compact("LMI", 3),
    compact("USDA", 4),
  ].join(" | ");
  const divider = "-".repeat(header.length);
  const rows = displayed.map((listing) =>
    [
      compact(listing.address, 34),
      compact(listing.price === null ? "—" : money(listing.price), 11),
      compact(listing.bedrooms ?? "—", 5),
      compact(listing.bathrooms ?? "—", 5),
      compact(listing.squareFootage === null ? "—" : listing.squareFootage.toLocaleString("en-US"), 8),
      compact(listing.propertyType ?? "—", 14),
      compact(listing.isLmi ? "Yes" : "—", 3),
      compact(listing.isUsda ? "Yes" : "—", 4),
    ].join(" | ")
  );
  const overflow = listings.length > displayed.length
    ? `\n\nShowing the first ${displayed.length} of ${listings.length} selected listings in this email.`
    : "";
  return `${header}\n${divider}\n${rows.join("\n")}${overflow}`;
}

function listingProgramLabel(listing: ListingEmailRow) {
  if (listing.isLmi && listing.isUsda) return "OHCS Flex Lending or USDA RD";
  if (listing.isLmi) return "OHCS Flex Lending";
  if (listing.isUsda) return "USDA RD";
  return "General home-financing review";
}

/** A readable, plain-text property card that remains scannable in common email clients. */
export function formatPropertyEmailDetails(listings: ListingEmailRow[]) {
  const displayed = listings.slice(0, 25);
  const details = displayed.map((listing, index) => {
    const agentContact = [
      listing.listingAgentName ? `• Name: ${listing.listingAgentName}` : "",
      listing.listingAgentPhone ? `• Phone: ${listing.listingAgentPhone}` : "",
      listing.listingAgentEmail ? `• Email: ${listing.listingAgentEmail}` : "",
    ].filter(Boolean);
    const contactSection = agentContact.length
      ? `LISTING AGENT CONTACT\n${agentContact.join("\n")}`
      : "LISTING AGENT CONTACT\n• Contact details were not included in this saved listing.";
    const listingLink = listing.zillowUrl ? `\n• Zillow listing: ${listing.zillowUrl}` : "";
    return `PROPERTY ${index + 1} OF ${displayed.length}


${listing.address}
────────────────────────────────
• Price: ${listing.price === null ? "Price unavailable" : money(listing.price)}
• Home type: ${listing.propertyType ?? "Not provided"}
• Beds / baths: ${listing.bedrooms ?? "—"} / ${listing.bathrooms ?? "—"}
• Square feet: ${listing.squareFootage === null ? "Not provided" : listing.squareFootage.toLocaleString("en-US")}
• Potential financing conversation: ${listingProgramLabel(listing)}${listingLink}

${contactSection}`;
  });
  const overflow = listings.length > displayed.length
    ? `\n\nShowing the first ${displayed.length} of ${listings.length} selected properties in this email.`
    : "";
  return `${details.join("\n\n")}${overflow}`;
}

function getPropertyEmailTemplateCopy(template: PropertyEmailTemplateKey, areaLabel: string) {
  switch (template) {
    case "short_property_update":
      return {
        subject: `Quick property update for ${areaLabel}`,
        heading: "PROPERTY UPDATE",
        opening: `I wanted to send you a quick update with a few homes currently saved in ${areaLabel}. Take a look at the details and Zillow links below, and let me know which ones you would like to explore further.`,
      };
    case "usda_rd_focused_list":
      return {
        subject: `USDA RD-focused homes to consider in ${areaLabel}`,
        heading: "USDA RD-FOCUSED PROPERTY LIST",
        opening: `I pulled together these homes in ${areaLabel} to support a conversation about USDA Rural Development financing and low- or no-down-payment possibilities. Program, borrower, and property eligibility all require case-by-case verification before any decision is made.`,
      };
    case "ohcs_flex_lending_focused_list":
      return {
        subject: `OHCS Flex Lending-focused homes to consider in ${areaLabel}`,
        heading: "OHCS FLEX LENDING-FOCUSED PROPERTY LIST",
        opening: `I pulled together these homes in ${areaLabel} to support a conversation about OHCS Flex Lending and low-down-payment first-home options. Program, borrower, and property eligibility all require case-by-case verification before any decision is made.`,
      };
    default:
      return {
        subject: `Properties to consider in ${areaLabel}`,
        heading: "PROPERTY LIST",
        opening: `Based on the home-search area you selected, I pulled together the following properties in ${areaLabel}. This is a starting point for a conversation—not a pre-approval, program approval, or guarantee of property eligibility.`,
      };
  }
}

export function buildListingEmailDraft(input: ListingEmailDraftInput) {
  const propertyDetails = formatPropertyEmailDetails(input.listings);
  const recipientEmails = Array.from(new Set([input.email, ...(input.recipientEmails ?? [])].map((email) => email.trim()).filter(Boolean)));
  const isMultiRecipient = recipientEmails.length > 1;
  const template = input.template ?? "property_shortlist_with_agent_follow_up";
  const templateCopy = getPropertyEmailTemplateCopy(template, input.areaLabel);
  const subject = isMultiRecipient ? templateCopy.subject : `${templateCopy.subject}, ${input.firstName}`;
  const body = `Hi ${isMultiRecipient ? "there" : input.firstName},

${templateCopy.opening}

${templateCopy.heading} — ${input.overlayLabel.toUpperCase()}
${propertyDetails}

I’d be glad to review your budget, loan options, occupancy requirements, and the details of any property that stands out. If a home catches your attention, I can reach out to the listing agent to check its current status and current price. Just let me know if you would like me to ask the agent any other questions you may have about the property, and I’ll get back to you quickly with any information I can find out. Availability and eligibility can change, so we’ll verify the relevant information before you make any decisions.

And when you’re ready, I can connect you with a great local buyer’s agent to help schedule a showing for any property highlighted here. If you are still refining what feels right, we can also dial in your custom home-search criteria and work together to find your first home soon. You will have a local team in your corner every step of the way.

Warmly,
Mike Ford
Loan Officer | NMLS #288455
Cornerstone First Mortgage | Company NMLS #173855
(541) 729-0819`;
  return {
    subject,
    body,
    mailto: isMultiRecipient
      ? `mailto:?bcc=${encodeURIComponent(recipientEmails.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      : `mailto:${encodeURIComponent(recipientEmails[0] ?? input.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}

export function buildListingAgentOutreachDraft(input: ListingAgentOutreachDraftInput) {
  const firstName = input.agentName.trim().split(/\s+/)[0] || "there";
  const listingLabel = input.listings.length === 1 ? "listing" : "listings";
  const selectedTemplate = input.bodyTemplate?.trim();
  const listingSummary = input.listings.map((listing) => {
    const price = listing.price === null ? "price not listed" : money(listing.price);
    const programOption = listing.isLmi && listing.isUsda
      ? "OHCS Flex Lending or USDA RD"
      : listing.isLmi
        ? "OHCS Flex Lending"
        : listing.isUsda
          ? "USDA RD"
          : "No saved program flag";
    return `• ${listing.address} — ${price}\n  Saved program option: ${programOption}`;
  }).join("\n");
  const subject = `${input.listings.length} ${listingLabel} in ${input.areaLabel}: buyer-attraction opportunity`;
  const introduction = selectedTemplate || `I’m Mike Ford, a local loan officer with Cornerstone First Mortgage. I noticed ${input.listings.length === 1 ? "your listing" : "these listings"} in ${input.areaLabel} and thought ${input.listings.length === 1 ? "it" : "they"} may be worth featuring in buyer-attraction marketing that speaks to low- and no-down-payment homeownership options:`;
  const body = `Hi ${firstName},

${introduction}

SELECTED PROPERTY DETAILS
${listingSummary}

The saved program option for each property is listed above. I would be glad to discuss a compliant, co-marketed outreach approach that highlights the specific buyer-financing conversation indicated for each home.

This is not a program approval or a guarantee of property or borrower eligibility. We would verify all program, borrower, property, occupancy, and availability requirements before making any representations.

Would you be open to a brief conversation about buyer-attraction marketing opportunities for ${input.listings.length === 1 ? "this home" : "these homes"}?

Best,
Mike Ford
Loan Officer | NMLS #288455
Cornerstone First Mortgage | Company NMLS #173855
(541) 729-0819`;
  return {
    subject,
    body,
    mailto: `mailto:${encodeURIComponent(input.agentEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}

export function buildLeadWelcomeDraft(input: LeadWelcomeDraftInput) {
  const scenarioBlocks = [
    input.scenarios?.costOfWaiting ? formatCostOfWaiting(input.scenarios.costOfWaiting) : "",
    input.scenarios?.buydown ? formatBuydown(input.scenarios.buydown) : "",
  ].filter(Boolean);
  const agentBlock = input.coMarketingAgent
    ? formatAgent(input.coMarketingAgent, input.siteOrigin)
    : "";
  const contextualWebsiteUrl = input.coMarketingAgent
    ? new URL(`/with/${input.coMarketingAgent.slug}`, input.siteOrigin).toString()
    : new URL("/", input.siteOrigin).toString();
  const isChatDraft = input.draftSource === "chat" || input.chatTranscript !== undefined;
  const transcriptRecap = isChatDraft
    ? `

${formatChatConversationRecap(input.chatTranscript, input.firstName)}`
    : "";
  const opening = isChatDraft
    ? `Thank you for your interest in home loan financing options for your first home purchase. Below is a recap of the conversation you had with my Mortgage Intake Specialist chat.`
    : `Thank you for requesting the First-Time Homebuyer Roadmap. I’m Mike Ford with Cornerstone First Mortgage, and I’m glad you’re here.`;

  const body = `Hi ${input.firstName},

${opening}${transcriptRecap}

These resources are designed to give you a clear, no-pressure starting point for understanding your options, mapping your next steps, and preparing to buy when the time feels right.

${formatRoadmapResources(input.siteOrigin)}${
    scenarioBlocks.length
      ? `

I also wanted to include a quick recap of the numbers you explored on the website:

${scenarioBlocks.join("\n\n")}`
      : ""
  }${agentBlock ? `

${agentBlock}` : ""}

If you have any questions about the cost of waiting, how a 2-1 buydown works, or what it could take to get pre-approved, please reach out anytime. I’m here to help you with your Roadmap to Homeownership. Feel free to head back to the website to run more scenarios or learn more about home loan financing products here: ${contextualWebsiteUrl}

Warmly,
Mike Ford
Loan Officer | NMLS #288455
Cornerstone First Mortgage | Company NMLS #173855
(541) 729-0819`;

  const subject = `Your First-Time Homebuyer Roadmap, ${input.firstName}`;
  return {
    subject,
    body,
    mailto: `mailto:${encodeURIComponent(input.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}
