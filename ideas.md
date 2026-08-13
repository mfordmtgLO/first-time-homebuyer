# Design Brainstorm — First-Time Homebuyer Mortgage Landing Page

## Three Candidate Directions

### 1. "Blueprint & Brass"
A drafting-table aesthetic: architectural blueprint linework, warm brass accents, paper-cream backgrounds. Feels like your advisor is sketching your future home with you.
**Probability: 0.04**

### 2. "Golden Hour Porch"
Warm editorial realism — dusk-lit home photography, deep evergreen and honey-amber palette, serif-led type. Emotional, aspirational, trust-forward. Feels like the moment you get the keys at sunset.
**Probability: 0.08**

### 3. "Ledger Modern"
A crisp fintech look: navy/white, mono-numerals, data-tables, sharp edges. Feels institutional and precise.
**Probability: 0.03**

---

## CHOSEN: "Golden Hour Porch" — full commitment

**Design Movement**: Warm Editorial Realism — a blend of upscale real-estate editorial (Kinfolk / Dwell magazine layouts) with conversion-focused direct-response structure. Photography-first, serif-anchored, generous whitespace.

**Core Principles**
1. *Warmth over sterility* — home buying is emotional; every surface should feel inviting, never clinical fintech.
2. *Guide, not salesman* — copy and layout position the advisor as a calm expert; no aggressive urgency banners.
3. *Asymmetric editorial layouts* — offset columns, overlapping photo cards, large pull-quotes; avoid center-stacked hero clichés.
4. *One clear path* — every section funnels to two CTAs only: "Get the Roadmap" (soft) and "Book a 15-min Call" (hard).

**Color Philosophy**
Deep evergreen (`#173B2D` / oklch ~0.32 0.06 160) as the anchor — evokes stability, established wealth, front-lawn green. Honey-amber (`#D99A2B` / oklch ~0.72 0.14 75) as the signature accent — golden-hour light, keys, optimism. Warm cream (`#FAF6EF`) backgrounds instead of stark white — paper, warmth, home. Ink text is warm charcoal, never pure black.

**Layout Paradigm**
Asymmetric split hero (60/40 text-photo with overlapping stat card). Sections alternate cream / evergreen bands. Editorial offset grids: images bleed off-edge, text columns sit off-center with generous left margins. A sticky top nav that turns opaque cream on scroll.

**Signature Elements**
1. *Key-tag motif* — small rounded-rectangle tags (like a house-key tag) used for eyebrows/labels throughout.
2. *Hand-drawn underline accent* — an amber brush/marker underline SVG under key phrases.
3. *Serif pull-numbers* — oversized serif numerals (0%, 3.5%, 15-min) as visual anchors in stats and program cards.

**Interaction Philosophy**
Calm confidence: subtle scroll-reveal fades (translate-y 16px, 500ms ease-out), gentle photo parallax feel via hover scale on cards, buttons with soft lift on hover and scale(0.97) on press. Nothing bouncy or gimmicky.

**Animation**
- Scroll-in reveals with 40–70ms stagger for card grids.
- Hero elements cascade in on load (headline → subhead → CTA → photo).
- Accordion (FAQ) 200ms ease-out.
- All gated behind prefers-reduced-motion.

**Typography System**
- Display: "Fraunces" (Google Fonts) — warm, characterful serif with optical sizing; used for headlines and pull-numbers.
- Body/UI: "Public Sans" — sturdy, trustworthy, highly readable; weights 400/500/600.
- Hierarchy: Fraunces 600 for H1/H2 (tight leading), key-tag eyebrow labels in Public Sans 600 uppercase 12px tracked, body 17px/1.7.

**Brand Essence**
"Hearthstone Home Lending — the calm guide that gets first-time buyers from renting to keys, often with $0 down." For anxious first-time buyers who think homeownership is years away. Adjectives: *warm, straight-talking, steady*.

**Brand Voice**
Myth-busting, second-person, zero jargon. Headlines state the surprising truth; CTAs are low-pressure invitations.
- Example headline: "You don't need 20% down. You need the right plan."
- Example CTA: "See what your numbers look like — 15 minutes, zero pressure."
Banned: "Welcome to our website", "Get started today", "Unlock your dreams".

**Wordmark & Logo**
"Hearthstone" set in Fraunces 600 with an amber keyhole-arch mark (a rounded arch/door shape with a keyhole cutout) — no generic house icon. Mark used as favicon and header glyph.

**Signature Brand Color**
Honey-amber `#D99A2B` — the golden-hour key color. Used ONLY for CTAs, underline accents, and the logo mark so it stays ownable.

## Page Structure (single landing page)
1. Sticky nav — logo, anchor links (Programs, How it works, About, FAQ), phone, CTA button.
2. Hero — myth-busting headline, subhead, dual CTA, hero photo w/ overlapping "0% down" stat card, trust strip (NMLS, Equal Housing, ratings-free).
3. Myth-buster band (evergreen) — "The 20% myth" with real math comparison (rent vs own cost of waiting).
4. Loan programs — 4 editorial cards: USDA 0%, VA 0%, Conventional 0%, FHA 3.5%, each with serif pull-number.
5. Lead magnet section — Roadmap download form (name + email), mock PDF cover image.
6. How it works — 3-step path (Call → Pre-approval → Keys) with connecting line.
7. About the advisor — photo, bio, credentials (NMLS), advisor-not-salesman positioning.
8. FAQ accordion — credit score, paperwork, pre-approval fears (from email 3 content).
9. Final CTA band — book a call (Calendly placeholder) or start application.
10. Footer — compliance: NMLS ID, Equal Housing Lender notice, disclaimers.

**Compliance note**: include NMLS # placeholder, Equal Housing Lender language + icon, and "not a commitment to lend" disclaimer in footer. NO fabricated testimonials/reviews anywhere.

## Style Decisions
- The hero must avoid centered or standard split-template composition; use an asymmetric editorial layout with one dominant warm home photograph, one overlapping stat/paper element, and visible golden-hour emotional atmosphere.
- The Hearthstone brand mark must be a recognizable amber keyhole-arch paired with a Fraunces wordmark; the mark language recurs subtly as a signature motif (section labels, dividers), not only as a small header icon.
- Human trust sections must never show placeholders; use a named advisor persona ("Sarah Whitfield"), credible lending credentials, and warm editorial portraiture. (User must still replace persona details with their real identity before launch — noted in delivery.)
- Honey-amber stays disciplined: only CTAs, underlines, logo mark, and high-value numerals. Never a general card fill.
- Reduce uniform bordered card grids mid-page; use editorial pacing — oversized pull-numbers, irregular columns, hairline rules instead of boxes.
