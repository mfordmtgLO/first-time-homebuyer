## Cover

# Downstream Loan-Officer Onboarding Wizard

## Mike Ford Admin provisioning, secure handoff, and first activation

Cornerstone First Mortgage · Internal product specification

## Slide 1

# The wizard makes release intentional

- Mike prepares a workspace before an officer can access it.
- The flow binds one saved loan-officer profile to one exact authenticated work email.
- Resource readiness and template availability are explicit decisions—not hidden defaults.
- A downstream officer activates only after Mike releases a reviewed setup.

## Slide 2

# Six steps create a controlled handoff

1. Select loan-officer profile.
2. Assign secure work email and create setup draft.
3. Prepare listings, Oregon agent source, and co-brand readiness.
4. Curate the approved template library.
5. Review all setup decisions.
6. Release secure handoff.

## Slide 3

# Start with identity—not a password

- Search and select an existing saved loan-officer profile, or create one through the established profile flow.
- Enter the exact work email that will authenticate the workspace.
- Block duplicate active workspace assignments for the same profile or email.
- The application does not create or store a temporary dashboard password.

## Slide 4

# Resource readiness is a manager decision

- Mike records readiness for GeoSphere listings, Oregon agent workflow, and the assigned co-branded partner.
- Every resource is marked Ready, Not needed, or Blocked with a reason.
- A blocked required resource prevents handoff.
- Advertising accounts remain informational until their own approved connection workflow is released.

## Slide 5

# Template access is curated before launch

- Mike searches the existing email, text, listing-agent, and buyer-agent templates.
- Each item is set to Team read-only, Private to Mike, or Not included.
- The officer can use approved material without editing Mike’s source template.
- Officers can later submit new drafts for Mike’s review and approval.

## Slide 6

# Review makes gaps visible before release

- One screen summarizes profile, access email, resource readiness, partner assignment, template count, and future-ad status.
- Each summary row has a direct Edit path back to its wizard step.
- Blocked resources and missing confirmations make the workspace non-releasable.
- Mike acknowledges readiness before advancing to the final release screen.

## Slide 7

# Secure handoff has one deliberate release action

- The final screen shows what the officer will receive after activation.
- Mike adds an optional launch note for the first dashboard visit.
- Releasing saves a setup snapshot, timestamp, and releasing administrator.
- The result becomes “Awaiting officer activation,” with copyable onboarding instructions and a suspension option.

## Slide 8

# The officer sees a safe waiting or activation state

- Before release, the signed-in officer sees only “Your team workspace is being prepared.”
- After release, the officer confirms the assigned work email and acknowledges their scoped-record boundary.
- Activation fails closed if the account email does not match, the workspace is unreleased, or access is suspended.
- Successful activation opens the officer’s scoped dashboard with a concise confirmation banner.

## Slide 9

# Post-handoff oversight stays practical

- Mike sees status, release and activation timestamps, template settings, and resource readiness.
- Shadow review provides private operational visibility across leads, chats, quotes, campaigns, and spend.
- Suspension immediately blocks future workspace use without deleting records.
- Activity and conversion views support coaching; they do not send messages or make lending decisions.

## Slide 10

# Design rules prevent accidental access

- Save draft never grants access.
- Release always requires a final confirmation.
- Server-side identity and workspace checks validate every protected action.
- No raw provider tokens, passwords, or credentials appear in the browser.

## Slide 11

# Ready to build the wizard interface

## Prepare deliberately. Release securely. Coach with visibility.
