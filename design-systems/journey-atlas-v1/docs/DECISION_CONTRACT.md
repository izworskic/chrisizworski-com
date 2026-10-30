# JOURNEY_ATLAS_V1 — decision and evidence contract

## Distinct product questions
**Discover:** Is this place appealing to this traveler? Supported by identifiable photography and independently researched editorial copy.
**Fit:** Does the experience match selected interest, shore and broad time budget? `choose()` performs transparent tag matching, **not** distance/time optimization.
**Decide:** What specialist information must the visitor inspect before committing to it? Link original park, NPS, DNR, weather, ferry or access owner, never rewrite their result in Journey Atlas.
**Adapt:** If the primary option is unavailable, which **type** of alternative should be researched? Alternative text never means currently open, bookable or safe.

## Minimum author record
`id`; `stopId` or verified destination URL; `region`; `interests[]`; `timeBands[]`; `whyGo`; `signatureExperience`; `specialistLink` if available; `officialSource`; `alternative`; `accessSourceReviewedAt` when applicable; `photo{url,attribution,license,source,alt}` when available; `indexOrder`.

Time bands: **short** (short stop), **half** (half day), **full** (full day or longer). These are **editorial suitability tags**, not sourced travel-time calculations. The user must separately inspect trail length, driving time, operating hours and closures.

## Stop ownership
For Lake Superior, `#stop-1 ... #stop-31` and the existing add button own the road itinerary and query-string state. The Circle Tour's 31-stop map remains its map. `/lake-superior-provincial-park/`, `/apostle-islands/`, `/isle-royale-ferry/`, `/duluth-canal-park/`, and individual park tools continue owning their decisions. The atlas must never silently interpret a boat's berth, an NPS campsite, a ticket or an observed water state as guaranteed availability.

## Four evidence classes
- **Editorial:** A destination is often worthwhile; not evidence of access today.
- **Official static:** What a land manager/operator has published, with date, rule and known geographic applicability.
- **Observed:** Timestamped measurements; never extrapolate to a safe launch, route or road crossing.
- **Live/recent feed:** Only when a first-party or official source adapter supplies observed-at, fetched-at, maximum age and failure state. The current v1 atlas has **no** live data feed.

When an upstream source changes, the specialist tool owns interpretation. The atlas links to it; an unresolved ambiguity results in "check official access", not "open".

## Privacy and controls
Never collect exact user location, identity or free-text itinerary. Region and interest filters are local controls. No analytics identifying trip preferences. Avoid manipulative rankings. Reset and no-match states remain navigable.

## Intent and SEO
One journey atlas per established route canonical is preferred; do not publish doorway children simply to increase index count. Indexable place-specific specialists need distinct researched intent. Preserve existing Person schema, canonicals, sitemap and ads.
