# Seaway Python Intelligence OS v1.0 — seasonal passage fieldbook

**November 5, 2026.** Owner: `izworskic/chrisizworski-com`; existing canonical: `/st-lawrence-seaway/`. Adds value to the existing journey hub without spawning competing SEO pages.

## Visitor decision

"When is the Seaway historically busier, and does that mean it is a good day to drive to a public lock?" The old experience displayed one year's monthly BTS vessel-transit bars at a time. Visitors could not readily see month-to-month variability across years, or distinguish shipping traffic from verified visitor hours. The new narrow interaction compares archived months and points toward independently verified access and official order-of-turn information.

## OS architectural comparison and score

| Approach | Benefit | Cost/risk | Decision |
|---|---|---|---|
| A. Client-only JS median of existing history | No new artifact | Repeated calculation/browser JSON, weaker independent data-quality regression; duplicates and missing values could change visitor text unnoticed | Not chosen |
| B. **Offline Python validator → checked-in JSON → generated HTML/JS** | Deterministic, source-validated historic comparison; static SEO text and no-JS table; fits established generator; no production API cost | One small audited artifact and Python CI tests | **Chosen** |
| C. Per-visitor Python endpoint and current AIS joins | Unnecessary runtime complexity; tempts misinterpretation as live ship schedule | Cost, data license and false-precision risk | Rejected |

Five-axis Python OS score (0–5, weighted): visitor decision **4/5 ×30=24**; evidence reliability **5/5 ×25=25**; distinctive seasonal passage experience **4/5 ×15=12**; maintenance and cost **5/5 ×15=15**; search opportunity **3/5 ×15=9**; **total 85/100**. This only clears the implementation-evaluation threshold; it is not a forecast of ranking or model accuracy.

## Data contract and source register

- Source: [Bureau of Transportation Statistics monthly Great Lakes St. Lawrence Seaway Performance](https://data.bts.gov/Research-and-Statistics/Great-Lakes-St-Lawrence-Seaway-Performance/swpm-impx); [DOT data catalog](https://catalog.data.gov/dataset/great-lakes-st-lawrence-seaway-performance), U.S. Government public-domain data.
- Existing historical snapshot: `data/seaway/history.json`, retrieved 2026-10-23, full 2022–2024 archive (36 calendar slots).
- Metric: **monthly commercial vessel transits** in the BTS published system-level series, not an individual lock's arrivals, confirmed ship identity, number of vessels seen by tourists, or a prediction.
- January–March in the saved snapshot have source notes about closure but **no numeric transit counts**. Those months emit `unreported` and null, never zero or a claim about current-year opening dates.
- April–December have three reported year-values per calendar month. The fieldbook computes the exact median plus observed minimum and maximum. No smoothing, confidence interval, probabilities, extrapolated zeros or fabricated 2026/27 data.
- Schema: `seaway-seasonal-fieldbook-v1`, JSON in `public/assets/seaway-seasonal-fieldbook.json`, embedded into static HTML at generation time. Fields: `months[].{month,name,state,sampleCount,sampleYears,minimum,median,maximum,reportedValues,sourceClosedNoteYears}`; `years`, `snapshotRetrievedAt`, `source`, `sourceMetadata`, `sourceLicense`, `method`, `limitations`.
- Provenance is **historical, snapshot-dated**. The fieldbook must not advertise its values as current season or a complete fresh history. No new source retrieval job; ongoing source rights and current AIS commercial-use rights are separate questions.

## Gate tests and integrity

Python script: `python3 scripts/build_seaway_seasonal_fieldbook.py --check` and `python3 -m unittest discover -s tests -p 'test_seaway_fieldbook.py' -v`. The existing `node --test tests/seaway.test.js` also verifies embedded JSON, source link, 12 months and static fallback.

Reject duplicates, absent year-month slots, invalid timestamps, negative/NaN/non-integral transit values, conflicting years or unexpected source paths. Descriptive median requires at least 3 valid annual observations, otherwise status `partial` or `unreported` and aggregate values null.

Mobile uses a manually scrollable month ribbon; all interaction is via native buttons. Select a month in the browser; the page presents that month’s historical median and observed span. Readout uses `role=status`; a complete HTML comparison table remains available without JS. Visitor-center hours and current official notices remain separate link-outs.

## Release and measurement

The original ship map, five river chapters, lock model, cameras, 2024 chart, canonicals, Person markup, ads, URLs and API are untouched by this addition. No Redis, Supabase, new runtime service, or scheduled Python job. The new artifact is versioned, deterministic and generated offline; Vercel build does not invoke Python.

Acceptance: Python unit tests; artifact parity; JS Seaway tests; full 59-step repository gate; Vercel preview; final mobile/desktop and public production verification; citation metadata. Rollback: revert the fieldbook enhancer, styles, JS selector and artifact together; pre-existing year chart stays functional. Do not claim SEO effect until comparable GSC 28-day windows and real GA4 seasonal interactions are available.

**Research caution:** Compare the *published system-wide BTS metric* only. Large monthly totals can coincide with seasonal weather and shorter visitor-center hours; traffic totals do not establish a visible ship, planned transit, lock open/closed status, or a safe visit.
