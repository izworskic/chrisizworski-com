# Rocket Launch Live USA — National Coastal Engine, 2026-10-31

Canonical: https://chrisizworski.com/national-tools/rocket-launch-live/
Florida specialist: https://chrisizworski.com/national-tools/space-coast-launch/
Owner repository: izworskic/chrisizworski-com.
Scope: six U.S. coastal regions across Atlantic, Pacific, and Gulf of Mexico; one national schedule and selected-region viewing decision.

## Confirmed launch location IDs (Launch Library 2 v2.3)

| Region | Launch Library location ID(s) | Local zone |
| --- | --- | --- |
| California, Vandenberg SFB | 11 | America/Los_Angeles |
| Florida, Cape Canaveral SFS / Kennedy | 12 / 27 | America/New_York |
| Texas, Starbase | 143 | America/Chicago |
| Virginia, Wallops | 21 | America/New_York |
| Alaska, Pacific Spaceport Complex / Kodiak | 25 | America/Anchorage |
| Hawaiʻi, PMRF Barking Sands | 1 | Pacific/Honolulu |

Location IDs tested against the official public Launch Library API: https://ll.thespacedevs.com/2.3.0/locations/?search=Vandenberg&limit=5&format=json and analogous tests for every region.
https://ll.thespacedevs.com/docs

## What "national coverage" actually means

Two batched LL2 queries use location__ids=11,12,27 (36 results) and location__ids=1,21,25,143 (18 results), both ordered by NET. The provider returned 265 upcoming records for a larger batch of all six coastal regions when inspected on Oct 31, 2026; the API deliberately returns a **bounded forward sample**, not every event across every future year.

- Distinguish NET precision ("minute" vs "hour" vs "day"/"month"/"year") and completed launch records. Never create an exact countdown from a coarse placeholder.
- All six regions remain visible even when the provider has no mission listed.
- If one provider query fails, report regional feed unavailable and national partial status, never a national "zero launches" claim.
- Source launch records may omit some missions and short-notice military or NASA sounding rocket launches.
- No automated launch go/no-go or guaranteed rocket-path/visibility claim.
- Anonymous LL2 public tier published quota approximately 15 requests per hour. Vercel CDN response uses 30-minute TTL plus 60-minute stale revalidation; distributed cache regions can still consume too many quota units. At national scale replace with an allowed paid key or globally shared authorized cache, **not Redis**. Do not promise instant or minute-by-minute data.

## Official local ground-truth references

### Vandenberg, California
- Vandenberg Environmental and beach status: https://www.vandenberg.spaceforce.mil/About-Us/Environmental/
- September 10, 2026 official reopening: https://www.vandenberg.spaceforce.mil/News/Article-Display/Article/4595736/vandenberg-opens-all-beaches/
- Launch public alerts enrollment: https://public.govdelivery.com/accounts/USDODSFVANDENBERG/signup/41755
- Lompoc tourism, named viewing locations: https://explorelompoc.com/best-places-to-view-a-rocket-launch-in-lompoc/
- Surf Beach regular hours officially 8AM–6PM; launch closures and snowy plover restrictions remain event dependent. West Ocean Ave parking requires legal pull-offs; Ocean Park road closes when parking fills. No public base entry.

### Florida
- Existing regional NPS Playalinda active alerts, KSC mission-specific viewer and NWS forecasts live via /api/space-coast-launch; do not fork and duplicate those access rules.
- https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm
- https://www.kennedyspacecenter.com/launches-and-events/events-calendar/

### Starbase, Texas
- Official City of Starbase beach and road notices: https://www.starbase.texas.gov/beach-road-access
- Local identified public alternatives: https://visitspi.com/attractions/spacex/
- Official page was directly inspected Oct 31; general Boca Chica Beach message showed open and a road delay near Masseys/Production Nov 1-2. The engine parses beach and road notices separately and labels "open" **general only**; a launch restriction can supersede this. Boca Chica Beach itself never shows directions as a safe launch spectator site.
- Cameron County older closure page may be stale: https://www.cameroncountytx.gov/spacex/; do not turn historical orders into current-day truth.

