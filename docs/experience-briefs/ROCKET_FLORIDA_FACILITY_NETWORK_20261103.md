# Rocket Launch Live: Florida facility network milestone (2026-11-03)

## Owner and decision

- **Source:** `izworskic/chrisizworski-com`
- **Existing canonical:** https://chrisizworski.com/national-tools/space-coast-launch/
- **National parent:** https://chrisizworski.com/national-tools/rocket-launch-live/
- **Neighboring guide:** https://chrisizworski.com/vandenberg-rocket-launch-viewing/
- **Question:** “Which actual Florida spaceport and pad is this mission departing from, and how does that change my viewing plan?”
- **Primary action:** Choose Kennedy Space Center or Cape Canaveral Space Force Station, then inspect the selected *real mission’s* pad, existing GIS map, access evidence, tickets, and local spectator weather.

## Evidence and alternatives

Existing Florida specialist already contains a purpose-built viewer map with actual LL2 pad points where reported, public site references, NPS Playalinda GIS and location-specific access limitations, KSC mission-specific ticket checks, official weather evidence, and a separate mission media desk. The national tool has a U.S. region atlas; Vandenberg’s standalone guide serves a different geographical visitor decision with its own illustrated Lompoc viewer map.

Considered:
1. New Kennedy and Cape canonical landing pages, mirroring Vandenberg’s guide. **Rejected this milestone**: distinct SEO intent and primary-source evidence not proven, duplicates the specialist and risks keyword cannibalization.
2. **Chosen:** A visually distinct two-facility origin desk embedded beside the existing Florida map and public viewing decisions. Facility choice selects a real scheduled mission rather than becoming a decorative toggle. The national tool passes the stable LL2 launch UUID into the Florida URL and back again.

External comparisons checked November 3: [KSC official launch-viewing locations](https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing-locations/), [NPS Canaveral launch-viewing guidance](https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm), and the [Florida Spaceflight Viewing Guide](https://flspaceflight.com/viewing-guide) as a relevant competing pad-centered guide.

## Experience OS v1.2 distinctive composition

Unlike the national **where/when** regional atlas, the Florida surface is a **two-spaceport origin-to-viewing** workflow. Unlike the Vandenberg photo-led Lompoc guide, it is a mission-linked facility verification desk, with compact number medallions 39 / 40 and a contextual KSC pad rule. The existing Florida GIS is the main map, not a disconnected second map. Its original 13 NPS Playalinda parking footprints, verified reference sites and access confidence remain intact.

Inputs: the selected shared LL2 `launchId`, actual `locationId` (27 KSC, 12 Cape), optional facility button. The ID survives links between the national and specialist tools. On a facility click, every dependent source desk, pad map, weather and KSC viewing panel reloads from the existing bounded JSON API. A→B→A restores mission-specific content. A stale deep link transparently falls back to the latest scheduled Florida mission and discloses the change.

## Safety boundaries and failure matrix

- Facility identity favors the upstream LL2 **location ID**, then official location name or known pad naming, otherwise **unverified**; a different explicit location ID never gets overridden by a similar pad name.
- LC-39A / LC-39B launches are *not* eligible for KSC Gantry viewing; a different pad still does not establish ticket availability. [KSC authority](https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing-locations/).
- No scheduled launch in the bounded feed does not establish a closed or inactive spaceport. Every pad is restricted, never a Google Maps destination.
- Playalinda NPS alerts govern specific beach/road/lot closures, separate from KSC ticket eligibility and regional sky forecast. [NPS authority](https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm).
- No JavaScript: original visible HTML explains the difference, exposes official URLs, the national schedule, map's existing fallback, and the visitor's next step. Buttons are initially disabled; no false mission status.
- No map tiles: the original geo-engine retains source-linked place cards and map status; no fabricated route or sightline.
- No image: no new image dependency or unlicensed imagery; the existing rocket photo catalog remains separate.
- No or stale schedule: buttons cannot manufacture launches; original schedule error states and operator links remain.
- No NPS source: existing access desk remains unknown; no invented park opening.
- Rapid selection: existing `loadSequence` and `space-coast:launch-loaded` event prevent stale mission responses from replacing a newer choice.
- No Redis, Supabase, ad changes, new sitemap, new canonical, or additional upstream API call; shared Vercel/Postgres schedule remains the data source.

## Acceptance and QA

Source unit tests: authoritative facility ID, normalized location ID persistence, unknown identity, Gantry exclusion, bounded facility roster, unchanged canonical, and cross-tool links. Required repository merge gate is `npm run verify:all`; branch CI is authoritative if local full repository checkout is unavailable. Browser gate: 360, 390, 768, 1440px, A→B→A facility click, deep-linked selected mission from national, fallback after expired link, GIS tiles failing, keyboard navigation, reduced motion and no-JS. **Do not claim browser/production passes until observed.**

**SEO and measurement:** Existing canonical intent owners unchanged; no GSC/GA4 or AdSense lift has been measured. Next opportunity: independently source and verify pad-specific launch viewing photos and better directional viewing geography for Florida without inventing rocket trajectories.
