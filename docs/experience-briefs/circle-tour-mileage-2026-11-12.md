# Lake Superior Circle Tour — published itinerary mileage reconciliation

Reviewed: 2026-11-12. Repository: `izworskic/chrisizworski-com`.

## Distinguish two valid but different claims

- **Official signed Lake Superior Circle Tour:** approximately **1,300 miles (2,092 km)**, as described by Superior Country and the Lake Superior Circle Tour organization. Source: https://superiorcountry.ca/touring/drive-and-rv-tours/lake-superior-circle-tour/ .
- **This site's published itineraries:** estimates for their selected day waypoints, not measured turn-by-turn navigation. Sum of `data-miles` in the three published presets:
  - 7-day: **1,359 mi** (7 daily legs)
  - 10-day: **1,358 mi** (10 daily legs)
  - 15-day: **1,358 mi** (15 daily legs)
- The 1-mile discrepancy is rounding in the authored day budgets, **not evidence** of a new route distance. Do not rewrite individual legs to force them to agree. Travel via Keweenaw/Whitefish Point/other selected detours and road routing can change these figures.
- Independent regional scenic route maps note side-trip mileage gaps, including Whitefish Point and Black River Harbor. Source: https://www.superiortrails.com/travel-planner/map-directory/ .

## Change and protections

The original 31-stop map, order, stop details, approved specialist catalog, border evidence, live day-sheet distance handling, SEO/canonical, AdSense, Journey Atlas, and existing static no-JS directions remain untouched.

The *interactive published-route preview* now sums the displayed published days, for both directions, instead of fixing every preset to 1,358 mi. It identifies the estimate and cites the official source. Missing/malformed daily mileage, zero-mile non-stay legs, disconnected day endpoints, and incomplete Duluth loops do not receive a synthesized total. Days over 250 estimated miles have a short practical warning to prioritize one outing.

Regression tests extract the actual published HTML day data, require all three totals to reconcile, verify reversed-loop continuity, and verify that broken routes or missing values fail closed.

## Still not completed

This is **arithmetic and itinerary continuity reconciliation**, not independent road-route verification. Do **not** describe the 1,358–1,359 miles as Google Maps-confirmed mileage, or infer attraction parking, closures, traffic, weather, current border waits, or arrival times.

Next phase: choose **specific arrival points and daily road corridors**, compare official regional mileage references and actual directions for each leg, mark verified-versus-estimated segments, and only then revise displayed mileage. The highest-value route checks are the Keweenaw detour, Whitefish Point/Pictured Rocks/Tahquamenon sequence, Wawa–Marathon–Nipigon, and Thunder Bay–Duluth North Shore day. Preserve the published route unless evidence justifies changing it.

Release proof still requires exact-head repository tests, relevant browser QA, CI and post-merge production check.
