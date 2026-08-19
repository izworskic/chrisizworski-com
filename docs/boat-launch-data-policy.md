# Michigan Boat Launch Data Policy

## Purpose

The Boat Launch Finder is an operational location tool. A wrong launch name or pin is a product failure, not a minor content error. The map follows a source-first rule: **a launch appears only after a qualified source establishes that the facility exists and provides enough location evidence for the way the site will use it.**

Accuracy and usefulness are separate release gates. The site must not invent a launch to improve coverage, but it also must not silently discard an official open launch because an optional identifier is blank or because DNR is reviewing ancillary facility metadata.

## Tier 1 — Michigan DNR boating-access records

The primary inventory is the Michigan DNR Parks and Recreation boating-access FeatureServer:

`https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/PRDBASPublicView/FeatureServer/0`

A DNR record can enter the Great Lakes finder only when all of the following are true:

- `bas_type = Boating Access Site`
- `launch_status = Open`
- `greatlakesaccess` begins with `Yes`
- latitude and longitude are present and numeric
- `referenceonly` is not `Yes`
- a stable source identity exists

### Stable source identity

`facilityid` is nullable in the DNR schema and therefore is **not** a completeness gate. V3 uses this order:

1. `facilityid` when present;
2. otherwise `globalid`;
3. otherwise `OBJECTID`.

The normalized source ID keys the launch card, map pin and routing action. The DNR latitude/longitude is used for the marker and Google Maps handoff. The site may describe the collection precision shown by `collecttype`, but it must not silently replace the DNR coordinate with a guessed point.

### DNR facility-review states

The DNR `flag` field is facility review status. It is not the same as `launch_status`.

The finder uses three review outcomes:

#### A. Source-qualified

`flag` is blank.

- May appear normally.
- Source-backed ramp, parking, lane, fee and hours fields may be used by filters and displayed when present.

#### B. DNR review in progress

`flag = InProgress`.

- May appear because it remains an official DNR record whose launch status is Open and whose location is published.
- Must carry an obvious **DNR review in progress** badge in the list and a distinct map treatment.
- Facility-detail fields such as ramp class, parking, fees and hours are labeled provisional.
- A review-in-progress record **cannot satisfy an explicit ramp-class or trailer-parking filter**. The finder must not turn provisional metadata into a precise decision promise.
- The raw internal `flagcomments` may be retained for QA, but the site should not expose shorthand/internal review notes as consumer guidance.

#### C. Withheld

`flag = Flag` (Review Needed), an unknown future nonblank flag, reference-only status, missing source identity, or invalid coordinates.

- Does not appear automatically.
- Requires source reconciliation or independent authoritative corroboration before production use.

## Tier 2 — Supplemental municipal, county, tribal or private-public launches

A launch that is absent from the usable DNR inventory may be added only through a supplemental registry. It must not be created by fuzzy-matching a place name against an existing list.

Every supplemental record must contain:

- stable internal ID
- official facility name
- owner/operator
- waterbody
- public-access status
- official source URL
- verification date
- location evidence type
- latitude/longitude only when the official source or official GIS supplies a defensible point
- ramp/parking/fee/seasonal details only when supported by the cited source

### Required evidence

At least one source must be from the facility owner/operator or an authoritative government/tribal GIS or facility directory. Search-engine snippets, crowd-sourced maps, marina aggregators and tourism pages can corroborate a facility but cannot establish it by themselves.

If the official source establishes that a launch exists but provides only a street address, the site may provide a place/address search handoff. It must not convert an estimated map point into a turn-by-turn coordinate and label it exact.

## Tier 3 — Corroboration and QA

Secondary sources may be used to catch conflicts, name changes, closures and map errors. They are evidence for review, not a substitute for the owning source. Material location conflicts keep a supplemental record out of production until resolved.

## Display rules

- The map, launch card and directions action use the same normalized source ID and source coordinate.
- Source-qualified does not mean survey-grade. Coordinate collection precision should be disclosed when the source supplies it.
- DNR review-in-progress records are visibly provisional, not silently promoted to source-qualified.
- Missing fields are shown as unknown/not listed rather than inferred.
- When the authoritative data source is unavailable, the application fails closed. It does not resurrect cached hand-authored or legacy coordinates.
- No fixed feature count is a product requirement. Accuracy and useful geographic coverage are both measured.

## Bay City State Park correction

The former site inventory contained a fabricated `Bay City State Park Launch` record. Michigan DNR describes boating access sites as being near Bay City State Park rather than identifying a launch in the park. That record is removed and cannot be recreated by name similarity.

A real nearby example is the Bangor Township/Independence Boat Launch at 1600 Martin Street. It may appear through the DNR inventory if the DNR record qualifies. If it requires a supplemental entry, the Bangor Township facility information is an appropriate owner/operator source and must be stored with the supplemental record.

## Maintenance

Before a launch-data release:

1. Run `npm run audit:boat-launch-source`, both boat-launch benchmarks and the full test suite.
2. Inspect new or materially changed source/review states.
3. Sample routing links in each Great Lakes region to confirm the card, marker and destination share one record.
4. Run the acceptance-destination set and record result counts, including how many are source-qualified versus DNR review in progress.
5. Investigate known geographic gaps for Tier 2 evidence without inventing points.
6. Do not merge if an unresolved location conflict is known.
