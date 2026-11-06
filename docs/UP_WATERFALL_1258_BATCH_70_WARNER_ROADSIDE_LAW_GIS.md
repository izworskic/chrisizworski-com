# Issue #1258 — Batch 70: Warner Falls official roadside stopping law and parcel/public-view test

**Reviewed:** November 5, 2026. **Decision:** materially improve the B69 question. Legal off-road roadside parking on M-35 can exist **without a separately designated MDOT waterfall lot**. The old "obtain a new MDOT-approved parking lot" gate was overly strict. Yet a site-specific safe off-road spot, signs/parking controls and the adjacent waterfall bank's property rights still require proof. GIS #172 stays research-only, noindex, no driving route and no public waterfall promotion.

## Verified official legal framework

1. [MDOT common questions, state highway roadside parking](https://www.michigan.gov/mdot/about/faqs/general/common): MDOT explicitly says it generally **does not prohibit parking on the side of state highways**, except limited cases. For a local hazard or recurring stopping issue, MDOT can consult MSP on a parking traffic-control order and install No Parking signs. This is not permission to park where dangerous or prohibited.
2. [Michigan Vehicle Code § 257.672](https://www.legislature.mi.gov/documents/mcl/pdf/mcl-257-672.pdf): generally outside city/village limits no standing/parking in paved/main traveled portion when vehicle can be stopped off that portion. It does not guarantee any specific shoulder is wide enough.
3. [Michigan Vehicle Code § 257.674](https://www.legislature.mi.gov/documents/mcl/pdf/mcl-257-674.pdf): do not park upon a bridge or other elevated highway structure, or where an official sign prohibits it; the statute has additional exceptions/restrictions. [Michigan SOS driver manual](https://www.michigan.gov/sos/-/media/Project/Websites/sos/Resources/Forms-and-publications/WEDMK/WEDMK.pdf) corroborates these.
4. [Michigan State Police Traffic Control Orders](https://www.michigan.gov/msp/divisions/spec-ops/inside-sod/traffic-crash-reconstruction-unit/traffic-control-orders): MDOT/MSP make an engineering survey when parking restrictions may be warranted. A prohibition becomes effective through a signed/filed order and posted signage. State policy is not proof that no local Warner Falls order exists.
5. [Travel Marquette's 2025 waterfall brochure](https://assets.simpleviewinc.com/simpleview/image/upload/v1/clients/marquettemi/waterfalls3_2025brochureV2_03a81a20-d8c9-4ab9-b1c6-ccc8ac1bfc68.pdf): explicitly lists Warner Falls at **46.43333, -87.59888** with M-35 southbound roadside approach and short walk west. The coordinate identifies the **falls**, not a certified off-road parking position. This is credible visitor publicity, not a November 2026 highway-engineering assessment.

**Legal caveat:** The site is off M-35, a Michigan state trunkline. This is a description of state general law and policy, not an exhaustive site-specific legal opinion, a waiver of traffic controls or a guarantee of current safe stopping. A signed MDOT lot is not universally required; legality also depends on conditions, exact road boundaries and posted controls.

## Official GIS and parcel/ownership investigation

### MDOT named roadside park test

Queried [MDOT roadside park public FeatureServer/0](https://gisagomdot.state.mi.us/arcgis/rest/services/MDOT/MdotRoadsideParkPublic/FeatureServer/0) through publicly available ArcGIS REST using:

- `Name LIKE '%Warner%'` -> **0 returned features**.
- The state GIS #172 location **46.433378,-87.598960**, `inSR=4326`, `spatialRel=Intersects`, `distance=5000`, `units=esriSRUnit_Meter` -> **0 returned park points**.

The published layer describes **roadside parks** only, so this is affirmative evidence that Warner is not a **recorded roadside park in that dataset**, NOT that roadside parking or a scenic turnout must be illegal/unavailable. The [Oct 15 MDOT seasonal announcement](https://www.michigan.gov/mdot/news-outreach/pressreleases/2026/10/15/mdot-roadside-parks-set-to-close-for-season) closed most named roadside parks Oct 29; it is not a blanket no-stopping order for unnamed M-35 shoulders at Warner Falls.

### Historical Marquette parcel test

A [public third-party 2023 compiled MarquetteParcelData ArcGIS layer](https://services9.arcgis.com/6EuFgO4fLTqfNOhu/ArcGIS/rest/services/MarquetteParcelData/FeatureServer/2) has `dataLastEditDate=1692574139294` (August 20, 2023). A point-intersection query at the falls and a 2023 third-party historical shoulder waypoint both intersect one polygon, `UseClass=Res`.

This is **not an authoritative current Marquette County deed/title or survey**, nor an exact right-of-way/easement and does not establish that the waterfall is private, that visitors trespass, or that the short trail is open. No private owner name is needed for visitor guidance. The [Marquette County Equalization office](https://www.co.marquette.mi.us/departments/equalization_tax_roll/gis_mapping.php) identifies its **current FetchGIS parcel viewer** as the authoritative route for a current tract/ROW crosscheck. Its dynamic map was located but the actual current waterfall/arrival parcel and complete route were not independently inspected in this review.

## Updated visitor decision

- **Natural waterfall:** verified south of Palmer. The July 2026 named Warner Creek MDOT project is **north** of Palmer; B69's corridor distinction stands.
- **General stopping entitlement:** broader than earlier policy assumed, conditional. An official, bespoke MDOT visitor lot is not always necessary.
- **A designated MDOT roadside park:** zero in 5km official roadside-park layer; not evidence against legal other pull-offs.
- **Specific safe M-35 shoulder or registered legal parking:** not established, no invented point.
- **Public bank ownership or full trail easement:** not established; historical residential land-use classification cannot answer it.
- **Opening right now:** unknown, especially early November. No winter-safe road/stopping/trail conclusion from a seasonal MDOT parks notice.

## Code and release guards

- Add `data/up-waterfall-warner-roadside-access-evidence.json` with exact official queries, dates, authority-vs-scope distinctions and non-promote gates.
- Rewrite Warner research page's visitor-decision explanation to replace unnecessary "official MDOT designated lot" demands with nuanced, lawful, conditional stopping and explicit bridge/no-parking/trespass concerns.
- Align GIS #172 reconciliation, reviewed inventory ledger, opt-in access popup, and deterministic 93-candidate research queue; no changes to curated mapping or non-Warner records.
- B70 automated regressions enforce correct law, zero park result, stale parcel caveat, noindex, no safe-shoulder invention, no attraction schema/directions/sitemap, and 75/68/93 counts. Existing B34/B69 regressions must remain green.

**Next definitive site-specific evidence:** a current MDOT/MSP signed order/no-parking sign record and practical sightline/shoulder-width data for the exact M-35 Warner Falls curve, plus Marquette County current parcel/easement or a responsible land manager's published authorization for the entire bank approach. This is a public-agency/data task, not visitor crowdsourcing. No outreach has been sent. No traffic/SEO lift is claimed.
