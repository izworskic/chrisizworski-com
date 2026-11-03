# Japanese beetle Field Station v1 — controlled adult-detection milestone

**Owner/release date:** `izworskic/chrisizworski-com`, November 2, 2026 (America/Detroit).
**Canonical visitor page:** https://chrisizworski.com/michigan-garden-pest-watch/#beetle-monitoring
**Protocol:** `japanese-beetle-controlled-adult-detection-v1`.
**Hard boundary:** The task is to build a repeatable **adult-detection** monitoring workflow. It is **not** to label retrospective model/raster agreement as forecast accuracy.

## Evidence and live provider probes
On Nov 2, 2026, the production Nature's Notebook data services on `https://services.usanpn.org` returned these metadata:
- `Popillia japonica` **species_id 2392**, `genus_id 1402`.
- Adult phenophases **327** (`Adults`) and **552** (near-duplicate old/new adult definition). The actual USA-NPN species page lists `Adults` as 'One or more adults are seen or heard moving about or at rest.' Do **not** use `Dead adults` or `Adults feeding` as direct substitutes for this status measure.
- Official NPN observations Status and Intensity record `phenophase_status` **0 (no), 1 (yes), -1 (uncertain)**; one row per site, phenophase, species and visit. Source: https://data.usanpn.org/observations/ and https://www.usanpn.org/node/223 .
- API: `/npn_portal/observations/getObservations.json?start_date=2026-01-01&end_date=2026-12-31&species_id%5B1%5D=2392&state%5B1%5D=MI&request_src=FreighterViewFarms&climate_data=0`. **Do not query `year=2026`: the server ignores that filter**, a serious research risk discovered by trial. Official `rnpn` client constructs `start_date` and `end_date` and bracket-indexed species/state filters: https://raw.githubusercontent.com/usa-npn/rnpn/master/R/npn_data_download.R .
- Correctly bounded **2025 and 2026 Michigan** calls both returned **zero records**. National sample for species in 2026 yielded 104 rows across multiple phenophases. This does not prove there are no monitored Michigan gardens, merely that the exact NPN source query returns no records.
- Official Japanese beetle profile https://naturesnotebook.usanpn.org/npnapps/species/Popillia/japonica does **not list MI among its displayed "where found" states** (as checked). Michigan enrollment/eligibility needs verification with the USA-NPN program; do not promise an accepted Michigan record.
- 2025–2026 official adult model rasters exist at `gdd:japanese_beetle_adult`, as verified in prior operational pilot. First adult model is a thermal threshold predictor, **not the exact date an adult biologically emerged at each site**: https://www.usanpn.org/data/maps/forecasts/Japanese_beetle .
- Prior independent opportunistic photo cross-check: 20 Michigan location-year pairs (2025–26) yielded 13 earliest reported species-level photographs before modeled adult dates, 5 after, 2 same date. Not adult confirmation, not controlled sampling, not accuracy.

## Visitor's decisive job
Who: Michigan gardeners with roses, beans, berries or grapes who want to help evaluate the official model.
Question: **"What should I actually record so that we can eventually tell whether the model helped detect adult beetles on time?"**
First useful answer: record repeated visits including deliberate **no adults** checks; each visit at one stable plot with repeatable method and fixed effort, **without** pretending absent reports prove beetles are absent.
Next action: choose one site alias, prepare the 2027 study, download a **completely empty** CSV, and begin true dated adult yes/no/uncertain visits when the 2027 season starts.
Alternative: use official USA-NPN observation instructions and confirm enrollment eligibility; no automatic submission from this website.

## Two design approaches and choice
**Rejected: public "Report a Japanese beetle!" crowdsourcing box.** Encourages positively selected sightings with unknown search effort, privacy/abuse burdens, and no no-sighting baseline; cannot measure onset.

**Selected: collapsed "Field Station 2027" within existing Pest Watch.** A fixed-plot five-minute minimum inspection log, no/yes/uncertain, same method & host, optional approximate reference ZIP, locally stored in the visitor's browser only, CSV export/import, an interval-censoring verdict, a prospective official source snapshot mechanism, and a separate source-health check against USA-NPN's public no/yes status feed. Normal visitors can ignore the advanced science module and still use the primary scout desk.

Compared with (1) the USA-NPN official model Forecast Wire (future thermal timing) and (2) the existing iNaturalist observational lens (past opportunistic reports), the Field Station is **prospective, repeat-visit and private**, not another risk-score card. Purposeful integration reuses crop, ZIP reference and source confidence, **not** a uniform visual skin. It uses a compact expandable green field notebook rather than enlarging the existing main hero or burying the answer.

