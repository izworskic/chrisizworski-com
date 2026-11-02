# Garden Pest Watch: Scientific milestone 2 / Historical Timing Lab

**Dated:** 2026-11-02. **Canonical:** https://chrisizworski.com/michigan-garden-pest-watch/ . **Research issue:** #1416. **Owner:** `izworskic/chrisizworski-com`. **Feature branch:** `feature/garden-pest-historical-science-lab-20261102`.

## Goal
Give Michigan gardeners a **transparent, place-specific view of how pest thermal thresholds varied in actual past seasons**, in a way that adds value without promoting heat accumulation to confirmed pest occurrence or an invented future forecast.

A visitor selects Michigan ZIP (Census ZCTA interior point) or Bay City reference city, opens a separate optional science desk, and sees **five annual, reconstructed Japanese beetle heat-threshold dates** drawn from NASA Daymet Version 4 R1 historical daily tmin/tmax records at ~1 km pixel resolution. The table is the readable primary evidence, and a minimal two-series season strip only visualizes the exact historical dates. A future-date prediction, scouting alert, treatment recommendation, probability or confirmed pest presence must never be produced by this experimental history.

## Research decision and alternatives

**Option A: combine the existing USA-NPN Jan-1 DD50 simple-average raster with Japanese beetle 873/1543 thresholds. REJECT.** USA-NPN's Japanese beetle method is a single triangle with 50°F lower / 92°F upper bound. Generic Jan-1 heat totals use different mathematics, so resulting dates are scientifically wrong, however visually attractive.

**Option B: auto-forecast beetle arrival in 2027 from historical median crossing dates. REJECT.** Past heat is not next year's temperature. A historical median could easily be read as a forecast, especially alongside the live watch verdict; method parity and actual biology-based emergence observations have not been established.

**Option C: separately-labeled Historical Timing Lab backed by NASA Daymet actual 2021–2025 daily tmin/tmax. SELECT.** Opt-in, economical, independent, model-method matched in *form* (single triangle, horizontal upper cap), spatial and data-source qualified. Does not alter the live pest scouting decision; a missing year voids all central estimate instead of inventing a date. Source links and per-year table permit review.

## Authoritative source facts verified

- USA National Phenology Network Japanese beetle adult earliest appearance threshold **873°F DD**, egg-hatch mean **1543°F DD**, start Jan 1, base **50°F**, upper cutoff **92°F**, **single-triangle** method. https://www.usanpn.org/data/maps/forecasts/Japanese_beetle
- NASA Daymet V4 R1 ~1 km gridded tmax and tmin at a location, historical data 1980–last complete calendar year. Daymet single pixel API, years=2021,2022,2023,2024,2025: https://daymet.ornl.gov/web_services and https://doi.org/10.3334/ORNLDAAC/2129
- Daymet leap years use *365 day yday*, including Feb 29 and omitting December 31, so date mapping uses year+yday, never assumes 366 records.
- USA-NPN data policy CC BY 4.0 with specific data attribution; no NPN photographs are reproduced. https://www.usanpn.org/about/terms
- NASA Daymet gridded climatology is a historical model-generated estimate, not a measured thermometer at the garden. Historical NASA provider and NPN's operational DDRP model do NOT use the same meteorological inputs.
- MSU cabbage maggot model parameters and squash vine borer calculation/rights remain unverified; no unsupported GDD event is activated for either.

## Precise method and reproducibility

Let daily minimum `L`, maximum `H` in Fahrenheit, and `A(T)` = area under a symmetric single triangle *above* temperature `T` divided by one day:

`A(T)=0` when `H <= T`; `A(T)=(L+H)/2-T` when `L >= T`; otherwise `A(T)=(H-T)^2/[2(H-L)]`.

Our exploratory daily heat is `max(0, A(50)-A(92))` in °F degree-days; this is the horizontal upper-cutoff single-triangle interpretation. Starting on Jan 1, cumulative heat triggers retrospective crossing of 873 and 1543. The daily series is not mixed with existing generic NPN simple-average heat, and no current-year NWS forecast is added to historical totals. **Operational USA-NPN/DDRP algorithm parity has not been established.** These reconstructed dates are not scientific validation against actual beetle emergence and must never be labeled as observations.