### Wallops, Virginia
- NASA official current mission calendar: https://www.nasa.gov/wallops-launch-schedule/
- NASA Visitor Center launch-access rules and first-come policy: https://www.nasa.gov/wallops/visitor-center/view-a-launch-from-nasa-wallops-visitor-center/
- Address/visitor-hours only: https://www.nasa.gov/wallops/visitor-center/plan-your-visit/
- Sounding rockets are particularly underrepresented in general orbital calendars; visitor center opening must be confirmed for the exact mission. Chincoteague Robert Reed Waterfront Park and Curtis Merritt Harbor are NASA-identified alternatives, but security, local parking and closure rules remain unverified.

### Kodiak, Alaska
- Operator public lands/tours and range closure policy: https://akaerospace.com/beyond-launch
- FAA site listing: https://www.faa.gov/space/spaceports_by_state
- Alaska DNR range safety authority: https://aws.state.ak.us/OnlinePublicNotices/Notices/View.aspx?id=221720
- Operator confirms facilities closed to ordinary visitors, surrounding Narrow Cape/Fossil Beach may close during hazardous operations. No verified safe public launch-day viewing venue; do not supply driving directions into the range.

### Barking Sands, Hawaiʻi
- Navy installation: https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/About/Installation-Guide/
- Navy beach access and emergency closure notice: https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/Operations-and-Management/Beach-Access/
- Controlled military range, no independently verified public launch-viewing area. Designated shoreline public access is conditional, can close with little warning. Not an ordinary visitor-park experience.
- NASA sounding rocket handbook confirms PMRF as range, but NASA launches may be omitted from LL2.

## Weather and map
- NWS /points resolves hourly forecast and forecastGridData. Gridded skyCover is accepted only if its updateTime is current and validTime covers a minute/second precision target within seven days. Incomplete NWS states cannot be upgraded into safe sky claims.
- Compare spectator points only when both have usable near-launch sky cover and weather with at least a 20-percentage-point difference; relative only, never trajectory visibility.
- No forecast is requested for an unverified public launch-viewing coast (Kodiak, Barking Sands); Florida delegates to its established specialized engine.
- CARTO light_all tile map includes approximate coastal range markers, not public launch pad or navigable range entrance markers. Always retain accessible region selectors if tile service unavailable.

## SEO and integration
- National canonical /national-tools/rocket-launch-live/ is intentionally distinct from Florida /national-tools/space-coast-launch/; national is a selector/atlas, Florida is an in-depth local access engine.
- Explicit Vercel route rewrites must precede old /national-tools/:path* proxy catch-all.
- Add one directory card and ItemList entry (national 71 tools), one sitemap canonical, and Florida-to-national crosslink.
- Preserve GA4 and AdSense account meta. Do not invent photo licensing: hero references U.S. Space Force official government photograph with attribution.
- Avoid overwriting this main-site-owned tool via the manual synced National Tools hub workflow.

## Quality gate
- node --test tests/rocket-launch-usa.test.js
- node --check api/rocket-launch-usa.js lib/rocket-launch-usa.js public/synced-national-tools/rocket-launch-live/app.js
- Full GitHub repository test suite and generated-site audit.
- Build-route check for three dedicated national rewrites, national directory ItemList schema and sitemap.
- Live production: /api/rocket-launch-usa returns six regions, correct partial/no-data handling, and Starbase access notice; query ?region=...&launchId=... for representative cases.
- Mobile and desktop renders; closed/restricted sites have no driving-directions shortcut.

## Next evidence investments (do not imply already available)
- Direct official NASA Wallops sounding rocket item ingestion and mission-level visitor opening events.
- Vandenberg launch-specific security/return-to-base beach closures from official dated notices.
- Official Starbase road closure PDF time-window parsing and location segmentation, with robust update-detection and quarantine of stale notices.
- PSCA Pasagshak Road status feed and real safe public viewing points after official verification.
- More reliable coast-by-coast NWS marine-layer height, ceiling, visibility and sky validation against launch photos.
- LL2 provider plan and global cache so traffic does not trip anonymous quota. No Redis.
