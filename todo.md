# Project TODO

- [x] Golden Hour Porch landing page (hero, myth-buster, programs, roadmap form, how-it-works, about, FAQ, final CTA, footer)
- [x] Rebrand with Cornerstone First Mortgage / Mike Ford (logo, NMLS# 288455, company NMLS ID #173855, compliance disclaimers, Apply Online portal link)
- [x] Upgrade project to full-stack (web-db-user) — resolve Home.tsx conflict
- [x] Create `leads` table in drizzle schema + migration
- [x] Add tRPC `leads.submit` public procedure + db helper
- [x] Wire LeadMagnet form to tRPC mutation
- [x] Owner notification on new lead submission
- [x] Vitest test for lead submission
- [x] Verify end-to-end in browser + checkpoint
- [x] Private /leads dashboard page (admin-only) with lead table
- [x] CSV export of leads from the dashboard
- [x] Login gating: non-authenticated → login; non-admin → access denied
- [x] Register /leads route in App.tsx
- [x] Vitest for leads.list access control
- [x] Verify dashboard in browser + checkpoint
- [x] Add `status` column (new/contacted/booked) to leads table + migration
- [x] tRPC `leads.updateStatus` admin-only mutation
- [x] Status dropdown/badges in /leads dashboard with optimistic updates
- [x] Include status in CSV export
- [x] Vitest for status update access control + validation
- [x] Verify status flow in browser + checkpoint
- [x] Add `notes` text column to leads table + migration
- [x] tRPC `leads.updateNotes` admin-only mutation
- [x] Notes editing UI (expandable row / popover with textarea + save) in /leads
- [x] Include notes in CSV export
- [x] Vitest for notes update access control + validation
- [x] Verify notes flow in browser + checkpoint
- [x] Search input (name/email) in /leads dashboard
- [x] Status filter (All / New / Contacted / Booked) in /leads dashboard
- [x] Filtered-empty state + result count; CSV exports the filtered view
- [x] Verify search/filter in browser + checkpoint
- [x] Shared 2-1 buydown math module (P&I payment, year-1/-2 savings, seller subsidy)
- [x] Buydown calculator section: purchase price input, down payment slider (% / $ toggle), note rate input (default 6.5%)
- [x] Chart comparing Year 1 / Year 2 / Note rate monthly payments with savings callouts
- [x] Educational copy explaining seller-paid 2-1 buydown + disclaimer
- [x] Add section to Home page + nav link, responsive check
- [x] Vitest for buydown math
- [x] Verify calculator in browser + checkpoint
- [x] Scenario column (JSON) on leads table + migration
- [x] Shared BuydownScenario type + React context so calculator state reaches the lead form
- [x] leads.submit accepts optional scenario; stored with lead
- [x] Calculator CTA "Get these numbers in my Roadmap" scrolls to form; form shows attached-scenario chip
- [x] /leads dashboard displays scenario details; CSV includes scenario
- [x] Vitest for scenario capture; end-to-end browser test; checkpoint
- [x] Update contact phone number everywhere to (541) 729-0819 (Nav, About, FinalCta, Footer, tel: links)
- [x] Add subtle hover animation to phone links (icon wiggle, sliding underline, color shift)
- [x] Add official Equal Housing Opportunity logo after every "Equal Opportunity Lender" phrase (Hero, Footer)
- [x] Create shared rent-vs-buy (cost of waiting) math module (rent paid vs equity built: principal paydown + appreciation)
- [x] Build Cost of Waiting calculator UI in MythBuster section (waiting years 1-5 slider, rent input, price input, down payment %/$ toggle starting at 0, rate slider 5.875-6.5, appreciation slider 0-3)
- [x] Comparison chart: cumulative rent spent vs equity built over the waiting period + cost-of-waiting summary
- [x] Vitest coverage for rent-vs-buy math
- [x] Verify interactions in browser (desktop + mobile) and checkpoint
- [x] Extend shared scenario types to support a cost-of-waiting scenario (wait years, rent, price, down payment, rate, appreciation, rent paid, equity built, cost of waiting)
- [x] leads.submit accepts optional costOfWaiting scenario; stored with lead
- [x] CostOfWaiting calculator CTA attaches its scenario to the lead form (chip shows both scenarios if present)
- [x] /leads dashboard Scenario popover + CSV include cost-of-waiting data
- [x] Vitest for cost-of-waiting scenario capture; end-to-end browser test; checkpoint
- [x] Rent-increase assumption slider (0%-10%/yr) in Cost of Waiting calculator UI
- [x] Compound rent annually in the rent-vs-buy math (yearly breakdown + totals)
- [x] Carry rentIncreaseRate through scenario capture (shared types, leads.submit, notification summary)
- [x] Show rent increase in /leads Scenario popover + CSV export column
- [x] Update vitest coverage for rent growth; verify in browser; checkpoint
- [x] Research Oregon historical average rent increases over the last 5 years (credible sources)
- [x] Add informative tooltip next to the rent-increase slider with Oregon historical data
- [x] Verify tooltip on desktop + mobile (tap support); checkpoint
- [x] Research Oregon historical average home price appreciation since 2000 (credible sources, e.g., FHFA HPI)
- [x] Add informative tooltip next to the home appreciation slider with Oregon historical data
- [x] Verify appreciation tooltip on desktop + mobile; checkpoint
- [x] Add agent_profile table (name, headshot URL, email, cell, bio, website, company logo URL, visible flag)
- [x] Add S3 image upload endpoint (admin-only) for headshot and company logo
- [x] Add tRPC procedures: agent.get (public), agent.save (admin-only)
- [x] Build "Real Estate Agent" settings panel in /leads dashboard with image uploads and clear/remove option
- [x] Add public "Local Real Estate Agent" section at bottom of landing page (renders only when populated)
- [x] Vitest coverage for agent.save access control and agent.get behavior
- [x] End-to-end verify: save agent in dashboard → section appears on landing page; checkpoint
- [x] Multi-agent upgrade: extend `agent_profile` into a multi-row agents table (unlimited profiles, unique slug, featured flag) + `agentId`/`sentToAgentAt` columns on leads; migrate existing single profile
- [x] tRPC agent CRUD: agent.list/create/update/delete/setFeatured (admin), agent.getBySlug + agent.getFeatured (public); slug auto-generated from name, editable, uniqueness enforced
- [x] Per-agent static co-branded URL: /with/:slug renders the landing page with that agent's Local Agent section; leads submitted there auto-tagged with agentId
- [x] Agents manager panel in /leads dashboard: add/edit/delete agents, copy custom URL button, visible toggle per agent
- [x] Agent assignment dropdown on each lead row (assign any saved agent to any lead)
- [x] "Send to agent" button on each lead row: emails assigned agent an intro with lead name/email/scenario summary (Resend integration + fallback)
- [x] Vitest coverage: agents CRUD access control, slug generation/uniqueness, getBySlug, lead assignment, sendToAgent gating
- [x] Visual verification of dashboard + /with/:slug page; checkpoint
- [x] Track lead origin: `agentSource` column on leads ("link" when submitted via /with/:slug, "manual" when assigned in dashboard)
- [x] tRPC agent.stats (admin): per-agent counts — leads from custom link, currently assigned, referred (sent to agent)
- [x] Show stats on each agent card in the Co-marketing agents panel (link leads / assigned / referred)
- [x] Vitest coverage for agent.stats access control and per-source counting
- [x] Visual verification of stats in dashboard; checkpoint
- [x] Fix "Send to agent" error for unverified Resend sender domain: open a prefilled mail draft instead of returning a generic failure; add email and router tests
- [x] Replace the dashboard lead email action with a personalized first-contact mail draft
- [x] Include a Roadmap PDF attachment reminder and calculator-specific 2-1 buydown / cost-of-waiting summaries when available
- [x] Include the complete assigned co-marketing agent profile and agent contact invitation for co-branded leads
- [x] Add Vitest coverage for email-draft content and verify the lead dashboard action visually
- [x] Checkpoint the polished lead email experience
- [x] Host Roadmap Homebuyer guide + checklist and Your Road Home Map PDFs as stable resources for lead email drafts
- [x] Add both named PDF links to the personalized lead email draft and replace the manual attachment placeholder
- [x] Test the two-resource email draft and checkpoint the update
- [x] Label the estimated temporary 2-1 buydown subsidy as 100% seller funded in lead email drafts; update test and checkpoint
- [x] Emphasize “GO” in the Your Road Home Map callout with reliable bold Unicode in the plain-text email draft
- [x] Change Cost of Waiting CTA text to “Get these numbers in my Roadmap” while preserving scenario attachment and form scroll behavior
- [x] Simplify the co-branded agent section in lead email drafts by removing agent bio, headshot, and company-logo links
- [x] Replace co-branded page wording and add contextual website links in the closing for both standard and co-branded lead drafts
- [x] Add tests for standard and co-branded closing links, then checkpoint the refined lead email draft
- [x] Change the 2-1 Buydown booking CTA to “Run my numbers” and add the same dark-green booking CTA to Cost of Waiting while preserving both Roadmap scenario-capture buttons
- [x] Define and migrate chat intake lead, chat transcript, and loan-officer profile data models
- [x] Add public structured mortgage intake procedures with partial-lead persistence, co-branded agent context, and compliant qualification prompts
- [x] Add admin-only loan-officer profile management and chat-lead list, filter, transcript, and CSV export procedures
- [x] Build a responsive floating Mortgage Intake Specialist widget with typing state, success card, and co-branded contact context
- [x] Build password-protected internal chat-lead review in the existing admin dashboard
- [x] Add Vitest coverage and complete end-to-end/visual verification of the chatbot intake flow
- [x] Checkpoint the conversational mortgage intake assistant
- [x] Run a complete persisted chatbot lifecycle test from greeting through qualification and transcript retrieval
- [x] Verify the public chat launcher and protected admin chat-review panels after the final chatbot implementation
- [x] Save a final checkpoint for the verified Mortgage Intake Specialist feature
- [x] Reposition the floating chat launcher above the bottom-right attribution overlay on all viewport sizes
- [x] Email each completed intake summary to the selected loan officer and, when applicable, the co-branded agent
- [x] Retain an inactive SMS notification upgrade path only; do not configure a provider, request credentials, or send automatic text alerts
- [x] Update “Option A — Let’s chat first” to offer clear call and text choices
- [x] Add tests and visual verification for chat visibility, intake recipient emails, and call/text CTA behavior
- [x] Checkpoint the intake notification and CTA improvements
- [x] Record completed-intake recipient email delivery status and show an admin-visible manual-follow-up state when Resend is not configured or the sender domain is unverified
- [x] Save a final checkpoint after notification fallback verification
- [x] Adjust the opened Mortgage Intake Specialist panel so the contact header stays fully visible above the viewport edge while the launcher remains clear of the attribution overlay
- [x] Open the Mortgage Intake Specialist at desktop and mobile widths and visually verify its full contact header is not clipped
- [x] Add a compact minimize state that hides the open chatbot without resetting its saved conversation
- [x] Add one-tap Purchase and Refinance quick-reply chips at the start of the mortgage intake conversation
- [x] Add an admin-only chat intake resend procedure and dashboard action for manual loan-officer/co-branded-agent follow-up emails
- [x] Add tests and public/admin visual verification for the chatbot interaction and resend enhancements
- [x] Checkpoint the chat minimize, quick-reply, and manual resend improvements
- [x] Visually verify the qualified chat-intake Resend action in the protected dashboard before final checkpointing
- [x] Add persistent resend count and most-recent resend timestamp to completed chat intakes and display both in the dashboard
- [x] Add a confirmation dialog before manually resending chat-intake recipient emails
- [x] Extend the mortgage intake flow to ask about low/no-down-payment home-search interest and, when requested, capture the target city and surrounding area before completion
- [x] Add a booking link to the chat completion card and a prominent scheduling placement on the public website
- [x] Embed the confirmed Calendly booking URL (https://calendly.com/mikefordlo/bookacall) in the chat completion and public scheduling placements
- [x] Add migration, tests, and public/admin visual verification for resend history, confirmation, home-search intake, and booking flows
- [x] Checkpoint the chat follow-up, home-search, and calendar booking improvements
- [x] Visually verify the public low/no-down-payment home-search yes/no prompt and target-area follow-up before qualification completes
- [x] Save a final checkpoint after public home-search flow verification
- [x] Upload the supplied enhanced Mike Ford headshot as a stable website asset and replace all public profile references
- [x] Visually verify the enhanced Mike Ford headshot in its public About-section placement
- [x] Checkpoint the enhanced Mike Ford headshot update
- [x] Confirm no public code reference remains to the prior Mike Ford headshot asset
- [x] Capture a valid public About-section render showing the enhanced Mike Ford headshot in place
- [x] Save a final checkpoint for the fully verified enhanced Mike Ford headshot update
- [x] Remove “not a salesperson” from the About-section headline
- [x] Correct malformed “first-time” typography in the Good Questions FAQ heading
- [x] Visually verify both public copy refinements and checkpoint the update
- [x] Change the full Good Questions headline to a clean font treatment without the distorted lowercase “f,” then verify and checkpoint
- [x] Apply the clean Public Sans headline treatment to “Your first home is closer than you think.” in the Two Easy Ways to Start section, then verify and checkpoint
- [x] Add an accessible typing indicator while the Mortgage Intake Specialist processes a visitor response, then verify and checkpoint
- [x] Add property-type quick replies: Single-Family, Condo, Multi-Family, Townhouse, and Manufactured home (no leased land/space rent)
- [x] Add guided purchase-price, gross-household-income, and down-payment slider inputs with requested ranges
- [x] Add credit-range quick replies and YES/NO property-search quick replies with the revised qualifying-properties language
- [x] Preserve chat validation, scenario persistence, and qualification behavior for all guided inputs
- [x] Add tests and mobile/desktop visual verification for guided chat inputs, then checkpoint
- [x] Visually verify the guided Mortgage Intake Specialist property, slider, credit, and YES/NO controls at desktop width
- [x] Save a final checkpoint after desktop guided-chat verification
- [x] Add Mike Ford’s verified Experience.com client-reviews link to the Your Guide loan-officer section
- [x] Add a second accessible client-reviews link at a high-intent public conversion point without displaying review content
- [x] Verify both public review-link placements and the live Experience.com destination, then checkpoint
- [x] Change the Good Questions headline to “Common first-time buyer lender questions.”, verify the public rendering, and checkpoint
- [x] Remove the duplicate co-branded website sentence from agent contact details while retaining it once in the email closing; add a regression test and checkpoint
- [x] Add independently scrollable vertical list containers to the Roadmap leads and Mortgage chat intakes dashboard sections
- [x] Verify long-list dashboard scrolling on desktop and mobile, then checkpoint the layout improvement
- [x] Automatically scroll and snap the Mortgage Intake Specialist to the newest question after quick replies or slider submissions, with accessible focus behavior
- [x] Verify guided chat auto-scroll and focus behavior at desktop and mobile sizes, then checkpoint
- [x] Visually verify newest-question snapping and focus at desktop width for guided quick replies and slider steps
- [x] Save a final checkpoint after desktop chat snap verification
- [x] Extend loan-officer data and dashboard management to support unlimited LO profiles with public slugs
- [x] Add per-LO agent partner selection from the saved-agent dropdown and persist unique LO-agent co-marketing pairings
- [x] Create unique public co-branded LO-agent URLs and preserve pairing attribution through chat and Roadmap lead capture
- [x] Add dashboard copy-link controls and visible partner assignments for each loan officer
- [x] Add migrations, access-control/attribution tests, public-route and dashboard visual verification, then checkpoint
- [x] Separate guided quick-reply and slider controls from the scrolling transcript so they never overlap the active Mortgage Intake Specialist question
- [x] Keep the full current question in focus immediately above the response input with an adaptively sized chat viewport for long prompts
- [x] Add regression coverage and visually verify long-prompt quick-reply and slider steps at mobile and desktop widths
- [x] Checkpoint the responsive Mortgage Intake Specialist layout correction
- [x] Replace the angled golden-arch hero home photo with a vertically straight rectangular photo treatment
- [x] Change the Loan Officer Guide portrait area to a professional 4:3 rectangular crop without tilted framing
- [x] Visually verify both public photo treatments at desktop and mobile widths, then checkpoint
- [x] Display loan-officer and agent attribution, including a co-branded source indicator, for every Mortgage chat intake
- [x] Add unified chat-intake search and loan-officer/agent filtering with no-result and clear-filter states
- [x] Ensure Mortgage chat-intake CSV export contains only the current filtered/visible list and includes LO-agent attribution columns
- [x] Add tests and verify filtered attribution search/export behavior in the dashboard, then checkpoint
- [x] Add City and County quick-reply choices after a visitor requests low/no-down-payment qualifying properties
- [x] Capture the requested Oregon city or county, persist the search-area preference, and include it in dashboard and recipient email follow-up details
- [x] Update completion and property-search chat wording to set the expectation that a qualifying-property list will be prepared and emailed soon
- [x] Add migration, tests, and guided-chat visual verification for the City-or-County property-search flow, then checkpoint
- [x] Display loan-officer and agent attribution, including a co-branded source indicator, for every Roadmap lead
- [x] Add unified Roadmap lead search and loan-officer/agent filtering with no-result and clear-filter states
- [x] Ensure Roadmap lead CSV export contains only the current filtered/visible list and includes LO-agent attribution columns
- [x] Add tests and verify filtered Roadmap attribution search/export behavior in the dashboard, then checkpoint
- [x] Adjust the Loan Officer Guide portrait crop so Mike Ford’s full head has comfortable top clearance, then verify and checkpoint
- [x] Inspect and document the existing GeoSphere/Rentcast saved-listing contract and dashboard integration points
- [x] Add dashboard data models and migration for idempotent saved-pull and listing synchronization
- [x] Implement protected saved-listing import and a deploy-ready scheduled synchronization endpoint
- [x] Build admin browsing for city/county saved pulls with All, LMI, USDA RD, and dual-overlay filters
- [x] Add Roadmap and chat-intake lead selection plus listing-table email-draft generation
- [x] Add automated tests, visual verification, and a checkpoint for the GeoSphere/Rentcast integration
- [x] Diagnose and repair the Roadmap lead-submission insert failure caused by a copied database schema mismatch
- [x] Restore the missing company logo, Mike Ford headshot, and public stock-photo asset references
- [x] Add regression coverage and verify the Roadmap submission and public media rendering, then checkpoint
- [x] Add a copyable loan-officer-only public profile URL when no agent partner is selected
- [x] Verify paired and loan-officer-only profile URLs, add regression coverage, and checkpoint
- [x] Add a phone field to Roadmap lead capture, persistence, dashboard display, and agent referral details
- [x] Refine Roadmap agent-referral greetings and 2-1 buydown savings/subsidy calculations in the draft email
- [x] Add regression coverage, verify the updated lead flow, and checkpoint the referral-email improvements
- [x] Add live U.S. phone formatting and placeholder-number validation to Roadmap lead capture
- [x] Add required and persisted SMS consent disclosure to Roadmap submissions
- [x] Add a dashboard badge for usable Roadmap lead phone numbers and verify the end-to-end behavior
- [x] Repair the missing standalone URL and copy-link control for unpaired loan-officer dashboard rows
- [x] Verify the unpaired loan-officer profile action and checkpoint the dashboard correction
- [x] Add QR-code, copy-feedback, and LinkedIn/Facebook sharing controls for standalone loan-officer profile URLs
- [x] Add a co-branded agent Share QR + URL dashboard action with a prefilled sharing email draft
- [x] Add regression coverage, visual verification, and a checkpoint for dashboard sharing tools
- [x] Update Roadmap send-to-agent drafts with first-name greeting, lead phone, and no source-tag line
- [x] Expand 2-1 buydown and cost-of-waiting details in sent and fallback referral drafts
- [x] Add regression coverage and checkpoint the revised Roadmap agent-referral drafts
- [x] Diagnose why the published Roadmap Send to agent action still displays the prior referral-draft wording
- [x] Correct and verify the active sent-email or fallback draft path, then checkpoint the published-draft fix
- [x] Diagnose why the live dashboard does not reflect completed dashboard changes
- [x] Restore and verify the current dashboard application bundle and referral action on the published site
- [x] Correct the Roadmap “Send me the Roadmap” button text wrapping and alignment at responsive form widths
- [x] Replace the co-marketing Share QR + URL email-draft closing with the requested next-deal message
- [x] Remove the always-visible Your Guide phone-link underline while preserving its animated hover treatment
- [x] Change the Your Guide Mike Ford headshot frame to a taller vertical portrait treatment
- [x] Resolve the bottom-right overlap between the platform attribution badge and Start chat launcher
- [x] Diagnose and fix the public Mortgage Intake Specialist startup error that appears after opening chat
- [x] Resolve the remaining production chat-start query failure shown in the browser console
- [x] Add consent-aware Text ready indicators for Roadmap and chat-intake leads
- [x] Build an admin texting workspace for individual and selected-recipient custom SMS/MMS composition
- [x] Add provider-ready attachment, draft-history, delivery-status, and mobile-responsive messaging controls; defer real delivery until an SMS/MMS provider is configured
- [x] Keep all dashboard text actions in provider-unconfigured draft mode until a verified SMS/MMS account is supplied
- [x] Add a chat-intake SMS consent question with explicit Yes and No responses, and make only Yes responses text-ready
- [x] Add provider-ready SMS/MMS message, recipient, JPG attachment, and delivery-status records without enabling real sends
- [x] Repair current and historical loan-officer attribution for co-branded Roadmap leads that display LO not linked
- [x] Add a visible pairing-status warning and guidance for co-marketing agents without an active loan-officer pairing
- [x] Add linked Loan Officer and co-brand Agent Roadmap lead dropdown filters with historical per-pair lead counts and pair-specific CSV export
- [x] Add linked Loan Officer and co-brand Agent Chat Bot Intake Lead dropdown filters with historical per-pair intake counts and pair-specific CSV export
- [x] Replace the copied-project title in automatic lead notification footers with the professional website name
- [x] Reformat automatic Roadmap lead notifications with name, phone, email, and detailed 2-1 buydown and cost-of-waiting summaries matching the referral draft
- [x] Replace the generated hosting subdomain in loan-officer and co-branded share links with a clean branded domain
- [x] Align Texting Workspace and Mortgage Chat Intake Leads with Roadmap Leads columns, searches, filters, email drafts, agent routing, and clear-filter controls
- [x] Add a visible Clear Filters action to all three lead-management sections whenever filters are active
- [x] Add visible Phone ready, Email draft, Send to agent, and Notes controls to Mortgage Chat Intake lead rows
- [x] Update Texting Workspace Send to agent drafts with agent first-name greetings and branded co-marketing source URLs
- [x] Update Mortgage Chat Intake email drafts with a chat-specific thank-you and complete conversation recap
- [x] Add a centered fixed dashboard snap-navigation bar with Top and section-jump buttons for all major management areas
- [x] Add a green USDA badge for qualifying Mortgage Chat Intake leads across all dashboard name displays
- [x] Correct Mortgage Chat Intake lead email drafts with first-home financing language and a readable question-and-response chat recap
- [x] Fix the Mortgage Chat Minimize button overlap with the response-field Enter action
- [x] Add a provider-ready Text Chain viewer for consented leads with clickable links, timestamps, and attachment cards
- [x] Prepare inbound and outbound text-history persistence for future SMS/MMS provider webhook synchronization
- [x] Enhance the GeoSphere inventory workspace with clearer saved-snapshot management, filters, and cache-only sync usability
- [x] Add grouped listing-agent outreach email drafts for selected GeoSphere listings with cautious low- and no-down-payment program messaging
- [x] Match listing-agent outreach program wording exactly to each selected listing’s LMI and USDA RD flags
- [x] Add a dynamic imported Listing Agent filter, agent-level select all, and consolidated property-detail outreach drafts in GeoSphere inventory
- [x] Add A–Z last-name recipient ordering, last-name search, and Roadmap or Chat Intake filters to property-list email drafts
- [x] Rename Roadmap and Mortgage Chat Intake CSV export buttons to Export visible CSV
- [x] Add built-in Flex Lending, USDA RD, and dual-program listing-agent outreach email templates with a selector beside Select all
- [x] Add a saved custom listing-agent outreach template editor with automatic recipient, property details, program labels, and standard signature composition
- [x] Record per-property listing-agent outreach email history, including first send, resend count, most-recent sent time, and most-recent template
- [x] Add a multi-line Communications column to GeoSphere listings with sent/resend badges, dates, resend totals, and latest template name
- [x] Standardize every Export visible CSV button to the dark-green Roadmap Leads primary style
- [x] Enhance property-list email drafts with scan-friendly listing details, listing-agent contacts, and a tailored agent-status follow-up offer
- [x] Add direct Zillow listing links to each property section in property-list email drafts
- [x] Add a warm buyer-agent showing and tailored home-search offer before the standard loan-officer signature in property-list email drafts
- [x] Add comma-separated multi-last-name recipient search and multi-lead selection to property-list email drafts
- [x] Add privacy-safe multi-recipient property email composition with a clear template selection step
- [x] Add a Select all visible addresses checkbox to the GeoSphere listing table header
- [x] Add two blank lines between each property email section heading and address
- [x] Add Short property update, USDA RD-focused list, and OHCS Flex Lending-focused list property-email templates
- [x] Add a saved custom buyer-facing property-email template editor with Add custom email template as the first selector option
- [x] Preserve automatic recipient, BCC, property, Zillow, listing-agent, buyer-agent, and signature pre-fills for custom property-email templates
- [x] Make All selected agents (BCC) the default listing-agent outreach target instead of automatically selecting one agent
- [x] Preserve optional personalized single-agent outreach drafts alongside the bulk BCC workflow
- [x] Rename the GeoSphere listing table Source column to Actions
- [x] Show the selected-agent count beside the listing-agent outreach button
- [x] Add a BCC recipient and selected-property confirmation preview before opening bulk outreach drafts
- [x] Assess Meta and Google campaign access, mortgage-advertising compliance requirements, and first-time homebuyer conversion goals
- [x] Create compliance-oriented Meta and Google ad concepts, keyword/placement strategy, SEO plan, and conversion measurement for the firsttimehomebuyer.manus.space funnel
- [x] Prepare an optional user-controlled publishing workflow that preserves direct control of platform budgets, billing, and final launch approval
- [x] Audit current Roadmap and chat lead attribution, analytics, and dashboard reporting paths for campaign-funnel readiness
- [x] Add persistent UTM and campaign attribution to Roadmap and mortgage-chat lead submissions
- [x] Add privacy-safe browser conversion-event readiness for Roadmap request, completed chat intake, buyer-agent request, and homes-list request actions
- [x] Add dashboard campaign-source reporting and filtered export visibility for funnel conversion analysis
- [x] Create compliance-review Meta and Google ad-asset production materials without connecting ad accounts or publishing campaigns
- [x] Add the supplied Cornerstone First Mortgage disclosure block and Equal Housing Opportunity logo-placement instruction to campaign asset and launch-review materials
- [x] Review the supplied Oregon census-tract workbook and document the LMI plus USDA RD eligible-area service boundary for campaign approval
- [x] Create Facebook and Google approval mockups that show the supplied Cornerstone disclosure block and Equal Housing Opportunity logo treatment
- [x] Record the proposed $450, 60-day first-campaign pacing and Roadmap/chat conversion targets in the compliance-pending launch package
- [x] Create a compliance-pending Meta and Google account-owner ad-spend setup guide with $7.50 daily pacing and direct billing control
- [x] Define completed mortgage-chat intake as the proposed primary conversion and Roadmap request as the secondary campaign event
- [x] Create 6–10 compliance-review chat-first Meta and Google ad variants tied to the existing landing page and chat completion goal
- [x] Create a compliance-pending 30-day nurture sequence for Roadmap, cost-of-waiting, 2-1 buydown, completed-chat, homes-list, and buyer-agent engagement
- [x] Add dashboard funnel cohort reporting organized by campaign and scenario engagement
- [x] Create a consolidated PDF compliance review packet covering the mission, approved ad assets, disclosures, website/chat funnel, dashboard reporting, lead/agent communication workflows, and approval gates
- [x] Add authoritative calculator-methodology sources and non-guarantee language for the cost-of-waiting and 2-1 buydown educational tools to the compliance packet
- [x] Add government-data provenance and non-live-listing disclosures for the GeoSphere LMI plus USDA RD property-screening workflow to the compliance packet
- [x] Audit saved GeoSphere listing fields, co-brand routes, property imagery, lead capture, and existing email-template workflows for single-property page support
- [x] Add persistent single-property page snapshots with LO-agent pairing assignments and reusable property-page listing-agent email templates
- [x] Build public single-property co-branded pages from saved listing snapshots with guarded property details, LMI/USDA context, Roadmap, chat, and buyer-agent lead capture
- [x] Add dashboard controls to create, save, pair, share, and draft listing-agent outreach for single-property pages
- [x] Route property-page Roadmap and chat leads through existing dashboard sections with address, LO-agent co-brand, and capture-date attribution while retaining calculator scenarios for agent drafts
- [x] Add persistent single-property page interaction events and a dashboard activity timeline for visits, calculators, Roadmap, chat, homes-list, and buyer-agent milestones
- [x] Add social media sharing controls and a printable property snapshot PDF export to public single-property pages
- [x] Add a review-gated AI property-description summary generator based only on saved imported listing snapshots
- [x] Add dashboard controls to retire or refresh single-property pages from saved GeoSphere listing snapshots
- [x] Add Professional and Exciting tone options to review-gated AI property-summary generation
- [x] Add property-page activity timeline filters for page views, calculator usage, lead milestones, sharing, and print/PDF export
- [x] Fix the React hook-order runtime error on public single-property page URLs and verify the route in production
- [x] Add qualified OHCS Flex Lending and USDA RD low- or no-down-payment financing context to AI property-summary drafts and single-property listing-agent email drafts
- [x] Assess authorized MLS-number import options for permitted listing photos and REALTOR® remarks on single-property pages
- [x] Design MLS import attribution, refresh, withdrawal, and page-retirement safeguards for compliance review
- [x] Validate enterprise listing-syndication provider terms for MLS-number property pages, photos, remarks, attribution, and downstream sharing
- [x] Document unresolved RESPA, fair-lending, data-license, and corporate-compliance decisions for zero-cost lender-realtor co-branding and lead-routing behavior
- [x] Research RMLS and WVMLS authorized data-access, licensing, media, public-remarks, attribution, and status/withdrawal requirements for single-property sites
- [x] Design a two-MLS single-property import architecture and partner onboarding sequence without public-web scraping
- [x] Document a neutral lender-realtor co-branding fact-pattern checklist covering exchanged benefits, lead-routing, cost allocation, and approval controls for corporate compliance review
- [x] Merge the latest co-branding fact-pattern checklist into the consolidated compliance handover PDF and provide a revised download
- [x] Add a persistent public-facing snap-navigation bar with quick jumps to the first-time-homebuyer website’s key educational and lead-capture sections
- [x] Highlight the active public landing-page section in the persistent navigator
- [x] Add a compact call shortcut to the public navigator on mobile screens
- [x] Ensure the default opened Mortgage Chat panel is fully visible and not clipped at the top of the viewport
- [x] Ensure the full Roadmap request success confirmation is automatically visible after mobile submission
- [x] Add graphical post-Roadmap navigation choices to return to the prior context or explore the next educational section
- [x] Keep Top permanently visible in the public snap navigation and signal that additional section buttons can be explored horizontally
- [x] Remove the duplicate Book a call shortcut from the public section navigator while preserving the header booking control
- [x] Add a visual Roadmap completion-card option that jumps directly to the 2-1 Buydown scenario tool
- [x] Fix the public 2-1 Buydown menu button so it always lands on the buydown calculator rather than Loan Programs
- [x] Reproduce and correct the remaining mobile 2-1 Buydown tap flow that routes from Cost of Waiting to Loan Programs
- [x] Reproduce and correct the mobile opened Mortgage Chat panel cutoff below the fixed header and section navigator
- [x] Align mobile Mortgage Chat follow-up questions lower in the visible transcript and show a down-arrow cue only when more content is below
- [x] Strip a leading U.S. country code from Roadmap phone input and always display the local 10-digit format
- [x] Add visual website navigation choices after a visitor completes the Mortgage Chat intake
- [x] Ensure all completed-chat navigation choices are reachable within the mobile chat panel
- [x] Prevent the collapsed mobile Mortgage Chat launcher from covering hero call-to-action buttons on initial page load
- [x] Compact the Roadmap completion navigation, adding Cost of Waiting and Meet Your Guide destinations
- [x] Replace the public section navigator’s More label with explicit left and right horizontal scroll controls
- [x] Make the collapsed mobile Mortgage Chat launcher icon-only while stationary and expand it when the visitor scrolls
- [x] Compact completed-chat navigation controls, remove overflowing subtext, and show a down-arrow cue when choices continue below the panel
- [x] Deferred at user request pending an authorized image: display a saved main exterior photo in the single-property page hero when supplied
- [x] Preserve the RMLS/WVMLS partner-membership listing-media and status import path as an approval-gated future upgrade framework
- [x] Add a compact Your Guide destination to the completed Mortgage Chat navigation choices
- [x] Place Loan Programs immediately before 2-1 Buydown in the public section navigator
- [x] Place compact Free Roadmap and Your Guide buttons on the same row after completed Mortgage Chat intake
- [x] Add protected pairing and spend-entry persistence for the private LO+Agent Pairings 50/50 Spend Tracker
- [x] Add private tracker totals, contribution percentages, balance indicators, and 40%–60% attention flags
- [x] Add the LO+Agent Pairings 50/50 Spend Tracker as the permanent final dashboard section with a top navigation shortcut
- [x] Ensure the desktop-browser completed Mortgage Chat message starts fully below the chat header without changing mobile behavior
- [x] Add a desktop-only top gutter so the completed Mortgage Chat message clears the fixed header in every desktop browser view
- [x] Add independent scrollbars to Pairing Trackers and active-pair spend history to keep the dashboard compact as records grow
- [x] Add protected storage and provenance for on-demand state-based synced top-agent profiles, starting with Oregon
- [x] Add an Oregon Sync Top Agents dashboard control that imports authorized source profiles on demand
- [x] Add synced-agent selection to the Add Agent workflow for quick creation with retained profile details, headshot, and links
- [x] Add and validate a protected read-only Oregon agent export endpoint in the supplied Oregon Agent Leads repository
- [x] Add a synced-agent profile preview card before partner-profile creation
- [x] Display last-synced time and imported-record count next to the Oregon Sync Top Agents control
- [x] Add name search within the synced-agent selection flow in Add Agent
- [x] Add an uncreated-only filter to the synced-agent selection flow to prevent duplicate partner creation
- [x] Detect source-profile changes on sync and show update badges on linked partner profiles
- [x] Add an owner-only review queue for approving or rejecting detected synced-agent profile updates
- [x] Sync dynamic Oregon agent rank positions with their current total-agent denominator
- [x] Sync and display principal-broker data, PB designations, office context, and source-profile links
- [x] Add private Oregon synced-agent filters for agent search and principal-broker-only views
- [x] Add a compact private source-profile detail drawer for synced Oregon agents
- [x] Show rank-changed indicators when refreshed Oregon source ranks improve or drop
- [x] Add synced-agent selector sorting by source rank and office name
- [x] Correct Oregon source rank denominators so no synced rank can exceed its displayed ranking pool
- [x] Display the Oregon source-pool total beside synced-agent sorting controls
- [x] Persist per-agent Oregon rank-history snapshots for private trend viewing
- [x] Show a private post-sync summary listing agents whose Oregon ranks changed
- [x] Add a private date-range filter for synced-agent rank-history snapshots
- [x] Add a private office-level rank-movement summary after Oregon syncs
- [x] Add green/red arrow indicators to private post-sync Oregon rank-movement summaries
- [x] Audit and repair Oregon source directory, search, and export coverage for all expected top agents and principal/managing principal brokers
- [x] Refresh and verify the dashboard Oregon sync includes the complete corrected agent and principal-broker set
- [x] Correct principal-broker office-rank labels to use the complete Oregon source pool denominator
- [x] Add owner-scoped saved Oregon outreach email templates with an Add template editor workflow
- [x] Add multi-selection of synced Oregon agents and principal/managing brokers for BCC email drafts
- [x] Add a signature-complete Oregon outreach draft action with recipient validation and template merge support
- [x] Diagnose and repair the Oregon Sync Top Agents token failure without overwriting existing synced records
- [x] Repair non-working completed-chat navigation buttons on public single-property pages
- [x] Add Cost of Waiting and full First-Time Homebuyer website destinations to single-property completed-chat navigation
- [x] Compact single-property website source labels in dashboard lead tables to street address and inline LO-agent context
- [x] Add expandable single-property source details with the full property-page URL and co-brand pairing information
- [x] Add one-click copy control for expanded single-property page URLs
- [x] Add single-property website source filters to Roadmap and Mortgage Chat Intake lead tables
- [x] Show a saved property thumbnail in expanded single-property source details when available
- [x] Add property-address filtering to Roadmap and Mortgage Chat Intake single-property lead views
- [x] Add a copyable LO-agent pairing label to expanded property source details
- [x] Display each single-property page activity count beside its lead source
- [x] Add date-range filtering to single-property engagement counts in dashboard lead sources
- [x] Show each property page’s most recent activity type and timestamp beside engagement context
- [x] Make property engagement counts open a detailed timeline for that specific saved property page
- [x] Add event-type filtering inside detailed property engagement timelines
- [x] Add CSV export for filtered property engagement timeline activity
- [x] Add a weekly single-property engagement summary widget to the main dashboard
- [x] Add quick keyword search inside detailed property engagement timelines
- [x] Show week-over-week percentage trends in the weekly property engagement widget
- [x] Highlight high-activity properties in the weekly widget with a visual alert badge
- [x] Add an owner-configurable weekly high-activity threshold setting for property alerts
- [x] Show weekly property activity-to-captured-lead conversion metrics in the engagement widget
- [x] Highlight timeline keyword matches inside displayed activity logs
- [x] Add a weekly property engagement sort toggle for activity volume and activity-to-lead conversion rate
- [x] Persist the weekly property engagement sort preference for each dashboard owner
- [x] Add a minimum-activity filter to weekly conversion ranking
- [x] Add per-property co-branded agent conversion comparison context to the weekly widget
- [x] Add the Cost of Waiting calculator section to public single-property pages
- [x] Verify completed-chat Cost of Waiting navigation reaches the live single-property calculator section
- [x] Prefill single-property Cost of Waiting purchase price from the saved property snapshot and identify the property in the calculator
- [x] Add a compact sticky section navigator to public single-property pages
- [x] Add a five-year buy-now-versus-wait comparison visual to the single-property Cost of Waiting experience
- [x] Prefill the single-property 2-1 Buydown calculator purchase price from the saved property snapshot
- [x] Add a share action for current single-property Cost of Waiting calculation results
- [x] Show exact year-by-year amounts in five-year Cost of Waiting chart tooltips
- [x] Ensure the sticky single-property navigator highlights the active scroll section
- [x] Add buyer-ready print-friendly PDF summary generation for current single-property Cost of Waiting and 2-1 Buydown scenarios
- [x] Display dynamic property loan-program eligibility badges beside single-property calculator sections
- [x] Include a five-year financial impact summary in copied Cost of Waiting share text
- [x] Add loan officer and co-branded agent contact block to buyer calculation PDF summaries
- [x] Add a client-email option for single-property buyer calculation summaries
- [x] Add property-specific OHCS Flex Lending and USDA RD screening notes below calculator eligibility badges
- [x] Add owner-scoped reusable buyer email templates to the single-property PDF-summary workflow
- [x] Track Email PDF summary clicks as property-page engagement events and display the metric in dashboard analytics
- [x] Add owner-only edit and delete controls for saved buyer email templates
- [x] Add date-range filtering for Email PDF summary click metrics in the weekly property engagement dashboard widget
- [x] Add Email PDF summary click-to-captured-lead conversion reporting to the property engagement dashboard
- [x] Inventory every dashboard email-template workflow and standardize lifecycle requirements
- [x] Add archive, restore, edit, and permanent deletion support for every custom dashboard email-template type
- [x] Add consistent create, manage, archive/hide, restore, and delete controls to all dashboard email-template interfaces
- [x] Test email-template archive, restore, and permanent-delete behavior and verify archived UI states
- [x] Add template search, bulk selection, and bulk archive actions to the shared template manager
- [x] Display sent-email usage counts for active custom templates in template management views
- [x] Add a read-only quick preview action to template-management rows
- [x] Add bulk restore and permanently delete actions for archived custom email templates
- [x] Add usage-count sorting to the unified email-template management list
- [x] Add validated export and import for custom reusable email templates across dashboard workflows
- [x] Add a universal rich-text email template editor with safe hyperlinks and formatting controls
- [x] Add browser-based Word document content import to the universal email template editor
- [x] Add reusable merge-field insertion controls beside rich email template editors
- [x] Add safe HTML email preview rendering for reusable dashboard templates
- [x] Add owner-scoped template version history with review and restore controls
- [x] Filter the universal merge-field picker to only fields supported by the active email-template workflow
- [x] Extract and normalize the supplied Mike Ford email signature for safe dashboard use
- [x] Apply Mike Ford’s complete default signature to applicable email drafts and new reusable templates
- [x] Add regression tests and publish the workflow-aware merge-field and signature update
- [x] Correct Mike Ford’s default email-signature phone to match the website’s (541) 729-0819 contact number
- [x] Render the assigned dashboard loan-officer profile with headshot, company branding, and contact details on every public single-property page
- [x] Render the assigned dashboard co-marketing agent profile with headshot, company branding, and contact details on every public single-property page
- [x] Add regression coverage and publish complete LO-agent single-property co-branding
- [x] Add a dashboard-managed appointment link to each public single-property loan-officer profile card
- [x] Add optional dashboard-managed social profile links to each public single-property co-marketing agent card
- [x] Add regression coverage and publish the public property-team profile-link enhancement
- [x] Make the future loan-officer Calendly profile field optional and show the public appointment action only when that officer provides a valid link
- [x] Track public single-property loan-officer calendar-button clicks without storing visitor identity
- [x] Display calendar-click counts in the private property engagement dashboard and date-range reporting
- [x] Audit and add a controlled optional third-party single-property CRM URL link for existing live property pages
- [x] Add regression coverage and publish property calendar analytics and third-party-link support
- [x] Inspect the GeoSphere Oregon map repository and supplied FirstHome targeted and non-targeted purchase-price limit data
- [x] Add FirstHome targeted and non-targeted purchase-price limit eligibility to the GeoSphere map without changing dashboard sync fields
- [x] Test the map logic, deployment, and existing first-time-homebuyer dashboard sync compatibility
- [x] Audit the Campaign funnel metrics against existing Roadmap, chat-intake, homes-list, and buyer-agent dashboard reporting for duplication
- [x] Streamline or remove redundant first-touch campaign presentation only if it adds no distinct attribution value
- [x] Validate the revised campaign-reporting experience and publish the dashboard update if needed
- [x] Replace the untagged Campaign funnel cards and repeated table with a compact attribution status until tagged campaign leads arrive
- [x] Add date-range filtering for qualifying UTM-tagged campaign submissions
- [x] Add an in-dashboard UTM campaign-link generator within the attribution guidance section
- [x] Add CSV export for date-filtered tagged campaign attribution rows
- [x] Add regression coverage and publish the campaign reporting controls
- [x] Add reusable Facebook, Google, and email campaign presets to the UTM link generator
- [x] Add a visual campaign-volume comparison bar chart for tagged submission reporting
- [x] Add private campaign-spend inputs with cost-per-tagged-lead calculation by campaign and selected date range
- [x] Add database migration, regression coverage, and publish enhanced campaign reporting
- [x] Audit synced GeoSphere FirstHome eligibility metadata and the dashboard saved-snapshot filter model
- [x] Add a FirstHome LMI-plus-purchase-price filter to Search this saved snapshot with targeted and non-targeted limit context
- [x] Add regression coverage and publish the dashboard FirstHome saved-snapshot filter
- [x] Audit Google Ads and Facebook campaign-spend reporting for comparable budget and outcome metrics
- [x] Add Google Ads campaign budget tracking through the existing private UTM spend workflow
- [x] Add comparable Google and Facebook ROI-style performance metrics based on tagged captured outcomes
- [x] Add regression coverage and publish the Google Ads campaign-reporting update
- [x] Diagnose why the public single-property Cost of Waiting calculator mount is empty
- [x] Restore the complete interactive Cost of Waiting calculator with property-price prefill on single-property pages
- [x] Add regression coverage, visually verify an active property page, and publish the calculator repair
- [x] Add a bounded independent vertical scrollbar to the Spend Tracker Active pairings sidebar for future pairing expansion
- [x] Add regression coverage, visually verify desktop and mobile compactness, and publish the Active pairings scroll behavior
- [x] Add a property-page 2-1 Buydown Share this scenario action with current scenario inputs and property link
- [x] Rename public property-page calculator share actions to Share this scenario for both 2-1 Buydown and Cost of Waiting
- [x] Add regression coverage, visually verify an active property page, and publish calculator scenario sharing
- [x] Audit the stored Mike Ford loan-officer profile and shared code for all obsolete (541) 729-2097 references
- [x] Correct Mike Ford’s dashboard profile, public single-property team cards, signatures, and outreach drafts to (541) 729-0819
- [x] Add regression coverage, visually verify the public profile card, and publish the phone-number correction
- [x] Remove loan-officer and agent bios from public single-property co-branding to reduce page length
- [x] Replace the inline property-team section with a right-edge expandable contact tab retaining essential LO and agent actions
- [x] Add a subtle bump cue only while the property page is actively scrolling, with an idle static state and reduced-motion support
- [x] Add regression coverage, visually verify desktop and mobile behavior, and publish compact property-team interaction
- [x] Audit existing single-property metadata storage and creation-editor controls for taxes and units
- [x] Add persisted optional Property taxes and Units inputs to the single-property dashboard creation editor
- [x] Display provided taxes and unit count in public single-property details with regression coverage and visual verification
- [x] Add optional HOA dues to the single-property creation editor and saved public snapshot
- [x] Add a dashboard metadata edit action for an existing property page’s taxes, units, and HOA dues
- [x] Include saved property tax and unit information in buyer property-list email draft details
- [x] Add regression coverage and publish expanded property metadata support
- [x] Add saved HOA dues, property taxes, and units to dashboard property CSV exports
- [x] Include saved property taxes and HOA dues in single-property calculator assumptions and buyer-facing summaries
- [x] Add client-side and server-side numeric validation for property tax and HOA dues editor fields
- [x] Add regression coverage and publish property export, calculator, and validation enhancements
- [x] Audit saved property-fact storage and extend it safely for optional homeowner-insurance values
- [x] Add optional homeowner-insurance inputs to single-property creation and post-creation editing with numeric validation
- [x] Add clear hover tooltips for property taxes and HOA dues on public single-property details and scenario planning context
- [x] Include saved taxes, HOA dues, and homeowner insurance in scenario planning context and total estimated monthly-payment CSV export
- [x] Add regression coverage and publish all-in property planning enhancements
- [x] Add optional monthly mortgage-insurance input to single-property creation and post-creation property facts with validation
- [x] Create a dashboard-only printable all-in monthly-cost summary for loan-officer use, including saved property planning facts
- [x] Remove public 2-1 Buydown principal-and-interest payment quotes and retain year-one/year-two savings plus seller-funded subsidy education
- [x] Add seller-contribution assumption and non-commitment language to the public 2-1 Buydown presentation for compliance review
- [x] Add regression coverage, visually verify dashboard and public property pages, and publish the revised calculator experience
- [x] Add a private compliance approval-status control to each single-property page’s dashboard editor
- [x] Add a For Internal Use Only watermark to the dashboard-generated all-in monthly-cost worksheet
- [x] Add a validated maximum seller-contribution limit to property facts and use it to contextualize the 2-1 Buydown subsidy
- [x] Add regression coverage and publish compliance-oriented single-property controls
- [x] Match the single-property Ask about buying launcher to the main site’s idle-icon and scroll-expanded behavior
- [x] Move Meet your team from the side tab into the far-right sticky property section menu
- [x] Keep the sticky property menu’s Meet your team action visible and accessible at desktop and mobile widths
- [x] Add regression coverage, visually verify scroll behavior, and publish compact property-page controls
- [x] Audit current seller-contribution fields and map FHA, VA, USDA, and conventional program selection to property pages
- [x] Add private Program contribution limits settings for FHA, VA, USDA, and conventional financing with reviewable values
- [x] Add program-aware seller-contribution warnings in the single-property editor and internal worksheet context
- [x] Add regression coverage and publish program-specific seller-contribution controls
- [x] Add conventional seller-contribution settings for primary residence, second home, investment property, LTV greater than 90%, and LTV 81–90%
- [x] Support both dollar-cap and percentage-of-sales-price inputs for every program contribution setting and auto-screen property scenarios against the stricter configured cap
- [x] Support both dollar-cap and percentage-of-price inputs for every program contribution setting and auto-screen property scenarios against the stricter configured cap (implemented as percentage of sales price)
- [x] Show the exact dollar exceedance when a seller contribution is above the private program limit
- [x] Automatically set a saved property page’s private compliance status to Needs Review when its entered contribution exceeds the calculated limit
- [x] Add a visual proximity indicator beside the seller contribution input for under-limit, near-limit, and over-limit screening
- [x] Add regression coverage and publish enhanced contribution screening feedback

- [x] Make the single-property creation editor a contained floating window with an internal vertical scrollbar and reachable action buttons
- [x] Rework single-property editor field sizing and responsive wrapping so labels and descriptions stay inside their cells without overlap
- [x] Add regression coverage and visually verify the single-property editor layout on desktop and mobile
- [x] Publish the single-property editor layout fix

- [x] Remove the public Cost of Waiting principal-and-interest payment quote from calculator displays and summaries
- [x] Add regression coverage confirming Cost of Waiting remains comparison-focused without public P&I quotes
- [x] Publish the Cost of Waiting disclosure-safe display fix

- [x] Expand the single-property Property Highlights disclosure for estimated taxes, HOA dues, and homeowner insurance requiring independent verification
- [x] Add regression coverage and visually verify the expanded Property Highlights disclosure
- [x] Publish the single-property property-facts disclosure update

- [x] Rename the completed-chat homebuyer destination so it does not use the word “full”
- [x] Ensure completed-chat navigation button labels wrap or fit clearly without truncation at mobile and desktop widths
- [x] Add regression coverage and visually verify completed-chat navigation buttons
- [x] Publish the completed-chat navigation readability fix

- [x] Add clear keyboard-only focus indicators to completed-chat navigation cards
- [x] Add regression coverage for completed-chat navigation focus styling
- [x] Publish the completed-chat keyboard accessibility improvement

- [x] Restore the public chat launcher to icon-only while idle and Ask about buying while actively scrolling
- [x] Verify compact-idle and scroll-expanded chat launcher behavior on homepage and single-property pages
- [x] Add regression coverage and publish the chat launcher behavior restoration

- [x] Remove the redundant Mike Ford contact block from the single-property agent outreach draft body
- [x] Retain exactly one standardized Mike Ford default email signature in the single-property agent outreach draft
- [x] Add regression coverage and publish the single-property agent draft signature cleanup

- [x] Remove the redundant Mike Ford contact block from the Saved qualified listings agent outreach draft body
- [x] Retain exactly one standardized Mike Ford default email signature in the Saved qualified listings agent outreach draft
- [x] Add regression coverage and publish the Saved qualified listings agent draft signature cleanup

- [x] Remove the legacy Mike Ford signature block from saved qualified-listings agent templates themselves
- [x] Prevent duplicate Mike Ford signature blocks from being saved in qualified-listings agent templates
- [x] Add regression coverage and verify both template editor content and generated agent drafts
- [x] Publish the saved qualified-listings agent template cleanup

- [x] Add a visible dashboard note that agent-email signatures are appended by the user’s mail client
- [x] Add a one-click cleaned template-body preview to the listing-agent template manager
- [x] Allow dashboard users to customize agent-draft subject lines before generating Saved qualified listings and single-property agent emails
- [x] Add regression coverage and publish the agent email-drafting workflow improvements

- [x] Compact the Single-property co-branded pages dashboard workspace into a vertically scrollable property-card list
- [x] Open a selected property card or address into a complete single-property detail workspace with all current controls
- [x] Add regression coverage and verify the compact property workspace on desktop and mobile
- [x] Publish the compact single-property dashboard workspace redesign

- [x] Add independently scrollable Co-branded agents and Loan officers directory sections for future growth
- [x] Add search plus A–Z last-name and most-recent sorting to both directories
- [x] Add a PB-only filter for Co-branded agents
- [x] Add template-backed draft-email actions for Co-branded agents and Loan officers, with Add template first and full lifecycle management
- [x] Add regression coverage and publish the scalable agent and loan-officer directory enhancements

- [x] Add bulk-selection checkboxes and grouped email-draft generation for Co-branded agents and Loan officers
- [x] Record and display each agent and loan officer profile’s most recent directory outreach draft timestamp
- [x] Add owner-scoped reusable directory filter presets for frequent agent and loan-officer searches
- [x] Add regression coverage and publish the directory productivity upgrades

- [ ] Verify the dashboard’s current Meta and Google UTM attribution, campaign-spend, and lead-funnel capabilities
- [ ] Prepare current official Meta Ads and Google Ads account and campaign setup instructions
- [ ] Provide a launch checklist for tracked campaign links and dashboard lead-funnel verification

- [x] Verify Meta Lead Ads and Google lead-form webhook or API support against the current dashboard lead-ingestion model
- [x] Compare secure native-form ingestion approaches and identify required account, access, and consent decisions
- [x] Provide implementation and end-to-end UTM attribution testing checklists for the dashboard lead funnel

- [ ] Add private platform_lead table for Meta and Google native form leads with idempotent deduplication
- [ ] Implement secure Meta leadgen webhook receiver with X-Hub-Signature-256 validation and lead retrieval
- [ ] Implement secure Google lead-form webhook receiver with google_key validation and is_test separation
- [ ] Register both receivers as public Express routes and request required secrets
- [ ] Add protected dashboard tRPC procedures and a private platform-leads view in the dashboard
- [ ] Add regression coverage for both receivers and the platform-leads dashboard view
- [ ] Validate and publish the webhook integration

- [ ] Resume native Meta and Google lead-form webhook activation after platform credentials, form mappings, consent language, and corporate compliance approval are available

- [x] Add protected manual native-platform lead creation with explicit manual provenance while webhooks are paused
- [x] Add a private manual lead-entry form to the Ad platform leads dashboard inbox
- [x] Add regression coverage and publish the manual platform-lead entry workflow

- [x] Add Facebook, Google Ads, and Organic source selection to manual platform-lead entry
- [x] Add enhanced private platform-lead inbox search and source filtering
- [x] Add protected loan-officer and co-branded-agent assignment controls for platform leads
- [x] Add regression coverage and publish the enhanced platform lead-management workflow

- [x] Normalize the manual platform-lead phone input by removing a leading U.S. country code and displaying (503) 729-5556 formatting
- [x] Add regression coverage and publish the manual platform-lead phone formatting refinement

- [x] Relabel the manual platform-lead identifier field and inbox subtext as Lead ID
- [x] Add regression coverage and publish the manual Lead ID label refinement

- [x] Add protected edit, restore, and permanently delete operations for platform leads
- [x] Keep archived platform leads searchable by name, contact, source, and Lead ID
- [x] Add individual and select-all checkboxes plus bulk restore and permanent delete actions in the platform lead inbox
- [x] Add regression coverage and publish the platform lead lifecycle management upgrade

- [x] Add timestamped private interaction-note history for each platform lead
- [x] Add configurable New, Contacted, and Qualified-style progress statuses for platform leads
- [x] Add CSV export for selected platform leads in active and archived inbox views
- [x] Add regression coverage and publish the platform lead history, status, and export enhancements

- [x] Add direct inline progress-status editing on platform-lead rows
- [x] Add platform-lead dashboard filters for progress status and assigned co-branded agent
- [x] Add an owner-only AI summary action for timestamped platform-lead interaction history
- [x] Add regression coverage and publish the inline status, filtering, and AI summary enhancements

- [x] Allow Campaign and Lead ID editing in the private platform-lead edit modal
- [x] Extend AI interaction summaries with an evidence-based next-best-action and follow-up suggestion
- [x] Add a Kanban-style status pipeline with accessible drag-and-drop progress updates
- [x] Add per-lead follow-up reminders for phone, text, email, listing list, agent connection, and Roadmap actions
- [x] Add template-backed platform-lead and platform-agent draft-email workflows with LO-only or LO-plus-agent branding and full template lifecycle management
- [x] Add regression coverage and publish the expanded platform-lead workspace

- [x] Diagnose and safely resolve the GitHub fetch failure affecting batch project download/export

- [x] Retry direct project archive creation and verify the connected GitHub repository status

- [x] Repair Mortgage chat intake filters so controls do not overlap at desktop or responsive widths
- [x] Compact saved planning snapshots in the Mortgage chat intakes table with accessible expanded detail
- [x] Add regression coverage and publish the Mortgage chat intakes layout repair

- [x] Add a date-range filter for Mortgage chat intake conversations
- [x] Add owner-reviewed exact-response extraction from a chat intake that prefills an Organic manual platform-lead entry with question-and-answer-only vertically paired verbatim responses, quick-button choices, slider values, No response provided placeholders, available Loan Officer and Co-branded Agent assignments, and blank follow-up scheduling
- [x] Add reusable consent-gated text-message quick-reply templates to the Mortgage chat intake section, with a known-LO Paired group labeled LO: First Last + Agent: First Last and an always-available Agents group before Connect with agent when none is assigned
- [x] Add regression coverage and publish the enhanced Mortgage chat intake workflow

- [x] Add the contextual Paired and Agents assignment dropdown convention to the Ad platform leads inbox using each lead’s currently assigned loan officer

- [x] Complete the reviewed exact-response Organic prefill and grouped consent-gated text quick-reply controls

- [x] Add natural, reduced-motion-safe typing animation and accessible progress feedback to the public Mortgage Chat Intake
- [x] Add a downloadable completed-intake PDF summary directly to the public chat completion view
- [x] Add contextual Paired and Agents groups to the Ad platform inbox agent-assignment controls using the lead’s assigned loan officer
- [x] Add regression coverage and publish the chat-experience, completion-PDF, and platform-inbox pairing enhancements

- [x] Add a smooth, reduced-motion-safe transition from the final Mortgage Chat response to the completed-summary view
- [ ] Add deliberate borrower and co-borrower email delivery for the generated completed-intake PDF summary
- [x] Add regression coverage and publish the completion transition framework; keep emailed PDF delivery inactive

- [ ] ON HOLD — Activate direct Mortgage Chat PDF email delivery only after approved Resend API key and sender-domain permissions are supplied

- [x] Add a reusable owner-only AI email-assistance panel to every shared dashboard create/edit template editor, using user-supplied goal keywords to generate editable subject and body drafts
- [x] Add the same owner-only AI email-assistance panel to Ad platform lead and agent template creation/editing
- [x] Add workflow-aware AI safeguards, regression coverage, and publish the user-controlled email-drafting workflow

- [x] Add clear in-progress spinner and generating status feedback to the AI email-assistance panel
- [x] Add owner-controlled Regenerate and Refine actions to rewrite an editable AI email draft
- [x] Add reusable private AI prompt quick-select options for faster template drafting
- [x] Add migration, regression coverage, and publish the AI drafting feedback and prompt-library enhancements

- [x] Add selectable tone control to owner-only AI email assistance
- [x] Add workflow-safe personalization placeholder insertion to AI-generated email templates
- [x] Add side-by-side original-versus-proposed AI draft preview with explicit apply control
- [x] Add regression coverage and publish the AI tone, personalization, and comparison enhancements

- [x] Add copy-to-clipboard control and a reduced-motion-safe application transition to the AI proposal preview
- [x] Add AI draft character and word metrics with a user-selected maximum-word input enforced during generation
- [x] Add regression coverage and publish the AI proposal feedback and length-control enhancements

- [x] Highlight approved dynamic placeholders in proposed AI email drafts
- [x] Add an author-controlled Undo action after applying an AI proposal
- [x] Add concise explanatory tone guidance to the AI assistance controls
- [x] Add regression coverage and publish the AI draft-review refinements

- [x] Add private AI draft session history with browse and restore controls
- [x] Add rapid AI refinement actions for shorter and more persuasive proposed drafts
- [x] Add independent vertical scrolling to co-branded agent and loan-officer directory result panels
- [x] Add regression coverage and publish the AI history, refinement, and compact directory enhancements

- [x] Add a clear local AI session-history control
- [x] Add hover guidance to rapid AI refinement actions
- [x] Keep co-branded agent and loan-officer search controls prominently available above scrollable results
- [x] Add regression coverage and publish the AI history-clearing and directory-search refinements

- [x] Add an independently scrollable active Ad platform leads result panel while keeping filters and bulk actions visible
- [x] Add an independently scrollable Weekly property engagement result panel while keeping metrics and sorting controls visible
- [x] Add regression coverage and publish the compact platform-lead and weekly-engagement lists

- [x] Add an independently scrollable spend-row history to the LO+Agent Pairings Spend Tracker while retaining allocation totals and add-spend controls
- [x] Add regression coverage and publish the compact spend tracker history

- [x] Add private Spend Tracker history text search and inclusive start/end date filtering
- [x] Add private Spend Tracker history sorting by date and total amount
- [x] Add entry-level hover guidance that shows stored campaign or expense description details
- [x] Add regression coverage and publish the Spend Tracker history discovery enhancements

- [x] Add additional private Spend Tracker sort options and a filtered-range spend summary widget
- [x] Add filtered Spend Tracker history CSV export beside the discovery controls
- [x] Add incremental Load More controls for large private spend histories
- [x] Add regression coverage and publish the scalable Spend Tracker history enhancements

- [x] Add protected edit and delete controls for individual private Spend Tracker history entries
- [x] Add Facebook and Google Ads spend source tags alongside existing spend categories
- [x] Add a source/category filter to the private Spend Tracker history
- [x] Add regression coverage and publish the spend-entry correction and source-filter enhancements

- [x] Save a clearly labeled clean recovery baseline checkpoint for the working dashboard and public website

- [x] Add a collapsible workday workflow sidebar to the private dashboard with clickable section links and an always-pinned daily workflow guide
- [x] Add concise section-specific best-practice recommendations for lead conversion, agent partnership growth, funnel review, and co-branded property workflow actions
- [x] Add owner-only AI daily section reviews that identify compact next actions for up to 10 current section records using existing private dashboard data
- [x] Add regression coverage, responsive validation, and publish the dashboard workday workflow enhancements

- [x] Diagnose and eliminate redundant final-review and publish loops in the dashboard completion workflow

- [x] Add a private Spend Tracker pie chart showing filtered spend distribution by category
- [x] Add a persistent dark-mode toggle to the private dashboard navigation
- [x] Add a public monthly-payment and interest estimator with clear assumptions and disclosures
- [x] Add focused regression coverage and publish the dashboard chart, theme, and mortgage estimator enhancements

- [x] Remove the Payment Estimate section and navigation item from the public website
- [x] Add a compact private monthly-payment and interest estimator to the dashboard workday sidebar
- [x] Add regression coverage, responsive verification, and publish the private-only calculator correction

- [x] Add property-tax and homeowners-insurance inputs to the private dashboard payment estimator
- [x] Show a clearly labeled total estimated monthly payment that includes P&I, property tax, and homeowners insurance
- [x] Add focused coverage, responsive verification, and publish the all-in sidebar payment estimator enhancement

- [x] Add monthly HOA-dues and mortgage-insurance inputs to the private dashboard payment estimator
- [x] Add protected saved mortgage-payment quote persistence with a Save Quote action
- [x] Add a compact dashboard comparison view for saved mortgage-payment scenarios
- [x] Add migration, regression coverage, responsive verification, and publish the saved-quote sidebar calculator enhancement

- [x] Add owner-private AI review recommendation history with review context and generated-action snapshots
- [x] Add owner-controlled recommendation outcome feedback and completion tracking without automatic outreach or lending decisions
- [x] Add a private PDF export for saved mortgage-payment quote comparisons
- [x] Add migration, focused coverage, responsive verification, and publish the recommendation-feedback and PDF-export enhancements

- [x] Audit the current authentication, authorization, and ownership model for secure multi-loan-officer dashboard access
- [x] Add an owner-controlled team loan-officer account and secure workspace-assignment framework
- [x] Add private downstream loan-officer workspaces with Mike Ford administrator shadow-view and management controls
- [x] Scope new downstream team data for co-branded agents, leads, property pages, campaigns, and saved tools
- [x] Add management safeguards, regression coverage, migration, responsive verification, and publish the team-dashboard foundation
- [x] Add Mike Ford administrator controls for read-only sharing or withholding of saved email and text templates from downstream loan-officer workspaces

- [x] Add an admin-only performance comparison chart for downstream loan-officer lead conversion rates
- [x] Add an administrator notification feed for downstream lead and saved-quote activity
- [x] Add downstream email/text template submission with Mike Ford review, approval, rejection, and controlled availability
- [x] Add migration, regression coverage, responsive verification, and publish the team performance, activity-feed, and template-approval enhancements

- [x] Document the current platform-managed team loan-officer invitation and workspace-activation steps for Mike Ford
- [x] Assess a separate identity-provider-based temporary-password and first-login reset flow without storing credentials in the dashboard

- [x] Audit team ownership boundaries for GeoSphere listings, Oregon agent sync, and reusable email/text/outreach template families
- [x] Add an admin-only downstream loan-officer provisioning checklist with controlled setup-readiness state
- [x] Add administrator controls to seed approved template libraries and prepare authorized listing and Oregon-agent sync resources for a downstream workspace
- [x] Add an explicit secure workspace handoff control that releases a prepared dashboard only after Mike Ford confirms readiness
- [x] Add migration, access-control coverage, responsive verification, release validation, and publish the provisioning-and-handoff workflow

- [x] Create a presentation summarizing Mike Ford administrator controls, downstream workspace setup, secure handoff, oversight, template governance, and future ad-account connection readiness
- [x] Draft exact screen-by-screen onboarding wizard wireframes and interaction specifications for Mike Ford provisioning and securely handing off a downstream loan-officer workspace
- [x] Draft the official OAuth scopes, account-selection, form-mapping, token-security, and release-gate steps for downstream officer-specific Meta and Google Ads connections
- [x] Create presentation slides based on the downstream loan-officer onboarding wizard wireframes
- [x] Draft compliant downstream loan-officer account-handoff, activation, reminder, suspension, and setup-readiness email notification templates
- [x] Generate complete presenter notes and delivery script for the onboarding-wizard slide deck

- [x] Remove the redundant upper public-header navigation row while preserving the lower persistent section navigator with Top and Mortgage Chat
- [x] Add regression coverage, responsive verification, and publish the streamlined public header navigation

- [x] Move the 2-1 Buydown item directly after Cost of Waiting in the persistent public section navigator
- [x] Add regression coverage, responsive verification, and publish the revised public section order

- [x] Guide the owner to the official full account and task/project backup portal options

- [x] Provide official step-by-step instructions for a complete export of all tasks and website project data

- [x] Add a private administrator backup-readiness panel with a confirmed link to the official restore portal rather than an unsafe automatic restore action
- [x] Add an owner-maintained backup and restoration history log for documented backup events and completed restoration events
- [x] Add migration, access-control coverage, responsive verification, and publish the private backup-management dashboard panel

- [x] Add a confirmation warning modal before opening the official restore portal from the private backup panel
- [x] Add date-range filtering and text search to the private backup-history log
- [x] Add loading and success feedback when an owner records a completed external restoration event
- [x] Add focused coverage, responsive verification, and publish the private backup-management refinements

- [x] Add truthful per-entry backup package download controls that appear only for saved valid package URLs
- [x] Add an admin-only Meta and Google advertising integration settings page with planning and approval placeholders only
- [x] Preserve the explicit hold on native Meta/Google webhooks, advertising credentials, and lead imports
- [x] Add migration, safeguards, regression coverage, responsive verification, and publish the backup-download and integration-planning controls

- [x] Add administrator-only Meta and Google Account ID planning fields
- [x] Add secure API-key configured-status controls with a no-edit, delete-and-re-enter policy note
- [x] Preserve secret-store handling and keep external advertising credentials, webhooks, and lead imports inactive
- [x] Add safeguard coverage, responsive verification, and publish the secure advertising-settings refinement
- [x] Ensure no API key values are stored in GitHub, application data, browser-visible code, or logs; use protected secret storage only

- [x] Add clearly labeled inactive, missing-credential, and ready-to-connect status indicators for Meta and Google advertising preparation
- [x] Add safe future-setup guidance for account creation, compliance approval, secure key entry, and form mapping without activating integrations
- [x] Preserve the no-account, no-credential, no-webhook, no-test-request, and no-lead-import state until the administrator explicitly approves a future connection
- [x] Add safeguards, regression coverage, responsive verification, and publish the advertising-integration readiness experience

- [x] Add official credential-location help beside the non-revealing Meta and Google API-key status controls
- [x] Add a Getting Started prerequisites checklist to the administrator advertising integrations settings
- [x] Add an administrator-controlled master visibility switch that hides or reveals the inactive advertising integrations settings module
- [x] Add migration, safeguards, regression coverage, responsive verification, and publish the advertising-integration readiness controls

- [x] Add persisted checklist completion controls and a visual progress bar to the administrator advertising Getting Started checklist
- [x] Add a smooth reduced-motion-safe collapse/expand transition and confirmation feedback for the advertising module visibility switch
- [x] Add a compact enabled/disabled advertising-module status badge to the main administrator dashboard navigation
- [x] Add migration, regression coverage, responsive verification, and publish the advertising-readiness interaction refinements

- [x] Add a hover and keyboard-focus progress-bar tooltip showing completed and remaining advertising setup steps
- [x] Add a temporary checklist dismissal with an in-dashboard reminder that returns after one week
- [x] Add a quick-link from the administrator Ads module status badge to the advertising integration settings section
- [x] Add scheduling-safe persistence, safeguards, regression coverage, responsive verification, and publish the readiness navigation refinements
- [x] Implement the chosen Option A reminder: hide the checklist for seven days and show an in-dashboard reminder only when Mike next visits afterward

- [x] Add an administrator-only Reset Checklist action that clears saved progress and reminder state without changing integration readiness or connection status
- [x] Add a Watch Tutorial action that opens a clear setup-walkthrough placeholder modal in the private advertising readiness section
- [x] Add regression coverage, responsive verification, and publish the checklist reset and tutorial controls

- [x] Add a confirmation dialog before the administrator can reset advertising checklist progress
- [x] Ensure the advertising tutorial modal supports click-outside dismissal and an explicit Close button
- [x] Add official Meta and Google documentation links below the tutorial placeholder
- [x] Add regression coverage, responsive verification, and publish the tutorial and reset-safety refinements

- [x] Add a tutorial Mark as Watched checkbox that safely updates the existing advertising Getting Started checklist progress
- [x] Add searchable official Meta and Google documentation resources to the private tutorial modal
- [x] Add per-resource Copy Link actions in the tutorial modal for internal team sharing
- [x] Add regression coverage, responsive verification, and publish the tutorial resource interaction enhancements

- [x] Add a clear no-results-found state when private tutorial documentation search matches no provider guide
- [x] Add an accessible reduced-motion-safe success celebration when the advertising Getting Started checklist reaches 100% completion
- [x] Add immediate copied confirmation after a tutorial resource Copy Link action
- [x] Add regression coverage, responsive verification, and publish the tutorial feedback refinements

- [x] Review the private Meta/Google integration settings and Getting Started checklist UI/UX for polish and accessibility
- [x] Create test scenarios and user-flow documentation for checklist progress, tutorial/reset modal interactions, and the master visibility toggle

- [x] Audit the provider-ready Texting Workspace and current consent gates before Twilio activation
- [x] Add secure Twilio credential configuration using protected secret storage only
- [x] Activate owner-controlled Twilio SMS/MMS delivery for explicitly text-consented leads with delivery-status tracking
- [ ] Verify consent enforcement, delivery error handling, controlled test sending, regression coverage, and publish the Twilio texting activation

- [x] Add a signed HTTPS Twilio status-callback route that records sent, delivered, failed, and undelivered updates in the private text-message thread
- [x] Add owner-confirmed Twilio SMS/MMS delivery for explicitly consented text-ready leads only
- [x] Add a private dashboard send confirmation and delivery-status presentation backed by Twilio provider message IDs
- [ ] Add secure Twilio secret configuration, webhook signature tests, consent/error coverage, controlled testing steps, and publish the callback-enabled texting activation

- [x] Configure the Twilio trial path using only protected Account SID, Auth Token, and From Number values; do not require a Messaging Service SID

- [x] Surface a safe Twilio rejection code in the private delivery detail so a trial sender issue can be resolved without exposing provider diagnostics or credentials

- [ ] Diagnose why the confirmed private-dashboard Twilio send reports zero messages sent despite a verified trial sender and eligible test lead
- [x] Show a safe per-recipient Twilio rejection detail in the private dashboard send result when zero messages are accepted

- [ ] Isolate the Twilio Trial error 572006 request constraint using read-only or intentionally invalid non-sending diagnostics only

- [ ] Replace the trial-only sender with the newly claimed usable Twilio From Number through protected secret configuration, then revalidate readiness before one controlled delivery test

- [x] Perform a focused security review of consent revalidation, owner confirmation, callback signature validation, and sensitive-data disclosure boundaries
- [x] Add additive consent and webhook hardening safeguards with adversarial automated coverage while sender replacement remains paused

- [x] Prevent a signed callback that arrives before the initial audit write from regressing delivery state or creating duplicate recipient events

- [x] Extend the separate GeoSphere map application with a Lakeview National Rentcast qualifying-list saved database, map overlay, property detail popup, and export selection

- [x] Add a review-only Lakeview National program filter to Saved Qualified Listings using existing GeoSphere sync metadata for new and existing Rentcast listing snapshots

## Independent public-site mobile clone

- [ ] Create a separate Manus project clone named First-Time Homebuyer Mobile-First Website without changing the original project
- [ ] Keep the existing private admin/user dashboard desktop-only and unchanged in the mobile clone
- [ ] Audit public-site mobile behavior for navigation, forms, chat intake, calculators, and single-property pages
- [ ] Implement touch-first responsive public-site improvements while preserving desktop browser functionality
- [ ] Add public-site regression coverage and verify key visitor flows at mobile and desktop viewports
- [ ] Save and publish the independent public mobile-first clone
- [ ] Keep the new clone's Twilio, Meta/Google webhook, and Resend email activation states aligned with the source project's paused/on-hold safeguards
- [ ] Document that the mobile clone is public-site optimized only; dashboard administration remains intended for computer browsers

## Scope history

- [x] Revised the mobile-clone scope to exclude mobile dashboard optimization after user clarification

## Delivery state

- [x] Lakeview National review-only Saved Qualified Listings filter released in checkpoint 8f20b620
- [ ] Resume intentionally paused provider integrations only after required credentials, sender number, consent, and compliance prerequisites are available

## MOBILE_OPTIMIZATION_HANDOFF execution

- [x] Save a rollback checkpoint before beginning mobile-only public-site changes
- [x] Audit public landing components and mobile rendering against MOBILE_OPTIMIZATION_HANDOFF.md
- [x] Add mobile-only hero headline scaling and verify CTA tap targets
- [x] Add mobile-only tap-to-call navigation control without changing desktop navigation
- [x] Harden mobile chat launcher and open panel sizing/stacking without changing desktop behavior
- [x] Verify mobile calculator controls and prevent small-screen horizontal overflow without changing desktop grids
- [x] Verify roadmap form mobile input modes, tap targets, and full-width submission behavior
- [x] Add regression coverage for the mobile-only public-site changes without touching dashboard/server/schema/lead-routing code
- [x] Verify public visitor flows at 390x844 and 1280px and confirm desktop remains unchanged
- [x] Push and checkpoint the completed mobile-only handoff implementation


## Mobile homepage enhancements

- [x] Add a lightweight public homepage mortgage payment estimate widget for mobile visitors, reusing existing mortgage calculation logic and showing educational estimate disclosures
- [x] Add a mobile-only sticky bottom navigation bar with quick access to contact and primary public sections
- [x] Add regression coverage and verify both enhancements at mobile and desktop viewports without changing the dashboard
- [x] Push and checkpoint the mobile homepage enhancements


## Mobile lead-capture parity verification

- [x] Verify mobile MortgageChatWidget uses the existing chat.start/chat.answer/requestBuyerAgent procedures and persists the full transcript
- [x] Verify mobile chat yes/no property-search responses retain desired city/county and low/no-down-payment request metadata
- [x] Verify mobile Roadmap submissions use the existing leads.submit path and preserve UTM/source, consent, and assigned LO/agent routing
- [x] Verify Cost of Waiting and 2-1 Buydown scenario attachments reach the same lead record fields from mobile CTAs
- [x] Verify dashboard intake sections and labels remain the same for mobile-originated leads
- [x] Run focused parity tests and report confirmed behavior or any regression


## Vercel independent production migration planning

- [x] Inventory required runtime environment variables and classify public versus secret values for Vercel
- [x] Inventory database schema/migrations and document a non-destructive MySQL migration path from Manus
- [x] Inventory uploaded-file/storage references and document an S3/object-storage migration path
- [x] Verify Vite + Express/tRPC hosting compatibility and identify required Vercel adapter/routing changes
- [x] Create a staged post-deployment test matrix for OAuth, tRPC routes, Roadmap/chat lead capture, scenarios, webhooks, and dashboard access
- [x] Provide Vercel configuration, migration, rollback, and validation instructions


## Vercel SQL, backend, and transition presentation

- [x] Inventory exact Drizzle tables, migration files, and current Express/tRPC entrypoint for the migration artifacts
- [x] Produce parameterized non-destructive MySQL dump, restore, schema migration, and verification commands
- [x] Define Vercel Express/tRPC routing, Node runtime, timeout, database connection, and webhook configuration guidance
- [x] Create slide content summarizing staging, database/file migration, validation, cutover, and rollback
- [x] Generate and present the Vercel migration and database transition slide deck


## Public lead-capture feedback enhancement

- [x] Audit the public lead-capture form submission state and existing success/error handling
- [x] Add an accessible loading animation and submitting-state feedback without changing lead payloads or routing
- [x] Add clear success feedback after a confirmed lead submission, preserving existing next-step navigation
- [x] Add focused regression coverage and verify mobile/desktop rendering
- [x] Push and checkpoint the lead-capture UX enhancement


## Lead form validation, contact preference, and new-lead badge

- [x] Audit the existing leads schema/procedure, public LeadMagnet form, and dashboard lead-row rendering
- [x] Add a nullable preferred contact method field with safe backward-compatible default behavior
- [x] Add inline required-field and format validation messages to the public LeadMagnet form
- [x] Add a text/email preferred-contact toggle while preserving explicit consent safeguards
- [x] Add a dashboard-only visual New badge for recent new submissions
- [x] Add focused regression tests and verify mobile and desktop behavior
- [x] Push and checkpoint the release


## Dashboard lead contact tools

- [x] Audit existing lead filters, clipboard utilities, and secure per-lead note editing flow
- [x] Add a preferred-contact-method filter to the Roadmap lead list
- [x] Add email and phone copy-to-clipboard controls with accessible feedback
- [x] Add a simple per-lead follow-up notes editor using the existing protected lead-note procedure
- [x] Add focused regression tests and verify desktop/mobile dashboard behavior
- [x] Push and checkpoint the dashboard lead contact tools


## Dashboard lead search, sorting, and note timestamps

- [x] Audit note persistence fields and current lead search/order behavior
- [x] Add a persisted last-updated timestamp for follow-up notes
- [x] Display the note last-updated timestamp next to each lead’s follow-up notes area
- [x] Add name/email search behavior to the dashboard lead list
- [x] Add newest-first and oldest-first sorting controls
- [x] Add focused regression tests and verify desktop/mobile dashboard behavior
- [x] Push and checkpoint the dashboard lead-list enhancements


## Browser-source tracking and dashboard affordability tools

- [x] Add backward-compatible mobile/desktop browser capture metadata to existing lead submission payloads while preserving workflow source labels
- [x] Surface Mobile Browser or Desktop Browser labels wherever lead source is shown in dashboard lead sections and exports
- [x] Add a sticky sidebar Desktop Browser versus Mobile Browser all-time comparison tracker with counts, ratio, percentage, and gradient meter
- [x] Move the existing sidebar payment calculator directly below the tracker and make it compact until expanded
- [x] Add a disclosed How much house can I afford? estimator with credit score, income, debts, and monthly expense inputs
- [x] Apply the requested program DTI and minimum-credit-score assumptions with clear non-approval disclosure
- [x] Add focused tests and verify lead capture, dashboard rendering, calculations, and frozen existing flows
- [x] Push and checkpoint the release


## Confirmed sidebar implementation scope

- [x] Complete the sticky fixed Mobile Browser versus Desktop Browser tracker at the top of the dashboard sidebar
- [x] Place the compact payment calculator directly below the browser tracker
- [x] Complete the expandable How much house can I afford? estimator with DTI and credit-score screens
- [x] Verify all existing lead source labels, lead flows, and dashboard sections remain functional


## Browser metrics timeframe and source visualization

- [x] Add All time, Last 30 days, and This year timeframe controls to the browser lead mix tracker
- [x] Recalculate browser counts, ratio, percentage, and meter from real lead timestamps for the selected timeframe
- [x] Add accessible tooltips explaining each affordability program’s DTI and minimum credit-score assumptions
- [x] Add a real-data lead-source pie chart below the browser tracker for chat, Roadmap, and other existing source values
- [x] Add focused data/count tests and verify dashboard desktop/mobile rendering
- [x] Push and checkpoint the browser analytics enhancement


## Lead analytics interactions and affordability email

- [x] Audit existing affordability calculator email-draft conventions and dashboard source-filter state
- [x] Add an Email Results action that opens a prefilled client-ready affordability summary draft without automatic sending
- [x] Make source pie-chart segments keyboard/click accessible and connect selection to the main dashboard lead-list source filter
- [x] Add a real-data daily incoming-lead trend line for the selected timeframe
- [x] Add focused tests and verify chart interaction, draft generation, filtering, and dashboard rendering
- [x] Push and checkpoint the release


## Dashboard chart and calculator interaction refinements

- [x] Add exact-day hover tooltips to the daily incoming-lead trend line
- [x] Add a visible Clear Filters button beside the lead-source pie chart that resets the dashboard source-filter view
- [x] Add a Copy to Clipboard action beside Email Results for the affordability breakdown
- [x] Add focused regression tests and verify desktop/mobile dashboard rendering
- [x] Push and checkpoint the interaction refinements


## Saved affordability quote workflow

- [x] Audit existing affordability calculator result fields, dashboard quote UI, schema, and protected procedure conventions
- [x] Add a user-scoped saved affordability quote table with named quote, borrower name, program, inputs, result, and timestamps
- [x] Add protected create/list procedures with name, program, and maximum-price ceiling filters
- [x] Replace Email Results with a named Save Quote workflow in the affordability calculator
- [x] Add a searchable dashboard saved-quotes section with first name, last name, program, and max-price slider filters
- [x] Add migration, security, calculation, search, and responsive regression tests
- [x] Push and checkpoint the saved-quote release


## Saved quote management

- [x] Audit saved quote card data and calculator state restoration fields
- [x] Add protected edit-name and delete saved quote procedures
- [x] Reload exact saved quote inputs and result fields into the calculator when selected
- [x] Add Edit Name and Delete controls beside each saved quote
- [x] Add Copy Summary to saved quote cards with accessible feedback
- [x] Add security and regression coverage and verify dashboard desktop/mobile behavior
- [x] Push and checkpoint the saved quote management release


## Enterprise dashboard AI and UX review

- [x] Create a pre-review rollback checkpoint for the current verified project
- [x] Create a downloadable source archive excluding secrets and generated dependencies
- [x] Document archive coverage and Manus-managed data/storage exclusions
- [x] Audit dashboard layout, information architecture, AI assistance, lead flow, outreach, analytics, and enterprise administration
- [x] Design and prioritize cross-dashboard AI/UX improvements before implementation
- [x] Implement approved dashboard improvements without weakening access, consent, or compliance safeguards
- [x] Add regression, accessibility, AI-output, and dashboard-flow verification
- [x] Push and checkpoint the reviewed/implemented enterprise dashboard improvements


## Executive command-center widget customization

- [x] Audit command-center widget structure and existing preference persistence patterns
- [x] Add native drag-and-drop ordering for command-center KPI widgets
- [x] Persist the chosen widget order in the browser for the current dashboard user
- [x] Add reset-layout control and keyboard-accessible move controls
- [x] Add focused regression coverage and verify desktop/mobile command-center layout
- [x] Push and checkpoint the widget customization release
