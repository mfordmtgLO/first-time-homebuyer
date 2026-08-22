# Team Loan-Officer Dashboard Onboarding

## Purpose

This guide explains how **Mike Ford, as dashboard administrator**, grants a saved loan-officer profile access to its own protected dashboard workspace. It also explains why the current system deliberately does not issue temporary dashboard passwords and what would be required to offer a first-login password-reset experience later.

## Current secure access model

The dashboard uses the platform’s authenticated account system. The application stores an administrator-controlled workspace assignment, the loan-officer profile selected by Mike Ford, the invited work email, and the access status. It does **not** store passwords, temporary passwords, recovery codes, or password-reset tokens.

| Role | Responsibility |
|---|---|
| **Mike Ford (Admin)** | Selects a saved loan-officer profile, assigns the loan officer’s exact work email, approves/suspends access, controls shared templates, and performs management/compliance review. |
| **Downstream loan officer** | Signs in through the authenticated account provider with the assigned email, activates the workspace, and works only with records scoped to that assigned dashboard workspace. |
| **Application** | Validates the authenticated email against the pending invitation, grants the team-member role only after successful activation, and preserves Mike Ford’s oversight. |

## Mike Ford’s onboarding procedure

1. Sign in to the private dashboard as **Mike Ford Admin** and open **Loan officers**.
2. Confirm that the loan officer has a complete saved profile, including the branding/contact information intended for that officer’s public and co-branded work.
3. In **Team loan-officer workspaces**, select the saved loan-officer profile from **Assign a saved loan-officer profile**.
4. Enter the officer’s exact work email. This must be the email the officer will use to sign in.
5. Select **Assign dashboard workspace**. The workspace is created as pending; no password is generated or transmitted.
6. Send the loan officer the private dashboard URL and instruct them to sign in through the account portal using the assigned email.
7. On their first dashboard visit, the officer selects **Activate my workspace**. The system confirms the authenticated email matches Mike’s invitation and activates the workspace.
8. After activation, Mike may select **Review data** to use the administrator-only shadow review, or **Suspend** to immediately remove team-workspace access. **Allow access** restores a suspended workspace.

> An email mismatch, an unassigned account, or a suspended workspace is denied access. An assigned workspace is not activated merely because a person knows a public site address.

## What the downstream officer can access

The downstream loan officer receives a separately authenticated, workspace-scoped dashboard. The officer can work with records attributed to the assigned loan-officer profile and their own dashboard account, including their Roadmap leads, Mortgage Chat intakes, platform leads, saved payment quotes, campaign spend, spend tracker, property-page inventory, paired-agent profile, and templates Mike has specifically made available.

Mike Ford retains administrator visibility and controls. Mike can review counts and recent lead, chat, quote, and spend activity for any active team workspace. This oversight is read-only unless Mike intentionally uses the applicable administrator management controls.

## Template controls

Mike’s library templates are private by default. Mike may make an email or text template **Team read-only**, allowing downstream officers to view and copy it without changing the source. A downstream officer may submit a proposed email or text template, but it is not available for team use unless Mike reviews it.

| Mike’s decision | Result |
|---|---|
| **Approve for team** | Creates a controlled read-only library item visible to active team members. |
| **Approve private** | Retains the approved item only in Mike’s private administrator library. |
| **Reject** | Keeps the submission out of the library and records Mike’s optional feedback for the submitting officer. |

## Optional future temporary-password and first-login reset flow

A temporary-password workflow cannot be safely added by storing passwords inside this dashboard. It requires an identity-provider capability that supports administrator invitations, one-time setup links or temporary credentials, mandatory first-login password reset, multi-factor authentication, rate limiting, secure password hashing, recovery controls, session revocation, audit logging, and incident-response procedures.

The recommended future path is to integrate a dedicated identity provider with those features. Mike would then create an invitation for the officer’s work email, the provider would send a short-lived setup link, and the officer would set their own password directly with the identity provider. The dashboard would continue to consume the authenticated identity and apply the existing workspace assignment and admin-oversight rules.

> Do not send reusable passwords by email, text, or chat. Do not store temporary credentials, password hashes, reset tokens, or recovery answers in dashboard records.
