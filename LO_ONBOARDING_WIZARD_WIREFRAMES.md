# Downstream Loan-Officer Onboarding Wizard

**Audience:** Mike Ford Admin, downstream loan officers, product/design reviewers, and compliance reviewers.

**Purpose:** Provide an exact UI and interaction specification for a controlled downstream loan-officer provisioning journey. The wizard prepares a workspace, records readiness, and releases access only after Mike Ford has reviewed the setup. It does not create, display, transmit, or store a dashboard password.

> **Authentication boundary:** A downstream officer authenticates through the existing secure account portal with the exact work email assigned by Mike Ford. The application validates the assignment and workspace release before activation. A temporary-password/forced-reset experience requires a separately approved identity-provider integration.

## 1. Wizard shell and state model

The administrator wizard opens from **Team loan-officer workspaces** through the primary action **Provision new loan officer**. It uses a six-step progress rail on desktop and a compact “Step _n_ of 6” bar on mobile.

| Step | Title | Required to continue | Primary data saved |
|---|---|---|---|
| 1 | Select loan officer | Existing saved LO profile | `loanOfficerProfileId` |
| 2 | Assign secure access | Valid unique work email | `assignedEmail` and pending workspace |
| 3 | Prepare operating resources | Readiness declarations | Source/template preparation flags |
| 4 | Curate template library | At least one deliberate template decision | Read-only template availability policy |
| 5 | Review setup | All required readiness items confirmed | Setup summary and optional internal handoff note |
| 6 | Release handoff | Explicit final confirmation | `handoffReleasedAt`, `handoffReleasedBy` |

### Persistent controls

The wizard header always shows **Save draft**, **Exit without release**, and a status label. Saving a draft never grants downstream access. The footer has **Back** and context-specific primary action buttons. The primary action is disabled until the screen’s required validation state is satisfied.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Team loan-officer workspaces   /   Provision new loan officer   [SAVE DRAFT] │
│                                                                              │
│  1 Profile ━━ 2 Access ━━ 3 Resources ━━ 4 Templates ━━ 5 Review ━━ 6 Release│
│                                                                              │
│                              [ current screen content ]                      │
│                                                                              │
│ [Exit without release]                                      [Back] [Continue]│
└──────────────────────────────────────────────────────────────────────────────┘
```

## 2. Administrator screen 1 — Select loan-officer profile

**Screen title:** `Choose the loan officer this workspace belongs to`

**Purpose:** Bind the workspace to an existing saved loan-officer profile. Public branding and co-brand relationships remain attached to that profile.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Step 1 of 6 · PROFILE                                                       │
│ Choose the loan officer this workspace belongs to                            │
│                                                                              │
│ [ Search saved loan officers by name, email, or NMLS ]                       │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ ○  Jane Doe                         NMLS #123456                         │ │
│ │    jane.doe@company.com             Existing public profile: ready       │ │
│ │                                                                          │ │
│ │ ○  Create a new saved loan-officer profile                              │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Selected profile preview                                                     │
│ [Headshot] Jane Doe · Loan Officer · NMLS #123456 · Profile status: ready   │
│                                                                              │
│                                                   [Back] [Use this profile]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Exact controls and validation

| Control | Behavior | Validation and error state |
|---|---|---|
| Search saved loan officers | Filters locally by name, email, NMLS, and status. | Displays “No saved profile matches this search” with a **Create profile** action. |
| Profile radio row | Selects one saved profile and reveals its summary. | Required. Continue remains disabled until exactly one profile is selected. |
| Create a new saved loan-officer profile | Opens the existing profile form in a side panel; returns to this screen after save. | New profile must pass existing LO profile validations before it can be selected. |
| Use this profile | Saves the selected profile to the draft workspace and advances. | If another active workspace already uses that profile, show a blocking conflict panel. |

**Conflict panel copy:**

> **This profile already has an active workspace.** Review the existing workspace, suspend it, or select a different loan-officer profile. Creating a second active workspace for the same profile is not allowed.

## 3. Administrator screen 2 — Assign secure access

**Screen title:** `Assign the authenticated work email`

**Purpose:** Define the email identity that is allowed to activate this workspace after release. This is not a username/password creation screen.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Step 2 of 6 · ACCESS                                                        │
│ Assign the authenticated work email                                          │
│                                                                              │
│ Loan officer: Jane Doe · NMLS #123456                                       │
│                                                                              │
│ Work email                                                                  │
│ [ jane.doe@company.com                                                  ]    │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ SECURITY MODEL                                                           │ │
│ │ Jane signs in through the secure account portal using this exact email.   │ │
│ │ No dashboard password or temporary credential is created here.            │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ [ ] I confirmed this is the officer’s correct work email.                    │
│                                                                              │
│                                                   [Back] [Create setup draft]│
└──────────────────────────────────────────────────────────────────────────────┘
```

