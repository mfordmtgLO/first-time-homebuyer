# Twilio Texting Activation Safeguards

This project’s existing Texting Workspace has a consent-gated draft and audit structure. A future live Twilio activation should preserve the following verified requirements.

| Requirement | Implementation consequence |
| --- | --- |
| A message-create request requires a recipient, a sender (`From` or `MessagingServiceSid`), and content. | Store only the Account SID, Auth Token, and one approved sender configuration in protected secret storage. Never place them in code, GitHub, logs, browser state, or database records. |
| U.S. SMS recipients must use E.164 phone formatting for the API request. | Normalize already validated dashboard phone values server-side before delivery. |
| The message-create response provides its initial status. | Store the returned provider message ID and initial status in the existing delivery-event record. |
| Post-creation statuses include `sent`, `failed`, `delivered`, and `undelivered`. | A status callback is needed for up-to-date delivery tracking. |
| Twilio signs webhook requests in `X-Twilio-Signature`; the official SDK should validate the exact callback URL and the full received parameter set. | Do not expose an unvalidated status callback. Validate HTTPS callbacks with the protected Auth Token before writing a delivery event. |

## Activation options

| Option | User experience | Tradeoffs |
| --- | --- | --- |
| Controlled outbound SMS/MMS | An owner selects explicitly consented leads, confirms the message, and sends through Twilio. The dashboard records the returned initial status. | Simplest activation. Later carrier delivery outcomes are not automatically recorded. |
| Outbound SMS/MMS plus signed status callback | The same owner-confirmed flow, with later status updates shown in the recipient chain. | Requires an HTTPS callback endpoint, Twilio Console callback configuration, and signature validation. |

> The application must not send to leads without recorded text consent. A first production test should use the account owner’s verified number, especially if the Twilio account is in trial mode.

## Callback security review findings

Twilio's current webhook guidance requires HTTPS using a publicly trusted certificate and recommends SDK-based validation of the `X-Twilio-Signature` against the exact configured webhook URL and **all** received form fields. Twilio may add callback parameters without advance notice, so validation must not rely on a fixed field allowlist for the signature calculation.

For direct Message Resource sends without a Messaging Service, Twilio returns the initial `queued` status in the create response. It does not issue a callback for that initial state; later changes may generate `sent`, `delivered`, `failed`, or `undelivered` callbacks. The private workspace must treat duplicate or out-of-order callbacks as untrusted state notifications and must not regress a terminal delivery result.

## Official sources

1. [Twilio Messages resource](https://www.twilio.com/docs/messaging/api/message-resource) — create-message requirements, statuses, E.164 phone format, Messaging Service use, and trial restrictions.
2. [Twilio outbound message status callbacks](https://www.twilio.com/docs/messaging/guides/outbound-message-status-in-status-callbacks) — status lifecycle and status-callback behavior.
3. [Twilio secure webhooks](https://www.twilio.com/docs/usage/webhooks/webhooks-security) — HTTPS and `X-Twilio-Signature` validation requirements.
