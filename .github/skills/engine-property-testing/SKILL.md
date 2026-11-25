---
name: engine-property-testing
description: "Use when testing numerical invariants, malformed or unusual engine inputs, date rollover, units, geographic boundaries, API fuzzing or generated counterexamples. Not a substitute for normal scenario tests."
---

# Engine Property Testing

Proposed first pilot: Shore Feel engine. This is an engineering workflow, not an installed runtime or a claim of improved results.

## Workflow

- Identify the engine's documented input domain, output contract and mathematical invariants with its existing tests and authoritative formulas. Do not assume monotonicity, symmetry or bounds that are not physically valid.
- Write deterministic example regressions first. Consider fast-check for JS, Hypothesis for Python, Schemathesis for schema-driven APIs only when useful. Prefer existing dependencies or small seeded generators; pin versions if an approved implementation adds one.
- Generate valid, invalid, boundary and missing inputs: NaN/infinity, null, zero, extremes, negative values where valid, timestamps/rollover, mixed units, duplicate records and coordinate order. Check finite outputs or explicit rejection, round trips, relevant invariants and preservation of unknowns.
- Keep fixtures local, seed and record failing cases, shrink counterexamples and add minimal permanent regression tests. API tests use mock/local read-only endpoints; never fuzz live sites, write visitor data or run unbounded workloads.
- Report seed, case count, assertion failures and minimized examples. Green random tests do not establish scientific accuracy, browser behavior or full coverage. Run existing full gates and document what remains untested.

## Integration and release boundary

Read root AGENTS.md, the owning repository instructions, and Python Intelligence OS README and QUALITY_GATES for substantive analytical work. Use Experience OS, Experience Investment and Foundry for significant visitor-facing changes. Scope this skill to the authorized task, preserve source rights, canonical Person/URLs, Auto ads, existing dependencies and owning-repository release gates. No new route, cron, paid service, database, push notification, or package install is authorized by loading this skill. Use skill-eval for adoption, compare against baseline, record unrun tests as NOT VERIFIED, and open a reviewed PR; do not auto-merge.

## Upstream references

- [dubzzz/fast-check](https://github.com/dubzzz/fast-check)
- [HypothesisWorks/hypothesis](https://github.com/HypothesisWorks/hypothesis)
- [schemathesis/schemathesis](https://github.com/schemathesis/schemathesis)

Reference only; no upstream code is vendored. Verify license, maintenance, compatibility and data rights at the selected revision before any implementation adoption.
