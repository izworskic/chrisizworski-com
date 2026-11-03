# Python Intelligence OS: release gates and benchmark contract

## Gate 0: correct owner and licensed source
Discover owning repository; inspect current implementation, active PRs, existing test and deployment topology. Make no assumption that Python helps. Verify provider license and allowed use on an ad-supported property. **Known caution:** several existing phenology archives describe Open-Meteo gridded temperature history. A historical license/access review remains open; do not add new requests, commercial traffic or dependency on an unreviewed free-tier source.

## Gate 1: scientific truth
Document method, units, reference climate period, point/region meaning, precise observation-vs-model distinctions, issue and as-of timestamps, data staleness and output schema. Include sampled source records in tests; reject NaN, -9999 nodata, duplicate or future dates, nonphysical states and invalid stage conversions. No silent interpolation or zero-filled missing readings. A region-specific signal is not a local sighting. For phenology, species lifecycle stages require their own documented biofix and GDD base.

## Gate 2: models prove an incremental improvement
For a prediction, compare against a simple calendar/reference baseline using independent measured outcomes and out-of-time validation; report sample count, coverage, MAE (timing), recall/false positives (event), calibration (probability) and seasonal/geographic error where applicable. Hold back claims if sample size or independent ground truth is inadequate. Do not score a descriptive history chart as a forecast model.

For descriptive outputs, report archive coverage, gaps, duplicate counts, revision flags, max age, source and tested fail-closed behavior; benchmark against existing display, not nonexistent forecast accuracy.

## Gate 3: visitor experience and performance
Use Experience OS: one clear decision, purpose-built creative interaction, precise labels, credible evidence, understandable uncertainty, fallback and mobile keyboard usability. Preserve indexable SSR answer, canonical, Person JSON-LD, structured data, ad policy and sitemap rules. Benchmark p95 response time, worker duration, bundle size and cost where applicable; prefer precomputed assets if Python adds no real-time benefit.

## Gate 4: release and measurement
Run complete owning-repo CI, compare output to baseline fixtures, verify production desktop and 390px mobile, run source-failure simulations, check generated content/canonical/sitemap, preserve rollback. Record exact PR/commit and run URL. For GSC use comparable 28-day windows, annotate seasonal volatility and avoid causal claims from single-variable changes without sufficient data.

### Required benchmark entry per proposed enhancement
- Visitor decision and differentiated value
- Existing vs proposed algorithm
- Competing architectures (keep JS, scheduled Python, on-demand Python)
- Five 0..5 quality scores and blocked gates
- Input provenance/rights, location and timestamp contract
- Evaluation data and legitimate ground truth
- Failure tests and recovery path
- Cold/warm cost and runtime if relevant
- Measured experience outcome and SEO observation protocol

### Invariants
No fabricated current sightings, unverified launch ETAs, invented trails, undocumented source substitutions, falsely precise predictions, unlicensed provider expansion, silent source staleness or automatic production merges despite failing gates.
