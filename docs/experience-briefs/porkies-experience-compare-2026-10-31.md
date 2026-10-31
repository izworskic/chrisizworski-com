# Porcupine Mountains: compare two real outings (EXPERIENCE_OS_V1)

**Date researched:** 2026-10-31; **owning repo:** izworskic/chrisizworski-com; **canonical URL:** https://chrisizworski.com/porcupine-mountains/  
**Decision:** "Should I visit the overlook, a tower, the waterfalls, the nature trail, the Escarpment ridge, or the winter sport district given my arrival, time, vehicle, walking comfort, and road uncertainty?"  
**Scope:** add a small photo-led A/B comparison integrated into the existing planner, parking map and trail catalog. Do not add a second URL, route engine, fake ETAs, live-trail claims, framework, Redis, ads, new unlicensed photos or navigation links. Retain `noindex,follow` until the separate park release gate is cleared.

## Primary evidence

| Official evidence and source | What it supports | Critical limit |
| --- | --- | --- |
| [Michigan DNR 2025 visitor guide](https://www.michigan.gov/dnr/-/media/Project/Websites/dnr/Documents/Education/visitorcenters/PMWSP-paper-23/PMWSP-Visitor-2025.pdf), scenic areas p.2, reviewed 2026-10-31 | Lake of the Clouds ~100 yd paved/boardwalk; Summit Peak ~0.5 mile walk then tower stairs; Presque Isle paths and separate flat gravel Nawadaha contact-booth access; camper/trailer lower staging advice | Historical descriptions **not** same-day access, and no verified day-use parking #841-to-contact-booth turn |
| [Michigan DNR trail descriptions](https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/PMWSP-trail-descriptions.pdf), reviewed 2026-10-31 | West River 1.1 mi, East River 1.2 mi, Escarpment 4.3 mi, Nature Trail loop 1.4 mi, Summit Peak parking-to-tower 0.5 mi | Source-trail miles **not** end-to-end visitor hike or current safe route |
| [DNR 2025 GPS park map](https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/Porcupine-Mountains-State-Park-Map-GPS.pdf) | Escarpment 3.7 mi in newer edition; location/river crossings/context | **Contradiction:** Escarpment 4.3 vs 3.7 miles. Neither source certifies current walkable topology |
| [Official park information](https://www.michigan.gov/recsearch/parks/porkies) | Winter vehicle closures, West Presque Isle access distinguished from East, accessible Nawadaha platform, recorded winter recreation | Road access not live, current bridge and platform conditions unknown |
| [DNR Visitor Center hours](https://www.michigan.gov/dnr/places/v-centers/porkies) | May 15–Oct 14 building open; Oct 15–May 14 building closed | Building closure does not prove outdoor Nature Trail is closed |
| Existing DNR parking crosswalk `access-points.json` | Six independently mapped DNR parking assets: Lake #1409, Summit #72, Presque #841, Visitor #11, Ski #171 | Parking pin ≠ signed lot access or route; Presque work-zone opening unverified |

The six options are recorded with **exact DNR source**, qualitative experience type, historic distance **type**, mapped parking ID, independent limitations, photo source/credit where available, and a hard no-route policy in `experience-options.json`.

### External examples and reusable mechanisms

- [NPS App](https://www.nps.gov/subjects/digital/nps-apps.htm), checked Oct 31, 2026: self-guided tours with point-of-interest maps, accessibility information, amenities, and alerts. **Adapt:** tell a compact park story, connect a visitor choice to real source parking and status caveat. **Do not copy:** NPS UI, routes, photos or false endorsement.
- [NPS Plan Your Visit](https://www.nps.gov/planyourvisit/index.htm), checked Oct 31, 2026: starts from activity/time/access planning and gives safety/conditions a separate mandatory check. **Adapt:** answers and links before user drives; do not turn activity selection into an access guarantee.
- Existing site [FIELD_GUIDE_V1](../../design-systems/field-guide-v1/AGENTS.md) and [EXPERIENCE_OS_V1](../../design-systems/experience-os-v1/AGENTS.md): cited real-place photography and *decision → evidence → action*, not repetitive card grids.

### Concept comparison

**A: Rank all 21 trails with scores and auto-route a best-fit 4-hour itinerary. Rejected.** Source distances are inconsistent, verified bridge/return/turn information is absent, and a score would invent certainty and encourage unsafe crossings.

**B: Compare any two of six anchored experiences. Selected.** Two carefully composed photo-led panels, each with: real experience, official walking commitment and surface, conditional visit/access problems, a source link, and a direct handoff to already-reviewed named trail evidence. One button locates **two DNR-mapped parking points** on the existing Leaflet/CARTO fallback map; it draws no connecting route. The visitor sees distinct tradeoffs without fictitious confidence or drive times.

### Interaction contract

| Action | Changed evidence and answer | Fallback |
| --- | --- | --- |
| Change first/second experience | Name, archival photo+exact credit (or non-image placeholder), sourced approach, terrain, reason, warnings and source links change together | Initial Lake/Peak comparison in static HTML when JS or JSON fails |
| Change date, arrival, vehicle, ability or time in existing planner | Conditional warnings change, including winter M-107 restrictions, Presque CR519 work-zone, Summit tower stairs, trailer staging, and 2-hour Escarpment mismatch | Historical DNR descriptions remain; no open status inferred |
| "Locate both DNR parking areas" | Focuses just the two verified DNR asset pins on the existing map; announces clearly that there is no route | Existing parking list + official park map; no new map source needed |
| "Inspect named trail evidence" | Opens the relevant existing 21-trail static detail and focuses keyboard selection | Full 21-trail HTML catalog remains source-browsable |
| Same experience on both sides | Disables two-pin action, requests different choices | No invalid source or invented route |

No map route engine. No GPS location, no additional analytic events, no new ads. Responsive 340/390/768/1366; motion-minimal; accessible native selects and button; every source link works without a bundle.

### Hard gates

Unit test exact DNR/parking/trail keys, date/vehicle/ability/arrival decision change, historic trail-length labels, non-route semantics and static HTML. Chromium desktop/390/340/768: change choices and parameters, locate two marker pins on visible map tiles, select a trail, reject duplicate choices, preserve keyboard focus. No-JS static comparison and source links. Re-run original entire repository CI, browser QA, public emitted-site audit, SERP/provenance and Vercel checks. Preserve noindex; no claims of search impact. Record exact run IDs and screen evidence after tests.

**Known remaining limitations:** Walking distances are older official descriptions with disagreement; nobody inspected bridge/ford conditions; the final Presque parking entrance remains unverified; no current ski grooming; exact visitor-center outdoor trail accessibility unknown; no photo suitable for exact nature trail or winter complex is authorized in this iteration. Future development needs verifiable public photographic rights, not a plausible substitute.
