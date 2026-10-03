# Niagara Border-Crossing Decision Engine — V1 readiness scorecard

Updated: 2026-10-02

This scorecard is intentionally pre-runtime. Scores must be reduced if CI, preview rendering, or live-source verification exposes a defect.

| Dimension | Score / 10 | Evidence / remaining risk |
|---|---:|---|
| Immediate decision usefulness | 9.5 | First screen asks direction, traveler and normal crossing before presenting a deterministic bridge decision. |
| Authority | 9.7 | CBP, CBSA and bridge operators have explicit roles; 511/weather cannot overwrite bridge-processing truth. |
| Freshness | 9.4 | Source-specific freshness gates exist; preview/live timestamp behavior still requires runtime proof. |
| Crossing comparison | 9.6 | Four crossings modeled; Whirlpool is deliberately context-only rather than falsely comparable. |
| Eligibility accuracy | 9.8 | Rainbow commercial and Whirlpool NEXUS/traveler vetoes are hard constraints; oversize is approval-required. |
| Mobile UX | 9.2 | Compact 620px/390px-oriented layout in source; browser verification still pending. |
| Transparency | 9.8 | Recommendation reason, authority roles, diversion buffers, source states and context-only evidence are explicit. |
| Resilience | 9.6 | Partial-source failure, stale data, conflict, closure and all-dynamic-unavailable cases are deterministic. |
| Camera usefulness | 8.5 | Official camera links are safe and fail-soft; exact reliable embedded streams are intentionally deferred. |
| SEO/search-intent fit | 9.4 | One canonical comparison product targets cross-bridge decision intent; keyword-volume metrics unavailable due Semrush API-unit limit. |
| Repeat-use value | 9.5 | Live decision surface, shareable query state and 60-second source refresh behavior support repeat checking. |
| Clarity under uncertainty | 9.9 | Eligible normal crossing with missing/stale/conflicting evidence returns insufficient data instead of a speculative detour. |

**Pre-runtime weighted mean: 9.49 / 10.**

V1 is not considered finished from this score alone. Required finish gates remain: targeted tests, repository suite, Vercel build, preview API behavior, 390 px rendering, console inspection, metadata verification, and no regression to existing bridge products.
