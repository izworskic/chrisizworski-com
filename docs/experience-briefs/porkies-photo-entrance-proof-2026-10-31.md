# Porkies: photographic provenance and six parking-to-trail identity proofs

**Date:** 2026-10-31 • **Owner:** `izworskic/chrisizworski-com` • **Canonical visitor page:** https://chrisizworski.com/porcupine-mountains/  
**Visitor question:** Where should I begin this actual outing, and is that photograph really of the place I selected?  
**Safeguard:** Never claim a signed route, open road, safe crossing, accessible path, parking vacancy, current ski operations or exact entry from a mapped DNR point.

## Verified source and legal evidence

The six experiences now have independently sourced geographic identities in `public/porcupine-mountains/experience-entry-evidence.json`:

| Experience | DNR parking feature | Named recreation feature | GIS point separation | Signed pedestrian entrance |
| --- | ---: | ---: | ---: | --- |
| Lake of the Clouds overlook | #1409 | #3761 | 74 m | Not independently mapped; 100-yard **published** boardwalk/overlook approach |
| Summit Peak tower | #72 | #3749 | 31 m | Not independently mapped; **published** 0.5-mi parking-to-tower path |
| Presque Isle falls | #841 | #3763 | 66 m | **Not established**: day-use area, contact booth, shorter Nawadaha gravel path are different named features |
| Visitor Center Nature Trail | #11 | #3744 | 25 m | No separately identifiable DNR hiking line for the visitor-center loop; check trail signs |
| Escarpment ridge | #1409 | #3761 | 74 m | Easy overlook and long ridge traverse are distinct; return/shuttle geometry not certified |
| Winter Sports area | #171 | #3747 | 38 m | DNR feature is near named Triple Trail, not proof of current winter complex door or operational entry |

Those values are the DNR inventory's **straight-line offset between parking and named recreation POINTS**, not hikes, proximity rankings, parking gates or paths. The DNR's official guide [2025 visitor guidance](https://www.michigan.gov/dnr/-/media/Project/Websites/dnr/Documents/Education/visitorcenters/PMWSP-paper-23/PMWSP-Visitor-2025.pdf) distinguishes the scenic overlook, Summit Peak's stairs and the Presque Isle day-use and contact-booth approaches. The [DNR park page](https://www.michigan.gov/recsearch/parks/porkies) explicitly describes an accessible Nawadaha viewing platform on **West River Trail** and the separate western County Road 519 approach, without certifying today's access. The 2025 [official GPS map](https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/Porcupine-Mountains-State-Park-Map-GPS.pdf) includes multiple separate entries; matching labeled sites on a static map is NOT proof of an inspected turn sequence.

**Photography rights:**
- [Yinan Chen's *A wooded walking path at Porcupine Mountains State Park*, photographed May 28, 2014](https://commons.wikimedia.org/wiki/File:Gfp-michigan-porcupine-mountains-state-park-the-walking-path.jpg). The file page verifies the photographer, explicit author public-domain dedication, 3371×2234 source image, and park-level subject. **The specific Visitor Center Nature Trail location/entrance is NOT established.** Alt, credit and caption say this clearly. Only a 960px public thumbnail is requested, not the 2.49MB original.
- [Victor Albert Grigas, *SKI 1960 00035 MAR 59 U.P. PORKUPINE MTNS*](https://commons.wikimedia.org/wiki/File:Photography_by_Victor_Albert_Grigas_(1919-2017)_SKI_1960_00035_MAR_59_U.P._PORKUPINE_MTNS._(49516814073).jpg). The file page identifies the March **1959** Porcupine Mountains ski archive, 6341×4461 original and **CC BY-SA 2.0** license, verified Flickr source. The source establishes historical skiing in the Porkies, NOT the modern Winter Sports Complex location, current ski lifts, snow depth or visitor entrance. A 960px Commons thumbnail is used; caption and license link appear alongside it.
- Existing location-specific lake, Summit Peak and Presque Isle photographs retain original license links; no new generic image replaced those. Historical Escarpment lake-region photo remains labeled as region, not entire hiking route.

**Externally checked examples:** [NPS Keweenaw Heritage Site entry for the Porcupine Mountains Visitor Center](https://home.nps.gov/places/porcupine-mountains-wilderness-state-park.htm) demonstrates identifying *the actual visitor center entrance*, dated NPS photograph, amenities and seasonal hours separately; we did not lift that photo because its independent reuse terms were not verified here. [Michigan DNR official park information](https://www.michigan.gov/recsearch/parks/porkies) supplies named parking and trail-area semantics but is not a live signed-entry GIS feed. An AllTrails-style continuous live route preview would be unsafe until one physically certified geometry chain exists.

## UX approaches compared

**Option A: Fill each card with any scenic hiking/ski photograph and show a green "take me to the trailhead" route. Rejected.** It falsely identifies a particular trail as pictured and conflates mapped DNR recreation points with signed access; unsafe at Presque and in winter.

**Option B: Rights-audited park-specific archive + entry evidence panel beside the decision. Selected.** The new images identify the real park and historical context, with visible source and licensing. Each of six choices exposes the actual DNR parking/recreation asset IDs, exact published point offset in a native disclosure, what the DNR guide says about the approach, and a plain-spoken next action. Pressing "Locate this DNR parking point" focuses **one** already reviewed map marker, not a road, walking path or current parking entitlement. Static two-outing proof remains visible with JavaScript disabled. An unavailable source ledger disables dynamic comparison rather than substituting guesses.

## Interaction/response contract

| Input | Observable change | Fail-safe behavior |
| --- | --- | --- |
| Select Nature Trail | Shows real park-wide 2014 walking-path photo, public-domain credit, prominent "not the named trail/entrance" disclosure, DNR visitor parking identity | Image network outage: visible alt/source context; **never claim exact trail photo** |
| Select Winter Sports | Shows real March 1959 ski archive with CC BY-SA 2.0 link and "not current" caveat | No live operations, snow, lifts or parking claims |
| Select falls or ridge | Displays separate DNR area/parking/trail relationships and warning not to confuse them with one signed route | Roadwork, bridge and shuttle states stay unverified |
| Expand entry proof | Reveals both GIS asset IDs and the straight-line separation labeled NOT a walk | Static fallback notes for Lake/Summit and official DNR links |
| Locate this parking marker | Centers the already verified DNR parking marker in the existing Leaflet/CARTO/OSM map; no route drawn | Without map: focus the static parking card; without entry source: no unsupported dynamic controls |

**Technology:** two existing public-source JSON files, site-native HTML/CSS/JS, existing verified Commons media and Leaflet map, no new library, tracking or external proprietary app. No client-side geolocation, Redis or ad changes. No new URL/indexable page.

## Verification and rollout

Run `tests/porkies-experience-compare.test.mjs`, `tests/porkies-photo-entry-evidence.test.mjs`, all existing Porkies tests and `npm run verify:all`; Chromium at 340/390/768/desktop, named source review, images have nonzero natural width, archive labeling, focus/keyboard disclosures, single marker handoff, source-ledger 503 and no-JS static fallback. Complete emitted HTML audit, identity/ads/canonical checks and exact-head Vercel build before merge.

**What remains genuinely unknown even after this investment:** today's roadwork reopening, exact signed contact booth and day-use turns, trailhead path coordinates, pedestrian crossing or bridge passability, exact Nature Trail photograph, and a modern Creative Commons photo of the operating Winter Sports Complex. Each is recorded as unknown, rather than misrepresented as resolved. Do not remove `noindex` or enable driving/walking directions.
