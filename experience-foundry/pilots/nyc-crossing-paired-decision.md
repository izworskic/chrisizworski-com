# NYC Crossing — Foundry 0.3 paired-decision improvement

**Canonical owner:** `nyc-crossing` · `izworskic/chrisizworski-com`  
**Existing public URL:** https://chrisizworski.com/nyc-crossing/  
**Research:** November 10, 2026 · **Baseline:** `f4870ae198dadefa70c9edb8456b1bf7a4217ddc`  
**Selected output:** source-preserving improvement to existing page, not a generated Foundry preview or second canonical

## Visitor decision

A driver with a destination, vehicle, payment type and approximate departure needs to compare **two actual crossings**, understand the *modeled road-charge difference* and distinguish a verified crossing/approach reading from a full-route travel time. The original page offered the right data but put the static reference and full explanations first, then an eleven-row ledger below a separate historical timing panel. It made a two-crossing decision a mental comparison.

### Reusable factual baseline

The engine already returns all eleven crossings with total road charge (crossing toll + applicable zone charge − qualifying credit), vehicle eligibility and explicit source/scope of live traffic. The 511NY cache may lack verified incidents even when its highway-sign feed updates; no incident claim may be interpreted as an all-clear. The static car toll reference is crawlable HTML and remains available without JavaScript.

### Research, inspected November 10, 2026

- [NYC DOT traffic feeds](https://www.nyc.gov/html/dot/html/about/datafeeds.shtml) describe speed measurements on individual links; they are *not* standardized door-to-door travel times. No duration winner is created from unlike segments.
- [Official 511NY map](https://511ny.org/map) presents separate incidents, closures, traffic cameras, speeds and crossing layers. The link is for human verification; the page cannot infer an absence of incidents from an unavailable cache.
- [NJ511 travel information](https://www.nj.gov/transportation/commuter/511/web.shtm) separates bridge/tunnel travel-time and incident list views from geographic exploration. The mechanism informed separation of a focused decision from the comprehensive list. We did not copy its UI or data.
- [NYC311 congestion pricing](https://portal.311.nyc.gov/article/?kanumber=KA-03612) distinguishes entering the zone from merely using excluded roadways. The existing engine's selected-zone assumption remains explicit, not an automatic route inference.

These are currently accessible source and design references; they do not establish access permissions, exact conditions or commercial redistribution rights.

## Three opportunities considered

1. **Two-crossing decision with source-qualified tradeoff (chosen).** Direct, reversible comparison of already returned road charges, eligibility, measured scope and verified current incidents. Low external dependency; risk is erroneous comparison of non-identical travel segments.
2. **Fix and deepen roadway incident completeness.** Strong operational value, but the 511NY upstream incident cache currently has no verified event timestamp. Needs provider diagnostics and credentials, not a decorative redesign. Keep existing truthful fallback and source link.
3. **Advance the historical timing model.** The Python backtest can describe historical segments, but predicting an advantageous *journey* needs comparable lanes, dates and actual route evidence. Prevent forecast-style language until defensible.

## Two credible designs

**A. Source-aware paired ledger (selected).** Show trip settings and live answer first, then two native crossing selectors with side-by-side costs, vehicle eligibility, travel scope and separate official camera/map links. Show the cost difference only when both choices are eligible and have numeric charges. Withhold fastest-route claims. A→B→A restores the answer without another API call, and the complete eleven-row ledger stays below. The deliberately asymmetric card-and-ledger composition supports quick on-road decisions while retaining investigative depth.

**B. Corridor-first navigator (deferred).** Begin with New Jersey, Queens, Brooklyn, the Bronx or Staten Island, then filter likely approaches. It could help drivers unfamiliar with the city, and a list-led interface would be viable with documented directional geometry. But geography alone can exclude viable crossings or suggest the wrong direction. This needs independently verified origin/destination and approach constraints, rather than a hardcoded region filter masquerading as a route planner.

Design review: A is feasible within the authoritative engine. B needs its own verified route-selection data; it is not a deliberately impractical comparison.

## State and integrity matrix

| State / user action | Expected visible response | Safeguard |
| --- | --- | --- |
| First load | Trip controls, then answer and two selected crossing cards | Both derive from one live API response |
| Change A/B, then restore | Price, eligibility and per-option source update and restore | No new request or mismatched IDs |
| Same crossing twice | Explicit request to choose different crossings | No false differential |
| One vehicle prohibited or review-only | Vehicle restriction and no savings recommendation | Cost-only card may remain visible, but no eligible verdict |
| One live ETA missing | Label as unavailable with source explanation | Never substitute a different crossing's time |
| Different roadway segment lengths | Each measurement carries direction/scope; no fastest claim | Neither ETA is promoted to door-to-door ranking |
| 511NY events missing or stale | One official 511NY source explanation | No incident-clear claim or repeated placeholder |
| API error | Entire dynamic decision set moves to unavailable | No stale, falsely live cards |
| JavaScript absent | Published toll table, canonical, sources and explanation remain | No invented live state |
| Narrow viewport | One-column options, native controls and readable cards | No mandatory map or horizontal comparison swipe |

## Acceptance and release boundaries

Foundry runs the real `improve`, `assess`, `prove` and `assess --proof` commands in a dedicated GitHub Actions workflow. Source capture uses the real pre-change Git commit. `tests/nyc-crossing-foundry-replay.cjs` executes identical fixtures and visitor scenarios against source snapshots from both versions. The responsive browser harness serves real HTML/CSS/JS with synthetic API fixtures at 360, 390, 768 and 1440 pixels, including keyboard focus, changed selections, restored selections, source failures and no-JS access.

The source replay is not a real-world claim that a driver arrived, saved money or chose a faster trip. Browser fixture success is not verification of a live agency incident or real map. Full repository CI, independent public smoke and measured visitor analytics are separate gates. **GSC, visitor completion and AdSense improvement: NOT MEASURED.** No new provider, new public route, Redis, third-party code, ad change, canonical, source ranking or toll calculation.

Next meaningful investment after release: independently verify the 511NY event-feed failure and restore source coverage without false all-clear claims.
