# Michigan Boat Launch Data Policy

## Purpose

The Boat Launch Finder is an operational location tool. A wrong launch name or pin is a product failure, not a minor content error. The map therefore follows a source-first rule: **a launch is displayed only after a qualified source establishes that the facility exists and provides enough location evidence for the way the site will use it.**

## Tier 1 — Michigan DNR boating-access records

The primary inventory is the Michigan DNR Parks and Recreation boating-access FeatureServer:

`https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/PRDBASPublicView/FeatureServer/0`

A DNR record is eligible for the Great Lakes finder only when all of the following are true:

- `bas_type = Boating Access Site`
- `launch_status = Open`
- `greatlakesaccess` begins with `Yes`
- latitude and longitude are present
- `referenceonly` is not `Yes`
- `flag` is empty

The DNR facility identifier is the record key. The DNR latitude/longitude is used for the map pin and Google Maps handoff. The site may describe the collection precision shown by `collecttype`, but it must not silently replace the DNR coordinate with a guessed point.

## Tier 2 — Supplemental municipal, county, tribal or private-public launches

A launch that is not represented in the Tier 1 inventory may be added only through a supplemental registry. It must not be created by fuzzy-matching a place name against an existing list.

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

Secondary sources may be used to catch conflicts, name changes, closures and map errors. They are evidence for review, not a substitute for the owning source. Material conflicts keep the record out of the production inventory until resolved.

## Display rules

- The map, launch card and directions action must all use the same facility ID and source coordinate.
- Source-qualified does not mean survey-grade. Coordinate collection precision should be disclosed when the source supplies it.
- Closed, flagged, reference-only or unresolved records are excluded.
- When the authoritative data source is unavailable, the application fails closed. It does not resurrect cached hand-authored or legacy coordinates.
- No feature count is a product requirement. Accuracy outranks inventory size.

## Bay City State Park correction

The former site inventory contained a fabricated `Bay City State Park Launch` record. Michigan DNR describes boating access sites as being **near** Bay City State Park rather than identifying a launch in the park. That record is removed and cannot be recreated by name similarity.

A real nearby example is the Bangor Township/Independence Boat Launch at 1600 Martin Street. It may appear through the DNR inventory if the DNR record qualifies. If it requires a supplemental entry, the Bangor Township facility information is an appropriate owner/operator source and must be stored with the supplemental record.

## Maintenance

Before a launch-data release:

1. Run the source-integrity benchmark and full test suite.
2. Inspect newly added or materially changed records against their source.
3. Sample routing links in each Great Lakes region to confirm the card, marker and destination share one record.
4. Review source timestamps/QA fields for unexpected stale or flagged records.
5. Do not merge if an unresolved location conflict is known.
