# Rocket Launch Live — place and vehicle interpretation
Date: 2026-11-13

## Editorial objective

A useful launch calendar tells you when a rocket might lift off. An exceptional field guide also tells a spectator what makes the place and the machine distinctive. This pass adds two interpretive experiences inside the existing six-region national rocket tool, following the prior visitor-voice rewrite.

**Coast field notes.** A selected region describes a real landscape, how the horizon can affect what a visitor sees, and one access check specific to the land manager. It links directly to the existing regional specialist, preserving the mission-linked viewing and legal access engine as the source of any actual recommendation.

**Vehicle field notes.** A positively matched rocket family explains ignition, ascent/staging and a possible later event in three human-readable beats. They describe standard vehicle design, never an asserted outcome for the selected mission. No operator profile is shown when the rocket field is absent or conflicts with the currently selected mission and coast.

### Source desk: coastal chapters

| Region | Specific reliable facts used | Sources |
| --- | --- | --- |
| Vandenberg, California | Pacific coastline near Lompoc; polar-orbit launches; coastal viewing requires official access checks | [Vandenberg official fact sheet](https://www.vandenberg.spaceforce.mil/About-Us/Fact-Sheets/Display/Article/736798/vandenberg-space-force-base/), [Vandenberg news and launch context](https://www.vandenberg.spaceforce.mil/News/) |
| Florida Space Coast | Multiple pads mean different public shorelines and sightlines; Visitor Complex admission/viewing is mission-specific; scrub policy varies | [Kennedy launch viewing](https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing/), [Kennedy launch-day expectations](https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/what-to-expect/) |
| Starbase, Texas | South Padre Island public shoreline; Isla Blanca Park tourist viewing reference; city beach/road closures | [South Padre viewing guide](https://visitspi.com/attractions/spacex/), [City of Starbase official access notices](https://www.starbase.texas.gov/beach-road-access) |
| Wallops, Virginia | Marshside viewing area at the public Visitor Center; very short sounding-rocket visibility; strict first-come opening and parking | [NASA Wallops launch viewing](https://www.nasa.gov/wallops/visitor-center/view-a-launch-from-nasa-wallops-visitor-center/) |
| Kodiak, Alaska | Narrow Cape wild coastline; recreation under normal access; launch facilities not open to public; hazard closures | [Alaska Aerospace Beyond Launch](https://akaerospace.com/beyond-launch/) |
| Barking Sands, Hawaiʻi | Navy PMRF coastline; designated public shoreline is distinct from federal range/property; operations can affect access without notice | [Official PMRF Navy beach access](https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/Operations-and-Management/Beach-Access/) |

### Source desk: named rocket families

| Rocket family | Facts that justify the visitor explainer | Vehicle authority |
| --- | --- | --- |
| Falcon 9 | Nine Merlin first-stage engines, stage separation, designed recovery and reflight | [SpaceX Falcon 9](https://www.spacex.com/vehicles/falcon-9/) |
| Falcon Heavy | Three Falcon-derived cores and 27 Merlin engines; recovery depends on mission | [SpaceX Falcon Heavy](https://www.spacex.com/vehicles/falcon-heavy/) |
| Starship + Super Heavy | Raptor propulsion, booster/ship separation, variable mission return or test profile | [SpaceX Starship](https://www.spacex.com/vehicles/starship/) |
| Vulcan Centaur | Two BE-4 core engines; 0/2/4/6 side solid boosters depending configuration; Centaur V upper stage | [ULA Vulcan](https://www.ulalaunch.com/rockets/vulcan-centaur) |
| New Glenn | Seven BE-4 booster engines; upper stage; reusable first stage and sea recovery objective | [Blue Origin New Glenn](https://www.blueorigin.com/new-glenn) |
| Firefly Alpha | Four Reaver first-stage engines, Lightning upper-stage engine, small satellite launch | [Firefly Alpha](https://fireflyspace.com/alpha/) |
| NASA sounding rockets | Brief scientific suborbital flights, often highly specific windows; short visibility possible | [NASA sounding rockets](https://www.nasa.gov/soundingrockets/overview/), [Wallops visitor tips](https://www.nasa.gov/wallops/visitor-center/view-a-launch-from-nasa-wallops-visitor-center/) |

## Structural and trust boundaries

1. These are **evergreen editorial stories**, not live traffic, weather, launch clearance, rocket telemetry, schedule, or a license to enter any site.
2. The module runs on the current `rocket-viewing:data` event after the national app has validated the selected mission. It requires matching `selectedLaunchId`, launch `id`, and selected `region`. No extra API request, provider lookup or mission inference is introduced.
3. Any failed schedule refresh fires `rocket-viewing:failure` and clears the previous selected region and vehicle narrative, avoiding stale confidence from the old selection.
4. Every substantive chapter has a direct human-readable source. Source and regional guide URLs are static editorial links, not derived from public input.
5. No new licensed imagery is needed; the existing independently cleared NASA image catalog remains unchanged and its credits and fallbacks are preserved.
6. No changes to public map routes, ticket claims, weather models, source collectors, Redis usage, ads, analytics, Person schema, canonical tags or sitemap are part of this change.
7. Source descriptions intentionally say `may` for sound, cloud, recoveries and visibility; rocket-family facts never assert what **this** mission will do.

## Verification

`tests/rocket-field-notes.test.js` checks the exact six coast keys and seven vehicle profiles, syntax/structure, absence of network calls, source URLs, strict rocket matching and DOM events, cross-coast mission rejection, state clearing, and whether the existing SEO/map/visual architecture is intact. Release is contingent on full project CI, responsive Rocket Launch browser QA and direct production confirmation after merge.
