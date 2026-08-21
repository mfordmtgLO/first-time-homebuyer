import { describe, expect, it } from "vitest";
import { formatUsPhoneInput } from "../shared/phoneFormat";

describe("U.S. phone input formatting", () => {
  it("formats typed or pasted ten-digit U.S. values as a readable local number", () => {
    expect(formatUsPhoneInput("5037295556")).toBe("(503) 729-5556");
    expect(formatUsPhoneInput("503-729-5556")).toBe("(503) 729-5556");
  });

  it("removes a single leading U.S. country code instead of displaying it", () => {
    expect(formatUsPhoneInput("+1 (503) 729-5556")).toBe("(503) 729-5556");
    expect(formatUsPhoneInput("15037295556")).toBe("(503) 729-5556");
  });

  it("keeps partial entry readable and limits the field to a local ten-digit number", () => {
    expect(formatUsPhoneInput("50372")).toBe("(503) 72");
    expect(formatUsPhoneInput("503729555699")).toBe("(503) 729-5556");
  });
});
