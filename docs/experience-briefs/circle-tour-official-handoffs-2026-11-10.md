# Circle Tour official source handoffs (2026-11-10)

**Scope:** exact-stop visitor guidance in the existing Circle Tour decision panel when an independent specialist is absent. Eight original stops only: 2, 4, 17, 19, 21, 24, 25 and 26.

## Visitor defect

A visitor could choose Superior, Ashland, White River, Nipigon, Grand Portage State Park, Cascade River, Temperance/Lutsen or Tettegouche and be presented with “No approved specialist at this stop.” True as an internal registry statement; unhelpful to someone already on a road trip.

## Decision

Keep the approved specialist catalog entirely unchanged (22 connections, owner-owned registry and future onboarding). Only for the eight unserved stops, render one source-supported visitor choice, a grounded distinguishing fact, an official/local source link and a clear “not live status” limitation. Preserve the full stop guide and the reversible interest filter. Never place these external links into the approved specialist registry or imply live trail, swimming, parking, border or resort service status.

| Stop | First visitor decision | Controlling published source |
| --- | --- | --- |
| 2 Superior, WI | Wisconsin Point shore vs harbor | [City of Superior](https://superiorwi.gov/226/Wisconsin-Point) |
| 4 Ashland, WI | Downtown murals vs Chequamegon Bay | [Ashland local visitor guide](https://www.visitashland.com/) |
| 17 White River, ON | Easy town-history break | [Township of White River](https://www.whiteriver.ca/winnie-the-pooh-park) |
| 19 Nipigon, ON | Short shore walk vs one-way rugged trail | [Township of Nipigon](https://www.nipigon.net/play-explore/things-to-do/trails-walks/item/114-nipigon-river-recreation-trail) |
| 21 Grand Portage State Park, MN | Paved High Falls vs longer Middle Falls | [Minnesota DNR](https://www.dnr.state.mn.us/state-parks/grand-portage/things-to-do.html) |
| 24 Cascade River State Park, MN | Gorge overlook vs bigger lake/forest visit | [Minnesota DNR](https://www.dnr.state.mn.us/state-parks/virtual-tours/cascade-river/dialup.html) |
| 25 Lutsen/Temperance, MN | Short gorge vs longer Carlton Peak | [Minnesota DNR](https://files.dnr.state.mn.us/maps/state_parks/spk00268.pdf) |
| 26 Tettegouche, MN | Shovel Point vs High Falls | [Minnesota DNR](https://www.dnr.state.mn.us/state-parks/park.html?id=spk00269) |

These are primary-source descriptions, **not** real-time monitoring. DNR's November 2025 High Falls pedestrian bridge announcement is history, not a status guarantee for a future visit. White River, Nipigon and Superior still require site/posting checks.

## Protected contracts and proof

- Circle Tour map, original 31 stop cards, trip planner, Journey Atlas and all specialist engines unchanged.
- Fallback is selected only when the decision kind is `no-specialist`; existing approved specialists continue to win.
- Explicit URL host allowlist and exact stop IDs in tests; no invented tool ID or claims of real-time checks.
- No new destination URL, sitemap, advertisement, person/canonical, tracking-on-render or external service. User-initiated official source link gets its own action tag.
- Exact-head Node tests and responsive browser/production verification remain mandatory before merge. A successful PR build does not establish real-world user results.

**Next distinct editorial phase:** extend Place & Story *only* where exact photo licensing and distinct visitor scale are researched, not by auto-assigning generic imagery to the other 28 stops.
