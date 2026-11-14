# Circle Tour Trip Intelligence v1 — Python evidence + shared Rust feasibility

**Release review:** November 14, 2026  
**Canonical:** `/lake-superior-circle-tour/10-day/` (new static editorial guide); existing `/lake-superior-circle-tour/` remains the 31-stop source and interactive map.

## Visitor outcome

A decision-oriented 10-day Circle Tour with a distinct suggested overnight base, destination-specific interpretation, visitor choice, reason to skip optional stops, and a rough day-budget check. The HTML is rendered at build time and indexable without JavaScript; Rust WASM improves interactive policy parity but does not control Google indexing. No new ads, maps, user accounts, third-party geolocation or live route calls.

## Source reconciliation

The original `data/circle-tour-road-evidence.json` retains the exact 30 adjacent directed legs. Three previously unresolved entries have new, bounded **approximate gateway planning mileage** (all sources cited inside the ledger):

* **Ontonagon to Houghton gateway: ~52 miles.** Independent OSRM travel estimate and NPS M-38/M-26 travel guidance. Copper Harbor, Brockway Mountain, Quincy Mine, and Isle Royale ferry terminals are additional decisions, not part of that 52-mile arrival.
* **Upper Tahquamenon Falls to Whitefish Point via Paradise: ~25 miles.** Michigan DNR management plan: ~14 miles Upper Falls to Paradise; Great Lakes Shipwreck Historical Society: 11 miles Paradise to the museum. The additive estimate does not include other park entrances or seasonal detours.
* **Whitefish Point to Sault Ste. Marie city gateway: ~73 miles.** Independently published OSRM estimate with museum route guidance via Paradise. Does not cover a Soo Locks parking detour or the scenic Point Iroquois alternate.
* **Thunder Bay to Pigeon River / Grand Portage State Park: WITHHELD.** Destination Ontario provides ~38 miles to the *border*, not a complete itinerary to park arrival, and crossing wait cannot be assumed. The publisher preserves the 38-mile corridor reference and refuses a park arrival clock.

These values are *not* certified road-network measurements, public approaches, current closures, parking permission, or real traffic. The existing published ten-day day totals remain an independent 1,358-mile editorial sum, not the sum of precise pairwise routes. Other stop-card figures remain published estimates, not audited by a live routing provider.

## Rust and browser contract

The shared `rust/shared-itinerary/src/lib.rs` exposes `ct_feasibility` (ABI v2), using 47 mph + 20% planning buffer, selected editorial visit hours, and optional unverified 45-minute crossing reserve:

* **1** day has at least 45 min unallocated planning margin;
* **2** tight (less than 45 min);
* **3** time budget exceeded;
* **4** incomplete full road approach, no ETA verdict (wins over optimistic margin);
* **5** chosen winter-sensitive park activity must be rechecked, never automatically considered closed;
* **0** malformed inputs.

`public/assets/circle-tour-rust-itinerary.js` checks the real WASM and maintains an independent JS oracle if binaries are blocked or unsupported; native disagreement fails closed. Neither provides live traffic, border wait, seasonal park access, or turn-by-turn routing.

## Python build and SEO

`python3 scripts/build-circle-tour-trip-intelligence.py` reads the existing 31-stop canonical page, the 10-day itinerary, and the reviewed source ledger; it fails on missing days, disconnected stop order, altered 1,358-mile total, or promotion of the unresolved border park approach. It generates:

* `public/lake-superior-circle-tour/10-day/index.html` as real, crawlable HTML with unique day-by-day visitor copy, source links, one canonical and Article structured data.
* A source-backed embedded JSON day list consumed by an interactive Rust/JS planning-hours + season control.
* No additional AdSense scripts, altered existing advertising, fictitious live availability, or duplicated 7/15-day doorway pages.

Vercel invokes Python during `npm run build:site`; the page is a build artifact, **not** an independently committed original page. CI generates it before tests/SEO canonical audits, then validates the exact output using `--check`.

## Release test requirements

1. Compile with pinned rustc 1.90.0 to real wasm32, commit exact base64 artifact, and prove byte parity.
2. Run Rust native and JS parity cases covering invalid inputs, 7/10/15-day original previews, 31 legs, seasonal gates and border reserves.
3. Run Python build/check plus Circle Tour source ledger and HTML tests; preserve old 31 stops and original hub SEO/ad footprint.
4. Chromium 360/390/tablet/desktop/wide desktop old planner regression, dedicated 390/1366 new-page checks, and blocked-WASM recovery.
5. Full repository gate, sitemap/Detroit audit, Foundry, Vercel; merge only if passing.

## CTR measurement

The November 9 Search Console export recorded 2,716 Circle Tour hub impressions, 19 clicks, 0.70% CTR, average position 14.28 (export period, not a claimed latest-28-day period). The query `lake superior circle tour itinerary 10 days` had 31 impressions, 1 click, average position 9.81.

Record **page+query** impressions, clicks, CTR, and average position in Search Console at comparable complete 7- and 28-day periods after indexing. Separate the hub and new URL and monitor cannibalization. Success requires additional **non-branded organic clicks**, not merely a higher CTR due to fewer impressions, and no claim of AdSense revenue impact without matching revenue evidence.