### Validation

| Rule | Message | Result |
|---|---|---|
| Empty email | “Enter the work email that will authenticate this workspace.” | Cannot continue. |
| Invalid format | “Enter a valid work email address.” | Cannot continue. |
| Email assigned to another active team workspace | “This email is already assigned to an active workspace.” | Cannot continue; include **View existing workspace**. |
| Confirmation checkbox unchecked | “Confirm the email before creating the setup draft.” | Primary action disabled. |

**Success behavior:** Selecting **Create setup draft** creates a pending workspace with status **Draft setup — access not released**. It does not change the downstream user role and does not permit activation.

## 4. Administrator screen 3 — Prepare operating resources

**Screen title:** `Prepare the officer’s operating resources`

**Purpose:** Record whether Mike has reviewed the controlled source paths and partner readiness. This screen never copies API tokens, credentials, or administrator integrations to the officer.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Step 3 of 6 · RESOURCES                                                     │
│ Prepare the officer’s operating resources                                    │
│                                                                              │
│ ┌───────────────────────────┬───────────────┬──────────────────────────────┐ │
│ │ Resource                  │ Readiness     │ Mike’s review                │ │
│ ├───────────────────────────┼───────────────┼──────────────────────────────┤ │
│ │ GeoSphere listings        │ [Not ready ▾] │ [ ] Approved source reviewed │ │
│ │ Oregon agent source       │ [Not ready ▾] │ [ ] Partner workflow ready   │ │
│ │ Co-branded partner        │ [Select agent]│ [ ] Pairing confirmed        │ │
│ │ Future ad account path    │ [Not enabled] │ Informational only           │ │
│ └───────────────────────────┴───────────────┴──────────────────────────────┘ │
│                                                                              │
│ Note to downstream officer (optional)                                        │
│ [ Your GeoSphere and Oregon source workflow are prepared...              ]  │
│                                                                              │
│                                          [Back] [Save resource preparation] │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Resource rules

| Resource | Permitted administrator action | Downstream result after release |
|---|---|---|
| GeoSphere listing inventory | Mark authorized source path reviewed and ready. | Officer can use approved listing workflow; source credentials remain admin-managed. |
| Oregon agent source | Mark source/refresh workflow ready and choose an approved partner workflow. | Officer sees the approved partner-source experience, not source credentials. |
| Co-branded partner | Select or confirm the saved agent paired to the officer profile. | Officer sees their own paired-agent detail. |
| Future Meta/Google path | Record as not enabled, planned, or compliance-approved when available. | Does not create a connection today. |

**Required validation:** GeoSphere and Oregon source each require a deliberate readiness selection: **Ready**, **Not needed for this officer**, or **Blocked — needs follow-up**. A blocked item prevents release and provides an internal reason field.

## 5. Administrator screen 4 — Curate the template library

**Screen title:** `Choose what the officer can use on day one`

**Purpose:** Seed only approved email, text, listing-agent outreach, and buyer-agent outreach materials through controlled availability. The wizard references Mike’s existing library; it does not alter the original source template.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Step 4 of 6 · TEMPLATES                                                     │
│ Choose what the officer can use on day one                                   │
│                                                                              │
│ Search templates [_________________________]  Filter [All categories ▾]      │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ □ First-time buyer Roadmap follow-up         EMAIL     [Team read-only ▾]│ │
│ │ □ Chat-intake follow-up                      EMAIL     [Team read-only ▾]│ │
│ │ □ Text-consented lead first reply            TEXT      [Team read-only ▾]│ │
│ │ □ Listing-agent Flex Lending outreach        EMAIL     [Private ▾]       │ │
│ │ □ Buyer-agent property-list outreach         EMAIL     [Team read-only ▾]│ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Summary: 4 team read-only · 1 private to Mike · 0 pending submissions        │
│                                                                              │
│                                             [Back] [Save template access]    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Template availability choices

| Choice | Meaning | Officer capability |
|---|---|---|
| **Team read-only** | Approved shared library material. | View and use/copy where the existing workflow permits; cannot edit Mike’s source. |
| **Private to Mike** | Retained only in the administrator workspace. | Not visible to the officer. |
| **Not included** | Deliberately excluded from this officer launch. | Not visible to the officer. |

