# Downstream Loan-Officer Handoff Email Templates

**Audience:** Mike Ford Admin and authorized downstream loan officers.  
**Use:** Internal dashboard setup, secure workspace handoff, and follow-up communication.  
**Signature convention:** The user’s configured mail-client signature is appended automatically. Do **not** paste a second Mike Ford signature into these message bodies.

> **Security convention:** The dashboard does not create, display, or store a temporary password. Each officer activates their workspace through the existing secure account portal using the exact email assigned by Mike Ford.

## Approved merge fields

| Field | Meaning |
|---|---|
| `[Officer First Name]` | Downstream loan officer’s first name. |
| `[Officer Full Name]` | Downstream loan officer’s full name. |
| `[Dashboard URL]` | Secure dashboard URL. |
| `[Assigned Work Email]` | Exact email bound to the released workspace. |
| `[Launch Note]` | Optional administrator-provided setup note. |
| `[Resource Summary]` | Prepared listing, Oregon-agent, partner, and template readiness summary. |
| `[Template Summary]` | Approved team-read-only template count and description. |
| `[Activation Date/Time]` | Timestamp of successful activation. |
| `[Suspension Reason]` | Administrator-provided reason for a temporary access hold. |
| `[Admin Contact Method]` | Approved route for contacting Mike Ford Admin. |

## 1. Secure workspace handoff — send after Mike releases access

**Subject:** Your first-time homebuyer dashboard workspace is ready

```text
Hi [Officer First Name],

Mike Ford has completed the initial setup of your first-time homebuyer dashboard workspace. Your workspace is now released and ready for secure activation.

To activate it:
1. Open [Dashboard URL].
2. Sign in using [Assigned Work Email].
3. Select “Activate my workspace” and review the workspace-boundary acknowledgment.

Your prepared setup includes:
[Resource Summary]

Your approved shared library includes:
[Template Summary]

[Launch Note]

For your security, this message does not contain a dashboard password. The dashboard uses your secure account sign-in and verifies that it matches the email assigned to your workspace.

If you cannot sign in with [Assigned Work Email], or if any setup item does not look right, please contact Mike Ford Admin through [Admin Contact Method] before creating or responding to any lead activity.
```

## 2. Activation reminder — send while released but not yet activated

**Subject:** Reminder: activate your prepared dashboard workspace

```text
Hi [Officer First Name],

Your first-time homebuyer dashboard workspace has been prepared and remains ready for activation.

Please open [Dashboard URL] and sign in with [Assigned Work Email]. After you select “Activate my workspace,” you will have access only to the leads, conversations, saved tools, approved templates, and resources assigned to your loan-officer profile.

No temporary password is needed or provided. If the secure sign-in email does not match your assigned email, activation will not proceed.

If you need Mike Ford to revise the setup before activation, use [Admin Contact Method].
```

## 3. Successful activation confirmation — send after activation

**Subject:** Your dashboard workspace is active

```text
Hi [Officer First Name],

Your first-time homebuyer dashboard workspace was activated on [Activation Date/Time].

You can now use the dashboard with your assigned loan-officer profile. Your workspace includes only the records and tools scoped to you, including your assigned leads and chats, platform leads, saved payment scenarios, campaign-spend records, eligible property-page inventory, and approved template materials.

Before your first outreach activity, please review the template availability labels and your current co-branded partner context. New template ideas can be submitted to Mike Ford for review; they are not available for use until approved.

If a listing source, agent source, or advertising connection is marked unavailable, do not attempt to bypass that control. Contact Mike Ford Admin through [Admin Contact Method] so the workspace setup can be reviewed.
```

## 4. Setup readiness update — send while Mike is still preparing the workspace

**Subject:** Your dashboard workspace is being prepared

```text
Hi [Officer First Name],

Mike Ford is preparing your first-time homebuyer dashboard workspace. Your secure account can be used to sign in, but dashboard activation will remain unavailable until the setup review is complete and Mike releases the handoff.

Current setup status:
[Resource Summary]

You do not need to create a password or send account credentials. When the workspace is released, you will receive a separate activation message with the dashboard link and the exact assigned email to use.

If you need to update your work email or loan-officer profile details before handoff, contact Mike Ford Admin through [Admin Contact Method].
```

## 5. Access suspended — send after Mike pauses a workspace

**Subject:** Your dashboard workspace access is temporarily paused

```text
Hi [Officer First Name],

Mike Ford has temporarily paused access to your first-time homebuyer dashboard workspace.

Reason provided:
[Suspension Reason]

While access is paused, you will not be able to activate or use the workspace. Existing dashboard records are retained according to the platform’s authorized record-handling practices; this message does not require you to delete or recreate any data.

Please do not attempt to work around the access pause. Contact Mike Ford Admin through [Admin Contact Method] to review the reason, any required correction, and the next approval step.
```

## 6. Re-release after correction — send after Mike restores a previously suspended workspace

**Subject:** Your dashboard workspace has been released again

```text
Hi [Officer First Name],

Mike Ford has completed the requested workspace review and released your dashboard access again.

Please open [Dashboard URL] and sign in with [Assigned Work Email]. If the workspace requires a renewed acknowledgment, complete it before returning to lead, template, property, or campaign activity.

Updated setup details:
[Resource Summary]

If you see a workspace status that does not match this message, stop and contact Mike Ford Admin through [Admin Contact Method].
```

## Internal send checklist

| Before sending | Confirm |
|---|---|
| Handoff message | Workspace is explicitly released and the recipient email is the assigned email. |
| Activation reminder | Workspace is released but the officer has not activated; do not send to suspended users. |
| Activation confirmation | The activation event is recorded for the assigned workspace. |
| Suspension message | Reason text is reviewed and contains no sensitive information beyond what the officer needs to act. |
| Re-release message | Mike has reviewed the correction and authorized the restored workspace. |

All messages are **notice and navigation templates**, not lending, credit, eligibility, pricing, approval, or legal/compliance determinations.
