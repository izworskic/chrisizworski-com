# Lake Superior Circle Tour foundational correctness release

Date: 2026-11-08. Scope: existing `/lake-superior-circle-tour/`, no new canonical route, provider, ads, tracking, Redis or user account state.

## Visitor problem and changes

The Circle Tour's existing 31 stop planner conflated Ironwood with Wisconsin, carried counterclockwise editorial context into clockwise previews, silently used a 45-mile fallback for an unlisted road segment, assumed fixed 47-mph driving time without a margin, treated unavailable border waits as zero budget time, and indefinitely repeated historical seasonal notices.

- Move stop #5 (Ironwood / Black River) into the Michigan segment; correct quick-reference region and map-color input. Preserve Central Time for Ironwood explicitly.
- Add published approx. 43-mile Ironwood to Lake of the Clouds direct-distance reference with explicit detour and seasonal-road caveats. This is a planning reference, **not verified live navigation**. The route's larger ~1,358-mi published itinerary total remains approximate and should not be treated as a reconciled road-network measurement.
- Refuse to produce a clock-based day sheet if any other route leg is missing distance: no default 45 miles. Maintain the independent map/written itinerary and Google Maps handoffs when this happens.
- Change driving time from bare distance/47 mph to an explicitly labeled conservative `distance / 47 × 1.2` planning allowance. Neither the baseline speed nor the 20% cushion is a measured ETA; no live traffic is claimed.
- Budget both crossings: Sault Ste. Marie official passenger wait when available; otherwise 45 minutes as **unverified planning reserve**. Pigeon River/Grand Portage gets the same reserve, with no invented official wait.
- Rebuild clockwise summary text from reversed endpoints; distinguish the counterclockwise source guide; identify named itinerary stops as waypoints, not promises to visit every attraction. Clarify heavy North Shore days.
- Expose 2026 Agawa train and park notices as dated references; after calendar rollover, mark them historical, do not score them as current access. Future-season reopening remains unverified. Keep official links.

## Evidence and scope limits

- Ironwood location: Michigan; Ironwood's time zone remains Central. Black River Scenic Byway is Michigan.
- Michigan DNR park source: https://www.michigan.gov/recsearch/parks/porkies (seasonal park road closures).
- Approximate road-distance source (Ironwood → Lake of the Clouds, direct): https://upper-michigan.com/guide/lodging/where-to-stay-in-ironwood.html ; does not include Black River Harbor detour.
- Ontario Parks 2026 operating dates and alerts: https://www.ontarioparks.ca/park/lakesuperior and https://www.ontarioparks.ca/park/lakesuperior/alerts .
- Agawa Canyon operator reference: https://agawatrain.com/ .
- Current road closures, exact ETA, future-season opening, train seats and cross-border wait estimates are **not** established by this release.
- The wider trip-mileage graph has not been independently reconciled. The corrected section is an evidence-labeled interim measure, not the route-graph v2 build.

## Tests and release limits

Added `tests/circle-tour-foundation.test.cjs`, included in the existing `npm run benchmark:circle-tour` script. Tests cover geography and Central Time, route mileage, missing-data refusal, both borders, reversed route text, seasonal rollover and dated sitemap. Existing static benchmark source checks also strengthened.

Connector-level static benchmark simulation: 100/100. Extracted route/border functions passed 9 targeted behavioral assertions. Browser script syntax checks pass; MapLibre source is an ES module and was not syntax checked by the script constructor. **Neither full `npm run verify:all` nor actual browser interaction was executed in this connector-only environment.** Do not merge until full repository gate, representative clockwise and two-border browser journeys, and production release criteria pass. Do not claim deployed/live/SEO results.

## Search and business evidence

Canonical URL, 31-stop count and author entity are preserved. Source Article `dateModified` and the primary sitemap lastmod are updated to 2026-11-08. Ad configuration, monetization, and specialist canonicals are unchanged. No new GSC/AdSense export was inspected; impressions, CTR, revenue and user behavior effects are **not measured**.

## Single next action

Run the full `npm run verify:all` gate on the PR head and real-browser travel journeys (clockwise, Ironwood, both crossings, 2027 rollover), fixing any reported failures before requesting a merge.