**Required validation:** Mike must make at least one deliberate availability decision. The screen should prefill current controlled-library status but require the administrator to acknowledge the launch library summary before continuing.

## 6. Administrator screen 5 — Review setup and readiness

**Screen title:** `Review the workspace before handoff`

**Purpose:** Make all preparation choices legible in one page and prevent accidental release of a blocked or incomplete workspace.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Step 5 of 6 · REVIEW                                                        │
│ Review the workspace before handoff                                          │
│                                                                              │
│ PROFILE                  Jane Doe · NMLS #123456           [Edit]            │
│ SECURE ACCESS            jane.doe@company.com              [Edit]            │
│ LISTING SOURCE           Ready                              [Edit]            │
│ OREGON AGENT SOURCE      Ready                              [Edit]            │
│ CO-BRANDED PARTNER       Alex Smith                         [Edit]            │
│ TEMPLATE LIBRARY         4 team read-only items             [Edit]            │
│ FUTURE AD CONNECTION     Not enabled                        [Edit]            │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ RELEASE CHECK                                                            │ │
│ │ [ ] I confirm this workspace is ready for downstream access.             │ │
│ │ [ ] I understand release activates the officer’s ability to use their     │ │
│ │     scoped dashboard after secure sign-in.                                │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                           [Back] [Continue to secure handoff]│
└──────────────────────────────────────────────────────────────────────────────┘
```

### Blocking conditions

| Condition | Review-page treatment |
|---|---|
| Required resource marked blocked | Red non-releasable row; **Edit** sends Mike back to Resource preparation. |
| No confirmed profile/email | Red non-releasable row; **Edit** sends Mike to the relevant step. |
| Workspace already released/active | Replace release controls with **View activation status** and **Suspend access**. |
| Required confirmations unchecked | Continue button remains disabled. |

## 7. Administrator screen 6 — Release secure handoff

**Screen title:** `Release this prepared workspace to Jane Doe?`

**Purpose:** Require a deliberate, irreversible-in-the-moment handoff action. Subsequent control is still available through suspension, but releasing is not silent.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Step 6 of 6 · RELEASE                                                       │
│ Release this prepared workspace to Jane Doe?                                 │
│                                                                              │
│ [READY FOR HANDOFF]                                                          │
│                                                                              │
│ Jane will be able to sign in through the secure account portal using:        │
│ jane.doe@company.com                                                         │
│                                                                              │
│ Once authenticated, Jane can activate this released workspace and access:    │
│ • her scoped leads, chats, quotes, campaigns, spend, property pages          │
│ • approved template library materials                                         │
│ • the prepared listing and Oregon agent-source workflows                      │
│                                                                              │
│ Handoff note shown after sign-in (optional)                                  │
│ [ Welcome, Jane. Your initial template library and resource path...       ]  │
│                                                                              │
│ [ ] I am ready to release this workspace.                                    │
│                                                                              │
│                                   [Back to review] [Release secure handoff]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Confirmation behavior

1. **Release secure handoff** is disabled until the checkbox is selected.
2. Selecting it opens a final native confirmation: `Release Jane Doe’s workspace now? Jane can activate it after signing in with jane.doe@company.com.`
3. Confirming saves the release timestamp, releasing administrator, setup snapshot, and optional handoff note.
4. The screen becomes **Handoff released — awaiting officer activation** and offers **Copy onboarding instructions**, **View workspace status**, and **Suspend access**.

## 8. Downstream officer screen A — Assignment waiting state

**Route context:** The officer signs in before Mike releases the workspace, or the workspace has not been prepared.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Your team workspace is being prepared                                        │
│                                                                              │
│ You are signed in as jane.doe@company.com. Mike Ford has assigned a          │
│ dashboard workspace but has not released it yet.                              │
│                                                                              │
│ Status: SETUP IN PROGRESS                                                     │
│                                                                              │
│ What happens next                                                            │
│ 1. Mike confirms your approved resources and template library.               │
│ 2. Mike releases the workspace.                                               │
│ 3. You return here to activate it.                                            │
│                                                                              │
│ [Refresh status]                                      [Sign out securely]    │
└──────────────────────────────────────────────────────────────────────────────┘
```

This screen contains no hidden dashboard navigation and no data preview. It should automatically refresh only on the user’s explicit **Refresh status** action or standard query refresh behavior.

## 9. Downstream officer screen B — First activation

