import twilio from "twilio";
import { ENV } from "../server/_core/env";
import { getTwilioStatusCallbackUrl } from "../server/twilio";

const url = getTwilioStatusCallbackUrl();
const params = { MessageSid: "SM00000000000000000000000000000000", MessageStatus: "sent" };
const signature = twilio.getExpectedTwilioSignature(ENV.twilioAuthToken.trim(), url, params);
const response = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Twilio-Signature": signature },
  body: new URLSearchParams(params),
});
console.log(JSON.stringify({ hardenedSignedCallbackProbeHttpStatus: response.status }));
process.exit(response.status === 204 ? 0 : 1);
