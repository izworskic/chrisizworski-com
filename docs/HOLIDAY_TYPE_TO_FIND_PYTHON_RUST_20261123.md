# Holiday travel: typed input, evidence and independent QA (November 23, 2026)

## Visitor job and evidence

At `/holiday-travel/`, a traveler should be able to type **"Detroit"**, **"DTW"**, **"Atlanta"**, a connection airport, travel day or departure time and select the correct existing answer without scanning ten dropdowns. The route's BTS history, arrival deadline, share URL and date/holiday-year logic remain owned by the existing JavaScript flight engine. The busiest-airport NWS board remains separate and unchanged. No data or computation comes from visitor text until the visitor **chooses a known option**.

Source inventory: `public/holiday-travel/data/national.json` is the existing BTS history (240 airports, 2,966,592 holiday-window flights and six available seasons; no 2020/2021); `lib/holiday-travel/busiest-airports.mjs` is the checked-in 30-airport derived roster. There are no new weather feeds, APIs, paid services or flight-delay probabilities.

## Experience Investment review

**Option A, selected: progressive local type-to-find controls.** The original source selects remain in HTML, including their values and all the route/time options populated by the existing planner. A separate lightweight script creates keyboard-accessible typed comboboxes, matches airport code and city text locally, and sends a normal select change event only on a valid choice. It exposes no new inference or network dependency. While JS is disabled or the enhancement fails, the original selects remain visible.

**Option B, rejected: a free-form AI travel-chat interface.** It would require disambiguation and inference about dates, airports and connections, increase mobile bytes and operational cost, and risk accepting a destination the BTS source cannot evaluate. The current 240-airport controlled vocabulary does not justify a language model, embeddings, Transformers.js or a hosted Hugging Face endpoint.

**Distinctiveness:** this is a typed route stress tester, not a destination-card search page or a map pin explorer. The actual decision, "Can I arrive before my deadline?", remains visible before deeper weather and source material. Compact search fields keep the existing page composition and ads rather than introducing a cloned hero or giant search overlay.

## HF skills applied and model decision

The repository's existing `huggingface-best` and `transformers-js` skills demand benchmarking against deterministic matching before selecting a model. `hf-semantic-discovery` is deliberately scoped to Adventure Finder, not transplanted into the holiday planner. Decision: **no Hugging Face model in production**. The skill informs evaluation and fallback requirements; it does not supply an airport dataset or take a network dependency.

## Language fit and QA

| Technology | Decision | Reason |
| --- | --- | --- |
| HTML and scoped CSS | Keep and extend | Search-indexed BTS comparison, semantic labels, no-JS native select fallback and responsive layout |
| Browser JavaScript | Keep and extend | Small local type-to-find UI, form state, keyboard operation and normal existing change events |
| Python | Add offline QA | Standard-library BTS airport uniqueness, code/coordinates, top-30 count/roster and HTML/source contract checks |
| Rust | Add offline independent QA | Pinned compiler checks an independent matching implementation against all 240 current airport labels and selected queries; no WASM sent to users |
| Java, hosted ML and new API | Reject | No demonstrated need; extra infrastructure and response-time/cost risks |

Risk and fallback: input must **never** silently choose the first airport for an unknown string; Escape and blur restore the valid underlying selection. A→B→A must preserve route state. Search suggestions cap at nine, with proper focus/keyboard options, and must not trigger a remote query. Any future ML experiment would need explicit mobile download/performance and correctness evidence and a separate reviewed PR.

## Reproduce and release gates

```sh
node --test tests/holiday-choices.test.js
python3 scripts/holiday-travel/audit-search-inputs.py
rustc +1.90.0 --edition=2021 --test scripts/holiday-travel/holiday-choice-oracle.rs -o /tmp/holiday-choice-tests
/tmp/holiday-choice-tests
rustc +1.90.0 --edition=2021 -O scripts/holiday-travel/holiday-choice-oracle.rs -o /tmp/holiday-choice-rust
node scripts/holiday-travel/compare-choice-ranking.cjs /tmp/holiday-choice-rust
npm run verify:all
node scripts/holiday-travel/verify-airport-weather-browser.cjs
```

Browser QA fixtures must inspect 360px and 1440px, NWS unavailable/partial response, airport type/keyboard selection, unknown-airport rejection, share-link restoration, overflow, and native no-JS fallback. Rust and Playwright run **only** in the existing path-scoped GitHub Actions workflow. Report actual run outcomes separately: code written is not proof of production deployment or SEO lift.

Protected: single canonical `/holiday-travel/`, unchanged Person JSON-LD, ad controls and scripts, BTS six-season figures/tests, official NWS weather parser, per-airport source uncertainties, zero new Vercel functions or Redis.

**Status at authoring:** implementation submitted to a PR; CI, browser and production status pending evidence. No auto-merge.
