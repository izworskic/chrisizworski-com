# Upper Peninsula Waterfall Explorer — access, source and release audit
**Checked:** November 12, 2026 · **Scope:** three held waterfalls, UP Travel directory membership, and waterfall release gates.
**Publication rule:** A research observation is never a verified public parking place or permission to walk. Do not modify sitemap, geographic pins, the 80-destination curated inventory, ads or attraction schema from this review.

## Three important access decisions

| Site | Authenticated evidence | Missing evidence / visitor verdict |
| --- | --- | --- |
| **Dead River Falls**, Marquette County | 2002 FERC environmental assessment distinguishes historic UPPCO McClure lot from a half-mile upstream trail reaching private property. 2022 township recreation-plan draft recognizes an established trail on Longyear Realty land, but Michigan's Commercial Forest program does not automatically permit non-hunting/fishing/trapping recreation. **Newly surfaced 2025 local record:** Respect Marquette County meeting notes enclosed with Feb. 19 Marquette Township board packet report that Travel Marquette stopped promoting the falls because of significant erosion and inadequate recreation-area management. | Current operator/owner approval for the entire gorge corridor, actual legal parking and crossing, safe maintained path, and any restrictions. **Research only; do not advertise a parking waypoint, public route or official closure.** |
| **Au Train Falls**, Alger County | Dec. 29, 2025 FERC implied-surrender order ends hydro license; June 2, 2026 EGLE emergency dam order identifies risk and requires corrections. DNR's March 2026 minutes document land-sale effects and discontinued hydro-company campground/boat launch. Parcels at dam and powerhouse have different documented ownership. Historic Munising tourism guide describes separate upper/lower visitor approaches, not current permission. | Current EGLE status after emergency order, mapped owner-granted legal access and parking for **each** tier, posted gate/road status, and safe route separate from high-hazard project works. **Not cleared; the emergency order alone does not say every waterfall footpath is officially closed.** |
| **Alger Falls**, near Munising | City of Munising 2024–28 and Alger County 2024–29 plans state there was no safe roadside waterfall parking. An area lodging operator states Alger Falls is on its property and available to **its guests**; this is an owner marketing claim, not independently verified parcel title or public authorization. | MDOT site-specific legal and safe stopping/crossing plus an approved public viewpoint, if one exists. Private guest access must not be interpreted as an open public trail or shoulder parking. **Research only; no M-28 parking waypoint.** |

### Dated source references
- Dead River FERC 2002 assessment: https://archives.nmu.edu/govdocs/local/Dead_River/2002_Final_Environmental_Assessment_Dead_River_Hydroelectric_Project_FERC%20Project_No_10855-002_and_Marquette_Hydroelectric_Project_FERC_Project_No_2589-024.pdf
- Dead River township board packet (Feb. 19, 2025), enclosing Respect Marquette County's Jan. 29 notes: https://www.marquettetownship.org/sites/g/files/vyhlif6666/f/events/february_19_2025_board_packet.pdf
- Michigan DNR Commercial Forest public access: https://www.michigan.gov/dnr/managing-resources/forestry/private/cf
- EGLE Au Train emergency order dated June 2, 2026: https://www.autraintownship.gov/wp-content/uploads/2026/06/Au-Train-Dam-Emergency-Order-SOM.pdf
- Federal FERC Au Train termination: https://mi-psc.my.site.com/sfc/servlet.shepherd/version/download/068cs00001ZSbG5AAL
- DNR March 2026 EUPCAC minutes: https://www.michigan.gov/dnr/-/media/Project/Websites/dnr/Documents/Boards/EUPCAC/Minutes/EUPCAC-2026-March-12-Meeting-Minutes-FINAL.pdf
- Alger Falls municipal plan: https://cityofmunising.org/wp-content/uploads/Munising_RecPlan_Adopted_2024.pdf
- Alger County recreation plan: https://cms2.revize.com/revize/algercounty/document_center/Dashboard/Plans/Alger%20County%205-Year%20Recreation%20Plan%202024-2029%20%28final%29.pdf
- Local Alger Falls lodging operator's guest-only claim: https://www.exploremunisingmi.com/

