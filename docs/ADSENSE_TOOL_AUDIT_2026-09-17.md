# AdSense tool value and data audit — September 17, 2026

**Later release record:** [September 17 final remediation](ADSENSE_FINAL_RELEASE_2026-09-17.md) records subsequent fixes and live checks. Preserve this original inventory as evidence of what the earlier audit did and did not establish.

**Owner update after this audit:** Chris confirms that he has the data permissions discussed below; supporting documents are not available in this chat. Treat permission as owner-confirmed, not independently inspected. The earlier permission follow-ups below describe the audit-time evidence and are superseded by that confirmation. Endpoint configuration, functional checks and Google account review remain separate.

**Original audit recommendation: hold resubmission pending the listed checks.** This review found useful, distinct tools and repairable defects. It does not establish that every tool meets every policy, and cannot guarantee Google approval. The reported rejection category is low value; Google's exact page-level reasoning is unavailable.

## What was inspected

81 tools and guides discovered through the tool registry and national directory; 335 fetched URLs across landing pages and supporting content, all eventually returning HTTP 200. Targeted source inspection used 43 repository clones, plus the main site's active handlers. HTTP success does not prove a working interactive tool. This is a reproducible inventory and prioritized audit, not exhaustive certification of every location, API response, user input, image, generated article, or separate-domain archive.

Four attempted owner clones were unavailable: Michigan Outdoor Weekend, Freighter View Garden Planner, Michigan Ice Report, and Michigan Whitetail Report. Main-owned ice content remained available. Sources can also exist behind private environment configuration that this audit did not inspect.

## Google policy interpretation

