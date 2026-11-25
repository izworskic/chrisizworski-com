---
name: visual-data-storytelling
description: "Use when redesigning scientific charts, historical comparisons, uncertainty bands, time-series visualization or accessible data explanations. Observable Plot is the default library when a chart library is justified. Not for unrelated page styling."
---

# Visual data storytelling

A chart on this site answers a question ("Is the ice behind normal this year?"), shows how sure the answer is, and says where the data came from. Proposed first pilot: Great Lakes Ice Cover. This skill is a method, not an installed runtime or a claim of improved results.

## 1. Start from the question

- Write the visitor question and the one-sentence answer the chart must make obvious.
- Look at the current chart. Choose the simplest form that answers it, and compare two genuinely different compositions under Experience Investment.
- Put the answer in words next to the chart, with the source and the date of the newest data.

## 2. Choose the stack

1. Plain HTML or a static SVG when the chart is small or rarely changes. Zero JavaScript is the best chart library.
2. Observable Plot (observablehq/plot, ISC, built on d3) as the default when a library is justified: normal bands, uncertainty, small multiples and direct labels in a few lines. Pin the exact version and load it only on pages that draw a chart. Where the data changes only at build time, consider rendering Plot to SVG ahead of time so the page ships no chart JavaScript.
3. uPlot for very dense time series (tens of thousands of points); Vega-Lite only for a declarative comparison that Plot cannot express.
4. Keep raw D3 for custom interactive scenes. Do not migrate a working D3 chart just to use Plot.

Adding a library to a tool is a dependency change: measure the bytes, put it in the tool's own PR and note it for `vercel-cost-guard`.

## 3. Recipes (Observable Plot)

```js
// This season against the normal range, gaps left as gaps
Plot.plot({
  y: {label: "Ice cover (%)"},
  marks: [
    Plot.areaY(normal, {x: "day", y1: "p10", y2: "p90", fillOpacity: 0.2}),
    Plot.line(normal, {x: "day", y: "median", strokeDasharray: "4 3"}),
    Plot.line(season, {x: "day", y: "cover"}),
    Plot.text(season.slice(-1), {x: "day", y: "cover", text: d => `${d.cover}% on ${d.label}`, dx: 6, textAnchor: "start"})
  ]
})
```

- Missing observations stay `null` so the line breaks; never interpolate across a gap or draw estimates as observed.
- Forecast or modeled values get a different mark (dashed line or band) and a label, never the observed line's style.
- Small multiples by site use a facet (`fy: "site"`) with shared scales.
- Label lines directly at their ends instead of a distant legend.

## 4. Honest charts

Preserve units, chronological order and meaningful scales; start bar charts at zero; label what an interval means ("middle 80 percent of 1973 to 2025 seasons"). Do not imply causation, hide revisions or present a model as an observation. Never show a fabricated chart.

## 5. Accessible and mobile

Every chart has a data table or text summary with the key numbers, an accessible name, and color that is never the only signal. Test at 390 px and desktop, with touch and keyboard; tooltips are a bonus, not the only way to read a value. Keep charts clear of ad units.

## Output

The question and answer sentence, the chosen stack and why, the chart data file, screenshots at both widths, the table or text alternative, bytes added, and unrun checks marked NOT VERIFIED.

## Integration and release boundary

Read root AGENTS.md, the owning repository instructions, and Python Intelligence OS README and QUALITY_GATES for substantive analytical work. Use Experience OS, Experience Investment and Foundry for significant visitor-facing changes. Preserve source rights, canonical Person and URLs, Auto ads and owning-repository release gates. Loading this skill authorizes no new route, cron, paid service, database, push notification or package install. Use skill-eval for adoption and open a reviewed PR; do not auto-merge.

## Upstream references

observablehq/plot (ISC), leeoniya/uplot (MIT), vega/vega-lite (BSD-3-Clause). Reference only; verify license, maintenance and data rights at the selected version before adoption.