## UP Travel directory versus independently indexed pages

**Directly observed November 12:** https://www.uptravel.com/outdoors-recreation/waterfalls/ displays **1–12 of 104**, with regional counts **Eastern 1, Central 39, Western 64**; visible first-page category membership verified for exactly twelve records. The directory advertises **300+ waterfalls** separately as a regional estimate, **not** a 300-row published list. A valid listing URL elsewhere in the UP Travel site is **not** evidence the listing is in the current 104-entry category.

The existing source register `data/up-waterfall-uptravel-indexed-listings-2026.json` records **149** keyword-matched site-index URLs, of which **108** stay in the noindex atlas (91 waterfall-named + 17 related) and **41** are excluded. **Only twelve URLs** have directly verified directory-card membership and source-provided road/town labels. The other **92 category entries** in the site's reported total **have not been independently enumerated**; do not infer that the 108 URL records cover them. The atlas has **640 source observations** across four overlapping streams, not 640 distinct or accessible falls.

**Technical investigation:** The live directory uses Simpleview's client-side `plugins_listings_layout_list` widget, 12 per page, loading later pages from `/includes/rest_v2/plugins_listings_listings/find/` using a site token and category filters. The paginated category is not exposed as stable public HTML links. Available page-text tools show only page one; a direct request to the internal JSON endpoint returned an anti-bot access wall and browser-click tooling was not available. Do **not** bypass authorization, fabricate pages 2–9, or quietly change the inventory to 104/104. Remaining task is a verifiable public pagination export or actual observed category cards by allowed interactive browsing.

**Automated guardrail:** `tests/up-waterfall-source-coverage-gates.test.js` protects separate 104/108 counts, exact 12 source-verified category cards, duplicate-ID absence, 91/17/41 source classification, no source-only waypoints, and research-only holds for the three priority falls. It is included in the repository's `npm test` glob and full `verify:all` gate.

## CI release evidence and remaining production uncertainty

The earlier PR #1602 (head `a69beaf42595bf7156b1e32c1bb4cf69dce17456`) reported **three failed workflows, each with zero jobs**. It did not establish a code test failure or passing smoke test. GitHub API jobs were empty for that browser workflow.

The **subsequent merged waterfall PR #1626**, head `c9c65b84c002da602a5e588f195749fe1bbb9d5e`, merged November 11 2026 and ran actual successful jobs:
- Browser/mobile-map smoke: https://github.com/izworskic/chrisizworski-com/actions/runs/42940859899 — `mobile-and-map` **success**.
- Repository verification: https://github.com/izworskic/chrisizworski-com/actions/runs/42940860019 — `verify` and `public-audit / build-and-audit` **success**. Unrelated LSPP browser job was skipped.
- Name SERP protection: https://github.com/izworskic/chrisizworski-com/actions/runs/42940859962 — `protect-existing-winners` **success**.
- The preceding merged waterfall PR #1622 also passed all three workflows on its exact head.

**Limitations:** These prove code/run-level gates on the merged PR head, not a direct click-through of every current production map popup or reliable Vercel production attribution. The connected Vercel account's linked-project list did not contain this website. Independently inspect rendered live pages, mobile map and day-plan actions when a browser-capable production harness is available; until then call this a `CI verified, production browser unverified` outcome rather than complete end-to-end deployment validation.

## Next evidence gates; no invented open-now claims
1. Obtain owner/manager-backed legal McClure-to-falls walking and parking permission and erosion-safe visitor route.
2. Obtain EGLE disposition/amendment to the Au Train order and written legal upper and lower access permission from the applicable parcel owners.
3. Obtain site-specific MDOT safe/public stopping and legal walking evidence for Alger Falls, or restrict to private guest-only sources without a public route.
4. Compare remaining UP Travel category entries using **direct observations**, record stable listing ID and town/road text only as textual source provenance, review each identity against GIS/curated before publication.
5. Run current-branch exact-head CI and one actual production browser/mobile smoke with pinned deployed SHA; do not mark live pass from CI alone.
