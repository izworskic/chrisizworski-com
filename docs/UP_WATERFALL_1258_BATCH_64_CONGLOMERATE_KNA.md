# Issue #1258 — Batch 64: Conglomerate Falls on the Gratiot River (KNA verified public access)

**Research and implementation:** November 3, 2026. **Disposition:** Promote a *site-specific public daytime visitor destination with explicit vehicle-season and riverbank caution*. No live open-road, parking GPS, riverbed access, or trail-line claim.

## Material evidence that resolves the previous 2026-11-02 blocker

The first-party land manager [Keweenaw Natural Areas](https://keweenawnaturalareas.org/KNA/Conglomerate_Falls.html) publishes a dedicated **Conglomerate Falls** page that:
- invites the public to spend the day at the 281-acre preserve and publishes **daylight-hour visits every day**;
- directs vehicles from Ahmeek via Five Mile Point Road, South Farmer's Block Road and Tanskanen Road to **1600 Conglomerate Falls Lane** and the preserve **parking area**;
- affirmatively documents the **first 1/4 mile of that approach on a private-property road easement**; explicitly instructs visitors to stay on the easement and **never park at the preserve cabin**;
- explicitly prohibits **driving the dirt road during spring thaw**, when a temporary cable blocks the entrance;
- prohibits camping, fires and motorized travel away from the entry road.

The independent [Visit Keweenaw solo-travel guide](https://www.visitkeweenaw.com/blog/post/guide-to-keweenaw-solo-travel/) describes the same preserve parking, falls sign, private road easement and approach. Its [Keweenaw waterfalls brochure](https://assets.simpleviewinc.com/simpleview/image/upload/v1/clients/keweenawmi/KCVB_summer_waterfalls_brochure_20230517_WEB_LOW_1__15f13fff-fd1f-4b37-9438-cd0a32dbaf4a.pdf) includes the falls and public access route, but its **E/easy** icon is not a guarantee of safe uneven bluff descent or a complete measured trail.

The independent [waterfall specialist's Conglomerate Falls page](https://www.waterfallsofthekeweenaw.com/gratiot-river/conglomerate-falls/) explicitly calls the river's long slide **Upper Gratiot River Falls** and maps it at **47.32985, -88.43395**. The original [Michigan GIS #136 Upper Falls](https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7) is **47.329239,-88.433472**, **76.9 metres** away by Haversine. The GIS natural-feature point and published waterfall photo viewpoint are **not car parking coordinates**. The separately mapped **Lower Gratiot Falls #137 is about 1.03 km downstream** and retains research-only status, historical ownership uncertainty and no inherited parking directions.

## Source and season boundaries

- KNA's daylight rule is **owner-published policy**, not an open-now claim. No real-time site gate, winter plow, trail closure or river flow data feed was found or introduced.
- KNA documents the **entry road to preserve parking**. Regional sources document a rustic walk to the river; no continuously surveyed legal footpath, accessible facility, safe riverbed scramble or bluff descent has been certified. The public guide uses the named owner parking and only qualitative trail advice.
- The old 2019 comment about a beaver pond cannot establish the state of the river in 2026; guide describes typical rock form, not an always-running 50-foot plunge.
- Do **not** navigate vehicles to #136 or the specialist's coordinates. No constructed destination lat/lng, Google driving URL to natural falls, parking pin, route polyline, swimming endorsement or public trail guarantee. The KNA cable must not be bypassed.
- **Distinct** from already-curated Great Conglomerate Falls in Gogebic County on the Black River; no duplicate canonical or direction.

## Implemented visitor experience

- New indexable initial-HTML guide at `/upper-peninsula-waterfalls/conglomerate-falls-gratiot/` (owner route, seasonal decision, natural-feature map, four independent source crosschecks, interpretive geology, Great-vs-Gratiot and Lower Gratiot distinctions).
- One curated map card, searchable Keweenaw region, canonical source links and six-stop shortlist reuse. Catalog grows **74 → 75**.
- GIS #136 exact-link source reconciliation and ledger promotion **67 → 68**; pending GIS **94 → 93**, with **Lower Gratiot #137 still blocked**.
- Existing noindex research page corrected in place to redirect readers to the current distinct canonical guide while preserving the 2019 provenance caveat. Historical opt-in GIS review annotated, not deleted.
- Nearby Python geodesic index regenerated **66 → 67** visitor-eligible suggestions; new links are straight-line natural-feature comparisons, not driving times. Queue regenerated deterministically.
- New URL added **once** to waterfall sitemap with its truthful `2026-11-03` creation date. Hub ItemList grows 72 → 73 and preserves existing item positions and Person identity, no change to Auto-ad policy.

## Exact-head verification required

`python3 scripts/build-up-waterfalls-nearby.py --check`; `node scripts/build-up-waterfall-review-queue.mjs --check`; `node --test tests/up-waterfalls-b64-kna-conglomerate.test.js`; existing B52/B57/B59/B60/B61/B62 and source-gate tests; **full `npm run verify:all`**; waterfall Chromium mobile/map smoke, name SERP, actual emitted-public HTML audit; successful Vercel preview and production after exact-head merge. Do not merge a failing or incomplete gate. Verify the live route, JSON-LD, KNA link, sitemap and decision after release.

**GSC baseline/outcome:** Not fetched or measured for this new URL; no CTR, impressions, traffic, or revenue uplift claimed.

**Next investment:** Source-verify Eagle River Upper / Ten-Foot Falls roadside parking jurisdiction, then determine whether it qualifies for a separate visitor experience.
