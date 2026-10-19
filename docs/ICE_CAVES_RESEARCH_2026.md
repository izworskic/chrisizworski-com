# Michigan Ice Caves & Frozen Waterfalls: Phase 1 research, 2026–27

**Research date:** October 19, 2026, America/Detroit. **Scope:** research only; stop for Chris's review before Phase 2. Target production launch remains December 1, 2026. One feature branch: `feature/michigan-ice-caves-2026`. No sibling winter builds are part of this work.

**Repository audited:** `izworskic/chrisizworski-com`, main commit `e1151cf8ea0ef6061c2b80eabfe393c899c94dc2`. Its Agent branch verification run [39205520879](https://github.com/izworskic/chrisizworski-com/actions/runs/39205520879) passed. This report does not claim that any new visitor page, engine change, or production deployment exists.

## 1. Decision for review

**GO for a report-led trip decision tool with live temperature history and forecast context. NO-GO for an autonomous “the caves are formed” model or a numerical “typical formation threshold” at launch.**

Cold accumulation describes weather exposure. It cannot measure seep discharge, the size/completeness of a curtain, structural stability, visibility from shore, or an open trail. No site-calibrated FDD threshold establishing prime viewing was located in the official guidance or research reviewed. The existing lake-ice thermal bands are not transferable cave thresholds.

Recommended launch scope:

| Destination | Decision | What can honestly ship |
| --- | --- | --- |
| Eben Ice Caves | **GO, report-led** | Dated official confirmation when available; nearby station cold history and thaw outlook; explicit difficult access and falling-ice warnings. No model-only “formed” claim. |
| Grand Island ice curtains | **GO, mainland shore viewing only** | View from Sand Point, with binoculars and visibility limitations. Lake context never opens an ice-crossing recommendation. |
| Munising Falls | **NO-GO for a visit planner while closed** | Keep a source-linked closure notice on the hub. Reconsider a dedicated destination page only after an explicit NPS reopening. |
| Wagner Falls | **GO, report-led** | Winter waterfall outlook and official access facts; current parking/trail maintenance must not be assumed. Withhold weekend recommendation if access is not checked. |
| Alger Falls | **NO-GO for a dedicated tracked page pending access verification** | Retain as a researched candidate, explain the roadside/access gap. No invented public trailhead or winter pull-off. |
| Tahquamenon Falls | **GO, winter scenery rather than complete freeze** | Upper Falls as primary car-access destination; Lower Falls context on the same page. Ice-framed flowing water can be the experience. |
| Sand Point inland ice curtains | **ADD; GO, report-led** | A distinct mainland curtain-viewing option documented by NPS. It addresses the core ice-curtain trip without a bay crossing and is useful while Munising Falls is closed. |

These are five proposed GO destinations, two deferred candidates, and one hub. “GO” permits the constrained implementation described here after Phase 1 review; it does not assert present formation or access. If maintaining dated confirmation records is not practical, ship the curated official-source/access pages with separately labeled weather context and **no current formation verdict or weekend winner**.

## 2. Demand, destination value, and limits of verification

### Evidence method

Reviewed named destination, winter, formation, and conditions queries; official land-manager pages; tourism destination inventories; and the existing canonical-intent registry. This establishes recognisable destinations and planning questions, **not measured monthly search volume**. A Semrush lookup could not supply metrics because the connected account has insufficient API units. No new GSC query export for this cluster was available. Numeric demand, CTR, revenue and traffic forecasts are **NOT AVAILABLE**. Do not turn search-result counts, social posts, or visits into keyword-volume estimates.

| Query family to measure | Evidence and distinct visitor decision | Implication |
| --- | --- | --- |
| `eben ice caves`, `eben ice caves conditions`, `are eben ice caves formed` | Forest Service visitor-management work documents a recognised, heavily used winter attraction and seasonal seep curtains [S1]. Pure Michigan specifically promotes the destination [S2]. | Primary condition-checking destination; strongest qualitative demand case. |
| `grand island ice caves`, `grand island ice caves conditions` | Forest Service/concessionaire destination information and NPS mainland-viewing guidance [S3, S4, S16]. | Valuable expectation correction: distant shore viewing is different from standing inside a cave. |
| `munising falls winter`, `munising falls closed` | NPS waterfall inventory plus an active closure statement [S5, S6]. | Closure accuracy has immediate visitor value; demand cannot override closure. |
| `wagner falls winter`, `wagner falls parking` | DNR publishes a dedicated site and short approach; regional winter-waterfall inventory includes it [S7, S8]. | A short waterfall visit in a Munising trip, not necessarily a long-drive anchor. |
| `alger falls winter`, `alger falls parking` | Local destination inventory and map identify the roadside falls [S9, S10]. | Supplementary stop; weaker distinct utility and unresolved safe winter arrival. |
| `tahquamenon falls winter`, `tahquamenon falls frozen` | DNR's year-round destination and winter facilities; regional source distinguishes partial ice from a completely frozen waterfall [S8, S11]. | A separate Eastern U.P. winter destination, useful even with flowing water. |
| `pictured rocks ice curtains`, `sand point ice curtains` | NPS expressly documents winter ice viewing and provides a location map [S4, S12]. | Add because of a materially different land-based approach, not to create another keyword variant. |

The live tool should own the condition/access decision; do not duplicate general Pictured Rocks, waterfall, or lake-ice guides. Review found no existing ice-caves canonical owner in `benchmarks/tool-network-registry.json`. Future GSC measurement should separate hub queries, individual destination queries, and closure queries; record a first complete 28-day window and the strong seasonal effect without claiming causation.

### Other candidates intentionally excluded

Do not expand this launch to Apostle Islands (Wisconsin), Lower Peninsula shelf-ice “caves” (different mechanism and exposure), or a statewide waterfall directory. Miners/Sable/Chapel and western U.P. waterfalls may have winter value, but longer winter approaches and a wider geography would dilute verification of this release. Tannery/Memorial and private attractions need their own current permission/access audit. None is a sibling build authorised by this report.

## 3. Destination and access ledger

Coordinates below are latitude, longitude in WGS84. The **point type matters**: a falls/reference coordinate is not a parking instruction. Tourism map points are rounded reference locations, not a surveyed trail or safe route. Never send a navigation app to a cliff, frozen channel, or roadside falls coordinate. Directions buttons require a separately verified legal arrival point.

| Site | Coordinate and point type | Land manager / official authority | Conditions source and access facts |
| --- | --- | --- | --- |
| **Eben Ice Caves** | Approx. **46.3830, -86.9440**, tourism attraction reference from 46°22.980′N, 86°56.642′W [S10]; **not a verified parking pin**. | Hiawatha National Forest, Munising Ranger District, Rock River Canyon Wilderness. Approach parking includes private land. | USFS alerts [S13] and site-management guidance [S1]. Frey Road via Eben Road is the published approach [S10]. USFS describes a roughly two-mile round trip on an unofficial winter route with steep slopes, wet crossings and slippery footing. Do not describe it as a designated, maintained NFS trail. Verify current private parking permission and access changes; planning documents do not prove proposed works are complete. |
| **Grand Island curtains** | **46.449, -86.606**, approximate **mainland Sand Point Beach area**, not an island landing or crossing point [S14, S15]. | Curtains: Grand Island National Recreation Area, Hiawatha NF/USFS. Mainland viewing beach: Pictured Rocks NL/NPS. These are different jurisdictions. | USFS alerts [S13]; NPS winter-viewing guidance [S4] and Sand Point beach access [S14]. Sand Point Road and beach lots are plowed in winter according to NPS. View from land; binoculars advised. Not every photographed island cave is visible from this shore. No guaranteed close-up experience or winter ferry. |
| **Munising Falls** | Approx. **46.4228, -86.6217**, falls reference [S10]. Visitor-center weather/arrival-area reference **46.4237065, -86.6238331** [S17]; do not confuse it with an open trail. | Pictured Rocks National Lakeshore/NPS. | **Closed until further notice**: NPS release dated April 29, 2025, updated July 8, 2026 [S6]; current NPS waterfall page still carries closure [S5]. The normal approach is 800 feet one way from the Sand Point Road visitor-center area. Normal winter plowing does not reopen the falls trail. No detours, behind-falls access or climbing. |
| **Wagner Falls** | **46.387526, -86.646904**, DNR destination/directions point [S7]. | Michigan DNR Parks & Recreation Division, Wagner Falls Scenic Site [S18]. Not a Pictured Rocks NPS waterfall. | DNR site page [S7] and DNR closures [S19]. Small M-94 parking area, published capacity 8–10 cars; 0.1-mile gravel/boardwalk approach to observation platform. No water/restrooms. **Winter plowing and platform maintenance were not established by the DNR page**; don't promise either. Prefer this current DNR approach distance over older tourism mileage. |
| **Alger Falls** | Approx. **46.3932, -86.6481**, falls reference from 46°23.591′N, 86°38.883′W [S10]. | Falls parcel manager/owner and pedestrian permission **not conclusively verified**. M-28 roadside jurisdiction must be distinguished from permission to approach the falls. Do not assign it to NPS, USFS or DNR by proximity. | Munising Visitors Bureau location [S9] verifies the M-28/M-94 junction, **not** an official formation report or maintained trailhead. A roadside pull-off is described by other visitor sources, but legal winter stopping, plowing, and safe pedestrian access need primary confirmation. No public-land or winter-parking assertion is authorised. |
| **Tahquamenon Falls** | Upper falls approx. **46.5747, -85.2564**; Lower falls approx. **46.6033, -85.2069**, attraction references [S20]. DNR's **46.610734, -85.206323** is a park directions point [S11], **not the Upper Falls parking lot**. | Michigan DNR, Tahquamenon Falls State Park. | DNR park page/alerts [S11, S19], winter maps [S21], official park updates linked from DNR. Separate Upper/Lower approaches off M-123; use verified Upper Falls day-use arrival guidance for the principal visit. The old winter map depicts parking and packed walking paths, but its 94-step brink approach is obsolete: DNR reports a new accessible boardwalk completed in 2026 [S22]. Confirm which surfaces are maintained in winter; do not promise summer accessibility under snow/ice. |
| **Sand Point inland curtains** | **46.449, -86.606**, approximate **beach arrival area**; curtains lie along the inland escarpment south of Sand Point, not at the pin [S4, S12, S15]. | Pictured Rocks National Lakeshore/NPS. | Current NPS winter page directs visitors to park at Sand Point Beach, walk back along the road about ¼–½ mile, and use signed viewing areas. No shoulder parking; approaches uphill are not designated trails. Check closures and avoid climbing fall zones. Do not direct visitors via the closed Munising Falls trail. |

**Official formation reporting is sparse.** The official pages above are dependable authorities for management guidance and closures; most are not dated daily ice-condition bulletins. An “open” recreation-site listing is not confirmation of ice. A tourism/social account called “Eben Ice Caves” is not automatically a Forest Service account. Never relabel an operator, visitor photo or tourism report as a ranger report.

No manager was contacted and no permission was obtained during research. An unanswered access question remains unanswered, rather than being filled from a travel blog. Contacts and official links must let a visitor check directly; the product must not promise a manager can certify overhead or lake ice safe.

## 4. Formation drivers and the boundary of an honest model

### What is being formed?

Eben and the inland Sand Point curtains are seasonal **seep-fed ice curtains beneath sandstone**, not underground perennial ice caves. The Forest Service describes seeping/dripping water building Eben's curtains [S1]; Pure Michigan describes snowmelt contribution [S2]. Liquid supply can continue while air freezes, but local seep discharge is not measured by this tool. Snowfall is not a direct measure of seep supply.

River waterfalls involve flowing water, spray, cold rock and accumulating ice. Air temperature alone cannot establish that a river waterfall has stopped flowing or is fully encased. Tahquamenon is especially important: the experience is often partial ice around moving water [S8]. Grand Island also has a distinct lake exposure: wind, waves, spray and local lake state can affect what develops and what a shore viewer can see. **Curtain formation and bay freeze-up are separate outcomes.**

| Type / destinations | Useful measured or forecast inputs | Missing information | Permitted conclusion |
| --- | --- | --- | --- |
| Seep curtains: Eben, Sand Point inland | Local station max/min; accumulated cold; full subfreezing-day streak; recent thaw-day history; NWS hourly/grid thaw/freezing outlook. | Seep discharge/temperature, rock temperature, geometry, sun exposure, damage and present curtain coverage. | Cold has accumulated; recent/forecast air favours freezing or thaw. Actual formation/prime viewing requires a site-specific dated report. |
| Island shore curtains: Grand Island | Munising station history; NWS shore weather; optional dated Lake Superior lake-wide and Munising Bay regional ice analysis. | Local cliff runoff, wave effects, actual curtains and shore visibility; unmeasured channel currents and load-bearing ice. | Weather and lake context only; never “island reachable” or a crossing opening. |
| Smaller falls: Munising, Wagner, Alger | Nearby cold exposure, thaw days and forecast weather. | Stream flow and heat, ice fraction, local damage and current trail/parking state. | Conditions may favour ice accumulation or thaw; full freezing is unconfirmed. Munising closure overrides travel advice. |
| Large flowing waterfall: Tahquamenon | Nearby cold exposure, thaw outlook and official winter access reports. | Flow/heat and local ice geometry; no validated complete-freeze relationship. | Winter ice scenery outlook; no prediction of full freeze, ice walking or structural stability. |

### Define the cold metrics before reusing the code

For a valid complete daily max/min pair in °F, let `Tmean = (Tmax + Tmin) / 2`:

- **Cumulative FDD:** `sum(max(0, 32 - Tmean))`, in °F·days. It does not decrease during a thaw.
- **Cumulative thawing degree-days:** `sum(max(0, Tmean - 32))`, shown separately; not a calibrated estimate of ice loss.
- **Existing net-cold index:** `A[d] = max(0, A[d-1] + 32 - Tmean[d])`. Preserve its existing meaning for `/michigan-ice/`; it subtracts warmth and is **not** cumulative FDD.
- **Sustained freezing streak:** consecutive complete days with `Tmax < 32°F`. A day at 32°F is not strictly subfreezing. Separately count days with `Tmax > 32°F` and days with `Tmean > 32°F`; do not conflate a brief warm afternoon with an all-day thaw.
- **Forecast hours:** integrate overlapping NWS intervals by their duration; identify thaw hours/degree-hours and freezing hours/degree-hours. Do not count forecast periods as equal-duration hours, or treat forecast values as observed daily climate history.

Example: a 20°F mean day followed by a 40°F mean day gives **12 cumulative FDD**, **8 thaw degree-days**, and **4 existing net-cold index units**. None of these is the measured thickness or completeness of a curtain. Colder weather after a thaw does not establish that fallen ice has rebuilt.

**No numerical formation threshold is authorised.** Do not borrow the existing 25/150/350/700 lake-thermal bands, a square-root lake thickness model, or a perennial underground-cave coefficient. The degree-day study found during research concerns a measured Austrian sag-type perennial cave; it is not calibration for these Michigan seasonal curtains [S23]. There is no approved “80% formed,” probability of formation, inch estimate, or countdown to opening.

### Useful graphs that remain honest

Show observed cumulative FDD and a separately labeled net-cold/thaw series, missing-date gaps, and dated official formation-report markers. Any forecast continuation must use a different line style and carry its issue time. “Formation history” means the **record of dated confirmations**, not daily statuses invented retrospectively from temperature.

An optional historical same-date cold comparison is a **weather baseline**, not a typical formation threshold. Use fixed seasons and disclose valid-year counts and incomplete years. No normal line should appear until the baseline has passed coverage checks. A season with missing temperatures must not silently become a complete low-FDD year.

For future calibration, record site, observation date, source, observed formation state and viewing area, then compare against valid temperature histories across different winters including failed/thaw seasons. Require documented out-of-season validation before promoting a weather signal into an autonomous formation classifier. This work is deferred, not a hidden launch prerequisite or a new pipeline.

## 5. Existing-system audit: what is reusable and what is not

### Source/module contract

All source references in this table were inspected at the audited main SHA. **There is no importable `lib/michigan-ice` FDD module today**; the relevant functions are private to the edge handlers. Phase 2 needs a small shared extraction/extension, not a duplicate fetch pipeline.

| Existing file / endpoint | Exact reusable part | As-is? / required adaptation |
| --- | --- | --- |
| `api/ice.js` → `/api/ice` | `acisRange`, `afddFrom`, `afddChange`, `coldFor`; ACIS `POST https://data.rcc-acis.org/StnData`, `elems: "maxt,mint"`; `currentCover` and GLERL parser. | **Provider/request pattern GO; current response NO for these sites.** Six configured stations serve other waters. Add site station configuration and shared extraction, return dated daily series/coverage, and add cumulative FDD alongside the unchanged existing net-cold metric. |
| `api/ice.js` | Current GLERL nine-column file already parses `superior`. `climatology` recognises `superior: sup`. | **Lake-wide parser GO.** Handler currently requests only Huron/Michigan climatology; adding Superior is configuration. Validate finite values, dates and requested lake; no local-bay inference. |
| `api/ice-now.js` → `/api/ice-now` | `lakeTrends`, `regionalObservation`, concentration decoder, geometry helpers, age/stale metadata; USNIC MapServer query; `forecastFor`/hourly-forcing pattern. | **Pattern GO, configured Munising support NO.** No Munising Bay region exists. Unknown `region` currently falls back to other regions and Saginaw Bay forecast. Add/validate explicit site/region handling before consuming it; never display that fallback as Munising weather. |
| `api/michigan-ski.js` | `json`, `forResort`: timeout/allowlist, cached `/points/{lat},{lon}` discovery, `forecastGridData`, zone handling and failure isolation. | **Extraction/pattern GO; endpoint itself NO.** Fetching all ski hills is wasteful and has no cave data. Reuse a shared, location-neutral weather helper, not the ski rankings or resort adapter. |
| `lib/michigan-ski/engine.js` | Exported `localUtc`, `weekendWindow`, `intervalSamples`, `dayWeather`; local-day and weekend handling. | **Weekend utilities GO.** `intervalSamples` supplies values, not exposure durations; use it only for appropriate min/max summaries. An interval-duration adapter is required for degree-hours and complete-day coverage. Explicitly validate °C temperature units before conversion. No skiing surface score becomes a cave score. |
| `public/michigan-ice/ice.js` | Existing separation of observed ice, thermal history, forecast forcing and non-safety language. | **Design convention only.** `stageFor` lake-thermal bands, hardcoded regions and rendering assumptions are not reusable formation logic. |
| `scripts/ice/gen_site.py`, `scripts/ice/gen_chrome.py`, `scripts/ice/regions.json` | Source of existing generated Michigan Ice pages and region links. | **GO for integration.** Add the hub handoff in the generator; do not edit generated HTML alone. No existing Munising/Superior/Eastern-UP ice-region page exists. |
| `lib/snowmobile/regions.mjs` and generated region pages | Existing `eastern-up` includes Alger, Luce, Chippewa, Mackinac and Schoolcraft. | **GO for cross-links only.** There is no dedicated Munising snowmobile canonical in the audited tree; use Eastern U.P. with Munising context, not an invented URL or new sibling region build. |

Proposed consumption path is one extension of the existing ice request/cache path with shared weather helpers, keyed by verified station/grid. No per-page duplicate fetchers, new scheduled job, database, paid provider, AI status generator, or independent winter-data pipeline is justified. A small source-backed, checked-in official-report ledger is editorial content, not an automated report feed.

### Live probes, October 19, 2026, approximately 06:01–06:09 UTC

These were actual HTTP requests, not inferred from source-code strings. Snapshot results can change; recheck at implementation and launch.

| Probe | Observed result | Consequence |
| --- | --- | --- |
| `https://chrisizworski.com/api/ice` | HTTP 200; `generatedAt: 2026-10-19T06:01:47.621Z`; all six `afdd` values null, season start `2026-11-01`; normals 0; cover null. | Existing endpoint's successful HTTP status is not proof of usable local or pre-season cold data. Guard future start dates; don't display those zeros as cave normals. |
| `/api/ice-now?region=munising-bay` | HTTP 200 but returned existing default regions and Saginaw Bay forecast, not a Munising product. | Unsupported-region fallback must not pass acceptance. This request is an audit, not an approved consumer URL. |
| ACIS `StnMeta` near Munising and Tahquamenon | HTTP 200; nearby station metadata returned. | Station existence alone is insufficient; daily data were checked next. |
| ACIS `StnData` for November 1, 2025–March 31, 2026 | Chatham `201485`: **151/151** valid daily max/min pairs; Munising Lakeshore `USW00054813`: **151/151**; Tahquamenon Falls SP `208043`: **148/151**; Paradise `206354`: **149/151**. | Providers support useful nearby history. Gaps must remain explicit. |
| Other tempting station IDs | Munising COOP `205690` and Newberry `205810` returned **0/151** valid pairs for that winter and 0/18 for October 1–18, 2026. | Reject these IDs despite their plausible names. An all-missing history is not zero cold. |
| Recent ACIS data, October 1–18 | Chatham `201485`: 14/18 valid, last valid October 14; Munising Lakeshore: 17/18, last valid October 17; park `208043`: 5/18; Paradise: 16/18, last valid October 16. | Station lag/coverage is material. Use the last **valid pair's** date, not the final all-missing row or request time. Current season has not started. |
| Historical ACIS, winters 2015–16 through 2025–26 | Chatham: all daily pairs present in each Nov–Mar season. Munising Lakeshore had incomplete seasons, including 137/151 in 2016–17 and 128/151 in 2018–19. Paradise had 0/152 in 2015–16 and 26/151 in 2024–25. | A “10-year normal” cannot blindly average every returned year. Need same-date coverage rules; omit comparison if insufficient. |
| NWS `/points/46.383,-86.944` and grid | HTTP 200; `MQT/168,64`; grid `updateTime 2026-10-19T05:07:24+00:00`, temperature `wmoUnit:degC`, 126 intervals. | Eben weather path works; weather is spatial proxy, not cliff measurement. |
| NWS Wagner and Tahquamenon sample grids | HTTP 200; Wagner `MQT/178,64`, 135 temperature intervals; Tahquamenon sample `MQT/223,76`, 125 intervals; same issue time and °C units. | Grid access reuses ski pattern. Re-resolve final approved site coordinates rather than treating audited grid IDs as permanent. |
| NWS Sand Point / Munising Falls point discovery | Approx. Sand Point `46.449,-86.607` → `MQT/179,67`; Munising Falls `46.423,-86.622` → `MQT/179,66`; HTTP 200. | Closely located destinations still have distinct resolved grids. Use America/Detroit for displayed trip days. |
| GLERL current-season file `g2026_2027_ice.dat` | **HTTP 404**. Prior-season `g2025_2026_ice.dat` HTTP 200 with the existing nine-column format including Superior. | Pre-season publication gap, not a zero-ice observation. Never relabel last winter as current. |
| GLERL `https://www.glerl.noaa.gov/data/ice/glicd/daily/sup.txt` | HTTP 200; header spans ice years 1973–2026. | Superior historical context is available from the existing provider. October dates may have no row. |
| Existing USNIC service metadata + Munising-area query | HTTP 200; `ct`, `idp_filedate`, `idp_ingestdate` fields available. Area query returned `ct=00` with file date **May 16, 2026**, months old. | Availability is not freshness. Do not call this October ice-free confirmation; stale chart must not affect ranking. |

Station-history probes used `POST /StnData` with explicit `sid`, `sdate`, `edate`, and `elems: "maxt,mint"`. ACIS returns max/min in °F for this existing request pattern. Reproduce station discovery via `POST https://data.rcc-acis.org/StnMeta`, `bbox: [-87.2,46.1,-86.3,46.7]` or `[-85.7,46.2,-84.8,46.9]`, with `meta: "name,ll,sids"` and `elems: "maxt,mint"`. Coordinates in ACIS `ll` are longitude first.

**Recommended candidates:** Eben → Chatham 1 SE (`201485` / `USW00054810`, 46.3345, -86.9200); Munising-area sites → Munising Lakeshore (`USW00054813`, 46.41204, -86.65045; source spells name “MUNSING LAKESHORE”). Tahquamenon → park station `208043` (46.6013, -85.2238) when current and complete; Paradise `206354` (46.6038, -85.0396) is a separately labeled proxy candidate, not a silent series patch. Park/Paradise coverage means a continuous exact Tahquamenon counter is **conditional**, not guaranteed. Never splice different stations into one curve without marking the change and defining a consistent baseline.

### Required corrections within the existing engine boundary

1. Extract private ice helpers with regression coverage preserving the six existing regional responses. Add site config and daily history rather than making a second cold service.
2. Handle a pre-season date explicitly. Do not query November 1 through an earlier October date, or treat an empty/all-missing response as measured zero.
3. `afddFrom` currently skips missing pairs and can return zero for all-missing rows. `latestDate` currently uses the last returned row. Expose expected/valid days, gaps, first/last valid date and metric definition. Incomplete history cannot imply complete seasonal accumulation or a continuous streak.
4. Add true cumulative FDD and thaw metrics from the same rows, with regression preservation of the existing net-cold field. Temperatures must be finite and physically/plausibly valid; flags and missing values must be handled explicitly.
5. Keep forecast, observation date, report observation date, report publication date and retrieval time separate. Reject future-dated records and previous-season confirmations as current.
6. Cache shared station history and NWS grid discovery. Existing `coldFor` can make 11 ACIS requests per region including sequential historical requests; don't multiply that for each cave card or page. Fetch baseline history efficiently and cache it only if this optional comparison is actually used.
7. The current edge response caches (six hours for `/api/ice`, 30 minutes for `/api/ice-now`) are not durable last-known storage. No persistent cache was established by this audit. Reuse a verified cached value with its observation date when available; otherwise **omit the failed numeric module**. No new storage dependency is necessary.
8. If Munising Bay chart context is added, extend the existing USNIC adapter with a verified broad water area and freshness/coverage handling. No route line, cross-bay sample waypoints or local thickness display. This context is optional and cannot block the shore-viewing page.

### Access, permission and new-source go/no-go

NWS describes its API as free open data with reasonable rate limits and an identifying User-Agent [S24]. The ACIS and NOAA endpoints above were reachable without a new API key; they are already used in this site. Nothing reviewed established a prohibition on the intended existing weather-data consumption. That is not a blanket licence for third-party photography or unrestricted bulk scraping.

Official USFS pages sometimes returned 403 on subsequent retrieval; the seasonal GLERL file is absent; social pages may require login. No authenticated workaround, captcha bypass, social scrape, or guaranteed live formation feed is proposed. Public official pages can be linked and summarized with source dates; a checked-in editorial report record avoids making fragile scraping a launch dependency. **No new external runtime API is justified in Phase 1.**

No machine-readable official feed was established for any site's curtain completeness, seep flow, local falling-ice stability, safe Munising Bay crossing or winter availability of Alger's stopping area. These are **NO-GO inputs** for an automated verdict. Existing weather products cannot stand in for them.

## 6. Status, provenance and pre-season specification

Use independent fields for **formation evidence**, **weather signal**, and **access**. A closure can coexist with formed ice; a cold forecast can coexist with no recent formation report.

| Requested visitor status | Minimum honest basis for this launch |
| --- | --- |
| Not Forming Yet | Dated official site statement, or clearly labeled pre-season state. Calendar alone cannot prove absence of early ice. In October use “2026–27 tracking starts November 1; no current formation report,” not an invented observation. |
| Forming | Dated official report of developing formations. Without one, display a separate “Weather favours ice growth — modeled” signal, **not** physical formation confirmed. |
| Formed — Prime Viewing | Recent, site-specific official evidence describes substantial formations at the intended viewing area; current access review has no unresolved restriction; no subsequent thaw/closure invalidation. “Prime” describes the view, never ice safety. If the report supports “formed” but not viewing quality, omit “Prime Viewing.” |
| Degrading | Official deterioration report; otherwise separate “Thaw exposure/risk — modeled,” with the actual air-temperature basis. Do not assert measured ice loss. |

**Additional evidence states are necessary:** pre-season, no recent confirmation, report out of date, and access closed/unverified. They are not placeholder widgets reading “Unavailable.” Refusing to invent one of the four physical states is part of the authorised fallback. This is a proposed change to the Phase 2 status/threshold contract for Chris to review before implementation.

Each confirmation record needs site ID and viewing scope, land manager, exact source URL, observation date (or explicitly unknown), publication date if present, retrieval/check date, concise supported claim, and reviewer. No “confirmed today” merely because an old webpage was fetched today. A broad Pictured Rocks statement cannot confirm Grand Island or Eben.

**Proposed editorial freshness policy, not an agency standard:** confirmations can support a current formed/prime badge for at most 72 hours after the observation, and only while access has been reviewed within 24 hours. Any later reported thaw, closure or damage suspends the prime badge pending a new report; forecast above-freezing exposure suppresses a confident weekend recommendation without asserting collapse. If the observation date is unknown, do not grant a current badge. Historical reports remain visibly dated in the timeline. Closures persist until explicit official reopening; they do not expire into “open.”

Pre-season rendering must be useful in server-rendered/static HTML before JavaScript: seasonal explanation, official checks, intended viewing experience, access and safety facts. Before November 1, label the accounting window “Counter starts November 1”; a mathematical zero before tracking starts is not an observed zero. Once tracking starts, show only validated observations through the last complete station day. December formation is variable; NPS's regional mid-December guidance is a seasonal reference, not a guarantee for every site [S4].

On failures retain only an actual last-good value with its date and incomplete/stale label, or omit the module. Do not use a preseason message to mask a midwinter outage. No loading spinners that never resolve, zeros from nulls, stale “Prime” labels, or blank charts with inferred data.

### “Worth the drive / best bet this weekend”

An eligible featured destination needs recent viewing evidence, checked land access, no active closure, no weather/access veto, and a forecast actually covering the visitor's weekend in America/Detroit. If none qualify, say **“No destination is currently confirmed for a dedicated ice-formation trip”** and provide worthwhile alternative winter scenery without calling it a confirmed ice show. Don't crown the site with the highest FDD total.

Grand Island's ranking scope is **distant mainland viewing only**. Wagner is a short stop, not automatically a stand-alone Detroit road trip. Tahquamenon can be a winter waterfall outing without a claim that the falls are fully frozen. Forecast travel hazards, daylight, snowfall/visibility and the intended viewing experience should inform the explanation, not a fabricated numerical “trip score.”

Detroit, Grand Rapids and Bay City drive context in Phase 2 should use verified legal parking destinations and labeled approximate ordinary-road travel ranges, with sources/check dates. Do not use straight-line distances as drive times, include a bay crossing, or promise winter travel times. The existing snowmobile routing APIs target a different activity and are not justified dependencies. No new routing API is approved by this research; an ordinary directions link is sufficient.

## 7. Safety gating: binding build requirements

These are product requirements derived from the sources, not remote safety certification. Apply them to hub cards, detail pages, maps, rankings, share previews and FAQ/schema as well as footnotes.

### All sites

1. **Access first:** known closure overrides all recommendations. Unknown access never becomes “open” from cold weather, a successful fetch or silence on an alert page. Preserve closure until an explicit reopening.
2. Put the relevant hazard and intended viewing location beside the main status and directions action. Keep safety visible at mobile widths and with JavaScript disabled; no dismissible-only warning or colour-only cue.
3. Model output cannot certify ice thickness, load, stability, entry beneath curtains, trail maintenance or road safety. No safe/unsafe ranking, “safe after X FDD,” recommended standing on ice, or safety-green badges.
4. For freezing/rain/thaw transitions show the actual dated weather basis. Traction reduces slipping; it does not protect against overhead ice. Encourage viewing from designated/open paths and outside fall zones; no instructions to climb, crawl behind, knock ice down or pass barriers.
5. Delayed rescue and patchy cell service belong in practical trip preparation [S25]. Do not imply a phone guarantees help or replace official emergency guidance with generated advice.

### Grand Island: fixed shore-only gate

NPS's published ice-viewing map identifies a deep channel with shifting currents between Sand Point and Grand Island and advises staying off lake ice [S12]. This is stronger than “check that it looks thick.”

- The tool **never encourages crossing Munising Bay/Lake Superior ice** on foot, skis, snowshoes, snowmobile or vehicle. No crossing routes, distances, thickness thresholds, opening dates, “go while frozen,” or “safe with a guide” wording.
- Pin and route only to verified **mainland** arrival/viewing areas. Island formations can be shown as distant geographic context, never a navigable destination. Keep map interaction from constructing a crossing route.
- Explicit visitor copy: “View Grand Island's curtains from the mainland at Sand Point. Stay off the lake ice. Lake-wide ice cover and cold totals do not establish a safe crossing.” Explain that a close-up cave experience is not promised.
- Regional/lake ice remains secondary context with chart date and scope. A 100% lake-wide value, local fast-ice classification, or very high FDD total must not change this gate.
- Guided option links should lead to the **current NPS-authorised mainland/Pictured Rocks guide list**, with a clear description that the operator confirms the actual itinerary [S26]. That list does not establish USFS permission or a safe Grand Island crossing. No Grand Island guided-crossing suggestion is approved. If a guide's offered itinerary requires a bay-ice crossing, do not feature it as this tool's alternative.
- No winter ferry or shore-visible curtain confirmation is inferred from a summer concessionaire schedule [S16].

### Eben: overhead ice and difficult-route gate

- Display falling-ice and steep/icy/wet-route warnings with the status, before directions. Thaw/refreeze exposure can invalidate a prime recommendation even with a high season cold total.
- Do not invite visitors to stand beneath or enter behind the curtains, climb the ice or scramble on the cliff. A cold streak is not stability evidence. State that large ice can fall unexpectedly; never present visually solid ice as an all-clear [S27].
- Describe roughly two miles round trip on an unofficial route, not an effortless accessible stroll. Explain traction, slopes/creek crossings and variable snow; do not promise maintained trails or emergency access [S1].
- Respect current private parking instructions and access boundaries. No invented fee, capacity, bathroom availability or permission; no roadside overflow advice from old blogs.
- Wilderness restrictions apply: do not route snowmobiles or mechanised transport into Rock River Canyon Wilderness [S1]. The snowmobile cross-link is regional trip context, not a route to the curtains.

### Waterfall and inland-curtain gates

Munising stays excluded from trip recommendations while closed, including if imagery shows formed ice. Wagner remains a platform/path visit; no stepping into the creek or under overhangs. Alger has no directions/pedestrian approach until verified. Tahquamenon remains on open designated overlooks/paths; no river-ice walking, crossing frozen flow, or claim of complete freeze. Sand Point approaches must respect the official map, shoulder-parking restriction, closed areas, no-pets ice-viewing areas and separation from climbing fall zones/groomed ski tracks [S4, S12].

### Minimum adversarial acceptance cases

| Input or visitor path | Required result |
| --- | --- |
| Grand Island cold total very high; regional chart says fast ice | Mainland directions only; stay-off-lake-ice warning unchanged; no crossing CTA or safety score. |
| Grand Island forms reported, but no confirmation visible from Sand Point | No “Prime mainland viewing” or confirmed weekend recommendation. |
| Eben “formed” report followed by thaw or unknown-date report | Remove prime recommendation; show dated last report and weather risk/confirmation gap. |
| Munising appears icy in a new photo, reopening absent | Closure remains; no directions to a prohibited falls approach. |
| Wagner API succeeds, parking maintenance not checked | No current “access open” claim or weekend winner. |
| All ACIS rows missing, or the last row is missing | Never zero accumulation; show last validated complete history only, mark gaps or omit counter. |
| Unknown ice region parameter | Never display fallback Saginaw Bay data as Munising. |
| Current GLERL file 404, old chart available | Pre-season or omitted lake module; never old data labeled current. |
| Forecast only reaches Friday; visitor asks about Sunday | No Sunday projection or weekend winner from extrapolation. |
| API blocked, JS disabled, mobile 320px | Useful source/access/seasonal answer and safety remain visible; no dead widget or hidden hazard. |

## 8. Phase 2 discovery, SEO and release contract

These are instructions for a later authorised build, **not pages created during Phase 1**.

Proposed canonicals: `/michigan-ice-caves/`, then `eben/`, `grand-island/`, `wagner-falls/`, `tahquamenon-falls/`, and `sand-point/` beneath that hub. Do not mint year-specific URL copies. Munising/Alger dedicated routes stay out until their NO-GO reasons are resolved and reviewed. Hub closure/candidate notes should preserve expectation-setting without pretending those are GO tracked destinations.

Use query-first, truthful titles/H1s. The requested examples fit the repo's 60-character title maximum; maintain descriptions within 158 characters. Include a defined canonical `Person` node at `https://chrisizworski.com/#person`, not only a dangling reference, appropriate author/publisher relationships, and a discreet linked “Built by Chris Izworski” to `/chris-izworski/`. FAQPage and ItemList must match visible content; no live-status markup implying observations that do not exist. Keep reference photos credited with date/season; historical imagery must not look like today's confirmation. No generated image posing as a live sighting.

| Integration surface | Exact current target / required treatment |
| --- | --- |
| Michigan Ice inbound handoff | Add in `scripts/ice/gen_site.py`/chrome as appropriate and regenerate, preserving existing pages and lake-ice purpose. |
| “Matching ice region” requirement | **Gap:** existing six region pages do not cover Munising or Tahquamenon. Link to `/michigan-ice/` with honest scope text; do not label Escanaba/Little Bay de Noc a matching Lake Superior region. A new region would be an explicitly reviewed same-feature extension, not silently created here. |
| Snow totals | `/michigan-snow-totals/`; snow is trail/travel context, not proof of curtains. |
| Munising/Eastern U.P. snowmobile | `/snowmobile/regions/eastern-up.html`; it already covers Alger/Luce. There is no separate Munising route to invent. Add inbound handoff at its generator source. |
| Aurora inbound/outbound | `/northern-lights-michigan/munising/` and `/northern-lights-michigan/paradise-whitefish-point/`. Preserve their separate sky-viewing decision. |
| XC | `/michigan-cross-country-skiing/` guide and `https://xcski.chrisizworski.com/` live tool; regional trail weather does not prove grooming. |
| Site discovery | Register the tool and network relationships; contextual Michigan/tools discovery as appropriate; add **every actually published GO URL** to `public/sitemap-winter.xml`. Truthful `dateModified`/`lastmod` from the repository freshness process; do not update lastmod on every weather poll. Preserve shared ad and entity integration. |

### Verification order and the production/merge distinction

The brief asks for a “production smoke test before merge,” but new production URLs cannot truthfully be tested before they are deployed. Preserve both gates in the workable order:

1. **Before PR/merge:** full-history checkout; `npm run verify:all`; production-output build; tests for missing/stale/pre-season data, provenance and safety vetoes; source/generator/link/schema/sitemap checks; preview/browser smoke for every GO route at mobile and desktop sizes. Verify actual NWS/ACIS responses, not just fixture-only success. Preserve the existing six-region behavior. Nothing is merged past red checks.
2. **Merge/release decision:** present exact branch SHA, checked preview, source exceptions and cuts. No automatic merge from this research authorisation. Ensure December 1 remains achievable; missing calibration never justifies pretending it exists.
3. **After authorised production deployment:** verify the exact commit is live and smoke-test every canonical URL, real data/dated pre-season state, chart interactions, source links, official closure precedence, mainland-only Grand Island directions, Eben gate, internal inbound links, sitemap discovery, and failure behavior. If production fails, fix or roll back; don't call the feature shipped based only on preview CI.
4. Report what shipped, what was deferred/cut and why, exact production evidence and remaining reporting limitations. Do not start sibling winter builds until this release passes production verification.

### Go/no-go checklist to carry forward

- **GO:** existing-provider weather history/forecast context, sourced editorial destination pages, dated official-report ledger, source transparency and the safety gates.
- **NO-GO:** calibrated formation threshold/percentage/countdown, model-only formed/prime statuses, automated bay-crossing recommendation, all-missing data treated as zero, fictitious normal/last-good values, presumed winter access, and a “best bet” selected merely because cold is highest.
- **Conditional:** Tahquamenon continuous local history, current official formation reports, Wagner winter maintenance/arrival verification, and report-review capacity. Omit unsupported modules or use the report-only fallback. GO site pages need not fail entirely because an optional graph is omitted with an honest explanation.
- **Deferred destinations:** Munising until explicit NPS reopening; Alger until land manager/permission and legal winter stopping are verified. Re-evaluate the sources at launch rather than carrying October assumptions into December.

## 9. Source register

All sources checked October 19, 2026 unless the probe table specifies an exact time. Publication/update dates below are source dates, not a claim of current ice confirmation. The report's proposed product policies are our design decisions, not attributed agency rules.

- **S1 — USFS, Eben management strategy:** [Sustainable Recreation Strategy: Rock River Canyon Wilderness, Eben Ice Caves](https://www.fs.usda.gov/r09/hiawatha/wilderness/sustainable-recreation-strategy-rock-river-canyon-wilderness-eben-ice-caves). Official site, mechanism, access and visitor-management evidence; some repeat retrievals returned 403.
- **S2 — Pure Michigan:** [4 Tips for Exploring the Eben Ice Caves](https://www.michigan.org/article/trip-idea/exploring-eben-ice-caves-michigans-upper-peninsula). Destination and seasonal context; not an official current formation report.
- **S3 — USFS destination inventory:** [Grand Island references in the Hiawatha recreation inventory](https://www.fs.usda.gov/r09/hiawatha/recreation?page=0%2C3). Establishes forest-management/destination context, not present formation.
- **S4 — NPS:** [Winter at Pictured Rocks](https://www.nps.gov/piro/planyourvisit/winteractivities.htm), updated January 14, 2026. Mainland/inland viewing guidance and typical regional season; its 2025–26 Munising closure language must not become a reopening assumption.
- **S5 — NPS:** [Waterfalls](https://www.nps.gov/piro/planyourvisit/waterfalls.htm). Current fetched page still identifies Munising trail closure; normal approach details are conditional on reopening.
- **S6 — NPS:** [Munising Falls Trail Closed Until Further Notice](https://www.nps.gov/piro/learn/news/2025-04-29-munising-falls-trail-closure.htm), release April 29, 2025, page updated July 8, 2026. Closure and no-safe-access statement.
- **S7 — Michigan DNR:** [Wagner Falls Scenic Site visitor page](https://www.michigan.gov/recsearch/parks/wagnerfalls). Official coordinates, parking capacity, approach and facilities.
- **S8 — U.P. Travel:** [9 Must-Visit Winter Waterfalls](https://www.uptravel.com/blog/post/must-visit-winter-waterfalls/), originally December 1, 2023, fetched version includes Munising closure. Winter destination evidence and Tahquamenon partial-freeze distinction; generic waterfall physics is not used as model calibration.
- **S9 — Munising Visitors Bureau:** [Alger Falls](https://www.munising.org/activities/alger-falls/). Destination/junction facts only, no verified manager or daily status feed.
- **S10 — Explore Munising:** [2024 waterfall/lighthouse map handout](https://www.exploremunising.com/wp-content/uploads/EM-Map-Handout-back-2024-072024.pdf). Reference coordinates/directions; distances differ from newer official sources. Not current access permission.
- **S11 — Michigan DNR:** [Tahquamenon Falls State Park](https://www.michigan.gov/recsearch/parks/tahquamenonfalls). Park directions, contacts, current boardwalk information and official update links.
- **S12 — NPS:** [Sand Point Ice Climbing and Viewing map](https://www.nps.gov/piro/planyourvisit/upload/Ice-Viewing-Map-at-PIRO-508.pdf). Visually inspected. Deep channel/current warning, stay-off-ice recommendation and land-viewing restrictions. Its generic Munising approach must yield to newer closure notices.
- **S13 — USFS:** [Hiawatha National Forest alerts](https://www.fs.usda.gov/r09/hiawatha/alerts). Closure-check authority, not a cave-formation feed.
- **S14 — NPS:** [Sand Point Beach](https://www.nps.gov/places/sand-point-beach.htm). Winter plowed road/lots and year-round vault toilet; summer accessibility equipment must not be promised in winter.
- **S15 — NPS:** [Sand Point Marsh Trail ranger event location](https://www.nps.gov/planyourvisit/event-details.htm?id=81200C3E-E5B9-29CB-9FC4112B354F98D8). Nearby area coordinate 46.448947, -86.605869. Used as an approximate arrival-area reference, not an exact beach parking-space pin.
- **S16 — USFS concessionaire:** [Grand Island visit information](https://www.grandislandup.com/visit-grand-island-mi.php). Operator context, not a crossing safety certification or verified winter service.
- **S17 — NPS:** [Pictured Rocks current conditions](https://www.nps.gov/piro/planyourvisit/conditions.htm), updated April 7, 2026. Visitor-center coordinate and official-check context, not a daily curtain report.
- **S18 — Michigan DNR:** [Wagner Falls natural-area record](https://www.michigan.gov/dnr/places/natural-areas/wagner-falls-scenic-site). Land manager.
- **S19 — Michigan DNR:** [Closures and detours](https://www.michigan.gov/dnr/about/newsroom/closures). Official park restriction entry point; verify named-site notices rather than assuming absence means open.
- **S20 — Tahquamenon Country tourism:** [Tahquamenon Falls State Park](https://tahquamenoncountry.com/things-to-do/the-great-outdoors/tahquamenon-falls-state-park). Upper/Lower attraction coordinates; not a parking pin or present trail report.
- **S21 — Michigan DNR:** [Tahquamenon winter trail maps](https://www.michigan.gov/dnr/-/media/Project/Websites/dnr/Documents/Education/visitorcenters/TF-2020-Winter-Trail-Maps.pdf). Visually inspected Upper Falls page; older infrastructure must yield to the 2026 update.
- **S22 — Michigan DNR:** [State park project update, June 9, 2026](https://www.michigan.gov/dnr/about/newsroom/releases/2026/06/09/273-million-in-arpa-funded-state-park-projects-entering-final-stretch). New Upper Falls boardwalk; does not establish snow/ice maintenance.
- **S23 — Wind et al., 2022:** [Multi-annual temperature evolution and implications for cave ice development in a sag-type ice cave in the Austrian Alps](https://doi.org/10.5194/tc-16-3163-2022). Different physical system; no Michigan formation threshold imported.
- **S24 — NWS:** [API documentation](https://www.weather.gov/documentation/services-web-api). Open-data/rate-limit/User-Agent and grid-discovery contracts.
- **S25 — NPS:** [Pictured Rocks safety](https://www.nps.gov/piro/planyourvisit/safety.htm). Limited communications, cliff hazards and delayed rescue.
- **S26 — NPS:** [Guided ice climbing](https://www.nps.gov/piro/planyourvisit/guided-ice-climbing.htm), updated March 31, 2026. Current authorisation list must be rechecked; does not authorise Grand Island itineraries.
- **S27 — U.P. Travel:** [Tour Ice Caves](https://www.uptravel.com/blog/post/ice-caves/), originally January 15, 2024. Eben falling-ice/route cautions. Its discussion of travel over lake ice is **not adopted** by the tool; the stricter NPS shore-only safety gate governs.
- **S28 — ACIS:** [Web-service documentation](https://www.rcc-acis.org/docs_webservices.html), [service endpoint](https://data.rcc-acis.org/StnData). Actual station requests and quality results recorded in Section 5.
- **S29 — NOAA GLERL:** [Ice data overview](https://www.glerl.noaa.gov/data/ice/), [2025–26 daily file](https://apps.glerl.noaa.gov/coastwatch/webdata/statistic/ice/dat/g2025_2026_ice.dat), [Superior daily history](https://www.glerl.noaa.gov/data/ice/glicd/daily/sup.txt). Lake-wide concentration context, not cave or crossing measurements.
- **S30 — NOAA/NWS/USNIC:** [Great Lakes ice chart service metadata](https://mapservices.weather.noaa.gov/vector/rest/services/obs/usnic_greatlakes_ice_chart/MapServer/0?f=pjson). Existing regional analysis source; dated query result was stale in October.

## 10. Phase 1 handoff

Research and a documentation-only feature-branch change are the deliverables. No new API, visitor page, sitemap URL, runtime status, merge or deployment is authorised by completion of this phase. GSC/GA4/AdSense outcomes and numeric keyword volumes remain unavailable. The unresolved model/status-contract decision and site exclusions are explicit above.

**Exactly one next action:** Chris reviews this report's report-led fallback, safety gates, destination GO/NO-GO decisions and the linked HTML/JavaScript specification before Phase 2 begins.

## 11. Continued research and HTML/JavaScript direction — October 19

Chris requested further needed research and interactive scripting alongside HTML. Interpret “Java” as **JavaScript** for browser interaction. The concrete [HTML/JavaScript interaction specification](ICE_CAVES_INTERACTION_SPEC_2026.md) now covers a linked cold/thaw timeline, date inspection, destination comparison, weekend/origin controls, a formation-explanation stepper and shareable choices. It specifies evidence states, browser-history behavior, mobile/keyboard access, reduced motion and later acceptance cases. This continues Phase 1; it does not claim a built or deployed interface.

Additional primary-source access research checked the [Munising Township draft recreation plan for 2024–2028](https://www.munisingtownship.org/wp-content/uploads/2023/10/Draft-Recreation-Plan.pdf), printed page 8 (PDF page 10). It identifies Alger Falls as visible from M-28 and Wagner as a DNR scenic site, but does **not** establish Alger's current parcel manager/permission or a legal maintained winter stopping area. It also does not document Wagner's winter parking/trail maintenance. The document is a **draft**, not proof of adoption or current operations. These gaps therefore remain explicit; no destination is promoted to GO on that evidence. The current NPS waterfall page was also rechecked and still carries the Munising Falls trail closure.

Implementation fit was checked against the existing vanilla-JavaScript SVG chart/stepper patterns in `public/winter-eagle-watching/app.js` and `flight-guide.js`, and primary MDN/W3C documentation linked in the specification. The proposed layer reuses the site's HTML and browser scripting conventions; it needs no Java service, frontend-framework migration or additional external data API. No runtime code or visitor URL changed in this research update.
