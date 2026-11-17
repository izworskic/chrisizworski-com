# Frozen Lighthouse Watch: experience and evidence brief

Canonical: https://chrisizworski.com/frozen-lighthouses-michigan/
Date researched: 2026-11-16
Owner: izworskic/chrisizworski-com

## Visitor decision

Will exposed Lake Michigan pier lights experience freezing spray in the next 72 hours, where, and during which hourly window? The watch is NOT an assessment that any pier is safe to enter. The answer is source-derived and may be unknown.

## Two closest site tools and design comparison

- Michigan Ice Report: lake and region seasonal freezing history with lake-ice and accumulated-cold context. Reuse the same existing /api/ice response and author entity. The new tool differs in time horizon, unit of comparison and principal decision. It ranks a distinct set of individual pier lights by hourly freezing spray signals and explicitly separates missing local pack ice.
- Great Lakes Buoys: dashboard for observed current wave, wind and temperature at reporting stations, with an interactive station map. Do not reuse its summer buoys as winter evidence. The new tool instead presents a linear hourly risk-to-ice chart, named pier explanations and NWS forecast issue times. Charts are not a map or a navigation aid.

**Design differences:** immediate future-window answer, rather than general conditions; a distinct weather-sheet page with expandable hourly timelines, not a generic map or identical card catalog; shoreline safety reminders next to every result. Focus is one visitor question.

## Source and failure-state matrix

| Signal | Source | Maximum age | Missing data action |
| --- | --- | --- | --- |
| Hourly wind, direction, air | NWS forecastHourly via NWS point discovery | 6 hours since issue time | No score for a missing hour or entire pier |
| Water at close-range sites | NOAA COOPS Holland 9087031 | 36 hours | Lakewide GLSEA fallback labeled explicitly; otherwise no score |
| Water elsewhere | NOAA GLERL GLSEA daily Lake Michigan mean | 72 hours | No score; no fabricated regional temperature |
| Existing lakewide ice | Existing same-origin /api/ice | 48 hours since daily observation | Unknown, not zero; local pack ice still unknown |
| Official freezing spray event | NWS alerts active by verified nearshore marine zone, with paired zones at harbor boundaries | 3 hours since feed update | Alert status unavailable or partial, never an all-clear |
| Wave height | Not verified as year-round | Not applicable | Omit wave-height score entirely |
| St. Joseph visual | Official Visit Southwest Michigan outbound link | User checks directly | No embedded or proxied video |

## Safety and semantic states

States are modeled ice-building window, no modeled spray gate crossing, and insufficient evidence. None means safe access or confirmed ice on a light. All cards and the hero warn to stay off the pier. Persistence is a qualitative forecast estimate, not proof that existing ice remains or will melt at a particular time.

## Quality release record

Source locations: USCG Light List Volume VII, Overland 1990 NOAA PMEL and Navy vessel icing technical summary. Search demand: 120 alphabet-expanded Google Suggest calls; 122 unique suggestions, not GSC volume. No photos because no per-light rights-verified license package was collected. No additional Vercel project, database or cron. The page is static, with one new CDN-cached edge endpoint.

Automated verification: pending pull request CI. Visual comparison and mobile browser execution: not yet measured, so no claimed experience score or live production readiness.

Nearshore marine zone names and identifiers were crosschecked against https://www.weather.gov/marine/greatlakestext and seven distinct live NWS zone alerts endpoints returned on 2026-11-16.

## Second-pass forecast desk | 2026-11-16

**Problem confirmed from source:** The first release had nine long individual cards and 72 bars inside each card. To compare two sites at the same forecast hour, a visitor had to expand multiple cards and manually align hours. The default top verdict only named the maximum-hour score. It did not expose a continuous span of conditions.

**External examples checked on 2026-11-16:**
- NWS Hourly Weather Graph, https://www.weather.gov/wrn/hourly-weather-graph: visual hour-by-hour reading and selectable weather elements; source-backed hourly details. This is an official description, not a full interactive field test.
- Meteoblue meteograms, https://content.meteoblue.com/en/private-customers/website-help/forecast/meteograms: dense local forecast elements and observation/forecast issue time conventions. Research only; no Meteoblue data or proprietary visual assets used.
- REA official JavaScript analysis documentation, https://github.com/morluto/rea/blob/main/docs/javascript-artifact-reconstruction.md: local source artifact inspection and explicit coverage/limitations.

**Three investigated opportunities:** (1) a single shared forecast hour for all nine piers to eliminate manual alignment; (2) continuous verified hour grouping with a distinct first window, peak, and duration, without interpolating missing periods; (3) a photograph-led gallery using verified historic lighthouse ice images. Selected (1) and (2). Declined (3) pending photographer permissions and attribution verification. Do not hotlink visitor bureau or news imagery.

**Two credible designs reviewed:** A giant nine-row-by-72-column heatmap would reveal coastwide patterns but creates 648 small targets, a poor keyboard and mobile touch model. A north-to-south list with a shared time scrubber lets a person first choose a place or hour, then see synchronized coastwide readings, detailed source age and a Google Maps light locator. Selected the second, preserving all nine original detail cards and their hourly tables below the desk.

**Implementation:** New static browser controller /assets/frozen-lighthouse-desk.js listens for one event from the existing API consumer. It makes no second network request and adds no Vercel function, database, scheduler, external mapping SDK or build dependency. Button selection, native range, previous/next controls, exact issue timestamps, and cross-place indicators share one selected time. Browser URL query parameters retain the chosen lighthouse and hour, while the canonical stays unchanged. Latitude/longitude links refer to the USCG light positions, not parking or accessible pier routes.

**Science change:** The existing Overland relative hourly indicator remains authoritative. A new conditionWindows helper groups only contiguous modeled positive hours, stopping at unknown, zero or missing timestamps. The displayed duration is conditional, not a forecast of existing ice or a safely accessible visit window. An independent, offline TSV fixture is checked by JavaScript, Python and Rust. The Python suite additionally asserts that forecast severity categories do not decline with stronger onshore wind under controlled conditions. These are consistency checks, not independent validation of real lighthouse ice formation.

**REA evidence:** On-demand, pinned REA 6.9.0 analyzed the two owned lighthouse JavaScript assets through a temporary CI workflow, GitHub Actions run https://github.com/izworskic/chrisizworski-com/actions/runs/43998715151. REA reported a reconstructed JavaScript artifact graph, no integrity contradictions and complete parse status for the inspected watch asset, with exact artifact-byte coverage. It did NOT verify actual browser rendering, physical icing accuracy or competitor internals. The temporary workflow was deleted after success. No project .mcp.json registration or persistent REA service was added.

**State checks:** A -> B -> A place selection preserves the chosen absolute forecast hour. Every pier shows its own result for that selected hour; unknown is visibly distinct from zero. Missing API clears the desk and disables controls. St. Joseph land viewing is supported only by the existing Visit Southwest Michigan source; no parking availability is inferred for any other pier. All dynamic content is rendered using textContent, not external HTML. JavaScript disabled retains the original HTML FAQs, warnings and official sources.

**Status before PR acceptance:** Implementation committed on a feature branch. Science parity, mock-data Chromium tests, and full verify:all must pass in CI. No claim of public deployment, actual icing observation, improved CTR or verified photographs.
