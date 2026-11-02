# Garden Pest Watch — Forecast Truth v1, Japanese beetle operational pilot

**Date:** 2026-11-02  | **Canonical visitor page:** https://chrisizworski.com/michigan-garden-pest-watch/  | **Owning repo:** `izworskic/chrisizworski-com`

## Mission, value and user decision

Give a Michigan gardener a clear, locally relevant answer: **Does an official model suggest that I should start scouting my beans, grapes, berries or roses for Japanese beetles?** Separate modeled adult and egg-hatch heat thresholds from actual beetle observation. Source evidence is visible alongside the answer, never obscured by a generic "risk score."

**V1 must not:** use simple-average DD50 as a Japanese-beetle single-triangle proxy; claim beetles at a garden from a gridded thermal model; calculate a future year's date from 2021–2025 Daymet medians; present a WCS layer coverage date as verified issuance time; imply that crop-independent or off-season status means no pests; issue pesticide product/rate/treatment triggers.

## Source investigation and key discovery

The official USA-NPN Japanese beetle Pheno Forecast page reports **873°F degree-days for earliest adults and 1,543°F degree-days for mean egg hatch**, single-triangle DDRP with 50°F lower and 92°F upper threshold, accumulation starting Jan 1: https://www.usanpn.org/data/maps/forecasts/Japanese_beetle

The network states Pheno Forecast maps are updated daily and offer a **six-day** future horizon; gridded model predictions supplement local inspection, not replace it: https://www.usanpn.org/data/maps/forecasts

Direct GeoServer discovery on Nov 2, 2026 verified **two dedicated species-specific raster coverages** in WCS `GetCapabilities` and `DescribeCoverage` (rather than merely generic AGDD rasters):

- `gdd:japanese_beetle_adult`
- `gdd:japanese_beetle_egg_hatch`

WCS `DescribeCoverage`: `https://geoserver.usanpn.org/geoserver/wcs?service=WCS&version=1.0.0&request=DescribeCoverage&coverage=gdd%3Ajapanese_beetle_adult` (same pattern for egg-hatch). The raster metadata lists **exact available dates** beginning 2025-04-07 through 2026-11-02 (at research time), with individual time positions. The WCS temporal axis is *coverage availability* and NOT a verified image publication time.

WMS 1.1.1 `GetFeatureInfo` for the same exact `TIME` and `LAYERS=QUERY_LAYERS`, sampled at the reference lat/lon with EPSG:4326 axis order `BBOX=lonMin,latMin,lonMax,latMax`, returned one `FeatureCollection.features[0].properties.GRAY_INDEX` value per stage. Values are day-of-year-style modeled threshold dates; decimal egg pixels are rounded to nearest calendar day and source-native float retained. **Do not interpret this as the number of beetles, likelihood of pest presence, or verified biological emergence.** No current garden sightings are supplied by either layer.

The pilot does not reconstruct the official forecast mathematically; it reads **the agency's actual species-specific data products**. The separate independent Daymet historical lab remains untouched, non-operational for forecast decisions.

## Independent live-source geographic sanity check (2026-11-02)

Exactly the same explicit WMS 1.1.1 query construction was used at ten named reference points. These are research observations of **official modeled date-index raster values**, not sightings and not immutable model fixtures.

| Michigan location | Adult model day | Egg hatch model day |
| --- | ---: | ---: |
| Bay City | 186 | 217.193 |
| Detroit | 177 | 202.326 |
| Lansing | 181 | 209.841 |
| Grand Rapids | 181 | 207.512 |
| Traverse City | 196 | 230.097 |
| Marquette | 213 | 259.662 |
| Houghton | 209 | 253.946 |
| Alpena | 207 | 244.581 |
| Kalamazoo | 182 | 211.691 |
| Sault Ste. Marie | 213 | 261.442 |

These samples establish that selected geography changes the actual model output, the two stages are appropriately ordered, the layer is not a constant generic DD50 scalar, and Michigan is inside the populated source raster. They **do not** establish forecast accuracy against observed beetle emergence or station-level microclimate.

## Architecture and failure modes

1. New `lib/japanese-beetle-forecast.cjs` is the **source adapter and decision classifier**. It queries both WCS coverage metadata and both WMS point values server-side. The current date is in `America/Detroit`, not UTC. Only a dataset date explicitly listed in both temporal axes, from the current year and no older than two days, may be called operational. Provider refresh / source fetching time is never mislabeled as official raster issuance time.
2. New `/api/japanese-beetle-forecast?crop=roses&zip=48706` or `?site=bay-city` uses existing Census ZIP Tabulation Area lookup and named-city resolver. A ZIP lookup failure never substitutes Bay City. No visitor GPS or garden address is saved. Fixed source layers, HTTPS provider host, bounded Vercel runtime; one-hour verified edge cache and two-minute outage cache.
3. Both sampled pixel values must be numeric, 1–365/366, finite, and **egg hatch >= adult stage**. Null/empty/-9999/non-numeric/mismatched-year/outdated coverage returns `UNAVAILABLE`, never an invented risk status.
4. The UI is a purpose-built **forecast wire** below the crop scouting decision and before the historical lab. It follows the crop selector, location, pending/not-applicable/off-season/scout/egg-stage/preparation state, source timestamps, and accessible textual modeled stage dates. A change to crop or ZIP immediately discards old model output; a successfully verified main scouting response initiates an official forecast request only for Japanese beetle host crops. No duplicate indexable URL, no new database, no frontend vendor bundle, no map whose raster pixels are guesses.
5. **Winter 2026:** when official current-year coverage is valid but its adult and egg stages are earlier in the same year, the tool explicitly returns `OFF_SEASON` and presents 2026 as a completed season, never a November emergence alert. **January 2027:** a surviving 2026 layer must return unavailable until 2027's own date dimension is listed and fresh.

