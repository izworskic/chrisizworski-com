# Michigan Garden Pest Watch: Experience OS 1.2.1 brief
Date: November 2, 2026. Canonical: /michigan-garden-pest-watch/. Owner: izworskic/chrisizworski-com. Research issue #1416. Governed by docs/experience-briefs/garden-pest-watch-goal-value-loss-execution-20261102.md.

## Visitor decision
"I'm growing specific crops in Michigan. Which pests deserve attention, where should I inspect, why does it matter this season, how certain is the evidence, and what is the least disruptive control after identification?" Intended for beginners, raised-bed gardeners, fruit growers and pollinator-minded visitors. Target time to first actionable answer <60 seconds in future observed usability tests.

## Competing concepts evaluated
A. Michigan Pest Forecast Heatmap: Geographic CARTO map, animated insect flight bands, location markers. Rejected: most species lack confirmed occurrence feeds or validated location-specific models. A pretty map would imply nonexistent spatial precision and confuse forecasts with observations.
B. Garden Watch Desk: Compact field notebook with first-screen scouting assignment, crop + stage + optional Census ZIP, stacked evidence register (season, NWS forecast conditions, regional field reports, biological model), 18 pest/disease field notes, prevention and if-confirmed tactics, source links and gardener suspect selection. Selected for evidence accuracy, decision value, reversible interaction and failure resilience.

## Material difference from two existing tools
- /michigan-gardening/ is a garden question directory. Watch Desk owns one particular, current crop/season *scouting* decision and filters a scientific pest catalog by growth stage and conditions. Different answer hierarchy and task, not another directory.
- /leafcutter-bees/ is a one-species care cycle. Watch Desk handles many pest species and their crop vulnerability, asks the visitor to investigate and displays four independent evidence channels. Different information model, interaction, storytelling and visual identity.

## Visual/editorial treatment
Field notebook typography, warm cream and deep green, copper annotations, numbered source registers, short task-oriented instructions and explicit unknown indicators. An original decorative plant/insect vector is labelled NOT A SPECIES ID IMAGE. No unlicensed insect photographs are embedded pending subject- and life-stage-specific rights verification. Distinctive layout must be assessed with real browser screenshots before releasing.

## Credible evidence boundaries
The first engine offers seasonal scouting references and bounded NWS weather suitability cues only. Numerical cabbage maggot / Japanese beetle modeling is disabled until method parity and historical temperature input validation. Squash vine borer remains seasonal reference because MSU's publicly described underlying algorithm is incomplete. No live regional trap feed or MDARD detection API is implied. A gardener's suspect is self-reported, never expert-confirmed. Missing weather does not imply no pest. The existing Jan 1 simple-average DD50 seasonal-heat provider cannot substitute for Japanese beetle's Jan 1 single-triangle DD50/92 model.

## Interaction and failures
Initial: November Bay City squash -> bed planning, not summer adult claims.
Alternative: April brassica seedlings -> cabbage maggot soil-line and flea beetle scouting.
Summer: July zucchini -> borer stem and squash bug underside checks.
Wet: August tomatoes + verified official humid outlook -> more careful leaf-spot scouting, no diagnosis.
Visitor suspect: borer reported -> signs and if-confirmed help, report remains unverified.
Reverse: squash -> tomato -> squash restores controls, answer, source caveats and URL; stale fetch sequence guarded.
No JS: HTML squash and evergreen scouting guidance, official links.
Bad ZIP: correction, no silent city replacement.
No NWS: explicit unknown weather, seasonal evidence still visible.
No tiles or photos: no map or external insect photo dependency.

## Actual proof and planned tests
Source code and 18 source-linked pest modules were committed on feature branch. Deterministic automated test suite was authored, but its execution/green status is not yet proved. Browser 360/390/768/1440, keyboard, no JS, NWS outage, contrast, loaded-source truth, CI, site integrity, deployment READY and live public verification are NOT MEASURED. Do not claim >=90 OS or >=92 composite until all stages are run and independently scored. Release record: michigan-garden-pest-watch.release.json.

## Documentation and official reference
https://enviroweather.msu.edu/crops/coleCrops/cabbagemaggot
https://enviroweather.msu.edu/crops/cucurbits/squashvineborer
https://www.usanpn.org/data/maps/forecasts/Japanese_beetle
https://www.weather.gov/documentation/services-web-api
https://www.canr.msu.edu/uploads/resources/pdfs/pest_scouting_in_vegetables.pdf
