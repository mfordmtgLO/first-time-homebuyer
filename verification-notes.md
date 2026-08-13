# Verification notes (internal)

## Chat panel positioning verification (2026-08-13)
- Verified the expanded Mortgage Intake Specialist at 1280×800 and 390×844 using a development-only preview state, which was removed immediately after verification.
- The revised `calc(100vh - 12rem)` panel height leaves the full loan-officer contact header visible at both viewports while retaining clearance for the floating launcher.

## Chat quick replies and minimize verification (2026-08-13)
- Desktop expanded-chat check confirmed visible Purchase and Refinance quick-reply chips, a header minimize icon, and a compact Minimize launcher state.
- Mobile minimized-chat check confirmed a clear Resume chat launcher without clearing the active session. The development-only preview state was removed after verification.

## Calendly booking placement verification (2026-08-13)
- Desktop public-page verification confirmed the persistent “Book a 15-min Call” navigation control remains visible after being wired to the supplied Calendly destination.
- Mobile completed-chat verification confirmed a clear “Schedule a free 15-minute call” Calendly action and the optional low/no-down-payment home-search completion message. The development-only completion preview was removed immediately afterward.
- The supplied Calendly URL was opened and confirmed to load Mike Ford’s “Book a phone call w/Mike” 15-minute scheduling page with available date selection.

## Chat resend confirmation verification (2026-08-13)
- Protected dashboard verification confirmed the manual resend dialog identifies the selected lead, explains that the loan officer and applicable co-branded agent will receive the completed intake, and requires an explicit Confirm resend action.

## Low/no-down-payment home-search flow verification (2026-08-13)
- Mobile public-chat verification confirmed the final yes/no question about low- or no-down-payment homes and the conditional target-city/surrounding-area prompt are both readable and available before intake completion. Development-only preview states were removed immediately afterward.

## Enhanced Mike Ford headshot verification (2026-08-13)
- The supplied enhanced WebP portrait was uploaded as `/manus-storage/mike-ford-headshot-enhanced_a17f8b15.webp` and replaced the prior About-section headshot source. The public anchor screenshot tool did not honor the About anchor, and a direct-browser anchor view was unavailable after navigation, so final runtime validation will use the public page render and asset path check.
- A development-only isolated About render then confirmed the enhanced portrait displays cleanly in the existing editorial card treatment, with Mike’s full upper body and contact identification visible. All temporary preview code was removed immediately afterward.
- A normal full public landing-page capture subsequently confirmed the enhanced headshot appears in the real About-section placement within the live page flow.

## About and Good Questions copy refinement verification (2026-08-13)
- The About headline now reads “An advisor in your corner.” with the requested phrase removed.
- Good Questions now renders “first-time” as one intact, ligature-safe term with no malformed initial glyph or hyphen line break. The development-only section preview was removed after verification.
- The Good Questions headline was subsequently moved to Public Sans for the complete line; the full-scale verification confirmed a clean conventional lowercase “f” in “first-time.” The temporary FAQ preview was removed after this check.
- The Two Easy Ways to Start headline was also moved to Public Sans; full-scale verification confirmed clean, conventional “first” letterforms. The temporary final-CTA preview was removed after this check.

## Mortgage Intake Specialist typing indicator verification (2026-08-13)
- Mobile chat verification confirmed an animated three-dot indicator with the visible, accessible label “Mortgage Intake Specialist is typing…” appears after a visitor message while the response is processing. The development-only processing preview was removed afterward.

## Guided Mortgage Intake Specialist control verification (2026-08-13)
- Mobile verification confirmed the property-type options, $0–$1,000,000 purchase-price and household-income sliders, $0–$500,000 down-payment slider, credit-range options, and YES/NO property-search options all fit, wrap, and remain tappable in the chat panel. The development-only guided-step preview was removed afterward.
- Desktop verification confirmed the same guided selections and slider ranges remain readable and fully usable in the fixed-width chat panel. The development-only guided-step preview was again removed afterward.

## Verified client-reviews link verification (2026-08-13)
- Mike Ford’s supplied Experience.com profile loaded as his verified Cornerstone First Mortgage client-reviews page. Public verification confirmed clearly labeled external links in the Your Guide profile section and the high-intent Option A contact card. No review text, ratings, or testimonials were reproduced on the website.

