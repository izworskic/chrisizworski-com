# Seaway vessel-class icon system · November 8, 2026

**Scope:** Existing St. Lawrence Seaway and Eisenhower Lock ship maps and recent-vessel cards. No separate tool, indexable route, map overlay, AIS API, or ship-state inference.

## Visitor task and placement

A visitor scanning the map should distinguish a freighter from a tug, yacht, sailboat, tanker, fishing boat, passenger ship, or service craft **before opening a bubble**. The same silhouette appears in the corresponding received-vessel card. A small, noninteractive, wrapping legend is inserted **below the map's availability caption**, outside the Leaflet map; it never covers a vessel marker or prevents map interaction. It explains that shape follows AIS type and visual size follows reported length.

## Classification and engineering

Classification derives only from an existing, validated numeric `shipType` from `lib/soo-ais.js` → `lib/seaway-ais.js`. The provider can leave this field null. Codes follow the [U.S. Coast Guard AIS Encoding Guide](https://navcen.uscg.gov/sites/default/files/pdf/AIS/AISGuide.pdf) and [USCG AIS Class A reports](https://navcen.uscg.gov/ais-class-a-reports):

| AIS codes | Icon | UI wording |
|---|---|---|
| 70–79 | Bulk freighter silhouette | Freighter / cargo |
| 80–89 | Tank arrangement | Tanker |
| 60–69 | Windowed passenger ship | Passenger |
| 31, 32, 52, 57 | Short squat tow/workboat | Tug / towing |
| 37 | Cabin recreational boat | Pleasure craft |
| 36 | Sail/mast | Sailboat |
| 30 | Working fishing boat | Fishing vessel |
| 33, 34, 50, 51, 53–55, 58 | General support hull | Work / service |
| Missing, invalid, reserved or unsupported | Plain undecorated hull | Type unknown |

**Do not infer freighter or pleasure craft solely from length**. An unknown type stays unknown at 300 feet or 900 feet. AIS type conveys a broad reported category, not a verified ship identity, tug-and-barge configuration, passenger occupancy, or cargo contents. AIS type code 40–49 represents high-speed craft of uncertain operation, so this limited icon set leaves it unknown instead of calling it a passenger ferry.

Sizing follows separately validated reported **length in meters**, without changing any existing stored units or lock clearance calculations. Bands are small below 40 m (under ~131 ft), medium 40–149.99 m (~131–492 ft), and large at least 150 m (~492 ft). Missing/bad lengths use an ordinary mid-size icon. Screen sizes at normal zoom are approximately 38/49/63 pixels wide, with selected-marker emphasis and a maximum 76px footprint. This is a screen-readable distinction, not a map-distance encoding.

## Implementation and safety

- `public/assets/seaway-vessel-icons.js`: standalone deterministic UMD classifier/shape generator, node-testable, safe static authored SVG strings. No third-party image API, no name-based guess, no data fetching.
- `public/assets/seaway.js`: consume the glyph module for Leaflet single-vessel markers and matching list icons; leave group clusters, actual GPS, freshness, follow-ship selection, and photo popups unchanged. Fallback to the existing generic glyph if the optional icon script fails.
- `public/assets/seaway.css`: isolate palette, shape strokes, mobile-friendly below-map legend and list-size bands. Do not modify ad placement or Leaflet control positions.
- `scripts/generate-seaway.mjs`, `scripts/enhance-seaway-journey.mjs`, and both emitted HTML files: load the module **before** the Seaway renderer, refresh only its CSS/JS asset versions, preserve both canonicals and photo helper.
- `tests/seaway-vessel-type-icons.test.js`: source category edge cases, length thresholds and malformed types, deterministic distinct SVGs, no size-based type guessing, existing map grouping/selection, generated asset references and legend placement.
- `scripts/verify-seaway-follow-browser.cjs`: synthetic AIS test reports verify the glyphs and scale in real map markers and lists on small screens, without asserting that those vessels exist today. Its existing four-breakpoint, no-JS, photo-popup, fresh AIS and Follow journey tests remain.

**Release proof:** record merge SHA, full repo CI and Vercel production READY only when verified. No claim of measured search or UX gain solely from icon implementation. Retain the existing provider coverage caveat: the map shows recently received AIS reports, not a complete vessel census.
