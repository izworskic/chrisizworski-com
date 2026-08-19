# Boat Launch Finder V3 — Implementation Prompt

You are rebuilding the Michigan Great Lakes Boat Launch Finder on chrisizworski.com. Do not start by redesigning the map. Start by proving the data model and the user job.

## Product goal

Build the tool a Michigan boater would actually use on a phone while deciding where to launch:

> I tell the tool where I want to boat. It returns a trustworthy shortlist of real launch sites near that destination, shows exactly where each launch is, explains the practical differences, and gets me to the correct ramp.

Accuracy is mandatory, but a technically accurate tool that returns no useful choices is a failed product.

## Hard lessons from prior versions

1. A hand-authored launch inventory plus fuzzy matching created a false `Bay City State Park Launch`. Never recreate that architecture.
2. The source-first correction then overfiltered the DNR feed and changed the destination box into a substring filter. That made the tool accurate in theory but frequently useless in practice.
3. `facilityid` in the DNR layer is nullable. Do not discard an otherwise valid authoritative record solely because that field is absent. Prefer `facilityid` when present and use another stable source identifier (`globalid` or OBJECTID plus source provenance) when necessary.
4. A query such as `Bay City, MI` or `Saginaw Bay` is a destination request, not a demand that those words appear in a launch's official facility record.

## Phase 1 — Research the source before coding

Before changing production UI, inspect the current Michigan DNR `PRDBASPublicView` FeatureServer layer and produce a source audit in the PR description or a checked-in report. The audit must include:

- total records;
- open boating-access records;
- counts for each `greatlakesaccess` coded value;
- count and examples where `facilityid` is null but `globalid`/OBJECTID is present;
- counts of `referenceonly`, `flag=Flag`, and `flag=InProgress` records;
- sample source records within 25 miles of Bay City, Tawas City, Alpena, Mackinaw City, Petoskey, Ludington, Holland, South Haven, Munising, Marquette and Monroe;
- confirmation that the latitude/longitude fields correspond to the actual facility location closely enough for directions;
- evidence of whether the DNR inventory includes state and local grant-in-aid/public launches relevant to the Great Lakes.

Do not infer these results. Execute the source queries and record the findings.

## Phase 2 — Data architecture

### Primary inventory
Use Michigan DNR Parks & Recreation boating-access data as the primary canonical inventory because it provides structured source fields for facility status, Great Lakes access, coordinates, ramp class, lanes, parking, hours, closures and ownership/administration.

Normalize each accepted record into a stable internal shape such as:

```js
{
  id,
  sourceType: 'michigan-dnr',
  sourceId,
  sourceUrl,
  name,
  latitude,
  longitude,
  waterbody,
  county,
  greatLakesAccess,
  rampClass,
  lanes,
  trailerParking,
  carryDown,
  piers,
  fee,
  operatingHours,
  operator,
  closureUrl,
  sourceUpdatedAt,
  qaStatus
}
```

Never create coordinates through fuzzy matching.

### Source eligibility

- `launch_status=Open` is eligible.
- `referenceonly=Yes` is not displayed as a normal launch.
- `flag=Flag` or `flag=InProgress` is excluded from verified results unless a separate authoritative operator source resolves the issue.
- Great Lakes access records should include the DNR coded `Yes` categories.
- Missing optional fields are allowed and shown as `Not listed`; missing optional data must not erase a real launch.
- Use `facilityid` when present, otherwise use a stable authoritative identifier rather than dropping the record.

### Supplemental registry
If an important public-access municipal/county/tribal launch or public-use private marina is absent from the DNR inventory, it may be added only through a separate supplemental registry. Every supplemental record must include:

- exact facility name;
- operator/owner;
- authoritative operator or government source URL;
- exact or defensible source coordinate;
- date verified;
- public access type and any fee/restriction noted by the source.

Search snippets, tourism articles, user reviews and crowd-sourced map labels can help discover candidates but cannot establish a production launch by themselves.

## Phase 3 — Destination search, not record filtering

