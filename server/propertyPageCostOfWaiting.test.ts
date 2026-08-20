import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("single-property Cost of Waiting section", () => {
  it("renders the calculator in a visible standalone anchored section", () => {
    const page = readFileSync("client/src/pages/PropertyLandingPage.tsx", "utf8");
    const calculator = readFileSync("client/src/components/landing/CostOfWaiting.tsx", "utf8");
    expect(page).toContain('id="cost-of-waiting"');
    expect(page).toContain('background: "oklch(0.27 0.05 162)"');
    expect(page).toContain("What could waiting cost you while this opportunity changes?");
    expect(page).toContain("<CostOfWaiting purchasePrice={snapshot.price ?? undefined} propertyAddress={snapshot.address} />");
    expect(page).toContain("<Buydown purchasePrice={snapshot.price ?? undefined} />");
    expect(page).toContain("BuyerCalculationActions");
    expect(page).toContain("Your local homebuying team");
    expect(page).toContain("Email PDF summary");
    expect(page).toContain('eventType: "email_pdf_summary"');
    expect(page).toContain("CalculatorEligibilityBadges");
    expect(page).toContain("OHCS Flex Lending screen");
    expect(page).toContain("USDA RD screen");
    expect(page).toContain("outside USDA’s ineligible urban overlays");
    expect(page).toContain("PropertySectionNavigator");
    expect(page).toContain('new Event("open-mortgage-chat")');
    expect(page).toContain("window.addEventListener(\"scroll\", updateActiveSection");
    expect(calculator).toContain("prefilledPurchasePrice");
    expect(calculator).toContain("For {propertyAddress}");
    expect(calculator).toContain("Five-year buy-now vs. wait lens");
    expect(calculator).toContain("LineChart");
    expect(calculator).toContain("Share this calculation");
    expect(calculator).toContain("FiveYearComparisonTooltip");
    expect(calculator).toContain("Five-year impact:");
  });
});
