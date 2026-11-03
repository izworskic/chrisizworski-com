# Florida launch viewing: 30-second pad-to-shore decision
Date: 2026-11-03 · Experience OS v1.2 / launch network

## Why this milestone instead of another website
Existing Florida [Space Coast tool](https://chrisizworski.com/national-tools/space-coast-launch/) already provides a precise launch feed, Kennedy/Cape switch, NPS official 13 parking-lot polygons, 14 historical boardwalk centerlines, official access warnings, 45WS weather, public NWS sky grids, KSC ticket monitor and media/mission truth. A new Florida canonical with another map would introduce competing intent and stale duplicated intelligence. The missing piece is an **immediate answer**: for *this actual pad*, which shore makes sense and what could stop me from using it?

The new decision deck lives directly below the mission selector, before the deeper evidence desks. It owns no weather, pad, venue, parking or closure status itself. It projects from the same shared bounded launch+GIS+NPS+KSC+NWS response and moves the existing map when the user chooses a source-attributed location.

## Experience quality scorecard (targets, not measured results)
| Criterion | Weight | Target | Evidence to pass |
| --- | ---: | --- | --- |
| Correct origin and place | 25 | 25 | Source location ID 27 Kennedy vs 12 Cape; no false location for unknown ID; raw pad if available |
| Actionable first answer | 20 | 20 | Visible first public place, flexible backup, ticketed distinction, map-focus actions |
| Permission truth | 20 | 20 | No park opening/parking ticket inferred; KSC Gantry 39A/39B exclusion; Playalinda cutoff policy |
| Mobile/accessible interaction | 15 | 15 | Chromium widths 360,390,768,1440; no overflow; keyboard controls and no-JS source fallback |
| Map and source integrity | 10 | 10 | Existing GIS point focused; source address/land manager retained; no invented drive or trajectory |
| SEO and release safety | 10 | 10 | Existing canonical, unchanged sitemap/ads, full verify:all and emitted-page checks |
| **Total** | **100** | **100** | Score actual result only after verified checks |

## Published external sources consulted 2026-11-03
- [Kennedy visitor complex official launch-viewing locations](https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing-locations/): Main Visitor Complex, Banana Creek, and The Gantry are distinct. Gantry specifically excludes LC-39A and LC-39B missions. Space Center launch package and transport availability is mission-specific, and guests do not drive themselves to secured viewing sites.
- [NPS Canaveral National Seashore launch viewing](https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm): Playalinda entrance may close due to capacity, NASA may close additional areas; incoming park road ordinarily closes 30 minutes before launch; summer and winter park-hour limits differ.
- [NASA published public view sites](https://www.nasa.gov/kennedy/see-a-launch-up-close/): lists Space View Park/Titusville and public riverfront locations.
- [Brevard County site-specific park pages](https://www.brevardfl.gov/ParksAndRecreation/): Space View Park, Rotary Riverfront Park and Parrish Park addresses, features and normal policies.
- [Port Canaveral Jetty Park](https://www.portcanaveral.com/recreation/jetty-park): park admission, current hours, passes and capacity separate from launch schedule.
- [Space Coast tourism viewing venues](https://www.visitspacecoast.com/landing-page/launch-venues/): public coastal viewing alternatives and contextual geography.

## Threat model / scenario matrix
1. **KSC 39A** with valid source: public starting point from Titusville, fallback County park, KSC ticket still conditional and Gantry explicitly ineligible.
2. **Cape SLC-40** with valid source: Port Canaveral public park references first, flexible Titusville fallback, KSC ticket never automatically available.
3. **Park closed / venue ineligible**: remove affected public candidate from the deck; choose other grounded site, or say no candidate rather than recommend the closure.
4. **No source-fresh NPS alert**: Playalinda entrance remains unverified, never 'open'. A zero-alert payload is not capacity approval or NASA safety clearance.
5. **Unknown or foreign location ID**: do not select a shoreline, even if an unrelated pad label resembles 'SLC-40'.
6. **Missing exact pad GPS**: show no straight-line distance or bearing; do not substitute park entrance/paid operator center for actual viewing lawn.
7. **Missing or too-far-out weather**: no surface cloud percentage or visibility claim; certainly no orbital cloud-track or launch approval.
8. **Schedule/API failure**: disable map recommendation buttons; static explanations retain general public sources and warnings, never stale 'go' recommendations.
9. **No JavaScript / tiles unavailable**: visible mission-independent explanations and links remain; full GIS currently retains its existing text/list fallback.
10. **Mission A→B→A**: cards, facility and map focus are derived from the *same* selected launch UUID; sequence guard prevents late earlier results from overwriting newer mission.

## Deployment gates
PR: https://github.com/izworskic/chrisizworski-com/pull/1479
Code: `lib/florida-viewing-deck.js`, `api/space-coast-launch.js`, existing Florida HTML/client/CSS and GIS focus event. Tests: `tests/florida-viewing-deck.test.js` plus extended Florida Chromium regression with 4 screenshots.
Verification state at creation: **pending**. Publish/live/browser outcomes and any CTR or revenue lift must be measured, never inferred.

Exactly one next investment after production verification: put the same **one-decision-first** quality bar through a verified Wallops viewing atlas with NASA Wallops and Chincoteague/Virginia land-manager access, without cloning Florida's visual system.
