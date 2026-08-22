import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sidebar = fs.readFileSync(path.join(root, "client/src/components/DashboardWorkdaySidebar.tsx"), "utf8");
const leadsPage = fs.readFileSync(path.join(root, "client/src/pages/Leads.tsx"), "utf8");
const router = fs.readFileSync(path.join(root, "server/routers.ts"), "utf8");

describe("dashboard workday workflow", () => {
  it("provides a collapsible owner workday sidebar with clickable current dashboard sections", () => {
    expect(sidebar).toContain("Daily workday flow");
    expect(sidebar).toContain("PanelLeftClose");
    expect(sidebar).toContain("campaign-funnel");
    expect(sidebar).toContain("platform-leads");
    expect(sidebar).toContain("roadmap-leads");
    expect(sidebar).toContain("chat-intakes");
    expect(sidebar).toContain("saved-qualifying-listings");
    expect(sidebar).toContain("pairing-spend-tracker");
    expect(sidebar).toContain("Open section");
    expect(leadsPage).toContain("DashboardWorkdaySidebar");
  });

  it("keeps daily section AI reviews private, compact, record-bounded, and operational", () => {
    expect(router).toContain("workflowAi: router");
    expect(router).toContain("requireAdmin(ctx.user.role)");
    expect(router).toContain("records: z.array");
    expect(router).toContain(".max(10)");
    expect(router).toContain("Do not give lending, legal, fair-housing, advertising-compliance");
    expect(router).toContain("Never instruct the user to send an automated message");
    expect(sidebar).toContain("Internal workflow guidance only");
    expect(sidebar).toContain("AI review history &amp; owner feedback");
    expect(sidebar).toContain("Feedback records your outcome; it does not automatically train or send anything.");
    expect(router).toContain("listHistory: protectedProcedure");
    expect(router).toContain("updateOutcome: protectedProcedure");
  });

  it("includes a compact payment and interest estimator only within the private dashboard sidebar", () => {
    expect(sidebar).toContain("DashboardPaymentEstimator");
    expect(sidebar).toContain("Quick payment estimate");
    expect(sidebar).toContain("Internal estimate home price");
    expect(sidebar).toContain("Property tax / yr");
    expect(sidebar).toContain("Home insurance / yr");
    expect(sidebar).toContain("HOA dues / mo");
    expect(sidebar).toContain("Mortgage insurance / mo");
    expect(sidebar).toContain("Estimated total monthly payment");
    expect(sidebar).toContain("Save Quote");
    expect(sidebar).toContain("Saved scenario comparison");
    expect(sidebar).toContain("downloadSavedQuoteReport");
    expect(sidebar).toContain("saved-mortgage-payment-scenarios.pdf");
    expect(sidebar).toContain("Term interest");
    expect(sidebar).toContain("Internal planning estimate only");
  });
});
