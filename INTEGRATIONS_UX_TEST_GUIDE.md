# Advertising Integrations: UX Review & Verification Guide

## Purpose and Boundary

This guide documents the private administrator experience for the Meta and Google advertising integration preparation module. It is a readiness tool, not a live provider connection. It must remain clear that the dashboard stores no API-key value, does not send a provider request, and does not enable a webhook or lead import.

## UX Review Summary

The current layout gives the administrator a strong, deliberate path: a compact dashboard status badge provides an entry point, the integration module makes inactive status explicit, the two provider cards group non-secret planning data clearly, and the Getting Started checklist breaks setup into reversible preparation steps. The master visibility switch lets an administrator defer the entire module without suggesting that an underlying integration has changed.

| Area | Current behavior | UX assessment | Verification focus |
|---|---|---|---|
| Dashboard badge | Shows whether the Ads module is enabled or disabled and links to the settings anchor. | Quick orientation and clear path back to setup. | Verify keyboard activation and anchor navigation. |
| Module visibility switch | Collapses or reveals the preparation module with reduced-motion-safe feedback. | Separates UI preference from provider connection state. | Verify that hiding the module does not change planning data or connection status. |
| Provider cards | Keep Meta and Google planning data separate, show Account ID, and expose only a masked secure-key status. | Avoids accidental secret disclosure and provider confusion. | Verify no API-key value is rendered, persisted, copied, or exported. |
| Getting Started checklist | Shows persisted completion and a hover/focus progress breakdown. | Makes setup progress discoverable without needing a live account. | Verify progress updates, reset confirmation, and seven-day deferral. |
| Tutorial modal | Offers a placeholder walkthrough, searchable official resources, copy controls, and explicit close paths. | Keeps guidance contextual and easy to dismiss. | Verify focus, click-outside close, search empty state, and copied confirmation. |

## Administrator User Flow

1. The administrator sees the **Ads module enabled/disabled** badge in the private dashboard header and selects it to jump to the advertising integration settings.
2. The administrator enables the module when they are ready to prepare, but does not interpret this as activating Meta or Google.
3. The administrator completes readiness steps, such as confirming an account exists, obtaining approval, identifying a non-secret account ID, and mapping an approved lead form.
4. The progress bar presents the number of completed and remaining steps on hover or keyboard focus. When the checklist reaches 100%, a short, reduced-motion-safe success treatment confirms preparation progress.
5. If the administrator is not ready, **Remind me later** hides the checklist for seven days. The reminder appears only when the administrator returns to the dashboard after that date.
6. **Watch Tutorial** opens the dialog. The administrator can mark the tutorial as watched, search official resource links, copy a link, click outside the dialog, or select **Close tutorial**.
7. **Reset Checklist** opens a confirmation dialog. Only confirmation clears checklist progress and the deferral time; it does not alter Account ID values, planning notes, masked key status, or inactive provider state.

## Test Scenarios

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| AD-01 | Module status badge navigation | Select the header status badge with pointer and keyboard. | Focus moves to the advertising settings anchor; no provider action occurs. |
| AD-02 | Hide and reveal module | Toggle the master switch off, confirm feedback, then toggle on. | Content collapses/reveals smoothly; saved planning data and inactive status remain unchanged. |
| AD-03 | Progress persistence | Complete one checklist step, refresh, and reopen the settings. | The selected step and progress count persist for the owner. |
| AD-04 | Progress explanation | Hover or focus the progress bar. | Tooltip reports completed versus remaining steps and remains readable by keyboard users. |
| AD-05 | Full completion feedback | Mark all six readiness steps complete. | Progress reaches 100% and one short accessible success treatment appears. |
| AD-06 | Reset cancellation | Open Reset Checklist and select Cancel or click outside. | No checkbox or reminder value changes. |
| AD-07 | Reset confirmation | Open Reset Checklist and select the confirmation action. | All six steps clear and the reminder deferral clears; integration planning values remain untouched. |
| AD-08 | Seven-day deferral | Select Remind me later, then reopen before and after the saved return time. | Checklist stays hidden before the time and returns with an in-dashboard reminder afterward. |
| AD-09 | Tutorial dismissal | Open Watch Tutorial, then click outside and repeat using Close tutorial. | Both actions close the dialog and return focus to the trigger. |
| AD-10 | Tutorial completion | Check Mark as watched. | The linked checklist step is stored as complete and progress updates. |
| AD-11 | Resource filtering | Search for a known provider term and then an unmatched term. | Matching official resources remain; unmatched search shows No results found with Clear search. |
| AD-12 | Resource link copying | Select Copy link for an official resource. | Clipboard receives the intended URL and the control briefly displays Copied!. |
| AD-13 | API-key privacy | Review settings, page source, client requests, exports, and logs. | Only configured/not configured status is visible; no API-key value is present. |
| AD-14 | Inactive integration boundary | Use all checklist and tutorial controls with no provider credentials. | No Meta/Google request, webhook activation, lead import, or credential collection occurs. |

## Acceptance Criteria

The private setup flow is ready for administrator use when the following conditions hold: all controls remain owner-only; every dialog can be closed without committing an unintended change; the master switch changes only visibility; progress and reminder state persist correctly; no-result and copied feedback are visible; and no secret, provider connection, webhook, or lead-import capability is implied or activated.
