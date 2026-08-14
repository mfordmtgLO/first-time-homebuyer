export const CHAT_STEPS = [
  "loan_purpose",
  "property_type",
  "property_value",
  "credit_range",
  "annual_income",
  "down_payment",
  "loan_amount",
  "full_name",
  "email",
  "phone",
  "sms_consent",
  "home_search_interest",
  "search_area_type",
  "target_area",
  "complete",
] as const;

export type ChatStep = (typeof CHAT_STEPS)[number];
export type LoanPurpose = "purchase" | "refinance";
export type CreditRange = "Excellent 720+" | "Good 660-719" | "Fair 620-659" | "Poor under 620";
export type SearchAreaType = "City" | "County";

export type IntakeValues = {
  loanPurpose: LoanPurpose | null;
  propertyType: string | null;
  propertyValue: number | null;
  creditRange: CreditRange | null;
  annualIncome: number | null;
  downPayment: number | null;
  loanAmount: number | null;
  lowDownPaymentHomeSearch: number | null;
  searchAreaType: SearchAreaType | null;
  targetArea: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  smsConsent: number | null;
};

export type ChatContact = {
  name: string;
  title: string;
  phone: string;
  email: string;
  nmls: string;
};

export type ChatAgentContact = {
  name: string;
  companyName: string;
  phone: string;
  email: string;
};

export const CREDIT_OPTIONS: CreditRange[] = [
  "Excellent 720+",
  "Good 660-719",
  "Fair 620-659",
  "Poor under 620",
];

export const PROPERTY_OPTIONS = [
  "Single-Family",
  "Condo",
  "Multi-Family",
  "Townhouse",
  "Manufactured home (no leased land/space rent)",
] as const;

export const SEARCH_AREA_OPTIONS: SearchAreaType[] = ["City", "County"];

