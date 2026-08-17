# Chat-First Paid Media Setup Guide

> **Status: compliance pending; no platform account has been connected, billed, configured, or published.** This guide is a working setup plan, not a guarantee of results. The account owner retains control of payment methods, budgets, campaign creation, and every publish action. Final mortgage-ad disclosures, claims, audience settings, and tracking implementation require Cornerstone corporate compliance approval.

## 1. Approved planning objective

The first campaign is planned as a **$450 total test over 60 days**, capped at an average of **$7.50 per calendar day**. The primary optimization target is a **completed mortgage-chat intake** (`chat_intake_complete`). The Roadmap request (`roadmap_request_submit`) remains an important secondary education-lead event. The current website already records first-touch UTM fields and emits tag-ready, privacy-minimized browser events; it does not currently send data to Meta or Google until the account owner approves tracking setup.

| Event | Funnel role | Platform role after approval | Current status |
|---|---|---|---|
| `chat_intake_complete` | A visitor completes the full mortgage chat | **Primary conversion / optimization target** | Tag-ready only |
| `roadmap_request_submit` | A visitor requests the Roadmap | Secondary conversion / reporting event | Tag-ready only |
| `buyer_agent_connection_request` | A completed-chat visitor requests buyer-agent help | Secondary high-intent reporting event | Tag-ready only |
| `homes_list_request` | A completed-chat visitor requests homes data | Secondary high-intent reporting event | Tag-ready only |

The chat-completion event, rather than a chat launcher click or chat start, should be the primary goal because it better represents the desired completed engagement. A short-term performance goal remains **at least 40 completed chat intakes** and **at least 20 Roadmap requests**. These are planning targets, not guaranteed results.

## 2. How to prepare Meta ad spend

