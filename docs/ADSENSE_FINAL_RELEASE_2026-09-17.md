# AdSense release record — September 17, 2026

## Recommendation and limits

The identified main-site code, routing, AIS and publishing defects have been repaired. It is reasonable to proceed to a new Google review after checking the signed-in account for any outstanding site or policy requirements. This is a remediation recommendation, not a certification that every tool, data response, archived claim or future generated edition complies with every policy. Only Google can approve the site. No review was submitted by this work. Further interactive verification and the secure sign-in handoff were blocked when automatic approval review reported a session usage limit; this was a tool-review failure, not a rejection by Google.

Google's account chooser still shows the owner's account as signed out. Sites status, Policy center, Privacy & messaging configuration and Auto ads settings therefore remain unverified. The presence of ad code, ad requests or ads.txt is not evidence of approval. Confirm the applicable consent setup before serving ads. Google requires a certified TCF CMP for personalized ads in the EEA, UK and Switzerland.

The owner's data permissions are owner-confirmed; supporting documents were not inspected. No further permission paperwork was requested.

## Released repairs

- Main PRs 368–369 repaired 16 existing aurora routes and composed policy navigation into 14 tool landing pages. Privacy disclosures now describe actual advertising, input, storage and embedded-service behavior. Error/policy aliases do not receive ads.
- Main PR370 repaired missing weather/geyser data handling and Firefall duplicate canonical ownership. Owner hub PR68 synchronized discovery. PR371 clarified the source and uncertainty of Michigan fall-color AI summaries.
- Main PR372 repaired Soo Locks AIS. The failing provider iframe was replaced by attributed recent reports, selectable vessels, map positions, timestamps, refresh and explicit failure/empty states.
- Main PR373 applied the same repair to the Great Lakes ship tracker, preserving all seven corridor choices. Missing NOAA values are no longer converted into calm wind or 32°F. The provider request uses three adjoining areas totaling 82 square degrees, within its documented anonymous limit.
- Main PR374 replaced failing Ballard and Melvin Price AIS embeds through the site-shell import adapter. The shared widget is noindex and excluded from advertising; the indexed parent content, engines and ownership remain intact.
- Gazette PR8 disclosed automated AI publication and enforced source-health checks. Gazette PR9 corrected 71 dated editions, replacing 74 distinct water-level paragraphs with their archived NOAA station values, station IDs, observation times and measurement limits. It also corrected September 17's unsupported corridor distance, report date and ETA certainty. Readers see a correction notice; Redis originals and source snapshots remain intact.
- Gazette follow-up withdraws 63 water-level paragraphs from 62 older imported editions that have no underlying gauge snapshots. Visible notices explain why the numbers and navigation implications cannot be verified. Combined correction coverage is 133 of 137 editions; all issue URLs and stored originals are retained.
- Phenology PR2 clarifies the separate local-model and USA-NPN seasonal comparisons. Their differing reference series no longer read as one contradictory universal season forecast. Values and calculations are unchanged.
- Gazette PR9 fixes a substantive publication defect: after four attempts, unresolved drafts could previously ship. Publication now requires the existing 90-point target, grounding of at least 12/15 and no blocking critique. Failed drafts leave the previous edition available. Shorter factual editions are permitted instead of mandatory word-count padding.

No indexed tool, branded coverage page, canonical URL or identity cluster was deleted. The canonical Chris Izworski Person ID remains `https://chrisizworski.com/#person`. No doorway or keyword-variant pages were added. Gazette headline and issue URLs remain intact; corrections change the identified body text, not the archive footprint. Ranking or branded-result occupancy is not guaranteed.

## Verification scope

The earlier inventory covered 81 tools/guides, 335 URLs and targeted source inspection across 43 repositories. All 335 fetched URLs ultimately returned 200. This is HTTP/source coverage, not 335 successful interactive tests. All 137 Gazette issue pages loaded and carried AI disclosures; no exact duplicate full issue bodies were found. Source payloads for all 137 editions were downloaded and the first correction transform changed exactly the intended 71; the legacy follow-up extends correction coverage to 133.

Main `npm run verify:all` passed 449 tests plus all registered source, search, entity, routing and product gates for PR374. Gazette `npm test` passed all six check scripts. GitHub required checks and Vercel deployments succeeded before the repairs were treated as released.

Representative live interactions exercised during this review:

