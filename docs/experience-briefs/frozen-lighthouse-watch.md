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
