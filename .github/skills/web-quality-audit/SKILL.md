---
name: web-quality-audit
description: "A measured audit of visitor task, performance, accessibility, SEO and best practices, ranked by visitor impact. Use when asked to audit a page or tool end to end, or before a substantial visitor-facing release."
---

# Web quality audit

An audit answers one question: what stops a visitor from getting the answer, and what fixes it first. Measure before reading code, triage broken paths before scores, and keep measured findings apart from hypotheses.

## 1. Set the target

- Representative URLs, the states that matter (default view, a selected place, an empty or failed feed, offline) and the main journey.
- Viewports: 390 px phone and 1280 px desktop, the same ones `docs/WEB_QUALITY_PILOT.md` uses.
- Record the commit SHA, the date and whether you test a preview, a local build or production.

## 2. Collect a baseline

| Need | Route in this repo | Fallback |
| --- | --- | --- |
| Visitor path works | Playwright on the journey (`playwright-browser-qa`) | Manual run in a real browser |
| Lab performance, SEO, best practices | Lighthouse CI with `lighthouserc.web-quality.cjs` (the pilot workflow covers three pages; add the page under audit) | Lighthouse CLI on the same machine, same throttling |
| Field performance | CrUX or PageSpeed Insights field data for the URL or origin | Say NOT MEASURED; lab is not field |
| Accessibility | axe-core in Playwright plus the manual checks in `web-quality-accessibility` | Manual keyboard and screen reader pass |
| Source | Read the files the failures point to | Direct inspection |

Use runtime failures to decide which source to read. A finding only seen in code is a hypothesis until a browser shows it.

## 3. Rank by visitor impact

| Severity | On this site | Action |
| --- | --- | --- |
| Critical | The answer is wrong, missing or unreachable: blank page, map tiles or feed fail with no fallback, stale data shown as current, security problem, Person or canonical broken on a priority page | Fix before anything else ships |
| High | Field Core Web Vitals fail at p75, keyboard trap, map with no list alternative, unlabeled controls, layout shift that moves the answer | Fix before release |
| Medium | Lab performance opportunities, missing meta description, weak headings, contrast just under 4.5:1 on secondary text | Schedule |
| Low | Minor optimizations and code tidiness | When convenient |

A green Lighthouse score never outranks a broken visitor path. Never trade a Critical fix for an easy Medium one.

## 4. Fix and re-verify

Make the smallest fix for each Critical and High finding in its own reviewed change, then re-run the same checks on the same viewports and states. Compare like with like: same page, device profile and throttling.

## Output

```
Target: URLs, states, viewports, SHA, environment
Critical (N): finding, evidence (screenshot, trace, rule id), fix, verified yes or no
High (N): same
Medium and Low: one line each
Lab: Lighthouse categories and metrics
Field: CrUX p75 LCP, INP, CLS, or NOT MEASURED
Not run: every check that was skipped, marked NOT VERIFIED
```

## Boundaries

Route narrow work to the specific skill: performance, core web vitals, accessibility, SEO or best practices. Experience OS, Experience Investment, Foundry, Playwright Browser QA and owning-repository tests remain authoritative. Preserve Auto ads, canonical and Person identity and factual evidence. No Redis, paid service or new dependency. Open a PR; do not auto-merge.

## Sources

Adapted from addyosmani/web-quality-skills, `web-quality-audit` (MIT): audit flow, tool routing and severity levels, rewritten for this repository. Reference only; nothing is vendored or installed.
