# Michigan Snowmobile: GPX export of DNR on-trail route

Date: November 13, 2026.
Scope: seven existing region pages, no new SEO URLs or backend services.

## Visitor outcome

After selecting 2–12 actual DNR trail junctions and successfully computing a
fully routable path, riders can:
- Download a standards-compliant GPX 1.1 track for a compatible GPS app.
- Copy a text summary of route distance, selected trail-junction labels,
  source timestamp and warnings for trip coordination.

The GPX is generated from the **actual route geometry returned by the
existing /api/snowmobile-route API**, which uses the DNR route graph and
Rust/WASM-backed shortest path. No geocoding, parking connectors, road paths
or straight-line interpolation.

## GPX format

Conforms to official TopoGrafix GPX 1.1:
https://www.topografix.com/GPX/1/1/

- `<metadata>` includes title, warnings, official DNR map URL and
  date when provided by the route response.
- Mapped DNR selected junctions are `<wpt>` elements. Their description
  expressly says they are **not parking locations or confirmed entrances**.
- The actual computed path is one ordered `<trk><trkseg>` with
  `<trkpt lat="..." lon="...">` in WGS84. Longitude is in `lon`, not
  accidentally reversed from the source GeoJSON `[lon,lat]` sequence.
- No fake elevation, point timestamps, driving directions or turn-by-turn
  instructions.
- Escaping prevents route names from injecting invalid GPX XML.
- The file has a deterministic region/date name, e.g.,
  `michigan-snowmobile-grayling-gaylord-2026-11-13.gpx`.

## Source safeguards

Export is offered **only** when a route is `routable=true`, has 2–12
selected mapped stops, positive plausible distance, actual valid Michigan
DNR centerline coordinates, nonempty segment evidence and no known closed
segment. It is blocked after request failures, a closed segment, an
incomplete graph or when any stop is edited / cleared. Mobile/browser
downloads use Blob and a generated file URL, revoked after download.

If the DNR closure feed was not verified, the GPX and UI both say that.
If the plan is outside December 1–March 31, the GPX and UI say it is not
riding permission. Even when DNR closure status was verified, GPX still
states that conditions and legal restrictions can change after export.
**Downloadable GPX is not a live status feed, an offline basemap, or a
guarantee of safe travel.** It does not provide route guidance from any
of the 105 DNR parking assets or 5 Keweenaw club staging sites.

Source check: the GPX path/waypoint model follows TopoGrafix GPX 1.1.
The route source remains the existing Michigan DNR designated-snowmobile
trail geometry and closure feed. No additional proprietary map data used.

## Test and release

```sh
node --test tests/snowmobile-route-export.test.js
node --test tests/snowmobile-route-ui.test.js tests/snowmobile-route-ux.test.js
node scripts/generate-snowmobile-region-pages.mjs
# CI installs isolated Playwright; actual Chrome at 390px + desktop:
node scripts/verify-snowmobile-gpx-browser.cjs
```

Unit tests independently parse the generated XML using Python's standard
`xml.etree.ElementTree`, verify coordinate order, waypoint/track counts,
XML escaping, closure/off-season labels, and failure cases.

Real browser QA verifies a GPX Blob is downloaded and opens on disk,
copy-summary behavior, that edits remove the buttons, that closed
segments never offer downloads, that DNR route requests can fail without
stale GPX, and that mobile card width stays within a 390px viewport.

Canonical tags, AdSense, GA4, public URLs, site templates, DNR
route API, Rust/WASM code, closure scoring and parking source policy
remain unchanged. Measure GPX downloads and summary copies through the
existing analytics helper. An app receiving the file must supply
offline map tiles or its own navigation separately.

After deploy, verify Vercel success and live page scripts. Browser-source
tests use fixtures; they are **not** a physical on-trail verification.
