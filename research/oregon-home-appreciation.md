# Oregon Home Price Appreciation Research (for appreciation slider tooltip)

Researched 2026-07-12. Primary source: FHFA All-Transactions House Price Index
for Oregon (ORSTHPI), retrieved via FRED (Federal Reserve Bank of St. Louis).
Computed directly from the raw quarterly CSV, Q1 2000 → Q1 2026.

## Key computed figures (FHFA ORSTHPI, Q1-to-Q1)

| Metric | Value |
|---|---|
| HPI Q1 2000 | 247.69 |
| HPI Q1 2026 | 848.51 |
| Total growth since 2000 | +242.6% over 26.0 years |
| **Compound average (CAGR) since 2000** | **≈ 4.9% per year** |
| Boom years | 2005–2007 (+13%, +20%, +10%), 2021–2022 (+9%, +20%) |
| Bust years (housing crash) | 2009–2012 (−6.9%, −10.5%, −7.0%, −2.8%) |
| Recent cooling | 2023–2026 roughly +1.7% to +2.7%/yr |

## Fair tooltip claim
"Since 2000, Oregon home prices have appreciated about 4.9% per year on average
(FHFA House Price Index) — a 26-year stretch that includes the 2005–2007 and
2021–2022 booms (up to +20%/yr) and the 2009–2012 housing bust (down as much as
−10%/yr). Recent years have cooled to roughly 2–3%. The calculator's 0–3% range
is deliberately conservative — long-run history has run higher."

## Sources
- https://fred.stlouisfed.org/series/ORSTHPI (FHFA All-Transactions HPI for Oregon, quarterly, Q1 1975–Q1 2026)
- https://www.fhfa.gov/data/hpi (FHFA House Price Index methodology)
- Raw data: https://fred.stlouisfed.org/graph/fredgraph.csv?id=ORSTHPI (computed CAGR and YoY series locally)
