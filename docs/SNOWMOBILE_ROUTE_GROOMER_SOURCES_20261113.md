# Snowmobile route-level groomer source reconciliation
Date: November 13, 2026. Official DNR source and public links verified during this task.

## Goal
Identify the MISORVA club-report source for the DNR grooming sponsors of the exact snowmobile trail segments traversed by a rider's computed route. Do not claim live grooming, current rideability, legal entrance, seasonal opening or trail condition from sponsorship.

## Source
Michigan DNR DNRTrailsOPENDATA FeatureServer/15, distinct TrailGrooming names: https://gisagoegle.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/FeatureServer/15
Live query on November 13, 2026 returned 71 distinct TrailGrooming values. 19 exact ID/name pairs matched known MISORVA club report pages. See lib/snowmobile/route-club-sources.cjs for the reviewed frozen 19-pair crosswalk.

Examples: 1714 Snow Sault Snowmobile Association; 1149 Snow Keweenaw Trails Services Inc; 2342 Snow Grand Traverse Area Snowmobile Club; 2422 Snow Cadillac Winter Promotions; 2570 Snow Greater Grayling Snowmobile Association; 2152 Snow Gaylord Area Snow Trails Council; Snow Pere Marquette Snowmobile Club 2432.

## Safety contract
1. Join DNR segment properties.id to exact route.segmentIds from the already computed official centerline graph. No new DNR fetch. No route geometry, GPX, distance or closure changes.
2. Require BOTH groomer ID and complete official DNR name; numeric code reuse or changed names MUST fail closed.
3. Exact matched club receives a verified-source link, not an assertion of report freshness. Club posting date must be read at the source; a recent source check is not recent grooming.
4. Incomplete, conflicting, unknown or Not Groomed sponsors stay explicitly unmatched. Never infer a club from county, route proximity or neighboring trail.
5. A nonroutable or closed route receives no club recommendation. Stale local reports never promote condition scores or legal access.
6. Deduplicate out-and-back DNR segment IDs so the dashboard's matched/unmatched counts mean unique sections.
7. Protect all seven public URLs, canonical tags, AdSense, Rust routing, snowmobile parking and visitor exports.

## Verification
Tests: exact 19 DNR identities, source URL roster reconciliation, unknown and changed-name rejection, duplicate route legs, conflict rejection, missing field fail-closed, no-route behavior, rendering escape and safe link validation, regional page generation and original route UI.

Later work: reconcile additional DNR sponsors only where their actual current public report URL and coverage are defensible. Never claim a source exists merely because the DNR lists a club.