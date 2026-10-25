# Michigan winter hiking and snowshoe route expansion — October 25, 2026

**Working branch:** feature/winter-hike-50-official-routes-20261025  
**Tracking:** #1109  
**Publication status:** noindex research preview only; no winter lot or road currently certified, no approved user driving directions.

## Summary of actual changes

- Enlarged existing research inventory from 38 routes / 13 park systems to **50 routes / 15 park systems**, while preserving every original route and its access restrictions.
- Added **12** specific manager-documented loops: two Michigan DNR Spring Brook loops and 10 NPS Sleeping Bear routes. Route-specific published mileage now exists for **37** of 50; remaining 13 retain unknown distance.
- All 12 new points are **manager-supplied geographic trail references**, not independently winter-cleared parking entrances. `currentWinterAccess=unverified`, `navigationReady=false`, parking and driving targets `null`.
- Expanded manager domains to NPS only with HTTPS exact-host validation. Static manager winter-use policies retained on route cards.
- Repaired a critical map ambiguity: one park may have multiple distant trails. CARTO pins now cluster routes by **separate official reference coordinates**, not one park-wide pin. Clicking a pin filters precisely the routes linked to that point.
- Extended source validation and negative-access unit tests. Tests are source assertions, **not** independently confirmed field access.

## Added route sources and source-of-truth notes

| Route(s) | Published distance | Manager source | Limits |
|---|---:|---|---|
| Spring Brook first cedar swamp loop | 1.5 mi | [Michigan DNR Spring Brook](https://www.michigan.gov/recsearch/trails/spring-brook-pathway) | DNR describes first and second loops without trail-sign names; ungroomed shared XC |
| Spring Brook second ridgetop loop | 0.5 mi | Same DNR page | DNR reference point is not a plowed trailhead |
| Alligator Hill easy | 3.0 mi | [NPS Stocking Drive trailhead](https://www.nps.gov/places/000/alligator-hill-trail-stocking-drive-trailhead.htm) | Optional spur adds 1.6 mi; ignore when reporting base route length |
| Alligator Hill intermediate | **5.0 mi** | Same trailhead page | [NPS general trail table](https://www.nps.gov/slbe/planyourvisit/trails.htm) gives **4.7 mi**; preserve explicit source conflict and verify local route signs; never pretend both match |
| Alligator Hill advanced | 4.6 mi | Same trailhead page | Do not add spur to main loop distance |
| Old Indian Green Arrow / Black Arrow | 2.3 mi each | [NPS Old Indian](https://www.nps.gov/places/000/old-indian-trail.htm) | General NPS trail table describes broader Old Indian as 2.5 miles; route page specifically defines each loop |
| Windy Moraine | 1.5 mi | [NPS Windy Moraine](https://www.nps.gov/places/000/windy-moraine-trail.htm) | Access and lot plowing unknown |
| Shauger Hill | 2.4 mi | [NPS Shauger Hill](https://www.nps.gov/places/000/shauger-hill-trail.htm) | Ski circulation differs by season; road and snowmobile crossing cautions |
| Bay View Farm / Ridge | 2.4 / 4.0 mi | [NPS Bay View](https://www.nps.gov/places/000/bay-view-trail.htm) | Named loops are distinct; winter lot unknown |
| Good Harbor Bay | 2.8 mi | [NPS Good Harbor Bay](https://www.nps.gov/places/000/good-harbor-bay-trail.htm) | Wetland bridge traction and access need verification |

[NPS winter activity policy](https://www.nps.gov/slbe/planyourvisit/winteractivities.htm): snowshoeing is permitted on snow-covered areas but shoes must stay to the side of ski tracks; these trail groups have seasonal pet restrictions (Dec. 1–Mar. 31). Policy does not imply that any of the trailheads are plowed **today**.

## Next highest-risk gate: winter vehicle approach

The present research records contain **zero season-current independently manager-confirmed route/road/plowed-lot triples**. An official parking icon or NPS coordinate is a candidate, not present operational access. Road / trail / lot must each have its own manager-specific status, timestamp, official source and exact wayfinding coordinate; allow routing **only** if all three were independently confirmed within 72 hours and there are no GIS identity/closure contradictions.

1. Prioritize 10 high-demand park entrances (Vasa, Tahquamenon Upper/Lower, Hartwick Old Growth, Spring Brook, Sleeping Bear Old Indian/Alligator/Windy/Good Harbor, Bay City Tobico). Obtain dated manager winter operational evidence instead of assigning hypothetical plowing.
2. Verify the route start entrance with parcel/manager maps and on-the-ground signage; separately verify **plowed winter parking geometry**, then add driver navigation to that lot only.
3. Extend official GIS route line matching (where DNR IDs exist) and NPS route map shapes; no line overlay is a complete route until every selected segment is matched and checked against active closure footprints.
4. Run the full native `npm run verify:all` and browser/mobile smoke on feature-branch preview before converting any page to indexable or recommending a trip.
5. Calibrate distinct hiking vs snowshoe signals using dated trail-surface observations; modeled NOHRSC snow depth is only context. If manager status is missing, display **verify with manager**, never **go now**.

## Quantified trust and utility gate

**Loss per false positive trip clearance:** 100. **Loss per invalid parking/directions link:** 100. **Loss per closed/unknown trail shown as open:** 100. **Loss per mismatched-source map line shown as verified:** 100. **Loss per unnecessary extra tap to reach known evidence:** 1. **Loss per unverified source label or unscoped mileage:** 10.

The public release requires **zero 100-loss violations**, 50 sourced real route identities, at least 40 route-specific mileage records or explicit `unknown`, all 50 with official rules and explicit parking/access provenance, mobile and desktop map stability, and no regressions to existing XC/snow-depth canonical owners. The current 50-route catalog satisfies *identity coverage* only. **Production release gate remains closed.**