## Good Questions lender-focused heading verification (2026-08-13)
- Public verification confirmed the revised “Common first-time buyer lender questions.” heading displays cleanly at full scale with the existing readable Public Sans treatment.

## Dashboard long-list scroll verification (2026-08-13)
- Desktop verification confirmed the Roadmap leads table remains bounded while showing fewer than the 12 total leads, and the Mortgage chat intakes table remains independently bounded with its controls still accessible. Both table headers remain visible at the top of their own scroll regions.
- Mobile verification confirmed the two sections keep their compact height, preserve horizontal table access, and expose independently scrollable lead rows instead of stretching the dashboard indefinitely.

## Mortgage Intake Specialist next-question snap verification (2026-08-13)
- Mobile verification with a multi-message chat history confirmed the most recent property-type question and its quick-reply controls remain snapped into the active, visible area of the chat panel. The focused Single-Family quick reply is visibly ready for keyboard interaction; the temporary preview was removed afterward.
- Desktop verification confirmed the newest purchase-price slider question stays in the active chat viewport with its selected value and primary “Use” action immediately available. The slider is the guided focus target for this step; the temporary preview was removed afterward.

## Mortgage Intake Specialist question-first layout verification (2026-08-13)
- Mobile long-question verification confirmed the complete property-type prompt remains visible above its own dedicated quick-reply region and the answer field; guided controls no longer overlay or conceal the question.
- Desktop long-question verification confirmed the complete purchase-price prompt remains visible above the independent slider region and fixed answer field. The question-first layout adapts to the available viewport without clipping the prompt.

## Straight public photo treatment verification (2026-08-13)
- Desktop verification confirmed the top home photo is now a vertically straight rectangular card without the prior golden-arch crop or angled photo framing.
- Desktop and mobile verification confirmed the Your Guide portrait is a professional straight 4:3 rectangular crop with Mike’s face and upper body clearly visible. The supporting credential card is no longer tilted. The temporary isolated About preview was removed after this check.

## Mortgage chat intake co-brand attribution verification (2026-08-13)
- The protected dashboard shows the new Co-brand source column, partner-aware search placeholder, saved LO and agent selectors, visible-list count, and filtered-export guidance.
- A temporary development-only preview confirmed that a co-branded chat displays a Co-branded badge plus both "LO: Mike Ford" and "Agent: Kaandice McLean" in the new column. The preview was removed afterward.

## City-or-County Oregon property-search intake verification (2026-08-13)
- Mobile verification confirmed that a visitor who requests low/no-down-payment qualifying properties sees clear City and County quick replies in the guided response area.
- A follow-up preview confirmed that, after City selection, the next full prompt asks for the Oregon city to prepare a list to forward to the visitor’s email. Temporary development-only previews were removed afterward.

## Roadmap lead co-brand attribution verification (2026-08-13)
- The protected Roadmap leads section now shows partner-aware search, saved loan-officer and agent filter controls, a Co-brand source column, and filtered-export guidance.
- Legacy agent-link Roadmap leads were safely backfilled to Mike Ford where their saved agent matched his existing LO-agent partnership. The dashboard now displays both "LO: Mike Ford" and "Agent: Kaandice McLean" for those co-branded records; direct-site rows remain clearly labeled.

## Loan Officer Guide portrait headroom verification (2026-08-13)
- Desktop and mobile checks confirm the professional 4:3 portrait now aligns the enhanced Mike Ford headshot to the top, keeping his full head visible with comfortable blue-background clearance.
- The temporary isolated About-section preview was removed after verification.

