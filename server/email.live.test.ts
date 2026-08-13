/**
 * Live credential check for the Resend integration.
 * Skips automatically when RESEND_API_KEY isn't configured (the app then
 * falls back to mailto: drafts, so no key is not a failure).
 */
import { describe, expect, it } from "vitest";

const apiKey = process.env.RESEND_API_KEY;

describe.skipIf(!apiKey)("Resend credential", () => {
  it("authenticates against the Resend API", async () => {
    // GET /domains distinguishes key states without sending any email:
    //   200                → full-access key, valid
    //   401 restricted_api_key → valid key restricted to sending emails (fine for us)
    //   401 (anything else)    → invalid key
    const resp = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (resp.status === 401) {
      const body = (await resp.json().catch(() => ({}))) as { name?: string };
      expect(
        body.name,
        "RESEND_API_KEY appears to be invalid — expected a valid (possibly sending-restricted) key"
      ).toBe("restricted_api_key");
    } else {
      expect(resp.ok).toBe(true);
    }
  }, 15_000);
});
