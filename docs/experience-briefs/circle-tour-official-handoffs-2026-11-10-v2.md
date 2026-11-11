# Circle Tour: useful official-source decisions for eight specialist gaps

Researched November 10, 2026 against official/local sources. Replaces the earlier draft handoff approach (PR 1617), rebased by implementation onto the current nine-story Circle Tour, not a stale branch.

## Visitor task

A traveler selects an original route stop without a released independent specialist. The application should not answer with a software-registry message ("No approved specialist"), particularly if that traveler is already standing near Highway 61. Present a useful, source-supported choice with a link to the controlling land manager or local guide, and preserve the full stop guide.

## Exact-stop evidence and actionable distinctions

| Stop | Choice | Published source |
| --- | --- | --- |
| 2 Superior, WI | Wisconsin Point beach/shore vs harbor; protect dunes, check restrictions and beach-water advisories | [City of Superior Wisconsin Point](https://www.superiorwi.gov/226/Wisconsin-Point) |
| 4 Ashland, WI | Eight-block outdoor mural walk versus longer Chequamegon Bay time | [Ashland murals](https://www.visitashland.com/murals/) |
| 17 White River, ON | Winnie the Pooh Park by Highway 17, distinct from seasonal visitor-centre services | [Township of White River](https://whiteriver.ca/winnie-the-pooh-park) |
| 19 Nipigon, ON | Short shoreline segments versus difficult 10.1 km one-way trail requiring a return plan | [Township of Nipigon recreation trail](https://www.nipigon.net/play-explore/things-to-do/trails-walks/item/114-nipigon-river-recreation-trail) |
| 21 Grand Portage State Park, MN | High Falls 1-mile paved/boardwalk round trip versus Middle Falls 4.5-mile challenging round trip | [Minnesota DNR top stops](https://www.dnr.state.mn.us/state-parks/grand-portage/things-to-do.html) |
| 24 Cascade River State Park, MN | Cascade River Lower Loop 0.5 mile versus steep Lookout Mountain Loop 3.5 miles, separate shoreline option | [DNR Cascade River tour](https://www.dnr.state.mn.us/state-parks/virtual-tours/cascade-river/dialup.html), [DNR park trail map](https://files.dnr.state.mn.us/maps/state_parks/spk00133.pdf) |
| 25 Temperance River & Lutsen, MN | Gorge trail 0.25 mile one way; Carlton Peak 3 miles one way; resort gondola/lifts require separate operator check | [DNR Temperance map](https://files.dnr.state.mn.us/maps/state_parks/spk00268.pdf), [Lutsen operating hours](https://www.lutsen.com/mountain-info/hours-of-operation) |
| 26 Tettegouche State Park, MN | Shovel Point 1.2-mile round trip with stairs versus Baptism River High Falls ~3-mile round trip | [DNR waterfall itinerary](https://www.dnr.state.mn.us/state-parks/itineraries/north-shore-waterfall-itinerary.html) |

**Document dates matter.** Cascade River DNR map bears ©2020. The online route descriptions are references, not live access reports. Temperance DNR warns against swimming in the river. Lutsen's own current conditions/schedule are operator controlled, not part of the DNR park map. The selected stop's date cannot validate conditions. The 2026 Nipigon trail maintenance notices and Gitchi-Gami/Poplar River construction provide further reason not to infer open-now from historical trail maps.

## Visitor voice

The visitor sees **"Make the most of this stop"**, one short question, a specific contrast grounded in geography/effort, a practical risk caveat and a clearly identified source link. There is no mention of a missing specialist, internal approval or AI source diagnostics. When a stop genuinely represents two separate operators, provide both original sources with no implied shared ticket. Historical access information is never presented as a live status verdict.

## Boundaries

- Official references are **not** independent first-party tools, do not enter the 22-entry approval catalog, and do not change the registry/auto-onboarding.
- Show the official reference only when the decision has no matching approved specialist. When the registry later approves a specialist at that stop, the existing independent action takes precedence automatically.
- Preserve the 31-stop route planner, maps, Journey Atlas, all nine place-and-story records, credits, canonical/Person metadata, no-JS fallback, tracking-on-click, ads, SEO and sitemap.
- No duplicate destination pages, route arithmetic, live service checks or synthetic visitor metrics.
- For unsupported interest filters, the original reversible "See other interests" remains.
- Exact-host HTTPS allowlist in Node tests, 8-stop visitor handoff browser check at 360/390/768/1366/1440, and regression for existing Tettegouche story with official reference while its specialist is absent.

## Release gate

Current `main` source is the baseline for this successor PR. Run exact-commit branch verification, browser QA, Foundry, public-output audit and Vercel preview before merging. After merge, verify production JS and eight official choices; do not mistake an image present in the DOM for a successfully loaded photo. Close prior PR #1617 only when the successor is safely merged.
