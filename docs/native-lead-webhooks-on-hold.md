# Native Lead Webhooks — On Hold

## Current preserved framework

The dashboard now contains an **inactive, credential-free framework** for receiving native Meta Lead Ads and Google Ads lead-form submissions. It is intentionally separate from the website Roadmap and Mortgage Chat funnel because native platform forms do not establish the visitor’s on-site UTM session.

| Component | Preserved implementation | Current state |
|---|---|---|
| Private storage | `platform_lead` table with provider/external-lead deduplication and test/new/archive status | Migration `0042_tricky_omega_flight.sql` applied |
| Meta receiver | `GET` and `POST /api/webhooks/meta/leadgen` | Disabled until all Meta server secrets are configured |
| Google receiver | `POST /api/webhooks/google/lead-form` | Disabled until its server webhook key is configured |
| Validation | Meta challenge plus HMAC signature validation; Google webhook-key validation | Implemented, but inactive without secrets |
| Retrieval | Meta event receiver retrieves approved field data with a server-only Page access token | Implemented, but inactive without secrets |
| Dashboard review | Private **Ad platform leads** inbox in `/leads` | Ready; empty until a receiver accepts a lead |

The receiver responds safely as unavailable while its required server-only settings are absent. No page token, app secret, Google key, or recipient lead data has been added to client-side code.

## Deferred activation prerequisites

Activation remains deliberately deferred until each requirement is available and approved.

| Requirement | Why it is required |
|---|---|
| `META_LEAD_WEBHOOK_VERIFY_TOKEN` | Completes Meta’s initial webhook verification challenge |
| `META_APP_SECRET` | Validates Meta’s `X-Hub-Signature-256` delivery signature |
| `META_PAGE_ACCESS_TOKEN` | Retrieves permitted lead fields after a verified Meta Lead Ads event |
| `GOOGLE_LEAD_WEBHOOK_KEY` | Validates Google lead-form webhook deliveries |
| Final Meta and Google form field mappings | Determines which approved contact and consent fields are retained |
| Reviewed consent language | Ensures native forms use approved outreach and SMS consent language before leads are contacted |
| Corporate compliance approval | Required before turning on mortgage advertising, audience targeting, forms, or outreach workflows |

## Future resume sequence

When activation is resumed, add the four server-only values through the secure project settings, map approved form fields, add focused receiver tests, and run a provider test lead through each platform. Confirm test leads are labeled as test where applicable, delivery retries do not create duplicate records, and live leads are reviewed in **Ad platform leads** without being miscounted as website UTM submissions.
