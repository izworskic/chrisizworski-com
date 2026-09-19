# Petoskey wine planner release, September 19, 2026

Chris reports AdSense approval today and authorized ad serving. A real ad was
observed in the production planner browser, with one matching publisher meta tag
and async AdSense loader in the HTML head. This is not a claim that every visitor
or every pageview will receive an ad, or a private-account policy audit.

## Completed

- Sync the authoritative planner source from izworskic/petoskey-wine-region PR #2.
- Replace watermarked CARTO tiles with the existing OpenStreetMap basemap.
- Repair popup winery-guide links to stay under /petoskey-wine/.
- Rebuild the itinerary when its date or starting town changes; previously the
  Sunday popup could disagree with Saturday hours still in the itinerary.
- Keep the designated-driver checkbox and its displayed state in sync.
- Include the return leg in total driving and the Google Maps loop destination.
- Associate form labels with inputs and use the destination local date.
- Match the routing API cap to twelve saved stops plus start and return, and
  reject out-of-range coordinates before calling the routing provider.
- Retain all 33 content pages, canonical URLs and the tools-directory listing.
- Record owner authorization so obsolete internal traffic thresholds cannot be
  mistaken for a reason to disable the approved ad implementation.

## Verification before release

- Owner npm run check: data gate and static Next build passed.
- Hub npm run verify:all: all 458 tests and all registered gates passed.
- New integration check executes the production tag injector twice against a
  temporary copy of the complete section. All 33 content heads contain exactly
  one async AdSense loader and the correct publisher meta; both 404 outputs
  have no ad loader. Publisher, contact, privacy and terms links are reachable.
- Seller record: google.com, pub-8222782620788075, DIRECT, f08c47fec0942fa0.
- API regression checks cover a twelve-stop round trip and coordinate limits.

After deployment, verify the canonical URL, map tiles, guide links, Sunday
hours recalculation, saved plans, and live AdSense headers.
