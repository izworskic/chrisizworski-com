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

Take demand from `search-demand` evidence or known seasonal demand; otherwise write unknown. Ship 6 to 8 weeks before the seasonal ramp.

## 5. Network fit

From `benchmarks/tool-network-registry.json`: which page already owns nearby queries, what the new tool would feed, what would feed it. A candidate that competes with an owned page fails here.

## 6. Score and brief

| Criterion | Question |
| --- | --- |
| Decision value | Does the answer change what someone does, and does a wrong answer cost them? |
| Uniqueness | Is it unanswered or clearly better answered after the existing-answer check? |
| Data feasibility | Are three or more primary sources available, licensed and fresh? |
| Demand | Is there dated evidence, or is it unknown? |
| Cost | Static or precomputed first; any function, cron or paid feed is a cost (vercel-cost-guard) |
| Timing | Can it ship before the season peaks? |

Write the top three as one-page briefs: the decision, who asks it and when, the existing-answer findings, the datasets, demand evidence, network fit and the smallest useful first version. Hand the chosen brief to `experience-investment`. Do not start building from this skill.

## Output

Three briefs, the rejected ideas with one line each on why, and every unchecked claim marked NOT VERIFIED.

## Boundaries

No generated filler pages, doorway pages or composite scores without real data. Follows AGENTS.md, Search Strategy, Experience OS and owning-repository rules. Do not auto-merge.
