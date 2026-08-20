# Campaign Funnel Duplication Audit

## Verified Current State

The supplied dashboard screenshot shows a single first-touch row, **Direct / untagged**, with the same source totals shown immediately above it: 15 Roadmap requests, 13 completed chat intakes, 13 homes-list requests, and 4 buyer-agent requests. All four ordered screenshot crops were reviewed; the table repeats those four values without any additional campaign distinction.

The `CampaignFunnelSummary` component derives those cards and its first table from the same `leads.list` and `chat.list` result sets used by the operational Roadmap and mortgage-chat dashboard sections. Its distinct feature is the grouping by UTM source, medium, and campaign, together with a separate Roadmap calculator-cohort breakdown.

## Preliminary Assessment

When every record is **Direct / untagged**, the headline cards and first attribution table add no actionable information beyond the lead sections and appear duplicative. The component becomes distinct only after traffic arrives with UTM campaign data. The calculator cohort table can remain valuable, but it should not occupy a full top-level funnel section while there are no tagged campaigns.

## Implemented Presentation

The dashboard now renders a compact **Campaign attribution** status when no qualifying Roadmap or completed-chat submission contains any UTM field. It reports the number of qualifying submissions monitored, the tagged-submission count, and an expandable UTM-link example. The complete campaign table and calculator-cohort table automatically return after the first tagged qualifying submission. The compact desktop dashboard state was visually verified on 2026-08-20.
