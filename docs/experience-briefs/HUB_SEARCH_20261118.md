# Experience brief — Hub search for the tool directories

- Date / owner: 2026-11-18 · Chris Izworski (requested: "search bar isn't working… logic on all tool pages is poor… use Rust, HTML, JavaScript and Python")
- Owning repository / URLs: `izworskic/chrisizworski-com` · `/national-tools/` (served from `public/synced-national-tools/`), `/tools/`, `/michigan-gardening/`
- Scope: the text search box on the three directory hubs. Non-goals: item search inside individual tools (beaches, buoys, boat launches, waterfalls), the hub repo's stale `national-tools` copy, analytics of typed text.
- Research last checked: 2026-11-18
- State matrix: N/A — one input, no map/photo/time selection; the stable ID is the card's `data-tool-id` (or `href` on gardening).

## Baseline (measured on production, 390 px, 2026-11-18)

- Three separate implementations, all exact substring matching on the whole query; `/tools/` ran two of them on every keystroke (`index.html` inline finder and `decision-network.js`).
- `christmas` did filter to White Christmas Odds, but the result rendered ~620 px below the input, under six persona buttons. On a phone the screen did not visibly change, so the search looked broken.
- `xmas`, `december snow`, `chrismas`, `snowmachine` returned nothing; no ranking, no plural handling, no recovery on zero results.

## 1. Visitor question and decisive action

"Which of these tools answers my question?" The first useful answer is the best-matching tool, visible directly under the box while typing, with one tap to open it.

## 2. Inputs and data contracts

| Input | Source | Behavior when unavailable |
| --- | --- | --- |
| Card text (title, tags, place, kind, description, months) | The HTML already on the page, read at search time so build-injected cards are included | Card is skipped if it has no readable text |
| Synonyms and season words | `data/hub-search/lexicon.json`, compiled by `scripts/build-hub-search.py` | Search still works on literal words |
| Ranking core | Rust → WASM (`rust/hub-search`), verified per query against the JS oracle | WASM blocked, missing, or drifting → JavaScript oracle answers (tested) |

## 3. Inspiration research

| Reference (checked 2026-11-18) | What the user can do | Lesson used here | Not copied |
| --- | --- | --- | --- |
| Scottish Government Design System, search filters — https://designsystem.gov.scot/patterns/search-results/search-filters | Results update live on desktop; on mobile, auto-update is discouraged because users "may not notice that the search results have updated"; result heading is `aria-live="polite"` | Exactly our failure mode: put the answer where the phone user is looking, announce the count politely | Their apply-button flow (a text box with instant results is clearer here) |
| GOV.UK, "Making it quicker and easier to search on GOV.UK" (Dec 2024) — https://insidegovuk.blog.gov.uk/2024/12/12/making-it-quicker-and-easier-to-search-on-gov-uk/ | Up to 5 suggestions, matching words bolded, content shifts down instead of overlaying (better for screen readers); suggestions used in 55% of searches where shown | Top 5 matches, highlighted words, in-flow panel (no overlay) | Their AI-trained query suggestions and data collection |
| Counterexample: zero-result pages (Algolia/Shopify site-search guidance, 2026) | Dead ends on typos, plurals, synonyms | Typo tolerance, light stemming, synonym groups, explicit "closest matches" and a clear recovery tip | Vendor engines and tracking |

Experience OS anti-patterns avoided: A09 (interaction must visibly change the answer), A11 (keyboard equivalents), A16 (no framework migration), A24 (real browser interaction tests), A25 (don't move the answer away from the user).

## 4. Two concepts

- **A. In-flow match panel (selected).** Best 5 matches appear directly under the box; the full grid below is filtered and re-ranked; status line announces the count. Works within the existing page composition on all three hubs.
- **B. Scroll-to-results.** Keep the grid filter only and scroll the page to the first match on each keystroke. Rejected: scrolling while the phone keyboard is open is disorienting, fights the user's own scroll and fails A25.

Originality review: this is a shared control for three directory pages, not a new tool; each page keeps its own layout, filters and voice. Shared: ranking contract, accessibility, recovery copy. **Gate: PASS (shared control, no page scaffold changed).**

## 5. Interaction contract

| Action | Change | State | Fallback | Test |
| --- | --- | --- | --- | --- |
| Type | Panel shows count + top 5 (highlighted); grid filtered and ranked | `?q=` via `replaceState` | No JS: page unchanged (search box inert as before) | Playwright 36 scenarios |
| Typo / synonym / month | Close spelling named; synonyms and month names match | — | Literal match only if lexicon missing | Golden queries |
| No full match | "Nothing matches every word… Closest:" partial list | — | — | `duck hunting` |
| No match | Message, example tip, Clear search | — | — | `xyzzy` |
| Page filter hides matches | "N more hidden by a filter — show them" resets filter | Filter state | — | national garden filter + `rocket` |
| Enter / ↓ | Focus first match; ↑/↓ between matches; Esc back / clears | — | — | keyboard test |

## 6. Responsive and accessibility

- 390 px: panel 10 px under the input (inside the stacked search row on `/national-tools/`), visible above the fold with the input centered. 360 px: no horizontal overflow.
- Desktop: panel spans under input and the "In season now" control.
- `role="status"` polite count; 44 px targets; visible focus; reduced motion respected for "See all".

## Evidence and release stages

- Implemented: this PR. Rust 10 unit tests; Rust/JS parity on 1,512 queries × all real cards; 50 golden queries; 60 node tests; Playwright 36/36 at 390/360/1440; WASM-blocked fallback.
- Not measured: actual visitor outcome. No typed text is collected; a privacy-safe zero-result counter is a possible follow-up.
