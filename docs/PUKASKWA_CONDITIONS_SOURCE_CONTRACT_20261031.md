# Pukaskwa trail conditions: source contract and first implementation
**Checked:** 2026-10-31 (America/Toronto)  
**Status:** Source-only prototype in `lib/pukaskwa`; no public tool, no scheduled collection, no live-status guarantee.

## Visitor decision

Before selecting a hike, establish whether the official trail status is a recent *dated* report, a closure, an out-of-season backcountry route, or unknown. Do not treat page retrieval time as condition-observation time. A green agency row without a fresh issue date is not an authoritative claim of current access.

## Primary evidence

| Role | Parks Canada source | 2026-10-31 finding | Caveat |
| --- | --- | --- | --- |
| Day-hike distances, difficulty, durations, elevation | https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking | Eight published hike itineraries (including combination and fire walk). Southern Headland 2.2 km / 75 min; White River 18 km / 8–9 h. | Not a live-access source |
| Individual condition rows | https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking/etat-sentiers-trail-conditions | White River Suspension Bridge Trail **Closed** Oct 22; five named Hattie Cove day trails marked **Open** Oct 12; segmented coastal and Mdaabii records marked open Oct 12. | **Public HTML, not a verified API**. Status observation dates may be old; descriptions may change |
| Operating hours | https://parks.canada.ca/pn-np/on/pukaskwa/visit/heures-hours | Backcountry operating dates May 15–Oct 15; weather dependent. | Conflicts with reservation guidance |
| Backcountry reservation guidance | https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/arriere-back | Backcountry dates May 15–Oct **14**; permits and safety orientation required. | Treat **May 15–Oct 14** as conservative overlap, not guaranteed booking access |

## Scope delivered

- Registry: verified official day-hike distances and durations without inventing geometry, campsite coordinates or permit availability. Includes two itineraries with **no dedicated condition row**.
- Collector: manual, bounded fetch from a fixed official HTTPS URL; checks HTTP status, content-type and final host; uses source HTML tables only. Unexpected layout, missing named rows, reduced segment coverage and duplicates produce a hard error. No snapshot is written on failure.
- Decision logic: an explicit **closed** observation blocks recommendations until superseded by an official observation; a dated open observation older than seven days is `stale` rather than `open`; absent or unsupported statuses are `unverified`; backcountry outside the conservative season is `out-of-season` even when a prior table says open.
- Whole backcountry routes and the Combination Hike intentionally remain `unverified` even when component rows say open: connectivity, river crossings, access and permits require independent confirmation.
- `recently-reported-open` never means the hike is safe or guaranteed available. The UI must show the issue date and source with that status.

## Manual proof of collection

```sh
node --test tests/pukaskwa-conditions.test.js
node scripts/pukaskwa/refresh-conditions.mjs
node scripts/pukaskwa/refresh-conditions.mjs --output /tmp/pukaskwa-review.json
```

The default CLI only prints a status summary. The `--output` flag is required to write a JSON review snapshot. Neither the repository nor the production site has automatic publication or scheduled collection as a result of this change. Do not wire it to visitor-facing pages without a source-policy review, a live test of HTML stability and a freshness/failure monitoring strategy. A genuine official feed would be preferable if Parks Canada makes one available.

## Tricky safety cases and exclusions

1. October 31 bridge: `closed` using issue date October 22; never offer the bridge as a valid all-day hike.
2. October 31 Southern Headland: October 12 official *open* row is `stale`, not currently confirmed open.
3. October 15 backcountry: date conflict leads to conservative `out-of-season`, not an inferred permit authorization.
4. Fire Walk: no dedicated status row; no inference from adjacent Coastal Hiking Trail.
5. Combination Hike: components may be available but connecting pathways unverified.
6. Missing source: leave status unverified; do not infer open conditions from prior fetches.
7. No mapping or sensitive cultural-site features are part of this initial registry.

## Next development gate

1. Validate the collector against a true live run in an authorized GitHub runner and store non-public evidence of the returned shape (no claim of live publication).
2. Confirm permitted access to the source / check whether Parks Canada provides a supported data feed. Define responsible request cadence and durable failure alerts before scheduling.
3. Add explicit change detection and latest-source timestamps; integrate a small, accessible status card and deterministic alternatives only after it can pass the source reliability tests.
4. Separately correct the already-identified Circle Tour statement: Southern Headland Trail is **2.2 km**, not **10 km**, and Hattie Cove is road-accessible by Highway 627. Preserve the original canonical, ads, attribution and full merge gates.

**Owning repository:** `izworskic/chrisizworski-com`. This change intentionally does not alter production HTML, sitemap, canonical, JSON-LD, AdSense, or Redis dependencies.