| Tool or group | Observed result |
| --- | --- |
| Soo Locks | 13 recent ships; vessel selection and refresh worked after repair |
| Great Lakes ship tracker | 347 recent reports; Duluth selected 19; PAUL R TREGURTHA popup showed MMSI and report age; refresh worked |
| Ballard / Melvin AIS | 278 / 1 recent reports; ALASKA CHIEFTAIN and TAMMY LYNN details opened; parent pages point to repaired components |
| Beaches | Bay City search matched; nonsense search returned explicit no matches; seasonal and missing conditions shown |
| Shipwreck / lighthouse / launch maps | Fitzgerald matched 1 of 63 wrecks; Tawas selected its lighthouse; carry-down launch filter worked |
| Border / Mackinac | Direction change updated waits; RV/axle selection updated guidance |
| Manistee / Ontario fishing | Pine River returned five locations; brook-trout selection returned 2,866 fisheries matches |
| Planting / frost / heirloom | Zone/date calculations updated; Bay City frost station resolved; five-step heirloom flow returned three varieties |
| National frost / planting / garden water | Bay City returned station/history, crop windows and a watering decision with rainfall completeness |
| National coastal / snow / white Christmas | Charleston and Denver results loaded; seasonal forecast limits and unavailable sources shown |
| National smoke / ice-out / fall color | Bay City AQI, Houghton seasonal ice state and Marquette historical color window returned with limits |
| Rivers / waterfalls | Bay City returned 21 rivers and 31 gauges; Tahquamenon returned 301 cfs vs 417 typical |
| Gauley / Blue Spring / Cumberland | Source-aware visit guidance and seasonal gates loaded; unknown flow/count/forecast remained explicit |
| Fort Madison / Grand Coulee | Train board and rail map loaded; spillway hotspot worked; optional AIS traffic control was disabled |
| Monarch / Platte cranes / elk | ZIP migration result returned; seasonal crane information and six elk watching windows loaded |
| Blue Ridge / Columbia / bird migration / red tide | Region/species filters worked; Bay City bird result and Sarasota sample-based red-tide result returned |
| Thunder Hole / Tahquamenon / Isle Royale / Au Sable | Condition and access limits shown; route/map data loaded; Beaver Island details and map search worked |
| Michigan trout / phenology | Species and Rifle River controls worked; these separate publishers have additional data/narrative limitations noted below |

Traverse City’s Old Mission preset and the Pictured Rocks planner were exercised; the latter returned a boat-cruise plan. Weekend and morel guidance loaded. The lawn form rejected an incomplete city-only input and requested a ZIP; end-to-end plan generation was not completed before the browser block.

Static guides were reviewed as content, not counted as interactive successes. Shared beach templates retain distinct locations, access information, coordinates, summaries and condition inputs; template similarity alone does not make them exact duplicates. The review did not manufacture extra paragraphs to reach a word count.

## Remaining observations, not concealed passes

- Google account configuration and the actual review decision are not verified.
- This does not certify external domains linked from the directory. Michigan Trout Report's separate domain showed missing telemetry while some summary/score text still described fishability. That external publisher needs separate data-quality follow-up; it carried no AdSense loader in the inventory.
- Phenology’s differing season-anomaly narrative was clarified in PR2. Creator checks and deployment passed; a fresh interactive confirmation was blocked by the browser usage limit.
- An alternate Niagara video was unavailable; the primary player and predictor remained available. Fort Madison's optional AIS traffic control was disabled. Monarch's local ZIP result worked while its global observations map did not finish in the browser check.
- Michigan Outdoors Now exposed its browse fallback when the map failed to initialize in the cloud browser. Its place opportunities rendered; full map operation was not certified.
- Provider freshness and coverage can change. Empty, delayed or unavailable feeds must remain labeled as such and are not proof of safe conditions or absent vessels.

## Primary references

- [Google site readiness and resubmission](https://support.google.com/adsense/answer/12176698)
- [Google Publisher Policies](https://support.google.com/publisherpolicies/answer/10502938)
- [Google consent requirements](https://support.google.com/adsense/answer/13554116?hl=en)
- [NOAA station versus lake-wide water levels](https://www.glerl.noaa.gov/data/wlevels/)
- [Open Waters AIS documentation](https://openwaters.io/api/ais/)

Release PRs: [main 373](https://github.com/izworskic/chrisizworski-com/pull/373), [main 374](https://github.com/izworskic/chrisizworski-com/pull/374), [Gazette 9](https://github.com/izworskic/great-lakes-gazette/pull/9).
