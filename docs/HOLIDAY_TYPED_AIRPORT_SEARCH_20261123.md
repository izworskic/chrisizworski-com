# Holiday airport search: HF skills, Python, Rust and typed navigation
Date: 2026-11-23. Owner: `izworskic/chrisizworski-com`. Scope: `/holiday-travel/` and a read-only sitewide dropdown inventory.

## Visitor problem and design choice

The holiday planner had ten native dropdowns. Two airport lists contained the full historical BTS airport catalog, forcing people to scroll for the origin and destination they already knew. The interaction now uses **type a city or three-letter airport code, see source-backed choices, select an airport**. It does not guess a route from an unselected string. It keeps the original select IDs and planner handlers behind the interface so route-history, share links, flight comparisons, and the 30-airport NWS board retain their behavior.

The planner still uses native controls for holiday year, connection, departure/deadline day and time, and EIA price region. These are finite constrained choices where text search would be less comprehensible. The sitewide script `scripts/audit-selection-surfaces.py` ranks future candidates rather than blindly removing all select elements.

**Two designs considered:**
- A. Existing BTS JSON + dependency-free browser typeahead with distinct city/code labels and a real selection gate. Selected: tiny initial cost, exact known catalog, no location API, airport-specific IATA disambiguation, and keyboard/touch fallbacks.
- B. Hugging Face embedding model in the visitor browser, optionally `all-MiniLM-L6-v2`, or hosted inference. Rejected for this first airport task: embeddings cannot establish canonical airport identity, city collisions need deterministic codes, and weights plus warmup would burden mobile users. Relevant existing HF skills: `hf-semantic-discovery`, `huggingface-best`, and `transformers-js`. This is a reviewed **no-model** decision, not a claim that any model benchmark was run.

## Technology fit

| Layer | Purpose | Decision |
| --- | --- | --- |
| HTML/CSS | Semantic label, keyboard combobox/listbox, native fallback, 360px layout | Use existing page markup; no framework |
| JavaScript | Normalize city/code text, rank seven suggestions, commit only explicit IATA choice, reuse the existing onchange event | Small UMD helper loaded before the existing inline planner; zero new runtime dependencies |
| Python 3 stdlib | Independently audit historical BTS IATA uniqueness, cities, valid lat/lon, flight counts and exact top-30 provenance | Development/CI only: `scripts/holiday-travel/verify_airport_catalog.py` |
| Rust stdlib | Independently validate Python's exact TSV stream, sorted uppercase IATA codes, count totals and ambiguous cities without overflow | Compile and execute in GitHub CI, not in the deployed browser |
| Rust/WASM | Replace the 200-ish-airport filter or historical risk engine | **Not justified** without a measured calculation bottleneck or parity advantage |
| Java | Same scoped computation | Not justified |
| Hosted Hugging Face | Model inference or vector database | Not justified, no new endpoint, tokens, keys or visitor query upload |

## Acceptance and truth contracts

- The source remains checked-in `public/holiday-travel/data/national.json`, originally built from BTS flight records; recorded flight counts do **not** imply current service or airline availability.
- `DTW` resolves its unique airport. Duplicate city labels such as New York/Chicago return distinct codes, never an arbitrary committed airport. Enter without a highlighted item cannot choose an ambiguous city. Unknown strings do not override the previous plan.
- Arrow Up/Down, Enter, Escape, pointer/touch and blur restore have tests. The current airport is displayed even if the user types an unmatched value. The original select remains visible if the enhancement script fails to load.
- Existing query-string state, route-history and optional NWS hazards remain owned by the current planner. No BTS counts, warnings, probabilities, visual hero, canonical, Person ID, ads or sitemap changed.
- No user location is obtained or uploaded; the only catalog transfer is the site's existing public BTS JSON. No additional Vercel function, React, HF model, Redis, Rust WASM asset or production Python process.
- `node --test tests/holiday-airport-search.test.js` is covered by the full repository `npm test`; exact-head `npm run verify:all` and the existing 360px/1440px Chromium NWS-outage workflow are the release gates.
- Independent checks: `python3 scripts/holiday-travel/verify_airport_catalog.py`, then `rustc --edition=2021 -O scripts/holiday-travel/verify_airport_catalog.rs -o /tmp/holiday-airport-rust-check` and `python3 scripts/holiday-travel/verify_airport_catalog.py --tsv | /tmp/holiday-airport-rust-check`.
- Sitewide inventory: `python3 scripts/audit-selection-surfaces.py --top 20`. It reports candidates only; it is **not** a WCAG, quality or SEO score.
- Real browser checks, build artifact audit, production deployment and visitor CTR outcomes are **not verified until the relevant CI/deployment evidence is recorded**.

## Failure and rollback

On a missing search module, the original native airport selects stay in place. On unknown input, typed state reverts without changing the underlying selected IATA code. A missing BTS catalog retains the existing planner's data-unavailable path. Rollback is removal of the enhancement markup, the search script tag and `fillAirports()` call, leaving the original select-based state engine intact.

## Next high-value work

Measure phone task-completion, no-match rate and correct-airport selection in an authorized privacy-respecting way. Use the sitewide inventory to identify other **large, open-ended selection vocabularies**. Keep finite date/time/status controls native unless usability evidence demonstrates a better interaction. Evaluate HF model inference offline against a real question set before any browser model pilot. Do not label expected CTR or Adsense gain as measured.
