import { describe, expect, it } from "vitest";
import { SMS_INTAKE_ALERTS_ENABLED, buildFutureSmsIntakeAlert } from "./sms";

describe("inactive SMS intake alert upgrade path", () => {
  it("remains explicitly disabled and only builds a future alert message without provider delivery", () => {
    expect(SMS_INTAKE_ALERTS_ENABLED).toBe(false);
    expect(buildFutureSmsIntakeAlert({
      recipientName: "Mike Ford",
      recipientPhone: "+15417290819",
      leadName: "Sarah Chen",
      loanPurpose: "purchase",
      leadPhone: "(541) 555-0101",
      leadEmail: "sarah@example.com",
    })).toContain("New completed purchase intake: Sarah Chen");
  });
});
