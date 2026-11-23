# Calumet map marker and popup parity — 2026-11-23

## Visitor need and verified code baseline

The Working Rivers pages share their new visual layout, but the map interactions drifted. Calumet showed approximate public places and NOAA bridge locations as generic circular glyphs with name-only hover tooltips, and ship selection updated a sidebar without opening an information bubble. Cuyahoga uses location-specific SVG shore markers, actionable park popups, and the exact Soo Locks vessel silhouettes with an AIS detail popup.

## Design choices

Option A: Build a new universal map component and migrate both existing tools. This would increase refactor risk and potentially weaken distinct, source-backed river experiences. Rejected.

Option B: Bring the successful Cleveland map grammar to Chicago, preserving its own bridge/industrial subject matter and independent source controls. Selected. The first phone screen remains the same map-first river desk; tap targets now open detailed bubbles instead of name-only tooltips.

## Implemented changes

- **Soo vessel symbols:** Calumet now calls the exact SeawayVesselIcons.icon factory used by Cuyahoga and loads soo-vessel-icons.css. The illustrations scale by reported length band and show a selected state. The separate compass badge is removed to match Cleveland, while reported travel course or true heading is explained as text only when source-supported. The existing AIS type-count/filters keep the shared RiverWatchVesselUI.
- **Public view markers:** distinct outlined SVG pins for the 95th Street bridge public sidewalk *area* and Calumet Park lakefront *area*. Cuyahoga-style click popup: title, actual documented visitor description, Google Maps place search, documentary/official source, explicit sidewalk/parking/view caution. Where ship and place drawings overlap, only the pin drawing is lifted; the source position never changes.
- **Bridge references:** a roadway-bascule schematic and a different railroad vertical-lift schematic. The popups contain published bridge name/type, NOAA river mile, described engineering, NOAA source and Coast Guard navigation notices. They say clearly that a chart coordinate is not a verified place to stand or live opening report.
- **AIS bubbles:** single Leaflet popup after clicking a vessel on the map or in the reported-ship list, with vessel name, reported AIS type, length in feet if known, speed in knots if known, Chicago-local report time, MMSI, source, valid travel course or true heading, last geographic position and full tracker link. A new click replaces the previous popup; detailed selection rail still updates.
- **Source truth:** no ETA, invented vessel status, direction or public entrance. Calumet fresh AIS bounds, dedup and 30-minute age rule remain in place. A 0–359-degree heading can pass through the existing core only when supplied by AIS; no new API or data provider.

## Technology and release

Only existing HTML/CSS, SVG, Leaflet and vanilla browser JavaScript are needed. No Python runtime, Java, Rust, database, Redis, paid service, Vercel function, new route, ad alteration, sitemap, canonical or Person schema change. Playwright/Python remains a test-only tool.

The scoped browser workflow checks five widths (360, 390, 768, 1280, 1440), ship popups and fields, source caveats, bridge/public markers, a single popup at a time, AIS filtering, fallback, no JavaScript and page overflow. Full repository verification, preview status, branded search protection and screenshot inspection are release gates. Do not merge until owner authorization; do not claim visitor outcome improvement or production availability based on a passing branch gate.