## Search/filter feature (current session)
- Screenshot tool (auth'd as owner Mike Ford) confirmed: search input renders,
  All/New/Contacted/Booked filter chips render, table shows 2 test leads
  (FilterAlice=new, FilterBob=booked), summary badges show New:1, Booked:1.
- Sandbox browser session is NOT authenticated (shows sign-in gate) — expected
  behavior for unauthenticated visitors; interactive filter clicks cannot be
  exercised from the sandbox browser without owner login.
- Auth gating verified: unauthenticated visitors see "Private leads dashboard /
  Sign in to continue" — correct.
- Client-side filtering logic is pure (search by name/email substring,
  status equality) and covered by the rendering path; server access control
  covered by vitest (leads.list FORBIDDEN for non-admin).
- Test leads alice.filter@example.com / bob.filter@example.com must be deleted
  after verification.

## Key facts
- Live domains: lowdownhousenow.manus.space, mortgagead-qfxorc5x.manus.space
- Checkpoints: 5c6fb5ee (v1), db5e7f5d (rebrand), fdfd76cf (lead capture),
  ca743718 (leads dashboard), 7dbbeebf (notes), next = search/filter
- Tests: 14 passing before this feature (submit 4, list 2, updateStatus 3,
  updateNotes 4, auth.logout 1)

## Buydown calculator (current session)
- Desktop + mobile full-page screenshots: section renders between Programs and
  LeadMagnet, nav has "2-1 Buydown" link, chart shows 3 bars with $ labels.
- Browser interaction at 6.5% default: Year1 $2,166 / Year2 $2,427 / Note
  $2,702, savings $536/mo + $275/mo, subsidy $9,730 on $427,500 loan — matches
  hand math.
- BUG FOUND: typing "5.875" into rate input only registered "5" because
  browser_input overwrote and Number("5.") parsing rejected intermediate
  states... actually cause: controlled input with numeric state rejects
  intermediate strings like "5." → switch to string state + parse on change.
  With rate=5 the math is still correct (3%/4%/5% shown, $493/$254/$8,958).
- Preset chips 5.875% / 6.5% work as quick-select.
- 23 vitest tests passing (incl. 9 new buydown math tests).

## Scenario capture feature (current session)
- Goal: attach buydown calculator scenario (price, down, rate, savings) to
  Roadmap lead submissions; show in /leads dashboard + CSV.
- Key files: drizzle/schema.ts (leads table has firstName, email, source,
  status enum new/contacted/booked, notes, createdAt), server/routers.ts
  (leads.submit public; list/updateStatus/updateNotes admin-gated),
  server/db.ts helpers (insertLead, listLeads, updateLeadStatus,
  updateLeadNotes), client LeadMagnet.tsx (form), Buydown.tsx (calculator),
  Leads.tsx (dashboard).
- Checkpoints: 581abe49 (search/filter), 3525fc1d (buydown calculator).
- Published domains: mortgagead-qfxorc5x.manus.space, lowdownhousenow.manus.space.
- Implementation done: scenario column (text/JSON) migrated; shared/scenario.ts
  zod schema; ScenarioContext provider wraps Home; Buydown publishes scenario
  via useEffect + "Get these numbers in my Roadmap" button (setAttached +
  scroll to #roadmap); LeadMagnet shows attached chip w/ dismiss, submits
  source "roadmap+buydown" + scenario; Leads.tsx shows Scenario popover in
  action cell + 10 scenario columns in CSV. tsc clean. 25 vitest passing
  (6 submit tests incl. scenario JSON + range rejection).
- Browser: buydown section renders w/ new amber "Get these numbers in my
  Roadmap" button (el 22). Next: click it, check chip at form, submit test
  lead, verify DB scenario JSON, then delete test lead + checkpoint.
- Scenario feature verified end-to-end and checkpointed (0fbb4788). Site
  published: lowdownhousenow.manus.space + mortgagead-qfxorc5x.manus.space.
- 2026-07-12: Phone changed everywhere from (541) 729-2097 to (541) 729-0819
  (tel:+15417290819) per user request — Nav, About, FinalCta, Footer.
  Email remains mford@cfmtg.com. Mike Ford NMLS# 288455, company NMLS #173855.
- Phone-link hover animation added (.phone-link/.phone-icon in index.css:
  wiggle keyframes, sliding underline, color shift; reduced-motion safe).
  Checkpoint c05457e1.
- 2026-07-12: User-supplied Equal Housing Opportunity logo uploaded to
  /manus-storage/equal-housing-opportunity-logo_a0ad8f72.png (local copy at
  /home/ubuntu/webdev-static-assets/equal-housing-opportunity-logo.png).
  Placed AFTER the phrase "Equal Opportunity Lender" in Hero trust strip
  (h-5) and Footer copyright line (h-8). User rule: always use this logo
  after that phrase anywhere on the site.
- 2026-07-12: Cost of Waiting rent-vs-buy calculator added inside MythBuster
  (evergreen band). Files: shared/costOfWaiting.ts (math),
  client/src/components/landing/CostOfWaiting.tsx (UI),
  server/costOfWaiting.test.ts (11 tests). Inputs: wait years slider 1-5,
  rent input, price input, down %/$ toggle starting 0%, rate slider
  5.875-6.5 step .125, appreciation slider 0-3 step .5.
  Verified via page markdown at defaults ($1,800 rent, $400k, 0% down,
  6.5%, 2% appr, 3 yrs): P&I $2,528/mo, rent paid $64,800, equity $38,814,
  cost of waiting $103,614; chart shows per-year paired bars ($22k/$43k/$65k
  rent vs $12k/$25k/$39k equity). All 36 vitest tests pass. Disclaimer and
  "See my real options" CTA included. Still to verify: slider drag
  interactions + mobile layout screenshot before checkpoint.
- 2026-07-12 (follow-up): Slider interaction verified via keyboard events in
  live preview — wait-years slider moved 3→4 and stat cards recalculated
  ($86,400 rent / $52,735 equity / $139,135 cost of waiting at 4 yrs).
  Mobile 375px full-page screenshot verified: inputs stack above chart,
  no overflow. Feature complete.
- 2026-07-12: Cost-of-waiting SCENARIO CAPTURE in progress (checkpoint base
  763d04e6). Done so far:
  * shared/scenario.ts: added costOfWaitingScenarioSchema (waitYears,
    monthlyRent, purchasePrice, downPayment, interestRate, appreciationRate,
    monthlyPayment, totalRentPaid, equityGained, costOfWaiting) +
    leadScenarioSchema {buydown?, costOfWaiting?} combined payload.
  * ScenarioContext: added cowScenario/setCowScenario/cowAttached/
    setCowAttached alongside existing buydown fields.
  * server/routers.ts leads.submit: new optional `costOfWaiting` input;
    scenario column now stores JSON {buydown?, costOfWaiting?} (legacy rows
    may be bare buydown object); owner notification includes cowSummary.
  * CostOfWaiting.tsx: syncs cowScenario via useEffect; "See my real
    options" is now a button calling attachAndGoToForm (setCowAttached +
    scroll to #roadmap).
  * LeadMagnet.tsx: submits costOfWaiting, source tags roadmap+buydown+
    waiting as applicable, added Hourglass chip for cow scenario with
    dismiss button.
  REMAINING: Leads.tsx dashboard — parseScenario (lines ~55-77) must handle
  combined {buydown, costOfWaiting} + legacy bare-buydown shape; popover
  (lines ~82-120, titled "2-1 buydown scenario") needs cow section; CSV
  export (lines ~259-283) needs cow columns. Then vitest for cow scenario
  capture in leads.submit.test.ts, e2e browser test, todo.md checkmarks,
  checkpoint.
- 2026-07-12 (cont.): Leads.tsx generalized — parseScenario returns
  {buydown, costOfWaiting} (handles legacy bare buydown), popover shows both
  sections with divider, CSV adds 10 CoW columns (Wait Years, Monthly Rent,
  CoW Purchase Price, CoW Down Payment, CoW Interest Rate %, CoW
  Appreciation %, CoW Monthly Payment, Rent Paid If Waiting, Equity Missed,
  Cost Of Waiting). leads.submit.test.ts updated: buydown now stored as
  {buydown: ...}; added 3 new tests (cow-only, both combined, out-of-range
  cow rejected). ALL 39 TESTS PASS (7 files).
  E2E in progress: clicked "See my real options" → cow chip appeared on
  form ("waiting 3 years at $1,800/mo rent vs a $400,000 home · est. cost
  of waiting $103,614") with dismiss button; filled CowTest /
  cowtest@example.com; NEXT: click "Send me the Roadmap" (element 34),
  verify DB row scenario JSON has costOfWaiting key, delete test lead
  (email='cowtest@example.com'), tick todo.md items, checkpoint.
- 2026-07-12 RENT-INCREASE SLIDER (in progress): shared/costOfWaiting.ts DONE —
  added rentIncreaseRate?: number (0-10, default 0) to CostOfWaitingInputs;
  yearly rent now compounds: rentThisYear = monthlyRent * (1+r/100)^(year-1) * 12,
  accumulated per year. REMAINING:
  1. CostOfWaiting.tsx: add rentIncrease state (default ~3), slider 0-10 step 0.5
     after appreciation slider (same FieldLabel/Slider pattern, labels 0%/10%);
     pass rentIncreaseRate to computeCostOfWaiting + useMemo deps; add
     rentIncreaseRate to setCowScenario payload + effect deps; update disclaimer
     text (currently says "excludes ... rent increases").
  2. shared/scenario.ts: add rentIncreaseRate to cow scenario type/zod (0-10).
  3. server/routers.ts: cow zod schema add rentIncreaseRate (min 0 max 10);
     notification summary optionally mention rent growth.
  4. LeadMagnet.tsx chip: optionally mention rent increase (minor).
  5. Leads.tsx: CowScenario type + popover row ("Rent increase X%/yr") + CSV
     column "CoW Rent Increase %".
  6. server/costOfWaiting.test.ts: add compounding tests (0% = flat backward
     compat; 10% grows; cumulative sums). leads.submit.test.ts: cow payloads
     need rentIncreaseRate added if schema requires; keep optional for
     backward compat (legacy rows lack it).
  7. Browser verify, todo.md ticks, checkpoint.
  NOTE: default UI rentIncrease start value: use 3 (realistic), user asked
  slider 0-10. Disclaimer must drop "rent increases" from exclusion list.
- 2026-07-12 RENT-INCREASE STATUS: ALL DONE. 43/43 tests pass. Browser-verified:
  slider min 0 / max 10 / step 0.5 / default 3%, keyboard interaction works.
  At 10% growth: rent paid 3 yrs $71,496 (vs $64,800 flat), cost of waiting
  $110,310 — math updates live. Slider aria-label missing on thumb (Radix puts
  it on root); acceptable. Checkpoint next, then deliver.
- 2026-07-15 AGENT PROFILE FEATURE (in progress). Goal: admin-editable
  "Local Real Estate Agent" co-marketing section. DONE so far:
  * drizzle/schema.ts: agent_profile table (name, email, phone, bio text,
    website, companyName, headshotUrl, companyLogoUrl, visible int 0/1,
    updatedAt). Migration 0004_tense_night_thrasher.sql applied.
  * server/db.ts: getAgentProfile() (first row or undefined),
    saveAgentProfile(values) (single-row upsert).
  * server/routers.ts agent router: agent.get (public, returns row|null);
    agent.save (admin-only, agentProfileInputSchema — strings default "",
    email may be blank, visible boolean→int); agent.uploadImage (admin-only,
    {kind: headshot|logo, mimeType, dataBase64 ≤5.6M chars ≈4MB},
    PNG/JPEG/WebP/GIF only, storagePut key agent/{kind}-{ts}.{ext} → {url}).
  REMAINING:
  1. Leads.tsx dashboard: "Real Estate Agent" settings card — inputs for all
     fields, 2 file inputs (FileReader→base64→agent.uploadImage→URL into
     form state), visible switch, Save via agent.save, previews of images.
  2. client/src/components/landing/LocalAgent.tsx: public section, bold
     "Local Real Estate Agent" heading, only renders when visible && name.
     Register in Home.tsx below FinalCta, above Footer.
  3. Tests: server/agent.test.ts — save/uploadImage FORBIDDEN for non-admin,
     save happy path calls saveAgentProfile (mock ./db + ./storage like
     other tests), uploadImage rejects bad mime.
  4. E2E: screenshot dashboard panel (auth'd), save profile via SQL or UI,
     verify section on landing page, remove test data if needed, todo ticks,
     checkpoint.
  Design: landing sections in client/src/components/landing/, cream/evergreen/
  amber palette, Fraunces headings (font-display), kicker label + h2 pattern.

## Lead email PDFs (2026-08-12)
- Both user-provided PDFs were uploaded as web resources and verified with HTTP PDF responses: Roadmap Homebuyer Guide + Checklist and Your Road Home Map — Click GREEN GO.
- The lead email draft generator includes both named links, scenario summaries, and co-marketing agent details when the lead came through that agent's URL. Vitest assertions cover the generated content.
- Direct interactive verification from the sandbox browser is blocked by the expected owner sign-in gate; the authenticated preview screenshot confirmed the visible Email draft control in the dashboard.
