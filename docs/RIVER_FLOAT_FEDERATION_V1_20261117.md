# River Float Engine Federation: 2027 Spring Contract

Status: proposed read-only interface, not published until its owning pull request is merged, deployed, and smoke-tested.

## Manistee is the reference implementation

Authoritative URL: https://chrisizworski.com/manistee-river-map/

Source in this repository:
- public/assets/manistee-river-data.js owns stable place IDs, names, coordinates, land-manager links and provenance.
- public/assets/manistee-route-core.js owns exactly one graph implementation, used both in the browser and from the server.
- api/manistee-river-hydrography.js owns the NHD source query, source metadata and response normalization.
- api/manistee-float-v1.js is a read-only consumer of those original modules, not an independent route dataset.

API: https://chrisizworski.com/api/manistee-float-v1

Read-only operations:
- GET ?mode=access gives a versioned, original-ID access catalog, available waterways and a link to the specialist field map.
- GET ?mode=route&from=pine-elm-flats&to=pine-peterson&speedMph=3 returns a source-backed modeled NHD distance, a speed-derived planning time and exact access records, but only if the current USGS geometry connects the points.
- Add &geometry=1 to receive a GeoJSON LineString with coordinate order longitude,latitude. The unrequested or too-large geometry returns null; it is never replaced by a made-up straight line.
- HEAD supports access and valid route requests without triggering external hydrography work.

Result schema:
- contract: "manistee-float/v1"
- kind: "access-catalog" or "river-network-route"
- owner: canonical specialist URL
- registryVersion: original field map data version
- status: "published-access-inventory" or "mapped-route-estimate"
- from/to: source-qualified place records, including exact original IDs
- route.miles: river-network graph estimate only
- route.geometry: optional source-derived GeoJSON
- route.startSnapMiles/endSnapMiles: connection distance between source point and NHD line
- route.estimatedHoursAtSelectedSpeed: explicit arithmetic, not a verified float time
- currentAccessVerified, navigabilityVerified and directionVerified: always false

Errors are explicit and uncached. Invalid IDs, cross-waterway pairs, non-routable places and source outages are never assigned a fallback mileage. Upstream NHD features must come from the existing named-flowline endpoint.

Access records are coordinates and facility references, not current open status, a legal launch entrance, or an assurance of river direction. The existing graph uses bidirectional NHD edges. The consumer must not interpret a result as an approved downstream trip. The time calculation does not account for wind, current, dams, portages, rapids, stops or local conditions.

Publication is additive. No new indexable float page, duplicate canonical, site ad setting change or independent data registry is created.

## Au Sable source boundary

Canonical specialist: https://ausable.chrisizworski.com/
Recovered source: tool-sources/ausable-river-map/index.html and provenance.json.

The complete recovered HTML contains the Au Sable in-browser float planner, access inventory and deep-link arguments b/from/to. The original deployment manifest identifies API helper files api/share.js and api/snapshot.js, but their complete source text is not recovered. The stored deployment/project IDs were not accessible through the currently connected Vercel project scope on November 17, 2026 (404 responses). Recovered HTML and public endpoint responses are not substitutes for complete API implementation source.

Until those sources are fully obtained and reviewed:
- Keep Au Sable route calculation, access inventory and trip-sharing in the existing field map.
- A federation consumer can use an explicit canonical handoff and documented deep link only when it already holds validated Au Sable landing IDs.
- Do not mirror the HTML access array into another repo and do not create a fabricated Au Sable server engine.
- Avoid registering any Au Sable route API as active or versioned before its deployed source is complete.
- Preserve the original 50-file deployment manifest and its immutability evidence.

Next recovery action: obtain the original project and deployment source from the account/team that owns the Vercel project, verify api/share.js and api/snapshot.js completely against the original hashes, and then define a source-owned read-only API for the existing Au Sable planner.

## Consumer release order

1. Merge the Manistee API PR only after full main-repository verification and client/browser QA.
2. Verify the deployed original field map still produces exactly the same routes and retains ads/canonical.
3. Smoke-test valid and intentionally unavailable API requests against deployed production with no fake values.
4. Merge the National Rivers adapter PR after it passes its own tests and its live Manistee catalog probe matches manistee-float/v1.
5. Do not automatically present Au Sable route APIs as available until recovery is done.

The existing field maps remain the primary place for selecting public arrival and departure locations.
