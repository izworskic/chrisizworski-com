# Issue #1258 — Batch 58: Au Train Falls access, dam-safety and title investigation
**Research and source review:** November 3, 2026
**Outcome:** Keep Michigan state waterfall GIS #192 **research-only, noindex**. The feature is real, but publicly available evidence does not clear either specific historic waterfall parking-and-walking route. **74 curated visitor stops remain unchanged; 94 GIS research candidates remain.**

## Most important new findings

### 1. The June 2, 2026 EGLE Emergency Dam Safety Order was missing from the prior audit
**Primary official source:** https://www.autraintownship.gov/wp-content/uploads/2026/06/Au-Train-Dam-Emergency-Order-SOM.pdf (six pages, EGLE letter to UP Hydro LLC, dam #MI00152; inspected pages 1, 4 and 5).

Michigan EGLE's Water Resources Division wrote that deficiencies identified in the dam's 2022 independent safety inspection created an imminent risk of dam failure during realistic normal-flow loading, worsened by less-than-design floods. The agency **ordered**, among other steps:
- continue the drawdown target **773.43 ft NAVD88** pending remediation;
- by **July 2, 2026**, provide a plan/schedule and engineering contract to repair, draw down, breach or otherwise alleviate dam risks;
- by **August 31, 2026**, submit an administratively complete permit application for proposed dam alterations; and
- begin work after any permit issuance.

These are dated **regulatory requirements, not observations that the owner complied**. No independently confirmed November 2026 modification, rescission, permit issuance, full resolution or present reservoir level was found. Do not claim the dam has failed or all falls trails are officially closed. 'High Hazard Potential' characterizes consequences if dam failure occurs; the separate 2026 emergency order documents findings about current structural deficiencies.

The township website still posts the order: https://www.autraintownship.gov/

### 2. Exact ownership of dam and powerhouse parcels differs
**FERC final order, December 29, 2025, Docket P-10856-141:** https://mi-psc.my.site.com/sfc/servlet.shepherd/version/download/068cs00001ZSbG5AAL . Stephenson Bank foreclosed on **18 of 22 former hydropower project parcels**, later conveyed to **D. Charles Trust Investments LLC**, including the powerhouse and surrounding project buffer.
**EGLE June 2, 2026 official letter** explicitly identified **UP Hydro LLC** in county title records as owner of the dam's north embankment/spillway and south-levee parcels: 001-206-001-10, 004-036-002-00, 001-231-004-00 and 001-231-005-00.

There is no contradiction between the two parcel groups. But neither report surveys the exact *upper-falls parking → pedestrian viewpoint* nor the exact *lower-falls parking → gated gravel road → viewpoint* chain. It is incorrect to assume a one-company right-of-way extends across the whole visitor route.

**Date discrepancy to preserve:** The June EGLE letter refers once to license termination on *November 29, 2025*, whereas FERC's operative signed final order expressly **issued and effective December 29, 2025**. Use FERC as the authoritative legal date; do not let EGLE's apparent typo corrupt content.

### 3. DNR confirmed former hydropower recreational facilities no longer in use
**Michigan DNR approved minutes of March 12, 2026 EUP Citizens Advisory Council meeting:** https://www.michigan.gov/dnr/-/media/Project/Websites/dnr/Documents/Boards/EUPCAC/Minutes/EUPCAC-2026-March-12-Meeting-Minutes-FINAL.pdf (approved April 14, 2026; Au Train agenda section).
DNR staff reported hydropower operation ended under the terminated license, a **penstock was severed in January 2026** to maintain discharge, and the **DNR-leased hydro campground and boat launch are no longer in use** because the land changed owners and a renewed agreement was not in place. The state was talking with the landowner.

This does **not** establish that the old upper or lower waterfall tourist lot is identical to the campground/launch, nor does it certify the whole falls path closed. It is strong independent evidence that older publicly provided hydropower-recreation rights are no longer reliable.