## Correct scientific inclusion gates
| Criterion | Required | Exclusion |
| --- | --- | --- |
| Species | NPN `species_id=2392` | Other beetles |
| Adult phenophase | IDs 327 or 552, matching "Adults" | Dead adults, egg hatch, generic species-level photos |
| State/coordinate | MI and plausible MI geographic values for internal matching | Unverified or drifting site coordinate |
| Status | 0 no, 1 yes; -1 uncertain excluded from onset | Missing status silently inferred as no |
| Sampling | Same site/host/method/fixed duration for self-report; ≥5 minutes | Variable or missing effort not treated as controlled |
| Baseline | At least two separate real negative dates; a prior no within 14 days of last no | Only one no before first yes |
| Onset bracket | (most recent no, first yes]; gap ≤7 days | No last no, no yes, >7-day gap, contradictory same-day visits |
| Confounders | Exposure to pesticide/traps explicitly logged | Claims independent of treatment without monitoring |
| Forecast snapshot | Only dated **source** raster before first positive and within six days | October retrospective raster labeled prospective |
| Empirical skill | At least 10 independently confirmed sites, ≥3 model-comparable seasons, independently audited protocol and sources, sufficient pre-event snapshots | No percentage score, "prediction accuracy", outbreak or confirmed property presence |
| Privacy | No precise observer locations, personal IDs, names or uploaded pictures in site API; source aggregates suppressed for fewer than 5 sites | No public individual visit detail or private-photo reuse |

**Definitions:** A detected-adult interval is not the biological first emergence interval. Arrival and detectability differ by habitat, nearby populations, gardener's method, and effort. Later user edits can shift interval estimates; publish only dated evidence checks and state limits. A client-side model snapshot is self-reported and is **not** independent immutable forecast issue-time archival evidence, so it must never become skill evidence without separate provider-side timestamped capture.

## Data architecture and failure modes
- `lib/japanese-beetle-controlled-monitoring.cjs`: pure bounded yes/no parsing and interval-censored result classification; reject taxonomy, stale years, conflicting dates, unstable site geography, invalid visit methods, missing negatives or unverified forecast snapshots.
- `api/japanese-beetle-monitoring-coverage.js`: read-only USA-NPN query scoped to one year, species and MI; no persistent backend; 4 MB input cap, 5000 rows max; return statewide aggregate only. Caches six hours. **No data** is a coverage gap, not zero beetle activity. A provider error yields 503 unknown, not zero records.
- `public/assets/japanese-beetle-monitoring.js`: date-bounded 2027 journal. Browser storage only after explicit save, export/import as standalone CSV. A plot alias and ZIP-area reference are stored locally; no street/GPS. Explicit warning about storage loss. Never auto-post to this site, NPN, or iNaturalist.
- Vercel's existing serverless setup; no Redis, Supabase, new database, account system or third-party telemetry.
- The field-station interface is optional progressive disclosure. No new indexable route or sitemap page; existing canonical, Person schema, ad and SEO protections untouched. No photographs generated, copied, licensed or misattributed.
- Source profile may prohibit MI enrollment; verified independent annual cohort may remain empty. This is a **biological evidence/data-access blocker**, not a software failure. The tool must say it.

## Verification goals and honest limitations
1. Browser tested at 360, 390, 768, 1440; no JS fallback; genuine sample *fixture* no→no→yes within 7 days; A→B→A plot and ZIP resets; CSV export, official 503, no-cohort result and future date veto.
2. Science tests with positive/negative/uncertain, years, MI vs non-MI, adults vs dead adult, 2 negatives and ≤7d, accidental "year" API filter, source outage, simultaneous opposite statuses and no 2027 future fake data.
3. Zero uncontrolled accuracy scores in any view or API response.
4. Post-release live checks of existing USA-NPN forecast and new status coverage, plus deploy commit and site canonical.
5. Future benchmark: recruit 10 verified monitoring sites for 2027; **three consecutive comparable seasons cannot be obtained in 2026**, and the official archived raster only covers 2025 onward. Evaluation of forecast *skill* remains blocked until a real controlled multi-season cohort and time-stamped historical near-term predictions exist.

## Source citations
- USA-NPN Nature's Notebook instructions and explicit negative phenophase records: https://www.usanpn.org/node/223
- USA-NPN Japanese beetle adults phenophase: https://naturesnotebook.usanpn.org/npnapps/species/Popillia/japonica
- USA-NPN Observation Data Portal: https://data.usanpn.org/observations/
- NPN observational service / R wrapper: https://www.usanpn.org/data/code and https://usa-npn.github.io/rnpn/reference/npn_download_status_data.html
- NPN official Japanese beetle model: https://www.usanpn.org/data/maps/forecasts/Japanese_beetle
- Nature's Notebook negative visits and two/three-day cadence: https://usanpn.org/nn/faq

**Release status:** Work is source-reviewed and implementation-targeted. Populate actual CI, visual browser, production and GitHub PR evidence before declaring released.
