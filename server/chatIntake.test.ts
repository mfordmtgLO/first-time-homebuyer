import { describe, expect, it } from "vitest";
import { completeMessage, openingMessage, parseAnswer, promptForStep, type IntakeValues } from "../shared/chatIntake";

const EMPTY: IntakeValues = {
  loanPurpose: null,
  propertyType: null,
  propertyValue: null,
  creditRange: null,
  annualIncome: null,
  downPayment: null,
  loanAmount: null,
  lowDownPaymentHomeSearch: null,
  targetArea: null,
  fullName: null,
  email: null,
  phone: null,
  smsConsent: null,
};

describe("mortgage chat intake flow", () => {
  it("opens with the required purchase-or-refinance prompt and actual mortgage contact", () => {
    const greeting = openingMessage(
      { name: "Mike Ford", title: "Loan Officer", phone: "(541) 729-0819", email: "mford@cfmtg.com", nmls: "288455" },
      { name: "Kaandice McLean", companyName: "The Cooley Real Estate Group", phone: "(541) 555-0123", email: "kaandice@example.com" }
    );
    expect(greeting).toContain("purchase");
    expect(greeting).toContain("refinance");
    expect(greeting).toContain("Mike Ford");
    expect(greeting).toContain("Kaandice McLean");
    expect(greeting).toContain("not a loan approval");
  });

  it("guides a purchase intake one answer at a time and calculates the purchase loan amount", () => {
    const purpose = parseAnswer("loan_purpose", "I want to buy", EMPTY);
    expect(purpose).toMatchObject({ ok: true, nextStep: "property_type", patch: { loanPurpose: "purchase" } });
    if (!purpose.ok) return;
    const property = parseAnswer("property_type", "single family home", { ...EMPTY, ...purpose.patch });
    expect(property).toMatchObject({ ok: true, nextStep: "property_value", patch: { propertyType: "Single-Family" } });
    if (!property.ok) return;
    const value = parseAnswer("property_value", "$450,000", { ...EMPTY, ...purpose.patch, ...property.patch });
    expect(value).toMatchObject({ ok: true, nextStep: "credit_range", patch: { propertyValue: 450000 } });
    if (!value.ok) return;
    const credit = parseAnswer("credit_range", "good, around 680", { ...EMPTY, ...purpose.patch, ...property.patch, ...value.patch });
    expect(credit).toMatchObject({ ok: true, patch: { creditRange: "Good 660-719" } });
    if (!credit.ok) return;
    const income = parseAnswer("annual_income", "120000", { ...EMPTY, ...purpose.patch, ...property.patch, ...value.patch, ...credit.patch });
    expect(income).toMatchObject({ ok: true, nextStep: "down_payment", patch: { annualIncome: 120000 } });
    if (!income.ok) return;
    const downPayment = parseAnswer("down_payment", "$45,000", { ...EMPTY, ...purpose.patch, ...property.patch, ...value.patch, ...credit.patch, ...income.patch });
    expect(downPayment).toMatchObject({ ok: true, nextStep: "full_name", patch: { downPayment: 45000, loanAmount: 405000 } });
  });

  it("routes refinance intake to estimated current balance and validates contact capture", () => {
    const refinance = parseAnswer("loan_purpose", "refi", EMPTY);
    expect(refinance).toMatchObject({ ok: true, patch: { loanPurpose: "refinance" } });
    const values = { ...EMPTY, loanPurpose: "refinance" as const, propertyValue: 600000 };
    const badPhone = parseAnswer("phone", "555", values);
    expect(badPhone.ok).toBe(false);
    const balance = parseAnswer("loan_amount", "$410,000", values);
    expect(balance).toMatchObject({ ok: true, nextStep: "full_name", patch: { loanAmount: 410000 } });
    const email = parseAnswer("email", "not-an-email", values);
    expect(email.ok).toBe(false);
    const phone = parseAnswer("phone", "(541) 555-0101", values);
    expect(phone).toMatchObject({ ok: true, nextStep: "sms_consent", patch: { phone: "(541) 555-0101" } });
    const noConsent = parseAnswer("sms_consent", "No", { ...values, phone: "(541) 555-0101" });
    expect(noConsent).toMatchObject({ ok: true, nextStep: "complete", patch: { smsConsent: 0 } });
  });

  it("captures an optional low/no-down-payment home-search target before completing a purchase intake", () => {
    const purchaseValues = { ...EMPTY, loanPurpose: "purchase" as const };
    const phone = parseAnswer("phone", "(541) 555-0101", purchaseValues);
    expect(phone).toMatchObject({ ok: true, nextStep: "sms_consent" });
    const consent = parseAnswer("sms_consent", "Yes", { ...purchaseValues, phone: "(541) 555-0101" });
    expect(consent).toMatchObject({ ok: true, nextStep: "home_search_interest", patch: { smsConsent: 1 } });
    const interested = parseAnswer("home_search_interest", "Yes, please", { ...purchaseValues, phone: "(541) 555-0101", smsConsent: 1 });
    expect(interested).toMatchObject({ ok: true, nextStep: "search_area_type", patch: { lowDownPaymentHomeSearch: 1 } });
    const areaType = parseAnswer("search_area_type", "City", { ...purchaseValues, lowDownPaymentHomeSearch: 1 });
    expect(areaType).toMatchObject({ ok: true, nextStep: "target_area", patch: { searchAreaType: "City" } });
    const target = parseAnswer("target_area", "Eugene and surrounding areas", { ...purchaseValues, lowDownPaymentHomeSearch: 1, searchAreaType: "City" });
    expect(target).toMatchObject({ ok: true, nextStep: "complete", patch: { targetArea: "Eugene and surrounding areas" } });
  });

  it("accepts the guided manufactured-home option and uses the revised qualifying-property search prompt", () => {
    const property = parseAnswer("property_type", "Manufactured home (no leased land/space rent)", EMPTY);
    expect(property).toMatchObject({
      ok: true,
      nextStep: "property_value",
      patch: { propertyType: "Manufactured home (no leased land/space rent)" },
    });
    expect(promptForStep("home_search_interest", { ...EMPTY, loanPurpose: "purchase" })).toContain("qualifying properties in Oregon");
    expect(promptForStep("search_area_type", { ...EMPTY, loanPurpose: "purchase", lowDownPaymentHomeSearch: 1 })).toContain("City");
  });

  it("returns the requested compliant completion message", () => {
    const message = completeMessage("Sarah Chen", "(541) 555-0101", true, "City", "Eugene and surrounding areas");
    expect(message).toContain("Thank you, Sarah Chen!");
    expect(message).toContain("(541) 555-0101");
    expect(message).toContain("within 24 business hours");
    expect(message).toContain("not a loan approval");
    expect(message).toContain("low- or no-down-payment qualifying properties");
    expect(message).toContain("Eugene and surrounding areas");
  });
});
