# Freighter Watch Desk: waterfront-first visitor contract

**Date:** November 8, 2026  
**Owning page:** `/great-lakes-ship-watching-spots/`  
**Source baseline:** production commit `0b60dff1`  
**Scope:** correct the visitor assumption and outcome copy. No new data sources, ETA models, backend routes, assets, map providers, or ad changes.

## Correct job to be done

The visitor is **already standing at the water or within a few minutes' walk/drive** of a familiar shoreline. They are not asking whether a distant freighter justifies a multi-hour road trip.

The first screen should answer: **"What should I watch for from here, and when might it pass?"**

An empty or uncertain AIS signal should not be interpreted as a reason to leave. The user still has a worthwhile waterfront view and may see other traffic. A nearby AIS position may be interesting without proving the ship will approach the chosen viewpoint.

## Outcomes

| Evidence | First-screen conclusion | Next useful action |
| --- | --- | --- |
| Source-confirmed vessel currently in a Soo lock | Look toward the chamber now; vessel may move at any time | Observe the lock and refresh live AIS |
| Soo/Duluth model has a source-matched window | Watch for named vessel during the model window | Scan the waterway now or walk over before the interval; do not imply a guaranteed arrival |
| Moving commercial AIS within a few nautical miles of a shore reference | Moving freighter reported near this shoreline | Look toward the channel, inspect the marker; no fabricated ETA or visibility |
| No qualifying close moving vessel | No nearby moving freighter confirmed right now | Enjoy the waterway and refresh AIS in a few minutes, not a "don't make a trip" warning |
| AIS unavailable | Live ship positions unavailable right now | Try the specialist ship tracker and observe the waterway |
| Tomorrow selected | Tomorrow's ships are not established by today's AIS | Use next-day weather as context and refresh vessel reports at the waterfront tomorrow |
| Severe NWS alert or strong wind | Shoreline exposure concern | Follow weather warnings and use sheltered locations rather than continuing exposed viewing |
| Published public-hours mismatch | Public viewing access may be restricted | Respect posted land-manager notices even if a vessel remains visible |

The original model owners, source freshness, NWS time-window review, published-hours checks, legal access limits, CARTO/OSM map, canonical, creator attribution and preserved editorial guide remain unchanged.

## Experience OS / Foundry distinction

Compared with **Great Lakes Freighter Tracking** (explore the fleet) and **Soo Locks Live** (follow lock operations), the Watch Desk answers a narrower question at a chosen viewpoint: **what to scan for from here**. The live waterway tracker is now the first action; maps/directions are secondary. The `now` selection is default; later today and tomorrow remain opt-in. No unnecessary "GO/NO-GO drive" scoring.

**Acceptance:** In the default and A→B→A visitor journeys, no "make a trip solely for a ship," "drive here," "return when closer to departure," or travel/parking time claim appears. Changing to an empty region reports no close moving ship, not a travel recommendation. The evidence map and its fallback still work at 360/390/768/1440 px. All source-truth, Foundry, browser, full CI and post-deployment checks remain required.

**Not claimed:** A close AIS position guarantees visual contact, an uncertain later forecast proves no vessels, published hours are live opening verification, or passing tests proves visitor engagement/SEO improvement.

**Next check after release:** inspect real production default and empty-source/quiet-state states, and test whether visitors use live ship details and refresh instead of abandoning the page.
