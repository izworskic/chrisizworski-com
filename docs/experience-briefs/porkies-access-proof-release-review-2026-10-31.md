# Porkies access-proof release review — October 31, 2026

**PR:** https://github.com/izworskic/chrisizworski-com/pull/1310  
**Exact reviewed code head before this review document:** `82c4398e22ead5feb9445d9fcfbfa3f3875519eb`  
**Canonical visitor route:** https://chrisizworski.com/porcupine-mountains/  
**Indexability:** `noindex,follow` retained  
**No new client dependencies:** unchanged Leaflet/CARTO source with OSM fallback; access panel is native HTML `details`, existing CSS, public JSON proof.

## Evidence and behavior verified

- DNR parking asset #841 matches independently mapped recreation point #3763, but there is no certified *signed vehicle turn* or *day-use lot entrance*. Spatial test finds **1,217m nearest reviewed western South Boundary centerline** and **1,316m nearest reviewed MGF Presque Isle Road centerline**, both straight-line GIS/source gaps, not road or trail distances.
- Wakefield Township's **Sept. 22** M-28/County Road 519 work-zone notice remains posted and identifies Johnson Road, but no verified reopening or full detour turn sequence was found. Google *driving directions* to Presque Isle remain blocked from that date forward; static DNR point/map and official notice links remain available.
- Gogebic County Road Commission's **Oct. 26** notice is source-linked, with exact **Nov. 1–Apr. 15, 2–7 a.m.** roadside/shoulder restriction. Does not infer same rule for designated park lots.
- Michigan DNR winter closure distinctions still link directly to the official park page. **Explicit limit:** the unattended GitHub runner received HTTP 403 from DNR, so it is classified as a **manual-only authority** rather than advertised as an automatically monitored source.
- The automated county/township monitor ran on GitHub runner at **2026-10-31T13:41:38Z**, and read all three supported official pages without review signals. Its conclusion is **`monitored-county-notices-unchanged-dnr-manual-only`**, not "the road is open". No source visit can change `accessOpenVerified:false`, `verifiedParkingEntrance:false` or `mayEnableDirections:false`.
- Source watch is scheduled daily, retains a dated Actions artifact, and creates/updates one issue only for evidence requiring manual review. It does **not** commit a new daily page build.

## Browser and integration checks

**Chrome QA run:** https://github.com/izworskic/chrisizworski-com/actions/runs/41206647669  
**Artifact:** https://github.com/izworskic/chrisizworski-com/actions/runs/41206647669/artifacts/13044459362  
**Full repository and public HTML audit:** https://github.com/izworskic/chrisizworski-com/actions/runs/41206647710

Observed in output/screenshots:
- Chrome 340×750, 390×844, 768×1024 and 1366×900: no horizontal overflow or JS exceptions, planner tests pass, source `details` opens via click and closes using Enter key. Access proof is visually legible on mobile, tablet and desktop, with one-column mobile and two-column larger layout.
- JavaScript-disabled scenario: native source proof still opens, static parking cards and official links remain accessible.
- Map: six DNR parking points, actual loaded tiles, 819 DNR trail fragments and 17+15 separate western road evidence overlay verified in existing QA.
- Tests cover normal official claims, possible reopening wording, source missing/change, source outage (never auto-open), geometry-source IDs and distances, and route-denial flags.
- All three required workflows passed for the exact head above, including full repo gate and emitted-public-HTML audit. Re-check the final documentation-only head after commit before merging.

## EXPERIENCE_OS_V1 quality assessment (observed, not a traffic promise)

| Dimension | Weight | Grade | Basis |
| --- | ---: | ---: | --- |
| Visitor can answer real decision | 25 | 5/5 | Source warning upfront, no fake drive link, specific next authority |
| Editorial fit | 15 | 4/5 | Existing field-guide voice retained, readable concise lead |
| Meaningful interaction | 15 | 5/5 | Native proof disclosure changes evidence shown; keyboard reversible |
| Truth/source freshness | 15 | 5/5 | Four authority roles identified, three auto monitored, DNR explicitly manual-only; unknown safe |
| Visual/photography | 10 | 4/5 | 340/390/768/desktop disclosure screenshots inspected; no photo alteration |
| Mobile and accessibility | 10 | 5/5 | Responsive Playwright + focus/keyboard + no-JS native disclosure |
| Performance and resilience | 5 | 4/5 | No additional browser JS, maps/tile and no-JS fallback tested; field Core Web Vitals **not measured** |
| Site integration | 5 | 5/5 | Ad/schema/canonical/indexing unchanged, existing full gate green |

**Evidence-based review score:** 94/100; this is a **release QA assessment**, not measured user satisfaction, speed-percentile data, or search uplift.

## Durable lesson

**DNR source page availability to an interactive human does not imply availability from unattended GitHub Actions**. Observe actual fetch responses before promising automated "live" monitoring; degrade to an explicitly manual-only source rather than hiding HTTP 403 or using an unverified proxy. A source line on a map is not a signed last-mile turn, and a missing/new notice should trigger review, never an auto-green road status.

**Remaining real-world source requirement:** a dated authoritative reopening of the township work zone and a separately documented, signed road-to-parking entrance for DNR asset #841. No bridge/ford, large-vehicle, turn, or road-time clearance has been added.
