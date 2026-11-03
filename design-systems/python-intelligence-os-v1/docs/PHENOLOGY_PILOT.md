# Pilot 1 — Michigan Phenology living field desk (2026-11-03)

**Owner and live home:** `izworskic/phenology-michigan`, https://phenology.chrisizworski.com/

## Baseline and finding

The separate repository **already** runs a stdlib Python evidence worker with a GitHub Actions schedule, a versioned JSON artifact, and existing Python and JS regressions. The home page already has a polished interactive 28-day river / accumulated-heat replay. Rewriting the front end or introducing a Python Vercel endpoint would add complexity without documented benefit.

Investigation found a more fundamental improvement: the archive analysis had no explicit published per-metric coverage and no duplicate-date ambiguity policy. Its timeline only emitted archive rows, making missing dates less discoverable to visitors. A non-monotonic accumulated GDD source revision on 2026-11-01 was already correctly called out; the extension generalizes evidence integrity without creating a species prediction.

## Implementation in owning repo

- `scripts/python_intelligence/quality.py`: deduplication fails closed, discards malformed/future records, measures 28 calendar days of heat/river evidence and records same-year cumulative revisions.
- `scripts/python_intelligence/scorecard.py`: portable gate-first project assessment.
- `scripts/build-phenology-field-read.py`: adds `dataIntegrity` to the existing `phenology-field-read-v1` output and emits explicit nulls for absent dates (28 fixed calendar slots).
- `components/SeasonalFieldRead.js`: accessible explanatory coverage panel in the existing field desk; the existing chart can already break lines across nulls.
- `scripts/test_field_intelligence.py`: duplicate conflicts, missing dates, future data, January resets, revisions and blocked high-scoring proposals.

No change to upstream APIs, observation eligibility, domain-specific onset models, live site slugs, source cadence, commercial licensing or source-confidence semantics.

## Acceptance and measurement

Baseline: valid field evidence, source-qualified tracks and a 28-day replay existed already. New measurable targets: **100% of 28 calendar slots expressed, 0 chart interpolation across missing days, 0 ambiguous duplicate dates silently selected, and 0 unqualified claims of forecast skill.**

Required gates: `python3 -m unittest discover -s scripts -p 'test_field_intelligence.py' -v`, `npm test`, `npm run build`, CI green, actual production JSON/desktop/mobile checks after release. The next scheduled Python worker may be needed before the published artifact includes the new `dataIntegrity` field; UI maintains backward compatibility until that refresh. Do not describe this as an operational forecast model, and do not claim improved CTR without measured GSC evidence.

Next investment: obtain species-specific Michigan ground-truth observations and legally reusable weather data; only then test out-of-time flowering/emergence prediction with credible baselines and uncertainty.
