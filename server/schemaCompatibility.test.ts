import { describe, expect, it } from "vitest";
import { chatIntakeLead, leads, loanOfficer } from "../drizzle/schema";

describe("copied database schema compatibility", () => {
  it("keeps the nullable lead officer attribution column used by public Roadmap submissions", () => {
    expect(leads.loanOfficerId.name).toBe("loanOfficerId");
  });

  it("keeps the public loan-officer fields used by dashboard and co-branded routes", () => {
    expect(loanOfficer.slug.name).toBe("slug");
    expect(loanOfficer.companyName.name).toBe("companyName");
    expect(loanOfficer.headshotUrl.name).toBe("headshotUrl");
  });

  it("keeps every chat-intake field read when a public Mortgage Intake Specialist session starts", () => {
    expect(chatIntakeLead.lowDownPaymentHomeSearch.name).toBe("lowDownPaymentHomeSearch");
    expect(chatIntakeLead.searchAreaType.name).toBe("searchAreaType");
    expect(chatIntakeLead.targetArea.name).toBe("targetArea");
    expect(chatIntakeLead.resendCount.name).toBe("resendCount");
    expect(chatIntakeLead.lastResentAt.name).toBe("lastResentAt");
  });
});
