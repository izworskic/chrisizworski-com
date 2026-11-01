# Issue #1258 — Batch 40: Letherby and Slate River waterfall source gate

Reviewed 2026-11-01, public online evidence only. No emails, drafts or outreach. Draft PR #1352; this is not a production release.

## Exact Michigan geographic identities
| GIS ID | Source name | Natural point (lat, lon) | Source-matched finding | Visitor status |
|---|---|---|---|---|
| 99 | Upper Letherby Falls | 46.769094, -88.109011 | 568 m from independently mapped *Upper Leatherby*; only 186 m from independent *Leatherby* | Research only |
| 103 | Letherby Falls | 46.781725, -88.102977 | 1,636 m from independently mapped *Leatherby*; 998 m from *Lower Leatherby* | Research only |
| 105 | Black Slate Falls | 46.784430, -88.241702 | 385 m from independent Black Slate reference, but it is a series of scattered drops | Research only |
| 107 | Quartzite Falls | 46.789247, -88.242098 | 50 m from field mapped Quartzite | Research only |

Distances are great-circle point comparisons, not walk distances. **Do not create name-based identity crosswalks for Letherby.** Independent historical descriptions of swamp and lower rapids could reflect different features. GIS #103's title may not correspond to the photographed main falls.

## Owner and road evidence

The Michigan DNR weekly LOTS Parcels Layer 0 and Conservation Easements Layer 9 were queried using each exact GIS natural point; **all eight point intersects returned empty feature arrays**. This does *not* prove private title, absence of an easement outside DNR's program, or lack of a public route. In particular, state-forest project boundaries include private inholdings and are not individual titles.

- DNR parcel service: https://services3.arcgis.com/Jdnp1TjADvSDxMAX/ArcGIS/rest/services/DNRLOTSParcelsOPENDATA/FeatureServer
- County Equalization official tax-parcel viewer link: https://www.baragacounty.org/government/departments/equalization/

For **Black Slate + Quartzite**, an original Baraga County visitor-bureau brochure explicitly documents two close falls and a short trail from Arvon Road about 3.3 miles south of Skanee Road. Current-hosted brochure corroborates two short falls and an easy forest route; independent field account describes unmarked All Wood/logging road near a wooden bridge and a longer upstream section without a continuous constructed footpath. Historical promotion is useful evidence of a recognizable visitor experience, **not** a landowner easement, officially designated 2026 parking or signed open-now status. The Skanee Road bridge/TNC Slate River Forest Reserve from separate GIS #119 is not the same waterfall or arrival site and its property may not be extended south by assumption.

For **Upper Letherby + Letherby**, 2008–09 field mapping documents multiple upper, main and lower drops on West Branch Huron River, with branching unmarked two-track access. Published waterfall coordinates materially disagree with the state's labels. County brochure mentions nearby *Erick's Falls* but does not endorse a legal route to the specific #99/#103 points.

## Publication decision and remaining proof

**Zero new indexable visitor guides.** Add four distinct `noindex,follow` research views linked solely from the opt-in geographic research map; do not add falls to public curated cards, canonical visitor guide inventory, tourist attraction schema, parking waypoints, Google driving destination, trail geometry or sitemap. Each source record has six source-backed gates. A future visitor promotion requires exact identity; current parcel owner/manager and explicit public use rights; legal road and signed parking; full safe continuous foot route; and current access/seasonal restriction source.

Sources: [Michigan geographic layer](https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7), [county original brochure](https://www.baragacountytourism.org/wp-content/uploads/2012/09/Travel-Guide.pdf), [county updated-hosted map](https://www.visitbaragacounty.com/wp-content/uploads/2022/07/Baraga-County-Waterfalls-Map.pdf), [Upper Leatherby field account](https://www.waterfallsofthekeweenaw.com/west-branch-huron-river/upper-leatherby-falls/), [Leatherby account](https://www.waterfallsofthekeweenaw.com/west-branch-huron-river/leatherby-falls/), [Lower Leatherby](https://www.waterfallsofthekeweenaw.com/west-branch-huron-river/lower-leatherby-falls/), [Black Slate](https://www.waterfallsofthekeweenaw.com/slate-river/black-slate-falls/), [Quartzite](https://www.waterfallsofthekeweenaw.com/slate-river/quartzite-falls/), [Baraga Equalization](https://www.baragacounty.org/government/departments/equalization/), [DNR LOTS ownership service](https://services3.arcgis.com/Jdnp1TjADvSDxMAX/ArcGIS/rest/services/DNRLOTSParcelsOPENDATA/FeatureServer).

**Inventory:** 71 curated, 65 exact GIS linked, 96 research pending of 161 named geographic features; all counts unchanged. Prior release gate remains: Node tests, real Chromium mobile smoke, full repository verification and deploy auditing on exact integrated head before merge.
