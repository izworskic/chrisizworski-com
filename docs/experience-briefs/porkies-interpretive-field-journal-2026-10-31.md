# Porcupine Mountains — source-first interpretive EXPERIENCE_OS_V1 brief

**Reviewed:** October 31, 2026. **Authoritative repo:** `izworskic/chrisizworski-com`. **Canonical:** https://chrisizworski.com/porcupine-mountains/ . **Status:** existing `noindex,follow` prototype; this editorial investment is NOT approval to index, advertise as official, certify trails, or change route guidance.

## Visitor decision and actual experience

The existing site lets a visitor choose arrival side, date, vehicle, 2/4/8/16 hours, walking comfort and interest. It uses a source-aware A/B comparison of six destinations tied to six DNR parking asset points and a 21-trail evidence catalog. It intentionally withholds unverified turn-by-turn routes, drive times, current parking openings, trail connections and river crossings. Existing comparison controls, evidence IDs and current working access logic must not be replaced.

**Gap:** The A/B comparison tells visitors about distance and risk but does little to teach what is remarkable about each place. The three photographic stories and old forest paragraph establish a beautiful voice, but do not carry that knowledge throughout the six interactive choices. A curious reader needs to understand the geology, old-growth forest, river corridor and real meaning of wilderness *without* scrolling through a second catalog of identical cards.

**Decision:** “I can see Lake of the Clouds easily, but what will I experience at the ridge, river, summit, old forest or winter complex, and which fits my limited time and mobility?”

## External examples and design approach

- National Park Service App: https://www.nps.gov/subjects/digital/nps-apps.htm — location-specific interpretive context tied to maps, activities, and points of interest. Transfer: source-grounded story at the moment a visitor chooses a site. Not transferable: app content, routing, images, offline guarantees or endorsement.
- AllTrails trail preview description: https://support.alltrails.com/hc/en-us/articles/37212870983700-Trail-previews-on-trail-pages — trail information linked to an actual selection. Transfer: selected destination updates the **explanation** as well as source/parking card. Not transferable: licensed trail geometry, assumed walking tracks or 3D implementation.
- GOV.UK design principles: https://www.gov.uk/guidance/government-design-principles — consistent interaction, not uniform layout. Existing Porkies photo A/B remains distinct from Tahquamenon's three-card experience.

## Official, reviewed primary source ledger

| Evidence | Source and what it supports | Limits |
| --- | --- | --- |
| [DNR designated natural area](https://www.michigan.gov/dnr/places/natural-areas/porcupine-mountains) | The park contains a dedicated 47,671-acre wilderness, including an approximately 35,000-acre large block of primary forest; DNR describes an ancient 12-mile escarpment and Lake of the Clouds beneath it; sensitive plants and wildlife habitat | These are established geography/history facts, NOT same-day access; do not assert a wildlife sighting |
| [DNR Presque Isle River Scenic Site](https://www.michigan.gov/dnr/places/natural-areas/presque-isle-river-scenic-site) | The river narrows into channels cutting underlying bedrock and is bordered by old-growth sugar maple, hemlock and white pine | Not proof of river-crossing, ford, bridge or parking safety |
| [DNR Porcupine Mountains park](https://www.michigan.gov/recsearch/parks/porkies) | DNR scenic and observation sites, 60,000-acre park, seasonal M-107 and South Boundary closures, winter sports, separately documented accessible Nawadaha platform | No real-time lot/gate or signed final CR519 turn confirmation |
| [DNR Visitor Center](https://www.michigan.gov/dnr/places/v-centers/porkies) | Exhibits and interpreters, seasonal building dates (May 15–Oct 14), old-growth forest introduction | The center's building dates do not establish opening or closing of the outdoor nature trail |
| [Existing DNR 2025 visitor and trail map ledger](https://github.com/izworskic/chrisizworski-com/blob/main/docs/experience-briefs/porkies-experience-compare-2026-10-31.md) | Documented accessible overlook distinction, half-mile Summit Peak approach and tower stairs, historical trail editions, 3.7 vs 4.3 miles Escarpment and complex RV parking restrictions | Historical editions, not certified current surfaces, roads, return logistics or trip mileage |

Source dates checked 2026-10-31. Official current pages remain authoritative; do not treat our check time as a current road status.

## Alternatives considered

**A. Copy Tahquamenon's three-photo chooser and large story cards.** Rejected: duplicates Porkies' existing three scenic images, consumes mobile space above the planner, and forces a foreign layout while the GIS and access engine are still being developed.

**B. Add a fourth map or 3D escarpment rendering.** Rejected: no verified ridge-route geometry or benefit to the visitor's current question; adds first-answer performance cost and potentially hides access warnings.

**C. An original, layered ranger field journal (chosen).** Keep current hero, planning controls, six-outing comparison and existing visuals. Add a compact “Read the Mountains” interpretive journal *after* the interactive comparison and *before* the technical access map. Write four connected landscape observations: ancient escarpment, primary forest, Presque Isle riverbed, and wilderness decision-making. Each links to a specific, already existing section and official source. Attach an accessible “What to notice” disclosure to each of the six live A/B comparison panels, using a source-controlled field note so choosing a new experience changes *the meaningful explanation*. Supply equivalent static notes for the two no-JS choices.

## Interaction and content contracts

- Selected option A/B changes photograph, field-note prose, effort, source links, access warnings and map parking-point comparison. Field notes are descriptive, not safety status, ETA, live sensing or DNR endorsements.
- Use existing option IDs (`clouds`, `summit`, `river`, `nature`, `escarpment`, `winter`) and preserve every existing risk or unknown value in `experience-options.json`. Add only sourced descriptive `fieldNote` and `fieldNoteSource` fields; do not change recommendation or route logic.
- Each disclosed note describes **what to notice, why it matters, and what route/access distinction remains**. Preserve the current warning and evidence panel directly adjacent.
- New static chapters include exact park source links and internal navigation to photo stories, trail evidence or source-backed map. The page is useful without JS.
- The existing HTML `noindex,follow`, canonical, Person author graph, Ads, map layers, CSS approach and winter restrictions stay unchanged.
- Avoid impersonating a Michigan DNR ranger; original writing *in the manner of an experienced naturalist* is not official park guidance.

## Quality gate

Run existing `npm run verify:all`, all Porkies source/geometry/road/parking/crossing guards, test six supplied field notes and source links, protect dynamic selected note, no-JS, keyboard, reduced motion, CSS readability and map fallback at 340/390/768/1366 px. Review actual screenshots if generated. Do not merge on red/pending required checks. After authorized production, inspect public output and continue to **not index** until separate full park release signoff.

## Reusable learning target

Where trail/access verification is incomplete, a source-grounded **interpretive layer** can deepen visitor confidence without pretending to fill evidence gaps. Keep the visitor decision, source evidence and a sense of place joined in the same choice, not split across marketing copy and technical warnings. Record what testing actually observes; no fabricated conversion or SEO results.
