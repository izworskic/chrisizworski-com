# Issue #1258 — Batch 65: Upper Eagle River / Ten-Foot Falls, M-26 visitor-route review

**Researched November 3, 2026.** A meaningful waterfall missing from the 161-name state GIS subset, but **NOT** a 76th source-cleared visitor destination. The project must not ask visitors to validate private land, drive to raw geographic coordinates or infer that general highway parking policy authorizes private riverbank access.

## Findings

### Identity established, geographic positions conflict

The source [2026–27 Visit Keweenaw visitor guide](https://assets.simpleviewinc.com/simpleview/image/upload/v1/clients/keweenawmi/KCVB_Visitors_Guide_20260407_HIGH_23713277-83e7-418f-aab3-34c51d92bb6f.pdf) explicitly lists **10-Foot Falls (Upper Eagle River)** as #7, with a short **unmarked** M-26 footpath. The [Visit Keweenaw two-day drive](https://www.visitkeweenaw.com/blog/post/2-day-keweenaw-waterfall-driving-tour/) likewise calls it Upper Eagle River Falls and describes an unsigned **gravel pull-off** about 0.8 miles along M-26 from Phoenix. The [2023 bureau waterfall brochure](https://assets.simpleviewinc.com/simpleview/image/upload/v1/clients/keweenawmi/KCVB_summer_waterfalls_brochure_20230517_WEB_LOW_1__15f13fff-fd1f-4b37-9438-cd0a32dbaf4a.pdf) labels a **small roadside parking area** and maps #7 at **47.4000,-88.2887**.

The independent [Waterfalls of the Keweenaw Ten Foot Falls field record](https://www.waterfallsofthekeweenaw.com/eagle-river/ten-foot-falls/) describes an upstream cascade with the **natural-feature point** at **47.39735,-88.28439**. The two coordinates differ by **438.3 metres** straight-line (Haversine, 6371008.8 m Earth radius), a material error for a purported roadside stop. The tourism map point has not been proven to be parking, falls, or a generalized marker; do **not** assign a role beyond what its source says. The Michigan state GIS 161-candidate extract contains **Lower Eagle River Falls #142** at 47.412144,-88.29635, but *not* a separate Ten-Foot feature. Do not relabel #142, inflate the GIS counts or use Lower's official parking for Upper.

### Highway parking permission ≠ legal riverbank visitor route

[Michigan DOT FAQ](https://www.michigan.gov/mdot/about/faqs/general/common) says roadside parking on state highways is generally not prohibited, with narrow exceptions and potential traffic-control orders. [Michigan State Police's official traffic control guidance](https://www.michigan.gov/msp/divisions/spec-ops/inside-sod/traffic-crash-reconstruction-unit/traffic-control-orders) also explains traffic safety and parking restrictions, and Michigan Vehicle Code [257.672](https://www.legislature.mi.gov/documents/mcl/pdf/mcl-chap257.pdf) requires parking off the main traveled portion outside incorporated areas where possible. None certifies the precise unsigned M-26 pull-off or a present-day all-season parking space.

Keweenaw County Equalization [links official parcel information](https://www.keweenawcountyonline.org/department-equal.php), but its county GIS link points to a generic Colligo login that did not provide a readable public parcel for the specific waterbank. [MDOT's ROW GIS program](https://www.michigan.gov/mdot/business/real-estate) confirms complex ROW records exist; no site-specific east-bank boundary or approved foot corridor was verified. The waterfall field account invites visitors onto a flat bank. This is not a certified legal easement. The 2026–27 tourist guide labels the trail unmarked, not signed or maintained.

**Site-specific verification gates still missing:** (1) reconcile the 438m coordinate difference and correctly separate natural feature from pull-off; (2) obtain exact MDOT ROW/traffic-control/parking evidence at the actual M-26 stopping site; (3) obtain parcel/title or an owner-confirmed easement for any required walk beyond public ROW; (4) document the continuous safe public viewpoint approach and present-day seasonal restrictions. If no safe off-road stopping place is available, the correct visitor decision is to continue to the separately certified Lower Eagle River bridge-side park.

### Decision and implementation

- **Do not promote:** No indexable child guide, verified-access card, nearby-falls suggestion, car GPS, guessed parking pin, invented walking route, TouristAttraction structured data or sitemap entry.
- New separate source ledger `data/up-waterfall-supplemental-candidates.json`. This is for significant non-GIS features, not a stealth extension of the 161-point state GIS inventory, with recorded evidence/uncertainty and promotion gates.
- One noindex/linked research page: `/upper-peninsula-waterfalls/research/upper-eagle-river-ten-foot-falls/`. It explains the Upper-vs-Lower decision, sources, 438 m discrepancy and the five outstanding visitor checks. Does not request citizen uploads.
- The existing Lower Eagle River Falls visitor guide now resolves the name confusion and links to the research page, while retaining the sanctioned pedestrian-bridge experience, existing canonical, title and source-reviewed directions. Its structured-data dateModified and single sitemap lastmod are updated to **2026-11-03**, reflecting the actual editorial change.
- **All portfolio counts intentionally unchanged:** 75 curated destinations; 68 exact-linked state GIS features; 93 pending GIS candidates; 161 state GIS candidates; 67 nearby-eligible; 73 indexable waterfall guide URLs.
- New Node test `tests/up-waterfalls-b65-upper-eagle-nongis.test.js` computes Haversine independently and protects existing GIS/map/sitemap/Person/ads/navigation contracts.

## Gates and next investment

Required `npm run verify:all`, dedicated B65 regression, waterfall browser/mobile/map, public-HTML audit, search protection and review; merge only on clean exact-head CI. After merge check source page and linked Lower guide on production plus honest sitemap lastmod. No SEO CTR, search demand or revenue improvement claimed without GSC.

**Next concrete investigation:** Montreal Falls owner-accepted Fish Cove access and the 2026 Keweenaw Outdoor Recreation Coalition/DNR permit status. Lower Falls terrain and new proposed parking must not be confused with existing signed access.
