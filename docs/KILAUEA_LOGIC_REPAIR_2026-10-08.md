# Kīlauea decision logic repair — October 8, 2026

Scope: existing Kīlauea Live tool at `/national-tools/kilauea-live/`. No new tools or routes. The second Hawaii tool has not been confirmed; Haleakalā is on Maui and was not changed.

## Observed defects and resulting behavior

- A previous episode's start could trigger `FOUNTAINING` despite a current negation. Past episode sentences, report background and possible-outcome sections no longer establish current eruption activity.
- An active eruption could yield `GO NOW` even when all three supported viewpoints were closed. This now yields `NO LISTED VIEWPOINT` and no recommended viewpoint.
- Missing weather was treated as absence of bad weather. Positive live recommendations now require a usable forecast covering the selected travel time's arrival; unavailable air data or an unhealthy regional SO₂ signal prevents a confident go-now response.
- The viewing window could end before a one- or three-hour traveler arrived. Eligible periods must overlap or follow arrival, and a period already in progress is labeled from arrival rather than its earlier start.
- Weather at departure determined the viewing verdict even when arrival weather differed. Arrival weather now controls the live viewing-weather decision.
- “Mostly Sunny” received two favorable bonuses and outranked “Sunny.” Sky descriptors now use mutually exclusive adjustments.
- Future HVO timestamps could appear fresh. Timestamps more than fifteen minutes ahead are treated as invalid rather than clamped to zero age.
- The HVO webpage parser only accepted daily update headings. It now accepts official status reports and volcanic activity notices; failure of the short-message page does not discard a successfully fetched official update.

## Evidence and validation

Production baseline captured at 2026-10-08T15:19:11Z returned HTTP 200 with all four sources marked healthy. The browser rendered `WATCHING`, a one-hour travel choice, and a 5:00 AM HST viewing window already in progress at its 5:19 AM refresh. The official USGS webpage carried an October 7 status-report heading, while production was using its HANS fallback.

Official references reviewed:

- https://www.usgs.gov/volcanoes/kilauea/volcano-updates
- https://www.usgs.gov/volcanoes/kilauea/volcano-updates/volcano-messages
- https://www.nps.gov/havo/planyourvisit/eruption-viewing.htm

Regression cases cover historical and hypothetical fountaining, closure precedence, absent weather and air, regional advisory handling, changed arrival weather, arrival-compatible windows, future timestamps, sky ordering, status-report parsing, and independent update/message fetches.

Direct outbound source calls from this development environment timed out. The candidate returned `VERIFY ACCESS` with missing sources rather than fabricating a usable visit. That confirms failure handling, not healthy live-source behavior in the deployed candidate. Production behavior after release must be checked separately.

No page content, metadata, schema, canonical URL, discovery links, ads or rendering scripts were removed or changed. The existing camera remains an external livestream; neither the engine nor this repair independently infers current lava from camera imagery.

The regional SO₂ network remains regional context, not a measurement of exposure at a particular viewpoint. NPS instructions and closures remain authoritative. No eruption countdown, indexed-status improvement or search uplift is claimed.
