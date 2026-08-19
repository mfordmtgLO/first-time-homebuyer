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
    expect(page).toContain("PropertySectionNavigator");
    expect(page).toContain('new Event("open-mortgage-chat")');
    expect(calculator).toContain("prefilledPurchasePrice");
    expect(calculator).toContain("For {propertyAddress}");
    expect(calculator).toContain("Five-year buy-now vs. wait lens");
    expect(calculator).toContain("LineChart");
  });
});