### 4. New visitor warning but not an official restriction map
Old official-region tourism still publishes two Power Dam Road visitor lots: https://www.munising.org/activities/au-train-falls/ and https://www.exploremunising.com/waterfalls/ . Their undated directions describe the upper rough pathway and lower walk past a gate.
A first-person visitor review, dated **June 10, 2026**, says the **upper lot was closed off, overgrown and marked No Trespassing**: https://www.tripadvisor.com/Attraction_Review-g42497-d8560119-Reviews-Au_Train_Falls-Munising_Upper_Peninsula_Michigan.html . This is not an official property map or a current inspection; it raises the cost of relying on old tourist instructions but does not establish lower-falls closure or legal access.

Au Train Township's new notice says US Army Corps surveying started **November 1, 2026** for changes at Au Train Lake and the river mouth in view of alterations to Forest Lake Dam: https://www.autraintownship.gov/ . This is **not an Au Train Falls visitor-trail opening** or an as-built walking route.

### 5. Hydropower source gives the correct waterfall/flow context
FERC's 2025 environmental analysis describes a **0.7-mile bypassed river reach with two waterfalls**, formerly bypassed by the hydropower powerhouse discharge. After the January 2026 penstock changes and EGLE's drawdown directives, historic seasonal flow photos, hydro generation and reservoir stage are **not real-time waterfall flow** or proof of safe water entry. Neither the state GIS #192 natural feature coordinate nor the historical 2021 visitor map is a verified parking coordinate.

## Source-and-access gate matrix

| Gate | State | Reason |
|---|---|---|
| Natural waterfall identity | Verified as geography only | State GIS #192; FERC two cascades in bypassed reach |
| Regulatory order | Verified emergency order; present compliance **unknown** | EGLE June 2 2026; July/August deadlines are requirements, not proof of response |
| Owner of all visitor parcels & permission | **Not cleared** | Dam parcels and powerhouse/buffer parcels have distinct private owners; no specific rights mapping |
| Upper parking to upper view | **Not cleared** | Older Munising tourism vs June 2026 unconfirmed posted No Trespassing report; no current owner signed approach |
| Lower parking to lower view | **Not cleared** | Old gate/gravel road directions but no currently authorized utility-gate entry or legal continuous path |
| Current restrictions and winter conditions | **Not cleared** | No rescission/approval/route inspection verified; no current open-now claim |

**Visitor decision:** 'We cannot verify a permitted trip' instead of 'waterfall closed' or 'waterfall open'. No indexable /au-train-falls/ guide, no saved/featured waterfall itinerary, no route from GIS coordinates, no driveway/parking location, no gate-bypass suggestion or water-safety assertion.

**Who could resolve the gate:**
- EGLE Dam Safety Unit listed in order: Michael Size, 989-619-4295 / SizeM@Michigan.gov, for current **emergency-order status and construction/safety buffer**, not as a landowner permission source.
- Au Train Township clerk 906-892-8265 / supervisor Thomas Balmes 906-892-8279, for latest local posted notices and parcel/right-of-way contact.
- Owner-signed visitor access map or written permission for both separate upper/lower parking/foot corridors from the current titleholder(s), including road/gate rules.
- Current posted trail inspection and winter road status before any visitor-guide promotion. No background monitoring initiated or falsely promised.

## Implementation
Source-backed update to `data/up-waterfall-reconciliation.json`, `data/up-waterfall-inventory-ledger.json`, `data/up-waterfall-review-queue.json`, `public/assets/up-waterfall-access-reviews.json` (with prior audit retained), and the existing **noindex** `public/upper-peninsula-waterfalls/research/au-train-falls/index.html`. Original geographic feature counts and indexable sitemap remain unchanged. No new geocoding, route, public card, tracking, Redis or Supabase.

Release acceptance: run deterministic research-queue `--check`, full Node tests, `npm run verify:all`, waterfall mobile/browser/map smoke, creator identity, canonical and sitemap audits, green Vercel preview and exact production SHA; publicly verify research-only page content and absence of a public guide once deployed.
