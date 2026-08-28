import { describe, expect, it } from "vitest";
import twilio from "twilio";

describe("protected Twilio credentials", () => {
  it("authenticate against Twilio without sending a message or exposing secret values", async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    expect(accountSid).toBeTruthy();
    expect(authToken).toBeTruthy();

    const account = await twilio(accountSid!, authToken!).api.v2010.accounts(accountSid!).fetch();

    expect(account.sid).toMatch(/^AC[0-9a-f]{32}$/i);
    expect(account.status).toBeTruthy();
  }, 15_000);
});
