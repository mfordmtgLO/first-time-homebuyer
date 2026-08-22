# Officer-Specific Meta and Google Ads Connection Guide

**Audience:** Mike Ford Admin, downstream loan officers, engineering, compliance, and corporate advertising reviewers.

**Purpose:** Define the exact future integration sequence for allowing an active downstream loan officer to authorize only their own Meta Ads and Google Ads accounts, route paid leads into their scoped dashboard workspace, and retain Mike Ford’s administrator oversight. This is a **draft implementation and approval guide**. It does not activate live ad-account connections, webhooks, or lead imports.

> **Control principle:** A loan officer authorizes their own advertising account. The platform stores only the server-side authorization artifacts needed for the approved integration, scoped to that officer’s active workspace. Mike Ford can review connection status and imported activity, but neither Mike nor the application should collect the officer’s Meta or Google password.

## 1. Required release gates before any live connection

The connection screen should remain unavailable until every gate below is recorded as approved. The current project deliberately keeps native Meta and Google lead-form imports on hold until this review is complete.

| Gate | Owner | Required evidence |
|---|---|---|
| Corporate compliance approval | Corporate compliance | Written approval of the proposed form, audience, disclosures, lead-routing, retention, and follow-up plan. |
| Officer account authority | Downstream loan officer | Confirmation that the officer has authority to grant the application access to the specific ad account, Page, and lead form. |
| Privacy and consent review | Compliance and Mike Ford Admin | Approved privacy notice, lead-form disclosure, consent language, and mapping of any phone/text follow-up behavior. |
| App review and production access | Engineering and platform owner | Applicable Meta App Review / Business Verification / access tier and Google Ads API developer-token access are complete. |
| Test plan | Mike Ford Admin and engineering | Test account/form, sample lead, attribution checks, failure handling, and a no-auto-message verification. |

## 2. Shared architecture and ownership boundary

The application should use a dedicated **Officer Advertising Connection** record, keyed to the downstream officer’s authenticated user account and assigned loan-officer profile. It must not be keyed only to a display name, co-branded agent, or global administrator account.

| Field | Purpose |
|---|---|
| `ownerUserId` | Binds the connection to the downstream officer’s authenticated dashboard workspace. |
| `loanOfficerProfileId` | Preserves public and co-brand branding attribution. |
| `provider` | `meta` or `google_ads`. |
| `externalAccountId` | Selected ad account/customer account identifier. |
| `externalPageOrFormId` | Meta Page/form or Google lead-form asset identifier, where applicable. |
| `grantedScopes` | Exact permissions approved during OAuth. |
| `tokenSecretRef` | Reference to encrypted server-side token storage; never the raw token in a browser payload. |
| `status` | `draft`, `pending_admin_review`, `test`, `active`, `revoked`, or `suspended`. |
| `approvedBy` and `approvedAt` | Mike Ford administrator release record. |
| `lastVerifiedAt` | Latest successful account/form verification. |

### Mandatory security rules

1. Use authorization-code OAuth with a server-side callback and anti-forgery `state` validation. Use PKCE where the provider and client flow support it.
2. Keep client secrets, Meta tokens, Google refresh tokens, webhook secrets, and developer tokens server-side in a managed secret store or encrypted credential vault. Do not return raw tokens to the browser, store them in local storage, add them to analytics, or put them in a normal database text field.
3. Bind every callback to the downstream officer’s active workspace and require a server-side re-check that the workspace is active and not suspended before persisting the connection.
4. Present only account names, account IDs masked where appropriate, selected Page/form names, authorization status, granted permissions, and a revoke action in the dashboard.
5. Revoke local access immediately when the officer removes the connection, Mike suspends the workspace, token refresh fails permanently, or the external provider reports revoked access.

## 3. Meta Ads / Lead Ads connection

### 3.1 Minimum permission strategy

Meta states that the `leads_retrieval` permission allows an app to retrieve and read information captured by a Lead Ads form, including use by advertiser-authorized CRM platforms. The current permission reference also displays lead-retrieval dependencies that include `ads_management`, `ads_read`, `business_management`, and `pages_manage_ads`; Meta’s exact required set can vary with the selected Graph API workflow, app configuration, and whether the application reads performance data, manages advertising assets, or works with business assets. Request only the permissions that the approved implementation actually uses. [1]