[Google's readiness guide](https://support.google.com/adsense/answer/12176698) and [Publisher Policies](https://support.google.com/publisherpolicies/answer/10502938) require useful publisher content and prohibit monetizing copied or embedded material without added commentary, curation or other value. They also address misleading representation and intellectual-property abuse. Shared public data alone does not establish duplication: the tool's useful transformation and presentation must be assessed. That last sentence is this audit's interpretation, not a Google approval decision. There is no word-count pass score in this audit.

The useful distinction is visible in this network: a frost probability, a crop planting window and a watering decision answer different questions despite shared weather inputs. Maps and calculators can supply substantial utility even with short initial HTML. Generated writing still needs accurate sources, editorial accountability and specific reader value.

## Changes in this release

- Michigan Fall Color: reject failed weather responses; missing sky/rain/temperature stays unknown. A partial history no longer masquerades as a complete warm spell. Preserve genuine zero rain and clear-sky observations.
- Michigan Fall Color daily note: explicitly identify AI generation and model-based interpretation on the page, report API and RSS, including previously stored notes. Future generation receives actual source drivers/dates and retains its input provenance. This improves transparency; it does not retroactively fact-check the archive.
- Trail Ridge Road: incomplete forecasts or unavailable alert data cannot establish workable travel weather; positive hazard evidence remains visible. Expired forecast periods are excluded.
- Space Coast: missing precipitation/wind remains unknown, and the strongest wind in a range is considered.
- Yellowstone: malformed, reversed, expired or missing eruption windows cannot be displayed as current predictions.
- Yosemite Firefall: two identical pages advertised different canonicals. Exact alias redirects consolidate into the already established `/yosemite-firefall-live/`; directory links and structured data point there. Asset paths remain usable.

The main identity pages, creator relationships and coverage strategy are preserved. Consolidating an exact duplicate supports a coherent canonical graph; it cannot guarantee ranking for any query. Prior PRs 367–369 and Gazette PR8 already addressed coverage context, tool shells, privacy, AI disclosures, source-health publishing gates and aurora routing.

## Commercial data issues to resolve

| Source | Concrete evidence | Remedy before advertising |
| --- | --- | --- |
| Open-Meteo | Seven mapped live products use keyless free endpoints: Beach Report, Michigan Fall Color, Outdoors Now, Phenology, XC Live, Cumberland Moonbow and Tahquamenon. Historical refresh code also appears in Platte Crane. | Confirm an existing commercial plan and configure the covered customer endpoints server-side, or replace the affected feeds while retaining their scientific meaning. Confirm history/air-quality/elevation coverage individually. Never expose a paid key in browser JavaScript. |
| eBird | API consumers appear in Michigan Birding Report, Birding Daily, Phenology and Bird Migration Morning. | Obtain/confirm written commercial permission, or replace the restricted data with appropriately licensed observations and revise claims honestly. |
| BirdCast | Derived dashboard/migration content appears in birding and phenology code. | Confirm permission specific to the products/content used; a publicly viewable dashboard is not proof of commercial reuse permission. |
| Open Waters AIS | Ballard uses anonymous API access; commercial service tier and upstream record permissions were not established. | Verify commercial entitlement plus source-specific attribution and rights. Preserve the working visitor tool while resolving the feed contract. |
| Other third parties | GeyserTimes rights could not be independently verified because its site denied access. Full media, rail-feed, article and observation/photo rights remain incomplete. | Retain a source/permission record and verify the specific reuse, rather than treating all public websites as open data. |

[Open-Meteo's terms](https://open-meteo.com/en/terms) explicitly classify websites displaying advertisements as commercial and limit the free API to noncommercial use. Its CC BY data license does not remove that service restriction. The [pricing and API plan page](https://open-meteo.com/en/pricing) describes commercial access; do not select a plan solely on forecast needs when history and other products are involved.

[eBird's API terms](https://www.birds.cornell.edu/home/ebird-api-terms-of-use/) require prior written permission for commercial API/data use and attribution. An existing API key alone is not that permission. [Cornell's general terms](https://www.birds.cornell.edu/home/terms-of-use/) impose additional content restrictions; BirdCast-specific scope needs confirmation.

[Open Waters' AIS page](https://openwaters.io/ais/) distinguishes free personal access from paid commercial access and describes multiple upstream licenses. The [MyShipTracking embed page](https://www.myshiptracking.com/more/embed-our-map) provides a supported website widget; that does not license unrelated images or third-party feeds. [NWS's disclaimer](https://www.weather.gov/disclaimer) describes public-domain use subject to exceptions and accurate identification; attribution should not imply agency endorsement of our derived conclusions.

## Duplication findings

A seven-word-shingle comparison flagged ten high-overlap pairs at a 0.72 screening threshold. This is a triage heuristic, not a Google standard. Yosemite's identical self-canonical pages required consolidation. Melvin's identical alias already identified the same canonical. Eight beach pairs shared substantial template text: Miners/Twelvemile, Sand Point/Twelvemile, Grand Haven/Holland, Glen Arbor/North Bar, Petoskey/Wilderness, Miners/Sand Point, Pere Marquette/Muskegon and Pentwater/Silver Lake. Their local data and access purpose must carry the value; do not bulk-add filler or delete useful destinations solely because their layouts match. Full locality-by-locality editorial validation remains open.

## Resubmission conditions

1. Resolve and document the commercial source issues above, including account-specific permissions this audit cannot infer.
2. Complete browser checks for every tool's main task, an empty/outage response and the most important location variants; record actual outcomes rather than counting controls or words.
3. Complete original-value and rights review for generated archives, embedded/media assets and highly similar location pages.
4. Verify live ads do not obscure controls or appear on empty/error-only screens. No served-ad layout was available for complete testing.
5. Confirm the appropriate Google-certified consent setup for personalized ads in the EEA, UK and Switzerland. See [Google's CMP requirements](https://support.google.com/adsense/answer/13554116?hl=en). Account configuration was not verified.
6. Request review only after the remaining items are resolved; approval is established by Google's [Sites status](https://support.google.com/adsense/answer/12170222), not this report. No review was submitted during this audit.

## Tool-by-tool record

All URLs below returned HTTP 200 during the crawl. “Distinct use” records observable utility; it is not an AdSense pass. The JSON ledger preserves canonical URLs as observed before this release and source-review commit references.

| # | Tool | Observed distinct value | Follow-up / limit |
| --- | --- | --- | --- |
| 1 | [Michigan Trout Report](https://michigantroutreport.com/) | River-specific fishing conditions and season context | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 2 | [Michigan Trout Stream Map](https://michigantroutreport.com/map.html) | Geographic stream discovery and map filters | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 3 | [Michigan Trout Daily](https://daily.michigantroutreport.com/) | Dated river analysis and report archive | Editorial and source-rights review remains for the complete automated archive. |
| 4 | [Michigan Salmon and Steelhead Run Tracker](https://michigantroutreport.com/salmon-run/) | River-by-river salmon and steelhead run context | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 5 | [Saginaw Bay Report](https://saginawbay.chrisizworski.com/) | Bay zones combined with wind and buoy conditions | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 6 | [Michigan Whitetail Report](https://whitetail.chrisizworski.com/) | Regional whitetail and harvest context | Owner repository was unavailable to this source audit; verify live fallbacks and source rights. |
| 7 | [Michigan Ice Report](https://chrisizworski.com/michigan-ice/) | Regional cold accumulation with explicit limits on ice safety | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 8 | [Michigan Phenology](https://phenology.chrisizworski.com/) | Multiple seasonal biology signals in a local almanac | Commercial access unresolved: Open-Meteo and eBird; BirdCast-derived content also needs permission review. |
| 9 | [Michigan Border Wait Times](https://chrisizworski.com/michigan-border-wait-times/) | Crossing comparison with direction-specific official wait information | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 10 | [Mackinac Bridge Live](https://chrisizworski.com/mackinac-bridge-live/) | Vehicle and crossing conditions interpreted for bridge trips | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 11 | [Great Lakes Gazette](https://chrisizworski.com/great-lakes-gazette/) | Shipping news organized into editions with source links | AI and source-health corrections from Gazette PR8 are live; source-content permissions and the complete archive still need review. |
| 12 | [Great Lakes Ship Tracker](https://chrisizworski.com/great-lakes-freighter-tracking/) | Corridor selection, vessel map and NOAA travel context | Public MyShipTracking embed supports website embedding; verify other media permissions and keep attribution. |
| 13 | [SS Edmund Fitzgerald](https://chrisizworski.com/edmund-fitzgerald/) | Substantial ship history and interpretive guide | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 14 | [Soo Locks Live](https://chrisizworski.com/soo-locks/) | Lock visit planning, official confirmation and local viewing context | Public map embedding has a provider-supported mechanism; retain attribution and verify third-party camera permissions. |
| 15 | [Great Lakes Buoy Dashboard](https://chrisizworski.com/great-lakes-buoys/) | Nearest buoy and lake comparisons for different activities | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 16 | [Michigan Beach Report](https://chrisizworski.com/great-lakes-beaches/) | Beach rankings, individual access context and weather comparisons | Commercial Open-Meteo access unresolved. Similar beach templates need continued review of unique local information. |
| 17 | [Great Lakes Levels](https://greatlakeslevels.org/) | Lake-level discovery leading to regional station and history pages | Landing page checked; all station/history pages on this separate domain were not exhaustively crawled. |
| 18 | [Michigan Boat Launch Finder](https://chrisizworski.com/michigan-boat-launches/) | Access-point discovery and boat-launch filters | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 19 | [Great Lakes Shipwreck Explorer](https://chrisizworski.com/great-lakes-shipwrecks/) | Filterable wreck locations and historical context | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 20 | [Great Lakes Lighthouses](https://chrisizworski.com/great-lakes-lighthouses/) | Lighthouse discovery with visitor and access information | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 21 | [Au Sable Field Map](https://ausable.chrisizworski.com/) | River access, float-time assumptions and leg-by-leg trip planning | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 22 | [Au Sable River Guide](https://chrisizworski.com/au-sable-river/) | Narrative river guide supporting the separate interactive map | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 23 | [Manistee River Field Map](https://chrisizworski.com/manistee-river-map/) | Manistee-specific access points and float planning | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 24 | [Michigan Outdoors Now](https://michiganoutdoorsnow.chrisizworski.com/) | Place-based outdoor decision planning | Commercial Open-Meteo access unresolved, including forecast, air-quality and elevation products. |
| 25 | [Michigan Outdoor Weekend](https://weekend.chrisizworski.com/) | Curated weekend destinations and trip guides | Owner repository was unavailable; complete generated-guide and source-rights review remains. |
| 26 | [Traverse City Winery Map & Wine Tour Planner](https://tcwine.chrisizworski.com/) | Winery constraints, selections and tour itinerary planning | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 27 | [Pictured Rocks Planner](https://picturedrocks.chrisizworski.com/) | Route and activity choices for different Pictured Rocks visits | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 28 | [Lake Superior Circle Tour](https://chrisizworski.com/lake-superior-circle-tour/) | Substantial original route, stop and itinerary content | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 29 | [Michigan Cross-Country Skiing](https://chrisizworski.com/michigan-cross-country-skiing/) | Trail type and access planning rather than a current snow report | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 30 | [Northern Michigan XC Live Conditions](https://xcski.chrisizworski.com/) | Trail-level skiing conditions and planning controls | Commercial Open-Meteo access unresolved; current browser calls need a server proxy if a secret paid key is used. |
| 31 | [Michigan Morel Report](https://morel.chrisizworski.com/) | Soil and seasonal morel context with uncertainty | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 32 | [Northern Lights Michigan](https://chrisizworski.com/northern-lights-michigan/) | Regional darkness, clouds and geomagnetic viewing context | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 33 | [Michigan Fall Color](https://chrisizworski.com/fall-color/) | Regional leaf-color timing and weather-informed trip planning | Missing weather/partial history correction included in this release. Commercial Open-Meteo access unresolved. |
| 34 | [Michigan Birding Report](https://michiganbirdingreport.com/) | Local bird observation discovery and migration planning | eBird commercial written permission unverified; BirdCast-derived content also requires permission review. |
| 35 | [Michigan Birding Daily](https://daily.michiganbirdingreport.com/) | County birding briefs and dated archives | eBird commercial written permission unverified; complete automated archive review remains. |
| 36 | [Zone 6a Planting Calculator](https://chrisizworski.com/zone-6a-planting-calendar/) | Crop-specific planting date calculation for Zone 6a | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 37 | [Heirloom Variety Matchmaker](https://chrisizworski.com/heirloom-variety-matchmaker/) | Variety matching against gardener constraints | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 38 | [Heirloom Seed Saving Guide](https://chrisizworski.com/heirloom-seed-saving-guide/) | Crop-specific seed-saving techniques | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 39 | [Michigan Frost Dates](https://chrisizworski.com/michigan-frost-dates/) | Station-based frost-date probabilities and local context | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 40 | [Seed Starting Guide](https://chrisizworski.com/seed-starting-guide/) | Seed-starting timing by crop and zone | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 41 | [Perfect Lawn Advisor](https://lawn.chrisizworski.com/) | Address-based lawn planning | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 42 | [When to Plant Tomatoes in Michigan](https://chrisizworski.com/when-to-plant-tomatoes-michigan/) | Soil, region and seedling considerations for tomato planting | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 43 | [Estivant Pines Hike Planner](https://chrisizworski.com/estivant-pines/) | Short-term forecast and walking choices for one destination | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 44 | [Isle Royale Interactive Map](https://chrisizworski.com/isle-royale-map/) | Island access, trail and trip-planning map layers | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 45 | [Aurora Tonight — U.S.](https://chrisizworski.com/national-tools/aurora/) | Location-based aurora viewing decision | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 46 | [U.S. River Conditions](https://chrisizworski.com/national-tools/rivers/) | Nearest river gauges, trends and historical context | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 47 | [U.S. Frost Dates & Freeze Risk](https://chrisizworski.com/national-tools/frost/) | Nearby station normals and freeze probabilities | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 48 | [U.S. Planting Calendar](https://chrisizworski.com/national-tools/planting/) | Crop windows and succession timing | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 49 | [U.S. Garden Water Decision Tool](https://chrisizworski.com/national-tools/garden-water/) | Root-zone watering decision rather than planting dates | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 50 | [U.S. Fall Color Timing](https://chrisizworski.com/national-tools/fall-color/) | Seasonal timing estimates distinguished from observed leaf color | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 51 | [U.S. Beach & Coastal Conditions](https://chrisizworski.com/national-tools/coastal/) | Official coastal risk, buoy and tide context | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 52 | [U.S. Snowpack & Snowmelt Conditions](https://chrisizworski.com/national-tools/snow/) | Measured snowpack distinguished from atmospheric melt conditions | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 53 | [Will I Have a White Christmas?](https://chrisizworski.com/national-tools/white-christmas/) | Lead-time-aware forecast and climate interpretation | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 54 | [White Christmas Probability Map](https://chrisizworski.com/white-christmas-probability-map/) | Historical probability map with interpretation | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 55 | [White Christmas Michigan](https://chrisizworski.com/white-christmas-michigan/) | Michigan climate and lake-effect context | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 56 | [Gauley Release Live](https://chrisizworski.com/national-tools/gauley-release-live/) | Release pulse information distinguished from recreation schedules | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 57 | [Niagara Falls Rainbow Predictor](https://chrisizworski.com/national-tools/niagara-rainbow/) | Rainbow geometry combined with mist, wind and cloud context | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 58 | [Cumberland Falls Moonbow Window](https://national-cumberland-moonbow-4k27.vercel.app/cumberland-falls-moonbow) | Moon geometry, river flow and viewing-window planning | Commercial Open-Meteo access unresolved. |
| 59 | [Blue Spring Live: Manatee Conditions & Best Time to Visit](https://chrisizworski.com/national-tools/blue-spring-live/) | Thermal refuge, manatee and arrival-time guidance around the embedded tool | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 60 | [Ballard Locks Live: Ships, Salmon & Tides](https://chrisizworski.com/ballard-locks/) | Lock operations, salmon, tides and vessel context | Open Waters commercial tier and each upstream AIS source permission/attribution remain unverified. |
| 61 | [Ballard Locks Interactive Tour & Live AIS Map](https://chrisizworski.com/ballard-locks/tour/) | Visitor tour and map distinct from the live conditions overview | Open Waters commercial tier and each upstream AIS source permission/attribution remain unverified. |
| 62 | [Melvin Price Live: Tows, Locks & River](https://chrisizworski.com/national-tools/melvin-price-live/) | River, tow, lock and visit decisions | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 63 | [Fort Madison Live: Trains, Barges & Swing Bridge Openings](https://chrisizworski.com/national-tools/fort-madison-live/) | Train and tow convergence and swing-bridge viewing context | Commercial rail-feed entitlement and source/media permissions remain unverified. |
| 64 | [Grand Coulee Live: Lake Roosevelt, Outflow, Tours & Laser Show](https://chrisizworski.com/national-tools/grand-coulee/) | Visitor timing, lake levels, outflow and show planning | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 65 | [Waterfall Window](https://chrisizworski.com/national-tools/waterfalls/) | Reach-specific hydrology and waterfall viewing conditions | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 66 | [Wildfire Smoke & Outdoor Air Window](https://chrisizworski.com/national-tools/smoke/) | Outdoor timing windows distinguished from observed air quality | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 67 | [Monarch Migration Live: Butterfly Migration Intelligence](https://chrisizworski.com/national-tools/monarch-migration-live) | Migration observations and flight-weather interpretation | Code includes licensed-observation handling; per-record and photo rights still need sampling. |
| 68 | [Platte Crane Live: Nebraska Sandhill Crane Migration Intelligence](https://chrisizworski.com/national-tools/platte-crane-live) | Seasonal crane planning with live abundance model explicitly disabled | Open-Meteo appears in historical backfill tooling; confirm rights/access before commercial refresh. Live abundance model is disabled. |
| 69 | [Lake Ice-Out Forecast](https://chrisizworski.com/national-tools/ice-out/) | Thaw and historical context for lake ice-out | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 70 | [Yosemite Firefall Live](https://chrisizworski.com/national-tools/yosemite-firefall-live/) | Seasonal light geometry, runoff and clouds for a specific phenomenon | Identical alias consolidated by exact redirects to established /yosemite-firefall-live/ canonical; discovery corrected. |
| 71 | [Rocky Mountain Elk Rut Live](https://chrisizworski.com/national-tools/elk-rut/) | Seasonal dawn/dusk elk-viewing context with access information | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 72 | [Blue Ridge Parkway Fall Color Live](https://chrisizworski.com/national-tools/fall-color/blue-ridge-parkway/) | Elevation-specific fall timing with observation and webcam context | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 73 | [Columbia Salmon Run Live](https://chrisizworski.com/national-tools/columbia-salmon-run/) | Dam counts, seven-day trends and species comparisons | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 74 | [Bird Migration Morning Index](https://chrisizworski.com/national-tools/bird-migration/) | Migration and weather signals for morning birding decisions | eBird commercial written permission unverified; BirdCast-derived content also requires permission review. |
| 75 | [Thunder Hole Live: Best Time to Hear the Boom](https://chrisizworski.com/national-tools/coastal/thunder-hole-live/) | Tide and wave timing with uncertainty for Thunder Hole visits | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 76 | [Florida Red Tide Live](https://chrisizworski.com/national-tools/florida-red-tide/) | Distance and age of field samples rather than an unsupported all-clear | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |
| 77 | [Space Coast Launch Viewing](https://chrisizworski.com/national-tools/space-coast-launch/) | Launch schedule confidence separated from visibility weather | Missing-weather and wind-range corrections included in this release. |
| 78 | [Trail Ridge Road Live](https://chrisizworski.com/national-tools/trail-ridge-road/) | Official road access separated from alpine travel weather | Missing forecasts/alerts can no longer produce a workable-weather verdict in this release. |
| 79 | [Yellowstone Geyser Timing](https://chrisizworski.com/national-tools/yellowstone-geysers/) | Current eruption-window comparison with source and timing context | Invalid/expired window correction included in this release. Independent GeyserTimes permission verification blocked by site access denial. |
| 80 | [Tahquamenon Falls Live](https://chrisizworski.com/tahquamenon-falls/) | Flow, weather and route choices for different waterfall visitors | Commercial Open-Meteo access unresolved. |
| 81 | [Ontario Fishing Lake Finder](https://chrisizworski.com/ontario-fishing-lake-finder/) | Lake discovery with explicit limits on verified fish-record coverage | Distinct use is visible; full interactive, source-rights and failure-state verification remains. |

## Release validation

- Main site: `npm run verify:all` passed, including all 439 tests and the required source, routing, search, entity, freshness and product benchmarks.
- National directory: all 68 tests passed; its Yosemite sync script was run before testing.
- Seven new regression tests exercise incomplete weather, real zero values, failed weather responses, wind ranges, invalid/expired geyser predictions and exact Firefall canonical redirects.
- These checks validate the changed behavior and existing repository contracts. They do not establish complete interactive coverage or commercial source entitlement for the 81-tool network.

Follow-up validation: legacy report API and RSS tests confirm AI/model disclosure also covers previously saved notes. The preceding release passed 51 production assertions across 15 routes/endpoints; browser checks loaded the fall-color regional readings, Firefall off-season view, road conditions, tentative launch list and current geyser windows. Full 81-tool interactive coverage remains incomplete.

Soo Locks follow-up: the MyShipTracking iframe returned an internal server error while its parent falsely showed a loaded/live status. Replaced it with a bounded Open Waters AIS feed and on-page map/list, preserving upstream attribution and actual report times. The owner confirmed data permissions before this repair.