**In-season decision policy:** if first-adult model day is 0–6 days from the reference date, `SCOUT`; if adult threshold is earlier and modeled egg hatch is 0–6 days away, `EGG_WINDOW`; if outside that horizon, `PREPARE` or `THRESHOLD_PASSED` with cautious wording. The model does not establish pest abundance or justify a pesticide application.

## Design options compared

**A — overlay a generic Jan-1 DD50 map with 873/1543: rejected.** A different degree-day algorithm leads to apparently precise but unscientific dates; also misses the validated provider map sources.

**B — publish a map screenshot and ask visitors to eyeball their Michigan county: not sufficient.** It cannot verify the exact ZIP reference pixel, its source date, or that the two life stages are current.

**C — official point-sampled forecast wire alongside the existing crop scouting and historical lab: selected.** The UI is an evidence-terminal with two model stages, rather than cloning the seasonal watch cards. It can answer "when should I check this crop" and still show a useful unknown when source retrieval fails.

## Release value/loss functions and measurable gates

| Function | Weight | Gate and required evidence |
| --- | ---: | --- |
| **F1 Source truth and geographic correctness** | 35% | Confirm 2 dedicated layer IDs; exact date present in WCS; 10 Michigan non-identical source points; reject non-finite/no-data pixel and both-stage disagreement |
| **F2 Scientific safety and scouting action** | 30% | Threshold, Jan-1 and single-triangle metadata sourced; no generic DD math; only 4 host crops; in-window scout only; no inference of observed pests/chemical treatment |
| **F3 Experience OS / user decision** | 20% | First crop assignment preserved; independent source wire tells what to scout; A→B→A and ZIP resets; 360/390/768/1440 browser, no-JS and source outage; visibly different from historical heat strip and seasonal field notes |
| **F4 Release and performance** | 15% | 100% deterministic contracts pass; full repo verify, Vercel preview READY, production exact-SHA READY, independent real API smoke and live page verification |

Minimum 90/100 in each function and weighted >=92, **plus zero critical vetoes**. Weighting is an engineering quality assessment, *not* observed field prediction accuracy. Hard vetoes: false infestation; recycled 2026 as live 2027; unnamed stale source; any invented numerical probability; generic AGDD converted to species emergence; unsupported pest treatments; no-data mistaken for no pests.

**Observed-beetle field validation is NOT COMPLETE.** The USA-NPN publisher's official raster is used directly, so implementing a separate model parity calculation is no longer a prerequisite for this pilot, but accuracy against field-observed life stages remains unmeasured. The NPN temporal catalog observed in 2026 covers only 2025 onward, so a 3-season comparative archive and 95% pilot source uptime measurement cannot honestly be claimed now. Store these as future operational validation benchmarks, not fabricated release accomplishments.

## Required release evidence

- Unit tests for exact WCS temporal date, WMS pixel parse, two-source agreement, 2027 rollover, stage ordering, nonhost state, geographic bounds and absent upstream, and the crop action rule.
- Four-width browser tests for forecast state, historical and scouting separation, rapid state changes, no-JS and source outage; screenshots/QA artifact.
- Live production test for 2026 Bay City and at least one Census ZIP returning `OFFICIAL_MODEL_AVAILABLE` with source timestamp and **OFF_SEASON**, not an active pest warning.
- Preserve the existing `#person`, canonical, site discovery, SEO/ad loader and no permanent state infrastructure.

**Prepared:** 2026-11-02. **Release status:** feature branch; unverified until exact-head GitHub workflow and independent production smoke are recorded.


## 2026-11-02 source-age correction to operational window

**Issue identified after production verification:** USA-NPN documents **six future days from its source forecast**, not necessarily six future days from a visitor's current date. Our reader already permits exact dated provider layers up to two days old. Therefore a six-day-from-*visitor-now* threshold could overstate the supported near-term guidance by up to two days. This is a scientific reliability bug even when the underlying spatial data are authentic.

**Invariant:** `remainingNearTermForecastDays = 6 - sourceDateLagDays`. The only allowed lag values are integer 0, 1, 2, from the independently checked WCS coverage date. For example with July 1 source viewed July 3, an event on July 9 is eight days from the source, so it must be `PREPARE`, **not** `SCOUT`. Egg-hatch monitoring uses the same remaining window; a past adult threshold does not transform a later egg threshold into a verified short-range forecast.

The source response includes `source.remainingNearTermForecastDays`; the proof desk shows that horizon when displaying active-season forecasts. The original 2026 off-season output is unchanged. Regression tests cover adult and egg boundary differences, source lag 1/2, out-of-range lag, and intact no-observation safeguards. Official USA-NPN source: https://www.usanpn.org/data/maps/forecasts . This correction does **not** assert model error against field observations or any verified pest population.