The main box should say something like `Where do you want to launch?` and accept destinations such as:

- Bay City, MI
- Saginaw Bay
- Tawas City
- Alpena
- Ludington
- Munising

Resolve the destination to a geographic point using a reliable geocoding approach. Then calculate geographic distance from the destination to every source-qualified launch.

Behavior:

1. Search a useful default radius (for example 20–25 miles).
2. Return the nearest verified launches regardless of whether the destination words appear in the facility name or DNR waterbody field.
3. Prefer a 3–5 result shortlist.
4. If fewer than three verified launches are available, expand the radius transparently and tell the user the expanded distance.
5. If no verified launch is available, explain that explicitly and offer the nearest verified result rather than silently showing an empty map.
6. Keep launch-name search as a secondary path for users who already know a facility.
7. Map bounds should fit the destination point plus returned launches, not the whole state.

Do not implement destination search as `recordText.includes(query)`.

## Phase 4 — Decision experience

The result card should help a trailer boater make a decision in seconds. Prioritize:

- launch name;
- distance from chosen destination;
- access waterbody / Great Lakes connection;
- ramp class and whether it is suitable for larger trailerable craft when the DNR says so;
- launch lanes;
- trailer parking;
- fee / Recreation Passport requirement when source-backed;
- hours or closure status;
- operator;
- source freshness;
- `Directions` to the verified ramp coordinate;
- `View official source`.

Use clear language rather than exposing raw DNR field names.

Never manufacture advice such as `best for walleye`, `protected in a north wind`, or `easy ramp` unless the statement is supported by an appropriate source or derived transparently from data with a documented rule.

## Phase 5 — Map UX

- The destination gets a visually distinct marker.
- Launch pins are numbered to match the shortlist.
- Selecting a result card highlights and zooms its pin.
- Selecting a pin opens/highlights the matching card.
- The initial post-search view should show the actual launch choices prominently; do not make the user hunt across a statewide map.
- On phones, the shortlist should be usable without fighting the map. Consider a map/list toggle or compact map above a short ranked list.
- Preserve visible attribution for map tiles and source data.

## Phase 6 — Conditions, only after the core finder works

Once launch discovery is correct, optionally enrich the shortlist with relevant NOAA/NWS observations or marine forecast context.

Conditions must be labeled regional when they are not measured at the ramp. Do not produce a safety score that implies ramp-level certainty. Official closures, NWS hazards and marine warnings outrank convenience ranking.

## Phase 7 — Benchmark and acceptance

Use `benchmarks/boat-launch-product-v3.json` as the release contract.

The implementation must score at least 95/100 with zero fatal failures.

Mandatory acceptance checks include:

- `Bay City, MI` returns verified nearby launch choices and never returns `Bay City State Park Launch`.
- Destination searches for Tawas City, Alpena, Mackinaw City, Petoskey, Ludington, Holland, South Haven, Munising, Marquette and Monroe return nonzero verified results when the authoritative inventory contains nearby launches.
- A destination need not appear as text in a facility record for that facility to be returned by proximity.
- Every card/pin/directions action traces to one normalized source record.
- Source failure and true zero-results are visibly different states.
- The page is exercised on phone and desktop before merge.

## Phase 8 — Search/SEO

Preserve the canonical parent URL and useful crawlable copy. Add regional internal links only when they correspond to useful destination/launch content, not thin keyword pages. Structured data must describe the page/tool honestly and must not publish an invented fixed launch count.

## Required delivery sequence

1. Source audit and findings.
2. Data normalization and tests.
3. Destination geospatial search and acceptance tests.
4. Map/list interaction.
5. Decision details.
6. Conditions enrichment only if the first five are solid.
7. Run the V3 benchmark.
8. Deploy a preview.
9. Manually exercise Bay City/Saginaw Bay plus at least four geographically diverse acceptance destinations on mobile and desktop.
10. Merge only after all gates pass.

Do not optimize for number of features. Optimize for a boater successfully finding a real ramp near where they want to boat.
