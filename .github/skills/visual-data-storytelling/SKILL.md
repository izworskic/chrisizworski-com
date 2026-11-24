---
name: visual-data-storytelling
description: "Use when redesigning scientific charts, historical comparisons, uncertainty bands, time-series visualization or accessible data explanations. Not for unrelated page styling."
---

# Visual Data Storytelling

Proposed first pilot: Great Lakes Ice Cover. This is an engineering workflow, not an installed runtime or a claim of improved results.

## Workflow

- Start with the visitor question and the current chart. Choose the simplest useful visual form and compare two genuinely different compositions under Experience Investment; include direct answer, source/time context and explanation.
- Consider existing HTML/SVG first; Observable Plot for concise statistical graphics, uPlot for dense time-series, Vega-Lite for declarative comparisons. Pick at most one if measured benefit warrants dependency; benchmark transfer, render, interaction and mobile memory.
- Preserve units, chronological order, meaningful scale and honest baselines. Do not join missing observations as if measured, obscure revisions, imply causal relationships or confuse model with observation. Label interval meaning and date/source; never show fabricated charts.
- Provide useful no-JS/table or text alternative, accessible names and keyboard operation. Color is not the only signal. Test readable labels, touch, screen readers and 390px/desktop; avoid chart overlays and preserve Auto ads.
- Compare visitor-task completion and chart performance using representative data and failure states. Deliver reproducible chart data, screenshot evidence, tests and limitations, not a chart-library migration.

## Integration and release boundary

Read root AGENTS.md, the owning repository instructions, and Python Intelligence OS README and QUALITY_GATES for substantive analytical work. Use Experience OS, Experience Investment and Foundry for significant visitor-facing changes. Scope this skill to the authorized task, preserve source rights, canonical Person/URLs, Auto ads, existing dependencies and owning-repository release gates. No new route, cron, paid service, database, push notification, or package install is authorized by loading this skill. Use skill-eval for adoption, compare against baseline, record unrun tests as NOT VERIFIED, and open a reviewed PR; do not auto-merge.

## Upstream references

- [observablehq/plot](https://github.com/observablehq/plot)
- [leeoniya/uplot](https://github.com/leeoniya/uplot)
- [vega/vega-lite](https://github.com/vega/vega-lite)

Reference only; no upstream code is vendored. Verify license, maintenance, compatibility and data rights at the selected revision before any implementation adoption.
