# Michigan Snowmobile — DNR-listed parking discovery

Date: 2026-11-13. First implementation for the seven regional pages.
Do not treat these records as a roster of confirmed accessible trailheads.

## Authoritative source

Michigan DNR's public snowmobile map explicitly includes parking lots:
https://www.michigan.gov/dnr/things-to-do/snowmobiling/where

The live field-asset GIS source:
https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/DNRReferenceAssetsOPENDATA/FeatureServer/6

It identifies `DNR Managed Parking Lots`, as point locations. DNR field staff
provide attributes: asset description, comments, asset detail type, owner,
admin/maintenance tags, coordinates, and last-edited timestamp.

A real query on 2026-11-13 found 127 records with *snowmobile* in their
description or comments. This is a **source candidate count**, not an
approved-access/verified-lot count. Of these, 102 had owner `State` and 15
had owner `Private`; the remaining records had mixed ownership including
federal, local, unknown and unspecified.

## Release logic

`/api/snowmobile-parking` retrieves official GeoJSON on demand with an
explicit 9.5-second timeout, bounded query, 30-minute cache and no-index.
No generalized geocoding, guessed parking addresses or scraper summaries.

`lib/snowmobile/parking.cjs` accepts a site only when it has:
- valid DNR OBJECTID and WGS84 coordinates inside Michigan's broad limits;
- DNR asset type containing `Parking Lot`;
- `Trail Access-Motorized` or `Trail Access-Both`;
- snowmobile explicitly identified in the source description or comments;
- public owner (`State`, `Federal`, `County`, `Municipal`).
It rejects `Private`, `Unknown`, `Unspecified` and null ownership.
Public owner does not establish open access or permission to ride.

A truncated feature response is an error; if DNR is offline, zero locations
are shown, and the visitor is sent to the official DNR interactive map.
Source-check time is labeled as such, not mistaken for a lot inspection.

## Geographic relation — not a route link

`public/assets/snowmobile-parking.js` evaluates distance from each parking
point to the **already-loaded DNR regional trail overlay** (at most 0.9
straight-line miles). It ignores the lines known legally CLOSED.
This is conservative proximity information, not a walking/driving trail
connection, groomed status, access, entry point, legal crossing, or evidence
that a lot can hold a truck with trailer. In particular, no parking point
gets inserted into the official node graph or Rust router. A road-side
parking site could be near a trail but not a lawful entry.

Cards and pins show the DNR asset's published description and dated field
provenance; Google Maps navigates to the **parking pin**, not onto a trail.
Never claim real-time vacancy, plowing, current opening, trailer
capacity, accessibility or required permit specifics for any given lot.

DNR winter rules: designated snowmobile trails normally operate Dec 1
through Mar 31; verify current closure and riding rules. The DNR notes
that Recreation Passport requirements apply to many parking areas. See:
https://www.michigan.gov/dnr/things-to-do/snowmobiling/permits-and-requirements

## Release validation

```sh
node --test tests/snowmobile-parking.test.js tests/snowmobile-route-ui.test.js tests/snowmobile-routing.test.js tests/snowmobile-rust.test.js
node scripts/generate-snowmobile-region-pages.mjs
node scripts/benchmark-snowmobile.mjs --check
```

Keep page canonicals, search-facing body copy, AdSense, GA4, the DNR
closure feed, and existing Rust/JS route graph untouched. Verify one live
regional page and its parking endpoint after Vercel production deployment.
