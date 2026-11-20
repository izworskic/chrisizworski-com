# Experience Investment: Great Lakes Winter Layup Archive recovery

**Mode:** IMPLEMENT, 2026-11-20. **Canonical:** https://chrisizworski.com/great-lakes-freighter-winter-layup/. **Owner:** izworskic/chrisizworski-com. **Baseline:** current main with Foundry 0.3 night-harbor hero, season dial, map-first atlas, Python-generated historical ledger, source-led 2026-27 desk and six biographies. No browser screenshots were captured in this connector-only recovery pass; browser QA must verify the release.

## Visitor job and evidence
A ship watcher selects an actual shipping winter, explores documented ports and vessels, and can tell what a source verified versus what a community report recorded, then follows the original record. In the existing modern page the 2025-26 archive only included 12 records and the previous winter only two; the incomplete archive made some real ships impossible to find. Old PR #1161 supplied 27 and 14 dated, credited entries, but had an incompatible page structure and stale state logic. Current-season AIS signals can never be converted to layup evidence.

## Competing, genuinely different concepts
**A. Harbor and winter evidence explorer, selected.** First 390px screen is the existing seasonal answer and map path, with the dated archive one action away. Choose a winter or harbor, then use *Verified historical records* vs *Reported historical records* within the source-linked historical ledger. A source provenance label remains visible and the full static archive survives disabled JavaScript. On desktop the existing atlas and harbor notebook stay synchronized; only the historical ledger gets confidence filtering. Unknown current layups do not acquire historical pins. Medium effort, low new dependency risk.

**B. Vessel-biography-first scrapbook, rejected.** Enter through large ship portraits and long chronological stories with a harbor map several sections down. It may appeal to maritime history readers, but it hides the first answer to "where did this ship lay up" and could reverse recent map-first Experience/Foundry gains. More photo/network cost, weak starting point for harbor-first visitors. Historic photography is supporting evidence, never a present-location claim.

Compared with Great Lakes Freighter Tracking (AIS position now) and the Winter Harbor Field Guide (where/how to view), this archive answers **what original dated records establish for a selected winter**. The Saginaw Bay ShoreFeel tool compares geographic temperature sensors; this is a time- and identity-grounded ledger, not a cloned map/dashboard.

## Recovery and experience changes
- Preserve current primary page, CSS, map and live season policy. Recover 15 additional historical 2025-26 and 12 additional 2024-25 reported records from #1161, original links, identity aliases, dated events and image rights metadata. Keep the 12/2 existing records as the primary newer source.
- Year-specific historical totals now 27 / 14, with 10/17 and 2/12 verified/reported respectively. These are **catalog coverage**, not fleet occupancy totals. All 41 are crawlable in Python-built HTML, including original evidence links.
- Add a visible jump from the atlas to the ledger and an independent historical evidence-quality control; it changes only the historical rows, not map pins or the independent live scanner. Default = all, visible counts update, A to B to A restores records, source links are retained.
- No icon or vessel artwork is used as evidence of physical presence. No live layup is projected from the previous winter. All 2026-27 berths must come from the separate dated source ledger.

## Technology Fit Review
| Technology | Decision | Reason |
| --- | --- | --- |
| Semantic HTML and scoped CSS | Keep | Crawlable static roster/ledger, direct source links, no-JS archive, compact responsive evidence control. |
| Browser JavaScript | Keep | Narrow, reversible confidence/season/harbor interactions and map-to-selection. |
| Existing Node APIs | Keep unchanged | Source-led current-season scanner and validated historical registry; no new service needed. |
| Python | Keep build-time only | Current `history.py` deterministically compiles source-checked historical HTML/JSON and supports `--check`. |
| Rust/WASM | Reject now | No measured sorting, rendering or numeric bottleneck. Existing itinerary Rust is unrelated. |
| Java | Reject now | Adds a runtime and cost for simple display/filter behavior without demonstrated visitor value. |

## Truth, integrity, release gates
Keep original Commons URLs, creators, image dates and licenses, and separate historical photos from proof of layup. Old community/Boatnerd roster items remain **reported**, never promoted to verified. Harbor pins are approximate public geographic references, not precise berths, docks or parking. Keep `https://chrisizworski.com/#person`, canonical, sitemap, AdSense Auto ads, reduced-motion and mobile map fallbacks. No Redis or new Vercel functions.

**Code-level evidence:** updated registry, Python-compatible historical JSON/HTML, static roster, evidence filter and source model/browser regressions. **Browser measurements:** NOT CAPTURED here; CI browser must test 360/390/768/1024/1320px, actual images/map tiles and simulated failure. **Full repository gate:** PENDING. **Preview READY/public after merge:** NOT YET VERIFIED. **GSC/GA4/AdSense benefit:** NOT MEASURED.

**Release rule:** no merge until exact-head full `npm run verify:all`, `python3 scripts/freighter-layup/history.py --check`, focused browser acceptance, preview and source/SEO/ad integrity checks are green.

**One next action:** inspect PR #1800 CI/browser reports, correct regressions and merge only when verified.
