# Japanese beetle Field Evidence v1 — biological cross-check milestone
**Research / build:** November 2, 2026. **Canonical:** https://chrisizworski.com/michigan-garden-pest-watch/ . **Owner:** izworskic/chrisizworski-com . **Branch:** feature/japanese-beetle-field-evidence-validation-20261102.

## Scientific problem and explicit release limits
USA-NPN Japanese beetle Pheno Forecast models first adult emergence and egg hatch from species-specific thermal development models. The existing production adapter verifies the actual dated raster time dimension and returns the predicted stage date for a Michigan point. It has NOT established whether those dates correspond to biological first adult emergence in local gardens.

A voluntary photograph dated after a modeled date does **not** prove the model was right. Earlier beetles may have been present without observers, and a record at 25 km distance is not the raster pixel. Even a photo dated before a modeled threshold is evidence warranting further investigation of scope, not a defensible numerical forecast-error statistic. Without systematic repeated **negative and positive** site visits, timing of true first emergence is not observable from incidental uploads.

### Data source review, 2026-11-02
- USA-NPN official Japanese beetle Pheno Forecast and WCS/WMS raster layers `gdd:japanese_beetle_adult` and `gdd:japanese_beetle_egg_hatch`: https://www.usanpn.org/data/maps/forecasts/Japanese_beetle . Species-specific modeled thermal timing, no insect detections.
- USA-NPN Nature's Notebook *Popillia japonica* phenophase protocol supports "Adults", "Adults feeding", "Mating", "Egg laying", and standardized negative / positive observations; best future reference for monitoring-site onset: https://naturesnotebook.usanpn.org/npnapps/species/Popillia/japonica and https://data.usanpn.org/observations/ . Live Michigan same-site repeated negative/positive cohort has NOT been established; no accuracy claims.
- iNaturalist v2 public observation API `https://api.inaturalist.org/v2/observations`. Species **taxon 67760**, Michigan **place 29**; query georeferenced, research-grade, photo-backed adult beetle records within **25 km** of selected reference point. Filter public site geoprivacy and spatial uncertainty <=5000 m. Return only dated source links, not uploaded photographs or precise observer locations. API recommended practices: https://www.inaturalist.org/pages/api+recommended+practices . Limit to at most first 100 ordered records, cache 6h, one service fetch per page visit. No bulk scraping, attribution preserved.
- MSU Extension July 15 2026 photo documents Japanese beetles on grapevines in Ray Township on July 13, 2026: https://msu-prod.dotcdn.io/news/japanese-beetle-control-for-fruit-orchards-and-vineyards . Independent extension provenance, but not a continuous field onset series.
- Michigan DNR Japanese beetle status: widespread and established, emergence broad June/July; state no longer maps range reports: https://www.michigan.gov/invasives/id-report/insects/japanese-beetle .

### Independently verified real-source examples (NOT accuracy scores)
- Bay City **2026**: Official USA-NPN archived adult raster at city reference reports DOY 186 **July 5, 2026**. iNaturalist public query (25 km around 43.5945/-83.8889, research grade, photo, 2026) returned 11 records, first dated **July 5, 2026**, directly linked https://www.inaturalist.org/observations/378482973. Same date is incidental association only.
- Bay City **2025**: Official archived raster at TIME=2025-10-15 reports DOY 188 = **July 7, 2025**. iNaturalist public query returned 21 records, first **July 3, 2025**, https://www.inaturalist.org/observations/294829197 (public coordinate; 6m position accuracy). The first reported sighting is **four days earlier** than the modeled city reference date. Compare spatially and investigate, do not imply a failed biological first-emergence forecast without a controlled detection dataset.

## Experience options and selection
**Option A: present "Japanese beetle forecast 95% accurate" from first crowd sightings. REJECT.** There are no standardized surveyed non-detections, ground truth date of true emergence, consistent observer coverage, or causal adjustment for search effort.

**Option B: ingest broad monthly statewide iNaturalist sightings and say "beetles nearby." REJECT.** Statewide reports fail local reasoning; records can be obscured, geographically imprecise, captive or misidentified, and absence cannot imply local safety.

**Option C: independently sourced Field Evidence lens + archival benchmark script. SELECT.** Primary answer remains USA-NPN official model. After choosing pilot host crop and valid Michigan location, show nearest bounded, research-grade public photo records by observation date, with a comparison explicitly defined as *dates observed vs modeled thermal day* and no diagnostic inference. No photography reuse. Stale, schema-invalid, geoprivacy-hidden or offline data fails closed.

Closest existing experiences: the Forecast Wire (species model) and NASA historical timing lab (independent heat reconstruction). This new lens is **observation-first**, contrasting provenance classes; location+model contextual comparison, not another generic forecast status card. It must never override the field action, treatment guidance, or NWS weather score.

## Quality benchmark and biological research gate
| Dimension | Gate |
| --- | --- |
| Species + geography + quality | Exact scientific taxon; Michigan; radius 25 km; known photo; research grade; public position accuracy <=5 km, no obscured/private point |
| Year + provenance | Same season; explicit checked time, source record URL, sample size, no unknown dates |
| Observation | "Sighting" means presence by reported date only, never first emergence, population risk, confirmed yard infestation, or egg hatch |
| Missing / stale | Invalid schema, failed fetch, ZIP mapping failure -> unavailable, never zero beetles |
| Spatial caveat | Nearby 25 km search cannot validate an individual ~raster point; avoid false precision |
| Cohort | Ten named reference areas, years 2025/2026, exact October 15 archived time slices verified against WCS axis |
| Forecast-skill gate | **FAIL until** repeated no/yes monitoring visits across >=3 complete seasons and enough matched sites; no numerical accuracy score from opportunistic records |
| Frontend | New evidence panel shown only for four pilot host crops, A→B→A and ZIP state reset, keyboard / mobile / no-JS fallback |
| Release | node science tests; browser fixtures; full repo checks; preview and live source smoke; deployment verification |

## Current missing evidence
The USA-NPN archived species raster accessible through GeoServer starts April 2025 (historical Daymet reconstruction extends earlier but not equivalent to the official operational model). The current cross-check can cover at most **two** comparable official archived seasons, not the three desired. No project-specific citizen photo can serve as a negative or true first-emergence sample. No calibrated false-positive, sensitivity, or timed prediction-error score is claimed.

The archive script tests 10 Michigan locations × 2 seasons (20 location-years) via official single-pixel queries and bounded iNaturalist records, rejects unavailable provider days, reports every unavailable row, and exports only source links + summary JSON as a workflow artifact. Live provider failure is a data-quality failure, not validation.

## Data rights / privacy / infrastructure
- Public source links and compact metadata are shown with attribution, no cached/copied photographs, personal IDs or coordinates; only project city-center reference points are queried.
- Server-side only queries, strict allowlist host and taxon, public response cache 6h; source request cap. No Redis, Supabase, new database, or browser-side secrets.
- Source metadata can change with observer correction, identifications, uploads and privacy settings; retrospective source reports are dated snapshots.
- No new indexable page, URL, sitemap, canonical, Person ID, map, ad-stack change or direct pest treatment recommendation.
- Persistent scoring never upgrades scientific truth. "Standardize the quality. Never standardize away the imagination."

## One next scientific action
Recruit or access repeated garden / Extension / Nature's Notebook adult beetle monitoring cohorts with documented **no adult found** checks starting before predicted emergence (at least 3 seasons/10 locations), then quantify interval-censored emergence and out-of-sample forecast skill before ever showing accuracy percentages.
