---
name: opportunity-scout
description: "Find the next tool worth building: an unsolved outdoor decision that needs several independent datasets together, checked against what already answers it. Use when asked what to build next, for new tool ideas, or before starting any new tool, and before experience-investment designs it."
---

# Opportunity scout: what is worth building

Experience Investment decides how to design a tool someone already chose. This skill decides which tool to choose. The owner's rule: build for decisions nobody answers well, where the answer needs many disparate datasets, and check existing sites first. Single-purpose tools first; linking comes later (`tool-handoffs`).

## 1. Start from a decision

Write the decision as a person would ask it, with its season: "Is the Mackinac Bridge likely to close for wind tomorrow morning?", not "a Mackinac weather page". A good candidate has:

- a go or no-go, where, or when answer that changes what someone does;
- a time window when the question peaks;
- a wrong answer that costs the person something (a wasted drive, a missed window, a safety risk).

## 2. Existing-answer check

Before anything else, search the way a visitor would: the top ten results, the obvious apps (state agency pages, NWS, AllTrails, OnX, Windy, and the like) and the owner's own tools in the registry. Record what each answers and where it falls short. If one already answers the decision well, drop the idea or name the exact gap that remains. "Ours would look nicer" is not a gap.

## 3. Data moat

List the datasets the answer needs. A strong candidate needs at least three independent sources combined (for example ice thickness, wind and access points), each a primary, current source that passes `public-data-scout` (rights, freshness, failure handling). One feed shown nicely is a page, not a moat.

## 4. Demand and timing

Take demand from `search-demand` evidence, which starts from the private growth summary when `GROWTH_AGENT_TOKEN` is set (search-demand step 1), or from known seasonal demand; otherwise write unknown. From the summary, favor ideas that feed or extend pages in `topEarners` or `risers`, and treat the sitewide `revenueTrend` as context, not proof. If the summary is unavailable, say so once and carry on. Ship 6 to 8 weeks before the seasonal ramp.

## 5. Network fit

From `benchmarks/tool-network-registry.json`: which page already owns nearby queries, what the new tool would feed, what would feed it. A candidate that competes with an owned page fails here.

## 6. Score and brief

Use `bestFitScoring` in `benchmarks/tool-network-registry.json` as the single 100-point scoring standard. Read its current weights and build and priority thresholds rather than maintaining a second rubric. Apply the existing-answer, source feasibility, cost and ownership checks above before scoring; they are evidence and eligibility checks, not additional points. Document the evidence behind each registry criterion, flag unknowns rather than inventing scores, and do not recommend a build that fails the registry's build threshold or a hard gate.

Write the top three as one-page briefs: the decision, who asks it and when, the existing-answer findings, the datasets, demand evidence, network fit and the smallest useful first version. Hand the chosen brief to `experience-investment`. Do not start building from this skill.

## Output

Three briefs, the rejected ideas with one line each on why, and every unchecked claim marked NOT VERIFIED. Briefs end up in PRs and docs in a public repository, so they cite page paths and direction (rising, falling, top earner) and never a click, impression, CTR, earnings or RPM figure.

## Boundaries

No generated filler pages, doorway pages or composite scores without real data. Follows AGENTS.md, Search Strategy, Experience OS and owning-repository rules. Do not auto-merge.