**Screen title:** `Activate your prepared dashboard workspace`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Activate your prepared dashboard workspace                                   │
│                                                                              │
│ Welcome, Jane Doe. Mike Ford released this workspace for your account:       │
│ jane.doe@company.com                                                         │
│                                                                              │
│ Your prepared starting point                                                  │
│ ✓ Scoped lead and chat workflow                                               │
│ ✓ Approved template library: 4 team read-only items                           │
│ ✓ GeoSphere listing workflow: ready                                           │
│ ✓ Oregon agent-source workflow: ready                                         │
│ ✓ Co-branded partner: Alex Smith                                              │
│                                                                              │
│ Mike’s handoff note                                                          │
│ “Welcome, Jane. Start with your approved templates and assigned lead queue.” │
│                                                                              │
│ [ ] I understand this workspace is for my own assigned business records.     │
│                                                                              │
│                                               [Sign out] [Activate workspace]│
└──────────────────────────────────────────────────────────────────────────────┘
```

### Activation validation and result

| Rule | Behavior |
|---|---|
| Authenticated email matches assignment | Allow activation when the acknowledgment is selected. |
| Email does not match assignment | Block activation and display: “This account does not match the email Mike Ford assigned to this workspace.” |
| Workspace not released | Return to the waiting state. |
| Access is suspended | Display a contact-Mike access notice; no activation control. |

After activation, the system assigns the team-member dashboard role, records the activation timestamp, and lands on the officer’s scoped dashboard with a small dismissible **Workspace activated** confirmation banner.

## 10. Administrator follow-up screen — Handoff monitoring

**Location:** Team loan-officer workspaces → selected officer → **Setup & handoff**.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Jane Doe · Workspace status                                                   │
│                                                                              │
│ [ACTIVE]  Released Aug 22, 2026  •  Activated Aug 22, 2026                    │
│                                                                              │
│ Setup snapshot          Profile / Resources / Templates / Handoff note       │
│ Access controls         [Suspend access]  [Edit template availability]       │
│ Management review       [Open shadow review]                                  │
│ Recent operating data   4 new leads · 2 saved quotes · 1 template submission │
│                                                                              │
│ [Copy onboarding instructions]                         [View full workspace] │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Safety behavior:** **Suspend access** requires confirmation and immediately prevents dashboard use after the current protected request completes. It does not delete any record, lead, quote, campaign, template, or partner data.

## 11. Mobile interaction rules

| Component | Mobile behavior |
|---|---|
| Step rail | Collapse to `Step n of 6` with a segmented progress bar. |
| Profile selection | One full-width selectable row at a time; profile preview expands below the selected row. |
| Resource table | Convert each resource into a stacked bordered block with readiness control followed by review checkbox. |
| Template list | Keep search at top; each template is a stacked row with availability menu beneath its title. |
| Review screen | Preserve one summary row per setup item and use an **Edit** text action on the right. |
| Release screen | Keep the final release action full-width and visually distinct from secondary controls. |

## 12. Required empty, error, and audit states

| State | Exact experience |
|---|---|
| No saved loan-officer profiles | Explain the need for a profile and offer **Create loan-officer profile**. |
| No templates selected | Show “No template library material will be available at launch.” Allow continue only after Mike acknowledges the decision. |
| Source readiness blocked | Show the blocker reason, last editor, and **Return to preparation**. Disable release. |
| Duplicate profile/email assignment | Stop at the conflict with a direct link to the existing workspace. |
| Release complete, not activated | Display **Awaiting officer activation** with copied onboarding instructions. |
| Active workspace | Show activation timestamp, last activity, shadow review, and suspend controls. |
| Suspended workspace | Show `Access suspended by Mike Ford on [timestamp]`; provide **Restore access** with confirmation. |

## 13. Exact onboarding instructions Mike can copy after release

> **Your dashboard workspace is ready.** Go to the first-time homebuyer dashboard and sign in through the secure account portal with **[assigned work email]**. After sign-in, select **Activate workspace**. You will have access only to your own assigned leads, chats, quotes, campaigns, property pages, spend records, approved templates, and prepared partner/listing workflows. If the assigned email does not match your account, contact Mike Ford before continuing.

## 14. Implementation acceptance checklist

- [ ] A draft workspace cannot be activated before Mike releases it.
- [ ] A released workspace cannot activate from an authenticated email that does not match its assignment.
- [ ] Wizard resume preserves all completed setup selections and shows current status.
- [ ] Source-readiness blockers prevent release and identify the required correction.
- [ ] Template availability never edits Mike Ford’s original template source.
- [ ] Release saves an immutable setup summary and optional handoff note.
- [ ] Suspension blocks future workspace use without deleting records.
- [ ] Desktop and mobile provide every required wizard action without horizontal scrolling.
