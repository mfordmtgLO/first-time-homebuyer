import { describe, expect, it } from "vitest";
import { leads, loanOfficer } from "../drizzle/schema";

describe("copied database schema compatibility", () => {
  it("keeps the nullable lead officer attribution column used by public Roadmap submissions", () => {
    expect(leads.loanOfficerId.name).toBe("loanOfficerId");
  });

  it("keeps the public loan-officer fields used by dashboard and co-branded routes", () => {
    expect(loanOfficer.slug.name).toBe("slug");
    expect(loanOfficer.companyName.name).toBe("companyName");
    expect(loanOfficer.headshotUrl.name).toBe("headshotUrl");
  });
});
