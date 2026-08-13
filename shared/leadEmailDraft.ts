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

  const body = `Hi ${input.firstName},

Thank you for requesting the First-Time Homebuyer Roadmap. I’m Mike Ford with Cornerstone First Mortgage, and I’m glad you’re here.

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
