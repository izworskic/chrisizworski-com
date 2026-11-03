# Vandenberg Viewing Decision Pilot — November 3, 2026

## Mission
Build a launch-specific, legally cautious spectator experience in the **existing** national rocket tool. The product needs to answer: "For *this* Vandenberg mission, where can I investigate public viewing access, in what direction is the pad, what do nearby NWS conditions suggest, and how does a few hours' delay change access?"

Canonical: https://chrisizworski.com/national-tools/rocket-launch-live/?region=california

## Competitor differentiation

Major launch calendars already offer timing, video links, satellite payload descriptions and some cloud forecasts. Our pilot connects **exact selected LL2 pad geometry**, **source-backed local venue inventory**, **daylight and legal-access exclusion**, **two existing NWS regional weather reference grids**, **scenario controls**, and **visitor-purpose ranking**. It intentionally does not claim to predict how visible a rocket is. Ranking is an editorial shortlist of *locations to investigate*, not a GO or verified open park.

## Venue research and GIS evidence

The public venue shortlist uses independently found **OpenStreetMap mapped feature centers**, not unsourced road turnouts. Feature centers are not guaranteed parking entrances, accessible paths, or precise photographer spots. Full public descriptions come from local authorities and local visitor guide:

| Candidate | OSM feature ID | Grounded public evidence |
| --- | --- | --- |
| Ocean Beach Park | way/44580742 | [Explore Lompoc launch guide](https://explorelompoc.com/best-places-to-view-a-rocket-launch-in-lompoc/), [Vandenberg beach management](https://www.vandenberg.spaceforce.mil/About-Us/Environmental/) |
| Surf Beach / Surf rail station | node/1112397161 | [Vandenberg official beach status](https://www.vandenberg.spaceforce.mil/About-Us/Environmental/) |
| Allan Hancock College — Lompoc Center | way/549619442 | [College campus address](https://www.hancockcollege.edu/about/locations.php?locale=en), [parking requirements](https://www.hancockcollege.edu/police/parking.php) |
| Riverbend Park | way/546639471 | [City of Lompoc facility directory](https://www.cityoflompoc.com/Home/Components/FacilityDirectory/FacilityDirectory/98/242) |
| Beattie Park | way/44580932 | [City of Lompoc facility directory](https://www.cityoflompoc.com/Home/Components/FacilityDirectory/FacilityDirectory/91/109) |
| Ryon Memorial Park | way/29088644 | [City of Lompoc facility directory](https://www.cityoflompoc.com/Home/Components/FacilityDirectory/FacilityDirectory/99/109) |

**Blocked as recommendations:** Top of Harris Grade Road, Hawk's Nest (Camellia/Azalea lanes), Marshallia Ranch Road and Highway 246 launch-viewing pullouts. [Explore Lompoc's updated guide](https://explorelompoc.com/best-places-to-view-a-rocket-launch-in-lompoc/) currently lists those closed.

- **Surf Beach:** base lists 8 a.m. to 6 p.m. daily, plus wildlife/restriction controls. Those hours are decisive, with the final 30 minutes before closing treated as an unsafe arrival boundary. They are never an independent live launch-day clearance. [Official](https://www.vandenberg.spaceforce.mil/About-Us/Environmental/)
- **Ocean Park:** dawn-to-dusk access; approximate solar elevation from [NOAA's published algorithm](https://gml.noaa.gov/grad/solcalc/solareqns.PDF) is used to veto late-night directions. A conservative 5-degree sunset approach margin **withholds** advice; solar calculations cannot override posted signs. [Official beach management notice](https://www.vandenberg.spaceforce.mil/News/Article-Display/Article/2948532/seasonal-beach-restrictions-begin-march-1/)
- **College:** paid/daily visitor permits are published, sometimes enforced during school hours, but no permission for an individual launch is inferred. [Official parking](https://www.hancockcollege.edu/police/parking.php)
- **City parks:** city and visitor bureau list the parks; current hours remain unverified. Do not label them open for night launches.
- **Private/military roads:** none are included as public visitor directions. Do not substitute prohibited lookouts.

## Data pipeline and fail-closed rules

1. The national API continues to load its **shared 30-minute signed LL2 Postgres schedule** and exactly **two preexisting NWS weather reference grids** (Lompoc and Surf Beach vicinity). The new Vandenberg layer makes **zero additional upstream calls** per visitor.
2. For California only, the API calls \`buildVandenbergViewing(selected, weather, now)\` in \`lib/vandenberg-viewing.js\`; every payload includes source URLs, feature-center warnings, current selected pad and dated uncertainty.
3. Pad geometry requires a positive pad ID, bounded coordinates inside the Vandenberg area, and valid lat/lon from the mission record. The map labels the actual pad as **restricted military property**, never a public entry. Distances use WGS84-style approximate great-circle Earth radius (haversine), compass degrees initial bearing; **not a walking/driving distance, line of sight or trajectory**.
4. NOAA approximate solar elevation uses UTC timestamps and coordinates, including crossing PST/PDT. Ocean Park **after sunset** and Surf Beach **outside 8–18 local** get an inaccessible state, no map-directions link and never become the first candidate. Ambiguous sunset margin produces the same caution.
5. The nearest NWS reference point within 5 miles is annotated for a venue. This is explicitly **not a point forecast at the venue**. If gridded cloud data are unavailable/stale, launch schedule overdue, the launch is held, or the nearby surface forecast is poor, no positive weather advantage is inferred. A nearby NWS assessment of poor surface conditions is explicitly flagged as a weather hazard and excluded from the shortlist. No launch GO, predicted visibility percentage, cloud altitude or booster flight path is fabricated.
6. Client controls for **family / photography / coastal experience** reorder published *candidates to investigate*. The same four scheduled/+1/+3/+6-hour scenarios update access and weather evidence. No automatic geolocation, private location processing, additional database, Redis, Supabase, caching calls or fake visitor reviews.
7. The existing national map, the other five U.S. regions, YouTube webcast gate, NASA image cards, SEO and ad safeguards are preserved.

## Benchmarks and validation

| Benchmark | Acceptance |
| --- | --- |
| Public viewing candidates with named local-authority evidence and OSM feature geometries | 6 |
| Closed / dangerous lookouts offered as destinations | 0 |
| Positive claims of an open launch site without live evidence | 0 |
| Surf Beach recommended after official closing | 0 |
| Ocean Beach Park recommended after solar sunset | 0 |
| Exact mission pad distances given when pad identity is missing | 0 |
| Added NWS/LL2 calls per visitor | 0 |
| JS ↔ Python distance, bearing, sun and DST parity scenarios | 30 |
| Additional NWS or Redis/Supabase dependencies | 0 |
| Unmodified national canonical and launch index protections | Preserved |

\`\`\`bash
python3 scripts/vandenberg_viewing_oracle.py --test
node --test tests/vandenberg-viewing.test.js
node --test tests/rocket-launch-usa.test.js tests/rocket-launch-slip.test.js tests/rocket-launch-visuals.test.js
\`\`\`

### Known limitations / next scientific investments

- Actual pad-topography viewshed and launch trajectory remain unverified. A bearing points toward the pad, not necessarily toward the visible rocket.
- NWS sky-cover grids do not distinguish marine-layer base height. **Do not call a clearer forecast a proved better rocket view.**
- Public source listings do not replace launch-day road closures, parking capacity or beach notices. A signed, regularly updated official access feed would be required to display a true access verdict.
- The map has no road routing or verified entrance geometries; do not compute ETA.
- This launch tool keeps one national canonical. A separate search-intent landing page can later be added through the existing sitemap and SSR framework without cloning the interactive engine.

## Source and reviewer notes

Research review completed November 3, 2026. Source links are included in the model, in the UI and above. Avoid broadening to other launch regions before the California decision behavior, map, mobile experience and access safety are stable in production.
