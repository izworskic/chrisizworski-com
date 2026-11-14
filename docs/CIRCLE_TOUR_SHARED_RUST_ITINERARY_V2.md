# Lake Superior Circle Tour | Shared Rust itinerary expansion (v2)

**Scope:** Existing `/lake-superior-circle-tour/` and existing
`rust/shared-itinerary/src/lib.rs`. No new SEO page, map provider, paid API,
route service, static HTML rewrite, photos, ads, tracking or personal state.

## The actual visitor decision

The visitor chooses a 7-, 10-, or 15-day editorial itinerary, or a segment
between two existing Circle Tour stops and the time available. What can be
trusted is a reviewed route order and *some* published distance references,
not live road connectivity, land-manager trail openings or reliable ETA.

This investment reuses the shared Rust WASM artifact already used by the U.P.
waterfall planner; each destination retains separate source facts and policy.

## Why a distinct Circle Tour adapter?

Unlike the waterfall day sheet's six independent candidate stops, the Circle
Tour includes 31 linked stop identities, 7/10/15-day published mile estimates,
clockwise reversals, optional detours, time-zone boundaries and **two**
international crossing-time considerations.

- The numbering is `1,2,...12,31,13,...30`. `31` is Whitefish Point
  between Tahquamenon and Sault Ste. Marie, not an alphabetical appendix.
- Stops `1` and `30` are two Duluth start/end identities. Crossing that
  identity boundary is zero additional *stop-to-stop* distance, not evidence
  that any road or visit is zero miles.
- Published day totals remain 1,359 mi (7-day) and 1,358 mi (10-, 15-day),
  distinct from the signed route's approximate 1,300 mi. Never infer real
  driving distances by dividing totals.
- `data-edge-verified="false"` explicitly withholds 7→8 Houghton/Keweenaw,
  12→31 Whitefish Point, 31→13 Sault via Paradise, and 20→21 Pigeon River
  approach as full road-mile references. Their partial or detour distances
  **must not** be used to fabricate an arrival clock. Legitimate editorial
  written itineraries remain visible.
- Sault passenger wait uses a currently available source report when present,
  otherwise **45 minutes unverified reserve**. Pigeon River/Grand Portage uses
  an unverified 45-minute reserve, not a fabricated live wait or zero.
- The existing `miles/47*1.2` allowance is explicitly a planning buffer,
  not a Google Maps ETA. Ironwood (#5) remains Michigan in geography but
  Central Time in the clock; no Rust travel-time-zone rewrite.

## What Rust is allowed to do

`ct_leg` checks full 31-stop directed topology and only the published
`stop-dist` source fields. No new road coordinate or distance generation.

`ct_published_day` checks eligible numbered start/end identities and a
bounded source-reported daily mileage or legitimate zero-mile stay day.

`ct_border` checks that *unavailable* crossing waits reserve 45 minutes
and *available* waits use exactly the observed minutes, without altering the
source's freshness gate.

`ct_drive` checks the existing conservative allowance for a fully
source-reconciled contiguous segment. It never produces a predicted arrival.

## Integration

`public/assets/circle-tour-rust-itinerary.js` loads the same pinned
`/assets/shared-itinerary.wasm.b64`, confirms the original waterfall ABI,
the Circle Tour ABI, 31 stop transitions and negative source/wait cases,
then marks the runtime native. It independently re-reads the existing
editorial stop cards to ensure the old `edgeMiles()` result agrees with
the printed source, and vetoes mismatches.

The existing Circle Tour core previews call `verifyPreset()` after the
original `publishedRouteMiles()` oracle, including both directions. The
live-day planner calls `auditSegment()` after its original mileage and
border calculations, before publishing a clock or itinerary.

On a WASM load failure or unknown ABI the independent JavaScript source
oracle remains; there is no empty-map or broken-trip failure. Native
disagreement fails closed rather than allowing previously unsupported access.

## Release proof

- Pinned rustc 1.90.0 native unit tests plus **real wasm32** compilation,
  byte-for-byte source/binary equality and full directed/invalid-route matrix.
- Both source-facing `tests/circle-tour-shared-rust.test.cjs` and original
  `tests/circle-tour-foundation.test.cjs`, plus the prior waterfall regressions.
- Browser smoke on 360px, 390px, tablet, desktop and wide desktop, explicitly
  asserting `CircleTourRust.engine() === 'rust-wasm'`, honest Ironwood
  43-mile reference, unverified Keweenaw connector withheld, original three
  published mile totals, mobile layout and no-JS fallback.
- Separate Chromium failure test blocks the shared WASM binary and proves
  the same 31 stops, source-bound missing legs and 1,358-mi published total.
- No new page URLs/canonicals, server endpoints, ads or third-party services.

Future stages can add a source-reviewed per-leg road evidence graph, freshness
and access snapshots, and actual parking arrival geometry *only if their
responsible sources are independently verified*. They must not be invented
by Rust from waterfall GIS coordinates or straight-line distances.