| Intended officer workflow | Permission / feature target | Notes |
|---|---|---|
| Read submitted Lead Ads form data | `leads_retrieval` | Core permission for approved CRM-style lead retrieval. [1] |
| Select pages the officer can use | `pages_show_list` and required page-access dependencies | Needed only to discover/select eligible Pages in the approved flow. Confirm against the current Meta app permission configuration before release. |
| Read campaign/ad insights for dashboard reporting | `ads_read` | Use when the approved design reads reporting data but does not change campaigns. Meta says third-party account management needs the appropriate advanced access. [2] |
| Create or modify campaigns, ad sets, ads, or forms | `ads_management` | Do not request for an import-only lead connection. Request only if corporate approval covers ad-management capability. [2] |
| Enumerate/manage Business Manager assets or account relationships | `business_management` | Request only when the approved account-selection workflow truly needs it. [1] |
| Modify Page ad settings/subscriptions as required by the selected Lead Ads workflow | `pages_manage_ads` | Treat as workflow-specific; validate against current Meta documentation and App Review feedback. [1] |
| Production operating capacity | Marketing API access tier and needed permission access | Meta describes access levels, app review, and marketing API access tiers separately. [2] |

> **Recommended launch scope:** Begin with an import-only proof of concept: Lead Ads retrieval plus the minimal Page/form discovery permissions the approved Meta workflow requires. Do not request `ads_management` unless the approved product scope actually creates or changes advertisements.

### 3.2 Meta administrator setup before officer authorization

1. Create a Meta Business app and configure the approved Meta login/business-login product.
2. Register exact production and test OAuth redirect URIs. The callback must be HTTPS and must route server-side; do not use a client-only callback.
3. Configure the Lead Ads / webhook product only after the webhook endpoint, verification token, signature validation, idempotency behavior, and test environment are approved.
4. Request the minimal permissions in App Review and complete Business Verification and any required Marketing API access-tier work before exposing the live connection button to officers. Meta documents that apps managing other people’s ad accounts need the appropriate advanced permission access. [2]
5. Create one non-production test path: test app, test Page, test lead form, and a test downstream workspace that cannot send automated outreach.

### 3.3 Downstream officer Meta connection wizard

**Screen A — Explain access.** Display exactly what the officer is about to authorize: “Connect your own Meta advertising account so approved Lead Ads forms can be mapped to your workspace. Mike Ford can review connection status and imported activity. The application cannot see or store your Meta password.”

**Screen B — Start authorization.** The officer selects **Continue to Meta**. The server creates a short-lived authorization transaction containing `ownerUserId`, `loanOfficerProfileId`, requested permissions, return route, `state`, and expiration. The browser redirects to Meta’s authorization screen.

**Screen C — Validate callback.** On return, the server validates `state`, exchanges the authorization code server-side, reads only approved account/Page/form metadata, stores encrypted token material, and redirects to the officer’s dashboard connection screen. An invalid state, expired transaction, suspended workspace, or email/workspace mismatch fails closed.

**Screen D — Select business assets.** Show only Meta ad accounts and Pages available to the authorized officer. The officer chooses one ad account, then one Page, then one approved Lead Ads form. Do not default to the first account or first Page.

**Screen E — Map the form.** Show incoming questions and require a mapping for name, email, phone, consent language, campaign label, and any custom first-time-homebuyer interest field. Unmapped required fields block activation. Do not map a Meta consent checkbox to text-message consent without legal/compliance confirmation that the disclosure meets the project’s SMS-consent requirements.

**Screen F — Submit for Mike’s review.** The officer can save the connection as `pending_admin_review`. It remains inactive for live import until Mike sees the exact account, Page, form, permissions, and field map and chooses **Approve test connection** or **Reject**.

### 3.4 Meta lead delivery and verification sequence