const usd = (amount: number) =>
  amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function openingMessage(officer: ChatContact, agent?: ChatAgentContact | null) {
  const officerLine = officer.name
    ? `You’ll be connected with ${officer.name}${officer.title ? `, ${officer.title}` : ""}${officer.nmls ? ` (NMLS #${officer.nmls})` : ""}.`
    : "A licensed mortgage specialist will review your options.";
  const agentLine = agent?.name
    ? ` You’re visiting with local real estate partner ${agent.name}${agent.companyName ? ` of ${agent.companyName}` : ""}.`
    : "";
  return `Hello! Welcome to our mortgage portal. I can help you begin a pre-qualification conversation in under 2 minutes. This is an informational intake, not a loan approval. ${officerLine}${agentLine}\n\nTo get started, are you looking to **purchase** a new home or **refinance** your current mortgage?`;
}

export function promptForStep(step: ChatStep, values: IntakeValues): string {
  switch (step) {
    case "loan_purpose":
      return "Are you looking to **purchase** a new home or **refinance** your current mortgage?";
    case "property_type":
      return "What type of property are you considering: **Single-Family, Condo, Multi-Family, Townhouse, or Manufactured home (no leased land/space rent)**?";
    case "property_value":
      return values.loanPurpose === "refinance"
        ? "What is the estimated current value of the property?"
        : "What is the estimated purchase price of the home?";
    case "credit_range":
      return "Which estimated credit-score range best fits you: **Excellent 720+**, **Good 660-719**, **Fair 620-659**, or **Poor under 620**?";
    case "annual_income":
      return "What is your estimated **gross annual household income** before taxes?";
    case "down_payment":
      return "For your purchase, how much do you have available for a **down payment**?";
    case "loan_amount":
      return values.loanPurpose === "refinance"
        ? "What is your estimated **current mortgage balance**?"
        : "";
    case "full_name":
      return "What is your **full name**? A licensed specialist will use this to review your options.";
    case "email":
      return "What is the best **email address** for your personalized options review?";
    case "phone":
      return "What is the best **phone number** for a licensed specialist to reach you?";
    case "sms_consent":
      return "Would you agree to receive calls and text messages from Mike Ford and Cornerstone First Mortgage about your mortgage inquiry? Consent is not a condition of purchase. Please choose **Yes** or **No**.";
    case "home_search_interest":
      return "Would you like us to prepare a list of potential **low- or no-down-payment qualifying properties in Oregon** and forward it to your email soon?";
    case "search_area_type":
      return "Would you like us to search by **City** or **County**?";
    case "target_area":
      return `Ok, great. Let us know what ${values.searchAreaType?.toLowerCase() ?? "city or county"} in Oregon you'd like us to prepare a list to forward to your email soon.`;
    default:
      return "";
  }
}

function amountFromText(raw: string) {
  const cleaned = raw.replace(/[$,\s]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? Math.round(value) : null;
}

function normalisePurpose(raw: string): LoanPurpose | null {
  const value = raw.toLowerCase();
  if (/(purchase|buy|buying|new home)/.test(value)) return "purchase";
  if (/(refinance|refi)/.test(value)) return "refinance";
  return null;
}

function normaliseProperty(raw: string) {
  const value = raw.toLowerCase();
  if (/(single|single-family|single family)/.test(value)) return "Single-Family";
  if (/condo/.test(value)) return "Condo";
  if (/(multi|duplex|triplex|fourplex)/.test(value)) return "Multi-Family";
  if (/(townhouse|townhome)/.test(value)) return "Townhouse";
  if (/(manufactured|mobile home|modular)/.test(value)) return "Manufactured home (no leased land/space rent)";
  return null;
}

function normaliseCredit(raw: string): CreditRange | null {
  const value = raw.toLowerCase();
  if (/(excellent|720|7[2-9]\d|8\d\d)/.test(value)) return "Excellent 720+";
  if (/(good|660|66\d|67\d|68\d|69\d|7[01]\d)/.test(value)) return "Good 660-719";
  if (/(fair|620|62\d|63\d|64\d|65\d)/.test(value)) return "Fair 620-659";
  if (/(poor|under 620|[3-5]\d\d|6[01]\d)/.test(value)) return "Poor under 620";
  return null;
}

function normaliseSearchAreaType(raw: string): SearchAreaType | null {
  const value = raw.toLowerCase().trim();
  if (/^city\b/.test(value)) return "City";
  if (/^county\b/.test(value)) return "County";
  return null;
}

export type ParsedAnswer =
  | { ok: true; patch: Partial<IntakeValues>; nextStep: ChatStep; response: string }
  | { ok: false; response: string };

export function parseAnswer(step: ChatStep, raw: string, values: IntakeValues): ParsedAnswer {
  const text = raw.trim();
  if (!text) return { ok: false, response: promptForStep(step, values) };

  switch (step) {
    case "loan_purpose": {
      const loanPurpose = normalisePurpose(text);
      if (!loanPurpose) return { ok: false, response: "Please choose **purchase** or **refinance** so I can ask the right questions." };
      return { ok: true, patch: { loanPurpose }, nextStep: "property_type", response: promptForStep("property_type", { ...values, loanPurpose }) };
    }
    case "property_type": {
      const propertyType = normaliseProperty(text);
      if (!propertyType) return { ok: false, response: "Please choose one of these property types: **Single-Family, Condo, Multi-Family, Townhouse, or Manufactured home (no leased land/space rent)**." };
      return { ok: true, patch: { propertyType }, nextStep: "property_value", response: promptForStep("property_value", { ...values, propertyType }) };
    }
    case "property_value": {
      const propertyValue = amountFromText(text);
      if (!propertyValue || propertyValue < 25_000 || propertyValue > 20_000_000) return { ok: false, response: "Please enter an estimated property price or value between $25,000 and $20,000,000." };
      return { ok: true, patch: { propertyValue }, nextStep: "credit_range", response: promptForStep("credit_range", { ...values, propertyValue }) };
    }
    case "credit_range": {
      const creditRange = normaliseCredit(text);
      if (!creditRange) return { ok: false, response: "Please select **Excellent 720+**, **Good 660-719**, **Fair 620-659**, or **Poor under 620**." };
      return { ok: true, patch: { creditRange }, nextStep: "annual_income", response: promptForStep("annual_income", { ...values, creditRange }) };
    }
    case "annual_income": {
      const annualIncome = amountFromText(text);
      if (!annualIncome || annualIncome < 10_000 || annualIncome > 10_000_000) return { ok: false, response: "Please enter your estimated gross annual household income as a dollar amount." };
      return {
        ok: true,
        patch: { annualIncome },
        nextStep: values.loanPurpose === "purchase" ? "down_payment" : "loan_amount",
        response: promptForStep(values.loanPurpose === "purchase" ? "down_payment" : "loan_amount", { ...values, annualIncome }),
      };
    }
    case "down_payment": {
      const downPayment = amountFromText(text);
      if (downPayment === null || downPayment < 0 || (values.propertyValue && downPayment > values.propertyValue)) return { ok: false, response: "Please enter a down payment amount that is at least $0 and no more than the estimated purchase price." };
      const loanAmount = Math.max((values.propertyValue ?? 0) - downPayment, 0);
      return { ok: true, patch: { downPayment, loanAmount }, nextStep: "full_name", response: promptForStep("full_name", { ...values, downPayment, loanAmount }) };
    }
    case "loan_amount": {
      const loanAmount = amountFromText(text);
      if (!loanAmount || loanAmount < 10_000 || (values.propertyValue && loanAmount > values.propertyValue * 1.25)) return { ok: false, response: "Please enter your estimated current mortgage balance as a dollar amount." };
      return { ok: true, patch: { loanAmount }, nextStep: "full_name", response: promptForStep("full_name", { ...values, loanAmount }) };
    }
    case "full_name": {
      const fullName = text.replace(/\s+/g, " ");
      if (fullName.length < 2 || fullName.length > 180) return { ok: false, response: "Please enter your full name so a licensed specialist can review your options." };
      return { ok: true, patch: { fullName }, nextStep: "email", response: promptForStep("email", { ...values, fullName }) };
    }
    case "email": {
      const email = text.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, response: "Please enter a valid email address." };
      return { ok: true, patch: { email }, nextStep: "phone", response: promptForStep("phone", { ...values, email }) };
    }
    case "phone": {
      const digits = text.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) return { ok: false, response: "Please enter a valid phone number, including area code." };
      const nextStep = "sms_consent";
      return { ok: true, patch: { phone: text }, nextStep, response: promptForStep(nextStep, { ...values, phone: text }) };
    }
    case "sms_consent": {
      const answer = text.toLowerCase();
      const nextStep = values.loanPurpose === "purchase" ? "home_search_interest" : "complete";
      if (/^(yes|y|yeah|yep|sure|i agree)\b/.test(answer)) {
        return { ok: true, patch: { smsConsent: 1 }, nextStep, response: promptForStep(nextStep, { ...values, smsConsent: 1 }) };
      }
      if (/^(no|n|nope|do not|don't)\b/.test(answer)) {
        return { ok: true, patch: { smsConsent: 0 }, nextStep, response: promptForStep(nextStep, { ...values, smsConsent: 0 }) };
      }
      return { ok: false, response: "Please choose **Yes** to agree to receive calls and text messages about your mortgage inquiry, or **No** to continue without SMS permission." };
    }
    case "home_search_interest": {
      const answer = text.toLowerCase();
      if (/^(yes|y|yeah|yep|sure|please|of course)\b/.test(answer)) {
        return { ok: true, patch: { lowDownPaymentHomeSearch: 1 }, nextStep: "search_area_type", response: promptForStep("search_area_type", { ...values, lowDownPaymentHomeSearch: 1 }) };
      }
      if (/^(no|n|nope|not now|not interested)\b/.test(answer)) {
        return { ok: true, patch: { lowDownPaymentHomeSearch: 0 }, nextStep: "complete", response: "" };
      }
      return { ok: false, response: "Please choose **YES** if you would like a low- or no-down-payment qualifying-property list prepared for email, or **NO** to continue without one." };
    }
    case "search_area_type": {
      const searchAreaType = normaliseSearchAreaType(text);
      if (!searchAreaType) return { ok: false, response: "Please choose whether you would like to search by **City** or **County**." };
      return { ok: true, patch: { searchAreaType }, nextStep: "target_area", response: promptForStep("target_area", { ...values, searchAreaType }) };
    }
    case "target_area": {
      const targetArea = text.replace(/\s+/g, " ");
      if (targetArea.length < 2 || targetArea.length > 240) return { ok: false, response: `Please enter the Oregon ${values.searchAreaType?.toLowerCase() ?? "city or county"} you would like us to target.` };
      return { ok: true, patch: { targetArea }, nextStep: "complete", response: "" };
    }
    default:
      return { ok: false, response: "Your intake is already complete. A licensed specialist will be in touch." };
  }
}

export function completeMessage(name: string, phone: string, homeSearch = false, searchAreaType?: SearchAreaType | null, targetArea?: string | null) {
  const homeSearchMessage = homeSearch
    ? ` We’ll also prepare a list of potential low- or no-down-payment qualifying properties${targetArea ? ` for the requested ${searchAreaType?.toLowerCase() ?? "area"} of ${targetArea}` : ""} and forward it to your email soon.`
    : "";
  return `Thank you, ${name}! Your intake profile is complete. A mortgage specialist will reach out to you at ${phone} within 24 business hours.${homeSearchMessage}\n\nWe’ll review the planning details you shared and help you understand the next steps. This intake is not a loan approval or commitment to lend.`;
}

export function intakeSummary(values: IntakeValues) {
  return [
    values.loanPurpose ? `Purpose: ${values.loanPurpose}` : "",
    values.propertyType ? `Property: ${values.propertyType}` : "",
    values.propertyValue ? `Value: ${usd(values.propertyValue)}` : "",
    values.creditRange ? `Credit: ${values.creditRange}` : "",
    values.annualIncome ? `Income: ${usd(values.annualIncome)}` : "",
    values.downPayment !== null ? `Down payment: ${usd(values.downPayment ?? 0)}` : "",
    values.loanAmount ? `Loan amount: ${usd(values.loanAmount)}` : "",
    values.smsConsent === 1 ? "SMS consent: Yes" : values.smsConsent === 0 ? "SMS consent: No" : "",
    values.lowDownPaymentHomeSearch === 1 ? `Home search: Low/no-down-payment options${values.targetArea ? ` · ${values.searchAreaType ?? "Area"}: ${values.targetArea}` : ""}` : "",
  ].filter(Boolean);
}
