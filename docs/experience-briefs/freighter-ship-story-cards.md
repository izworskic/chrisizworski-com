# Ship photo and history cards — 2026-11-03

## Visitor outcome

Select a ship and see a real, credited historical photograph and a short, sourced vessel story alongside its current AIS report. The photo is explicitly identified as historical, not a live view. The full existing biography remains one click away.

## Evidence and identity

The first two cards reuse existing first-party biography text, linked sources and locally hosted photos. Lee A. Tregurtha, IMO 5385625 / MMSI 366904950, was cross-checked against VesselFinder and MyShipTracking; its 2021 photo is credited to U.S. Army Corps of Engineers Detroit District, public domain. James R. Barker, IMO 7390260 / MMSI 366905890, was cross-checked against MyShipTracking and Maritime Optima; the 2014 photograph is Levi Gates, CC BY-SA 4.0, with links to the source and license. All exact source links are in `public/assets/freighter-card-stories.json`.

Match requires the exact current MMSI and normalized current AIS name together; ambiguous, unnamed, unknown, renamed, expired or otherwise mismatched identities show only the ordinary AIS card. Mappings expire 180 days after the dated review; a later re-verification is required. These corroborated public-provider mappings are not a guarantee against spoofed or erroneous AIS. No photos are assigned solely by vessel name. Identity source failures do not block the live map. The catalog is a reviewed static file, not a new live API.

## Interaction and limits

The existing selected-ship inspector owns the ship state. The photo, source and story render only if that selected identity remains current when the catalog response completes; switching to another ship clears old content. A failed catalog fetch, missing photo or unrecognized vessel never blocks the AIS report. The displayed photograph is not the ship's current location and the link to a past winter does not assert current layup. Screen-reader labels, source credits, visible image date, keyboard links, mobile stacking and no-image fallback remain part of release review.

Python-backed geographic tests continue to validate the desk. This feature uses existing web display logic, not Python as a live ship identity service. No traffic, CTR or revenue lift is measured. Real-browser and independent accessibility checks plus exact-head hosted CI and preview evidence are required before release.