1. Subscribe the approved app to the relevant Lead Ads webhook/event path only after the connection is approved for testing.
2. On notification, verify the provider signature and event structure before retrieving lead data using the approved server-side token.
3. Apply a provider event ID or lead ID idempotency key before writing a record.
4. Assign `ownerUserId` and `loanOfficerProfileId` from the approved connection record, not from lead-form input or a browser-provided value.
5. Save raw provider metadata separately from normalized dashboard fields, then show the lead in the officer’s Platform Leads workspace and Mike’s shadow review.
6. Do not auto-send email, text, or AI-generated outreach when a webhook arrives. Keep the existing user-controlled draft workflow and consent controls.
7. Test with a provider-approved test lead, confirm the officer sees only their record, confirm Mike sees the shadow-review activity, then obtain written production release approval.

## 4. Google Ads connection

### 4.1 Exact OAuth scope and access prerequisites

Google documents one Google Ads API OAuth scope: `https://www.googleapis.com/auth/adwords`. Google also requires a developer token in addition to OAuth credentials, and recommends a **multi-user authentication** approach when an application lets logged-in users connect their own Google Ads accounts. [3] [4]

| Requirement | Implementation meaning |
|---|---|
| OAuth scope | Request exactly `https://www.googleapis.com/auth/adwords`. [4] |
| OAuth flow | Use authorization-code OAuth for the downstream officer’s own Google account, tied to their active workspace. |
| Offline access | Request `access_type=offline` only when the approved design needs refresh tokens for server-side scheduled retrieval or verification. Google documents offline access for this use case. [4] |
| Developer token | Store the project’s Google Ads API developer token server-side. Do not disclose it to the officer or browser. [3] |
| Account access | The authorizing Google user must already have access to the Google Ads customer account or linked manager-account relationship. [3] |
| Revocation | Provide a dashboard revoke action and honor access removal; Google directs users to their Google Account permissions page for third-party access review. [3] |

### 4.2 Google administrator setup before officer authorization

1. Create or use an approved Google Cloud project under the intended legal/business owner.
2. Enable Google Ads API, configure the OAuth consent screen, publish approved redirect URIs, and request/maintain the developer token under Google Ads API policy requirements. [3]
3. Define the allowed production OAuth client and separate test client/configuration where feasible.
4. Create an encrypted credential-storage design for refresh tokens and record their downstream workspace ownership.
5. Confirm corporate approval for the lead-form asset, privacy policy, lead delivery endpoint, follow-up workflow, and error/retry retention.

### 4.3 Downstream officer Google connection wizard

**Screen A — Explain access.** Display: “Connect your own Google Ads account. This authorizes the application to work with the Google Ads accounts you choose; the application does not receive or store your Google password.”

**Screen B — Google consent.** The officer selects **Continue to Google**. The server starts an authorization-code transaction with the Google Ads scope, server-side `state`, PKCE where applicable, exact redirect URI, and the officer’s workspace binding.

**Screen C — Account selection.** After token exchange, the server uses the accessible-customer discovery method to list customer accounts available to that officer. The dashboard shows customer name, customer ID, account type, and hierarchy context. The officer selects the intended advertising customer account; the system never auto-selects an account.

**Screen D — Lead-form asset selection.** Show lead-form assets available within the selected customer account. The officer selects an approved lead-form asset and chooses **Configure delivery**. Google Ads Help documents a webhook delivery option for sending lead-form leads directly to a CRM. [5]

**Screen E — Field mapping and test.** Map lead-form questions to normalized platform-lead fields, including explicit review of phone/text consent. Require a test submission or approved Google lead-form test path before status can change from `pending_admin_review` to `test`.

**Screen F — Mike’s release.** Mike reviews the selected customer account, lead-form asset, OAuth grant, webhook delivery configuration, field mapping, compliance approval ID, and test evidence. Only then can Mike select **Approve production import**.

### 4.4 Google lead delivery and verification sequence

1. Configure the approved lead-form asset’s CRM/webhook delivery option using the server-side endpoint and a securely stored verification key/secret, as allowed by the current Google Ads configuration. [5]
2. Validate incoming requests before parsing lead data and store an idempotency key based on provider event/lead identifiers.
3. Normalize and persist the lead with the officer’s approved connection ownership values.
4. Display the new lead in the officer’s Platform Leads workspace and in Mike’s private activity feed/shadow review.
5. Preserve manual and consent-aware follow-up. No automatic message, application decision, eligibility statement, or credit analysis should follow receipt of the lead.
6. Maintain a visible last-successful-delivery status, last-error reason, selected account/form identifier, token expiry/refresh state, and connection-revoke control.

