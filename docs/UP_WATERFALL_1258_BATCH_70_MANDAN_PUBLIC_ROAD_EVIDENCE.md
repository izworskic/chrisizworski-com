# Issue #1258 — Batch 70: Lower Montreal Falls full-route passenger-road authority audit

**Review date:** November 5, 2026. **Question:** Has an authoritative source certified a continuous, lawfully drivable conventional passenger-vehicle route to the existing Fish Cove lot *and* a permitted uninterrupted walking route to Lower Montreal Falls? **Answer: Not established from the official published records reviewed.**

## Material new agency records and their exact scope

1. [Michigan DNR Keweenaw Point Existing Conditions map](https://www.michigan.gov/dnr/-/media/Project/Websites/dnr/Documents/PRD/MgtPlans-in-progress/KeweenawPoint_ExistingConditions.pdf?hash=732370CD6062E03A9BDF9290F3726351&rev=b9ab50b5f2c645c5838b1058ca77e54e), revised **October 11, 2024**. Visually inspected: the map names South/North Mandan roads, Hoar Lake Road and Fish Cove, with explicitly distinct **state forest road, county, private, designated ORV route, and snowmobile route** legend categories. These are not interchangeable authorities. The scale/map is not a signed current parking or uninterrupted vehicle permission certification. It also distinguishes state land and acquisition-pending areas.
2. [Michigan DNR 2026 Keweenaw state-forest-road PDF](https://www2.dnr.state.mi.us/Publications/pdfs/ForestsLandWater/DNRRoads/PA288_KEWEENAW.pdf), **April 1, 2026** effective, via [DNR printable-map directory](https://www.michigan.gov/dnr/things-to-do/orv-riding/state-forest-roads/maps-and-status). Visually inspected: legend distinguishes DNR forest roads open/closed to ORVs, restricted routes and **non-DNR roads**. It does NOT establish present-day passenger-car legality and status for every county/private/ORV connector or the Fish Cove parking lot. DNR [road FAQ](https://www.michigan.gov/dnr/faqs/forestry/forest-roads) defines a state forest road as DNR-managed and open to conventional motor vehicles, **distinct from designated trails and county roads**.
3. [Michigan DNR Baraga Compartment 11082](https://www2.dnr.state.mi.us/publications/pdfs/forestslandwater/Cmpt_Reviews/Baraga/2027/bar082_comp_info.pdf), source exported **September 16, 2025**. DNR has easements for **parts** of Mandan Road and reports DNR + Keweenaw ATV Club construction of Fish Cove parking. This proves neither route-long easements nor November 2026 gate/lot status.
4. [Michigan DNR October 30, 2026 forest road review](https://www.michigan.gov/dnr/about/newsroom/releases/2026/10/30/annual-review) specifically states **proposed 2027 changes can open or close roads to conventional street-legal vehicles**. Those changes remain for future director approval and would only take effect April 1, 2027, *not November 2026*. Do not mistake the state forest roads overview page's forward-looking 2027 mileage or a draft map for currently effective conditions.
5. [KORC's Mandan hunting access warning](https://www.keweenawoutdoorrecreation.org/hunting-fishing) says **some portions** of Mandan Road have been gated. The source does not say WHICH portions or prove this affects the published Fish Cove road. Equally, it cannot certify that every Fish Cove approach segment is open.
6. [Keweenaw County Road Commission public office](https://keweenawcountyonline.com/commissions-roads.php) is the county-road jurisdiction authority. Its roster/general October 27 winter parking notice does not give a road-by-road Mandan/Hoar Lake certificate. [County general contact page](https://keweenawcountyonline.org/contact.php) provides current public office contacts.
7. [Visit Keweenaw Lower Montreal guide](https://www.visitkeweenaw.com/blog/post/a-guide-to-visiting-the-keweenaws-montreal-falls/) (June 9, 2023) remains the historical visitor offer: Mandan Road to Hoar Lake/Fish Cove gravel lot, then an unmaintained rocky shore walk. DNR forest-road inventory records cannot substitute for verifying the pedestrian corridor.

## Vehicle/jurisdiction decision

| Leg | Primary documented class | Remains unresolved |
|---|---|---|
| End of US-41 | MDOT highway endpoint | current through-leg rights, after highway |
| Mandan Road | Mixed roads; DNR easements for **parts** | continuous public right and which portions are gated |
| Hoar Lake/Fish Cove approach | Named road beside designated ORV routes | street-legal vehicle permission for **all** connectors; Nov. seasonal/gate status |
| Fish Cove gravel parking | Existing 2022 lot / 2025 DNR land manager record | current lot public-use terms, posted limits, legal exact arrival |
| Westbound shoreline to Lower Montreal | Visit Keweenaw historical unmarked route | uninterrupted public legal corridor and site-specific safe viewpoint |

**Decision:** Leave **Lower #139** and **Upper #140** as noindex research features, not discoverable route suggestions. No invented car navigation, parking coordinates, future 2027 open-road assertions, completed waterfall spur, current opening or road closed blanket claim.

## Actionable authoritative verification

Two **unsent drafts**, not official agency replies, have been prepared to seek:
- DNR Road Inventory/Baraga FMU map or written statement identifying current conventional-vehicle access rights along the complete approach, existing lot permissions, and continuous legal Lower Montreal foot corridor.
- Keweenaw County Road Commission identification of the exact certified/maintained vs. seasonal segments and relevant winter road rules.

No reply is recorded and there is **no agency confirmation**. Do not infer a response, promise future delivery or ask visitors to provide onsite validation.

## Implementation in this release

- `data/up-waterfall-montreal-access-evidence.json` stores distinct B70 road legs, 8 official/attributed evidence sources, effective dates and missing-proof flags.
- Lower research page gets a concise explanation of official 2024 jurisdiction vs 2026 effective inventory vs 2027 proposed changes.
- `tests/up-waterfalls-b70-road-jurisdiction.test.js` prevents inventing through-route driving permission, private gates, or prematurely applying future-year DNR changes.
- No expansion of current 75 curated / 68 GIS-linked / 93 pending inventory, public waterfall sitemap, nearby geodesic recommendations, maps, personal author identity, ads or telemetry.