The model contract is versioned `japanese-beetle-daymet-retrospective-v1`. The separate endpoint `/api/garden-pest-timing-lab?zip=48706` or `?site=bay-city` returns `HISTORIC_MODELLED_RESEARCH_ONLY`; the existing `/api/michigan-garden-pest-watch` remains untouched. Daymet series must have 365 chronological complete records for EACH of the five years, numeric C tmax>=tmin, valid spatial bounds, known variable names, no missing or duplicate days. On any source error the endpoint returns `UNAVAILABLE` and never a zero-risk or guessed season. UTC/MI timezones are not used to fake future model dates. NOAA/NASA services are requested only on click; Vercel edge caches verified historical payloads for one day. No persistent DB, API key, Redis, Supabase, geolocation prompt or unlicensed photo.

## Verified Bay City reference-point manual cross-check (43.5945,-83.8889)

All 1825 Daymet records present (365 each year) when checked Nov 2, 2026. Independently calculated exploratory threshold crossings:

| Year | Adult 873°F DD | Egg 1543°F DD |
| --- | --- | --- |
| 2021 | 2021-06-24 | 2021-07-26 |
| 2022 | 2022-06-28 | 2022-07-30 |
| 2023 | 2023-07-02 | 2023-08-04 |
| 2024 | 2024-06-22 | 2024-07-26 |
| 2025 | 2025-06-30 | 2025-07-29 |

**These five dates are testable historical degree-day model outputs, NOT beetle survey observations or dates of emergence.** Latitude/longitude was the Bay City *reference city*, not the user's home address; a ZIP query will use the Census ZCTA interior point and may differ.

## Benchmarks / loss functions

| Portion | Must pass | How measured |
| --- | --- | --- |
| Data quality 35% | Five complete 365-day years, exact metadata and MI spatial validation; no stale substitute | Missing-day, leap-year, impossible temperature, API outage, out-of-region fixtures |
| Model math 30% | All tested cases match independent numerical integration within 0.005°F DD/day; original 873 and 1543 preserved; noninterchangeability tests | Numeric integration and fixed control geometry |
| Visitor value 20% | Crop and ZIP changes do not retain prior location's history; table plus mini plot, clear forecast/observation distinction, opt-in load | 360/390/768/1440 Chromium, no JS, outage, A→B→A |
| Release safety 15% | No new numeric model in live verdict; no chart on incomplete years; original full CI+site build+preview+public smoke | Compare JSON outputs, Github CI, screenshots, Vercel READY and independent canonical |

**Vetoes**: any fabricated 2026 or 2027 adult emergence date, incomplete year presented as median, unverified operational parity declared as truth, generic heat substituted for a species model, current temperature source used as a pest observation, supplier data used without accurate attribution, or unsupported garden-specific treatment. Any veto = 0 and no merge. Acceptable initial state: historical model only. The wider goal is still evidence-class separation and injury prevention, not prettier numbers.

## Next scientific gate, explicitly NOT complete
- Obtain official DDRP/USA-NPN model implementation details (single-triangle variants, cutoff handling) and same-weather historical data if allowed. Compare reconstructed dates for at least 5–10 independent stations over 3–5 years to official archived forecasts; report bias, MAE and spatial error.
- Compare threshold-crossing dates to independently verified observed adult/egg-life-stage field data, where legally available and adequately sampled, without cherry-picking. Measure bias and uncertainty and biological false alarm vs miss for geography and habitat.
- MSU cabbage maggot: confirm actual Michigan method, base, start date, generations and measured events. Squash vine borer: secure complete method and permission or retain seasonal reference. Both stay BLOCKED.
- Only after these checks, add separately versioned `BIOLOGY_MODELLED` **live** outputs with documented forecast horizon and source freshness. Historical medians are not a forecast.

## Source, UX, SEO constraints
One existing canonical URL. No new indexable competing page; the lab is a subordinate opt-in section under current scouting verdict. Plain-language evidence in source register, responsive data table and graphic, no species photographs mistaken for verified ID, accessible link to raw NASA Daymet source. Retain original tool directory, Person schema and ad safeguards. No alteration to existing NWS provider or seasonal-intelligence shared contract.

**Status at writing:** Implementation on feature branch; CI, screenshot QA, production publication and live results must be verified and recorded separately. Numerical forecast **not enabled**.