## 5. Mike Ford administrator connection-review screen

The dashboard should add an **Advertising connections** panel within each team workspace. It should show an officer-specific row for each provider and no raw secrets.

| Column | Example content |
|---|---|
| Provider | Meta Lead Ads / Google Ads |
| Status | Draft, pending review, test, active, revoked, suspended, error |
| Selected account | Masked customer/ad-account ID plus display name |
| Selected form | Page + Lead Ads form / Google lead-form asset name |
| Granted access | `leads_retrieval` or `adwords`, plus approved optional capabilities |
| Last verification | Timestamp and test status |
| Last lead activity | Timestamp and count; no raw sensitive fields in the overview |
| Admin action | View mapping, approve test, approve production, reject, suspend, revoke |

### Approval dialog copy

> **Approve this officer-specific connection for production lead import?** This will allow the approved provider form to create leads in **[Officer Name]’s** scoped dashboard workspace. Imported leads remain subject to existing consent controls and will not trigger automatic messages. Confirm that corporate compliance approval, field mapping, and test evidence are attached before continuing.

## 6. Recommended connection statuses

| Status | Meaning | Officer access | Mike action |
|---|---|---|---|
| Draft | Officer has not completed authorization/configuration. | Can continue setup. | View only. |
| Pending admin review | OAuth/account/form/mapping captured, not live. | Can view details and withdraw. | Approve test or reject. |
| Test | Test delivery permitted only. | Can run approved test. | Approve production, reject, or suspend. |
| Active | Production lead delivery approved. | Can view connection health and revoke. | Shadow review, suspend, or revoke. |
| Error | Verification, token refresh, or delivery failure. | Can reconnect after explanation. | Review error and suspend if needed. |
| Revoked / suspended | No lead import permitted. | Cannot use the connection. | Restore only after review. |

## 7. Logging, retention, and incident controls

1. Create a non-editable connection audit event for OAuth start, callback success/failure, account/form selection, mapping change, admin approval, test lead, production activation, revocation, and suspension.
2. Avoid logging raw tokens, client secrets, webhook keys, full lead answers, or unredacted personal information in application logs.
3. Store the minimum source payload needed for reconciliation and follow corporate retention instructions. Keep raw provider payload access restricted to Mike/admin and engineering support roles.
4. Send a private administrator notification on token revocation, repeated delivery failures, account/form deletion, or an incoming form field that no longer maps to a required dashboard field.
5. Include a connection-specific kill switch that stops imports without deleting historical, properly stored lead records.

## 8. Suggested delivery sequence

| Release stage | Scope | Exit criteria |
|---|---|---|
| 0 — Documentation | This guide, design review, compliance questions | Corporate and technical owners agree on boundaries. |
| 1 — Sandbox/test only | One provider, one Mike-controlled test workspace, one test form | OAuth, mapping, idempotency, consent, and shadow review verified. |
| 2 — Officer pilot | One approved downstream officer, their own account/form, no auto outreach | Written compliance approval and successful test lead lifecycle. |
| 3 — Controlled rollout | Additional officers one at a time | Monitoring, token revocation, and error handling work reliably. |
| 4 — Optional reporting expansion | Approved read-only spend/insight retrieval | No new write permissions unless separately approved. |

## 9. Explicit non-goals for the first release

- No automated campaign creation or campaign budget changes.
- No access to an officer’s Meta or Google password.
- No automatic email, text, or AI outreach after an imported paid-ad lead arrives.
- No use of imported lead information for credit, eligibility, pricing, or approval decisions.
- No global account token shared across different downstream officer workspaces.
- No activation without Mike Ford’s explicit administrator approval and recorded test evidence.

## References

[1] [Meta Permissions Reference — `leads_retrieval`](https://developers.facebook.com/docs/permissions/)

[2] [Meta Marketing API Authorization](https://developers.facebook.com/documentation/ads-commerce/marketing-api/get-started/authorization)

[3] [Google Ads API OAuth overview](https://developers.google.com/google-ads/api/docs/oauth/overview)

[4] [Google Ads API OAuth internals](https://developers.google.com/google-ads/api/docs/oauth/internals)

[5] [Google Ads Help — About lead form assets](https://support.google.com/google-ads/answer/9423234?hl=en)
