import { describe, expect, it } from "vitest";
import { PUBLIC_SITE_ORIGIN, publicSiteUrl } from "@shared/publicSiteUrl";

describe("public share-link origin", () => {
  it("uses the branded first-time-homebuyer domain for loan-officer and paired URLs", () => {
    expect(PUBLIC_SITE_ORIGIN).toBe("https://firsttimehomebuyer.manus.space");
    expect(publicSiteUrl("/loan-officer/mford")).toBe("https://firsttimehomebuyer.manus.space/loan-officer/mford");
    expect(publicSiteUrl("/with/mford/kaandice-mclean")).toBe("https://firsttimehomebuyer.manus.space/with/mford/kaandice-mclean");
  });
});
