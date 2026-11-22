---
name: hf-forecast-benchmark
description: "Opt-in offline challenger testing for seasonal and time-series engines against authoritative observed history and simple baselines."
---
# Forecast challenger for Python Intelligence OS

Use only after reading `design-systems/python-intelligence-os-v1/AGENTS.md`, source quality gates and the individual tool's owning repo instructions. Candidate: `amazon/chronos-bolt-tiny` (Apache-2.0); no deployed model is implied.

Select one bounded task with measured observations (for example river-stage history or ice progression), not a composite or fictional visitor condition score.

Compare: (A) current forecast/baseline method, (B) naive persistence/seasonal baseline, (C) a licensed model on an **out-of-time** holdout. Use identical horizons, missing-value policy, station IDs, units and train/validation/test cutoff. Evaluate MAE, bias, coverage/calibration where the model supports intervals, seasonal shifts and false reassurance risk. A model that cannot beat the naive baseline does not ship.

Source ledger includes direct owning agency observation URL, observation time, reanalysis/revision policy, license, rate limits, target precision, and data-gaps. Never model inferred readings as official sensor values; no prediction becomes a public current observation. Reject endpoints/Jobs/GPU costs absent specific approval.

Deliver reproducible offline scripts/fixtures and a signed-off recommendation before any production code, API, or UX change. Maintain source age, uncertainty, failure and safe access disclosures.
