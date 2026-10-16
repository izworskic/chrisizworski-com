# Grand Marais rockhounding — 2026 GLOS rolling storm evidence engine

**Science milestone, October 15, 2026.** This is a *source-stamped history of actual offshore water conditions*, not a validated beach-collecting forecast.

## Real input and first successful persistent run

- GLOS Seagull dataset [obs_140](https://seagull-erddap.glos.org/erddap/info/obs_140/index.html), Superior Watershed Partnership Grand Marais Spotter **SPOT-1361**, four miles north of Grand Marais Harbor. Observed wave height (m), wave-from direction (°) and mean period (s). It is **not** a surf sensor inside the harbor.
- [First successful scheduled-workflow research smoke test](https://github.com/izworskic/chrisizworski-com/actions/runs/38831824791) and independently persisted original rows on [research/rockhounding-glos-observed-data](https://github.com/izworskic/chrisizworski-com/tree/research/rockhounding-glos-observed-data).
- Actual **142** source rows in the previous 96-hour overlapping capture, **October 12 01:16 UTC – October 14 23:46 UTC**. Last observation was over 25 hours old at October 16 00:51 UTC; thus **STALE_OBSERVATIONS**, *not a live calm-water condition*.
- Actual observed **2.57 m** significant offshore-wave peak on **October 12 at 14:46 UTC**. This differs from an earlier *shorter sampled window* which found 1.57 m; do not conflate distinct study-window maxima.
- **83 readings meeting 1.0 m descriptive threshold** grouped into **one 58-hour offshore episode**. Reading frequency is approximately every 30 minutes; these readings do **not** constitute 83 independent storms.
- A measured decline to **1.03 m** at October 14 02:46 UTC following the peak. This is not proof that the event ended; waves above 1.0 m continued later. **Event end unconfirmed or source gappy.**
- Contemporaneous separate NWS source check returned **ACTIVE** warnings/advisories (Gale Warning and Small Craft Advisory). NWS alert feed checks cover LSZ250, LSZ251 and a Grand Marais shoreline point; the absence of selected alert types *never* certifies shoreline safety. Current NWS alert checks are **not historic storm observations**.

## Built

`lib/rockhounding/glos-spotter-event-ledger.cjs` stores original source observations with exact UTC and physical units, strict station identity, coordinate gate, dedupe-by-time with conflicts rejected, maximum 120-day rolling retention and no future observations. All inputs must be `OBSERVATION`, never model forecasts. It counts separate elevated offshore episodes only if high measurements are more than **48 hours apart**, the correlated measurement run has **at least 6 readings over >=3 hours**, and no internal source gap >3 hours. A post-peak measured drop requires source samples with <=3-hour gaps, at least eight subsequent observations, and height <65% of event peak. This grouping threshold is **not** an NWS warning, a safety limit, or a calibrated agate exposure score.

`scripts/rockhounding/rolling-glos-spotter-events.cjs` refetches a bounded 96-hour original GLOS CSV overlap, merges new original measurements into the archive without duplicating existing timestamps, and checks the existing `nws-shore-hazards.cjs` source separately. If GLOS fails, it fails closed rather than fabricating measurements; if NWS fails, it records UNKNOWN, not safe or clear.

`.github/workflows/rockhounding-glos-event-ledger.yml` runs four times daily in March–December (01:15, 07:15, 13:15, 19:15 UTC), subject to GitHub schedule availability, and stores data **only** on the dedicated research branch `research/rockhounding-glos-observed-data`. It does not commit generated observations onto main. Research branch push and manual runs verify logic and collect genuine data without any visitor-side requests. No API keys, credits or paid services.

`public/rockhounding-lab/glos-spotter-oct2026.json` freezes the original observed 142-row series, and `public/rockhounding-lab/index.html` charts it under a dated, clearly labeled **historical-source** panel distinct from simulated decision controls and distant NOAA 45004 events. Source gaps over 90 minutes are not joined in the visualization. Prototype remains **noindex**.

Node regression tests cover event grouping vs 30-minute readings, real data provenance, storage idempotence, conflicting data, bad coordinate/future timestamps, stale data, failure to infer event completion during outages, NWS warnings vs outages, and static chart source integrity.

## Release policy and next work

- The source and engine are independent *offshore observation research*. The historic chart-derived Agate shore normal (~336.74°) is not an onsite-surveyed 2026 waterline. Bayshore's harbor wave response is unresolved.
- A 120-day rolling archive will eventually include multiple distinct observed events. A single 58-hour episode is **not** sufficient to tune a storm-to-new-stones probability or announce a "best collecting window".
- Source age, NWS warnings, and confirmed shoreline access/permission remain distinct blocking gates. No WMO marine advisory threshold is inferred from the arbitrary descriptive 1.0 m bin.
- **Next priority:** a scientifically conservative event lifecycle (post-peak wave rebuild vs genuine sustained decline), then compare repeated independent events to actual dated shoreline changes. Keep rockhound opportunity and safety publication flags false until validated.

No ad scripts, canonical URL, sitemap, paid data feed or indexed page was changed.
