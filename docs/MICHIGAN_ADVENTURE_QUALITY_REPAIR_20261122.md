# Adventure Finder accessibility and layout-shift repair

Baseline from GitHub Web Quality pilot on November 22, 2026: Lighthouse 79 performance, 93 accessibility, 73 best practices, 100 SEO, CLS 0.327 (one synthetic lab run). The audit found 21 low-contrast instances and 6 touch-target issues at 390px, and 22 contrast instances at 1280px.

The root causes identified in the report were pale copper text on cream cards, small Leaflet click targets and short destination links, and late Google Fonts swapping DM Sans and Fraunces. The map pin is kept visually 18px wide but receives a 40px hit area. Destination links receive at least a 32px hit region; the two pale text labels use the darker existing earth palette. Existing font families are requested early with display=optional so slow responses do not move page content after first paint.

The path-scoped Web Quality GitHub Action now checks zero serious axe failures on Adventure Finder, 24px target-size rules and CLS no greater than 0.1 for the two pilot pages. Verify these checks and the full repository suite before merge.

No new dependencies, map provider, images, data source, API, ads, SEO metadata or canonical page were introduced. This patch does not claim field Core Web Vitals improvement or verified production ad behavior.

Broad-view marker grouping: nearby gauge-free destination pins are now grouped in Leaflet at zoom-dependent projected pixel separation. The group badge counts actual listed destinations; clicking shows named links to each original card. Group badges are anchored to a real member's coordinates, not a fabricated centroid. All cards and links remain in HTML when scripts or maps fail. The photo browser checks coverage of all twenty entries after grouping.