Go to [Meta Ads Manager](https://business.facebook.com/adsmanager). Complete the business and ad-account setup in your own login, then add a company-controlled payment method. Meta lets advertisers control budgets, spending limits, and payment thresholds; Meta can also apply account-level limits or fees depending on account and billing conditions. [1]

For this mortgage/homebuyer campaign, select **Financial Products and Services** under Meta’s Special Ad Categories when creating the campaign. Meta states that this category is required for relevant campaigns shown to or run by U.S. advertisers and restricts certain audience controls, including age, gender, ZIP/postal code, exclusion targeting, lookalikes, saved audiences, and some interests. [2]

Use the approved Facebook Feed mockup, the approved UTM pattern below, and the final corporate-compliance copy. Do **not** use the GeoSphere census-tract layer as a Meta audience-targeting instruction. It is a post-click property-eligibility review rule, not a permission to target demographic or census-tract audiences.

| Meta setup item | Account-owner action | Chat-first configuration |
|---|---|---|
| Billing | Add your business-controlled card or payment method in Meta’s billing settings. | Keep all billing in your own Meta account. |
| Budget guardrail | Set a lifetime campaign cap and confirm the displayed average daily pace. | Total cap: $450 across the 60-day test; average: $7.50/day. |
| Special category | Select **Financial Products and Services** before adding ad sets. | Required compliance gate for this campaign type. |
| Conversion goal | Select website conversion only after tracking is compliance-approved and verified. | Optimize to `chat_intake_complete`; keep Roadmap as secondary reporting. |
| Destination URL | Use the existing landing page with UTM parameters. | `https://firsttimehomebuyer.manus.space/?utm_source=meta&utm_medium=paid_social&utm_campaign=meta_ore_chat_first_60d&utm_content=feed_chat_a` |

## 3. How to prepare Google Ads spend

Create or access the account at [Google Ads](https://ads.google.com/signup), using the company-controlled Google login. In Google Ads, open **Tools → Billing & payments → Settings** to enter or update the payment method. Google describes automatic payments as a common option and allows the advertiser to set and adjust campaign budgets. [3]

Before creating a campaign, create website conversion actions from **Goals → Conversions → Create conversion action**. Google’s web-conversion workflow supports code-based measurement for button clicks and complex actions, and it distinguishes primary biddable conversions from secondary observation-only conversions. [4] For this funnel, create and verify the following conversion actions only after the tag and final privacy treatment are approved:

| Google conversion action | Classification | Recommended use |
|---|---|---|
| Completed Mortgage Chat Intake | **Primary** | Use as the campaign’s optimization goal after verified event firing. |
| Roadmap Request Submitted | Secondary | Observe education-lead volume without asking the campaign to optimize toward it initially. |
| Buyer-Agent Connection Request | Secondary | Report high-intent downstream demand. |
| Homes List Request | Secondary | Report high-intent home-search demand. |

| Google setup item | Account-owner action | Chat-first configuration |
|---|---|---|
| Billing | Add the company-controlled payment method in Billing & payments. | You control every payment setting. |
| Conversion measurement | Create the four conversion actions; then provide the approved tag/manager details only if you want the website implementation activated. | Make Completed Mortgage Chat Intake the only Primary conversion at initial launch. |
| Campaign type | Start with a Search campaign after compliance approves keywords and ads. | Use the chat-focused Search copy and send traffic to the existing website. |
| Location assets / Maps | Verify the company-controlled Google Business Profile before linking any location asset. | Treat Maps/local visibility as a separate review item, not an assumed standalone Maps campaign. |
| Destination URL | Use the existing landing page with UTM parameters. | `https://firsttimehomebuyer.manus.space/?utm_source=google&utm_medium=cpc&utm_campaign=google_ore_chat_first_60d&utm_content=search_chat_a` |

## 4. Controlled $450 / 60-day test structure

At a combined average pace of $7.50 per day, splitting both platforms simultaneously would yield roughly $3.75/day per platform. That may not generate enough initial conversion signal for either platform. The recommended **planning structure** is a sequential, controlled comparison; the total daily pace remains $7.50 and the full budget remains $450.

| Test window | Platform | Planned cap | Daily pace | Primary event |
|---|---:|---:|---:|---|
| Days 1–30 | Meta | $225 | $7.50/day | Completed Mortgage Chat Intake |
| Days 31–60 | Google Search | $225 | $7.50/day | Completed Mortgage Chat Intake |

This is a recommended test design, not an activation instruction. If corporate compliance or the account owner prefers simultaneous delivery, set a strict $225 cap for each platform while recognizing that the daily learning budget per platform will be lower.

## 5. Gate before any activation

No campaign should be activated until all of the following are true.

| Required gate | Current status | Owner |
|---|---|---|
| Corporate compliance approves the three ad mockups and disclosure treatment | Pending | Cornerstone compliance |
| Meta campaign is classified as Financial Products and Services | Pending | Account owner |
| Google Search copy, keywords, and conversion settings are approved | Pending | Account owner and compliance |
| `chat_intake_complete` is confirmed in the Google/Meta test environment with no lead PII sent in the event | Pending | Account owner and website implementation review |
| Payment method and budget caps are entered directly by the account owner | Pending | Account owner |
| Final publish decision is explicitly approved in writing | Pending | Account owner |

## 6. Current connector position

The current session has **Meta Ads Manager** and **Google Ads** connectors available but disabled. They have not been enabled, connected, or authorized. When you are ready for account-level analysis—not publishing—you can choose to connect either platform. Before any account-writing action, you will see the proposed changes and retain control of billing and final publish approval.

## References

[1] [Meta Business Help Center — How Meta charges for ads](https://www.facebook.com/business/help/716180208457684)

[2] [Meta Business Help Center — How to choose a Special Ad Category](https://www.facebook.com/business/help/298000447747885)

[3] [Google Business — Understand the basics of Google Ads billing and payments](https://business.google.com/us/resources/articles/basics-of-google-ads-billing-and-payments/)

[4] [Google Ads Help — Set up your web conversions](https://support.google.com/google-ads/answer/16560108?hl=en)
