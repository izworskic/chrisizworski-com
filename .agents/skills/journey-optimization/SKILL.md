---
name: journey-optimization
description: "Use when planning time-constrained itineraries, selecting stops within daylight or opening hours, balancing travel and visit time, or comparing feasible route options. Not for a simple attraction list."
---

# Journey Optimization

Proposed first pilot: Lake Superior Circle Tour. This is an engineering workflow, not an installed runtime or a claim of improved results.

## Workflow

- Identify the visitor's time, start/end, priorities, travel mode, overnight constraints and optional versus mandatory stops. Use verified routing, opening hours, closures, ferry schedules, time zones, daylight and visit durations. Mark unknowns and avoid inventing driving distances.
- Compare the existing planner and a transparent greedy heuristic before considering an offline OR-Tools solver. Model feasible time windows, buffers, stop durations and user preferences; use bounded solver time and explicit objective weights. Keep hard constraints separate from preferences.
- Never optimize away accessibility, legal access, rest or required arrival windows. Account for time-zone crossings, overnight boundaries, ferry timing and seasonal closure. If inputs cannot support a route, return a partial itinerary or infeasible status with alternatives.
- Benchmark representative short/long journeys for feasibility, travel burden, missed constraints and runtime against baseline. Explain tradeoffs instead of labeling one route universally best.
- Prefer precomputed data or existing JS where sufficient; no new routing API, paid solver or production database. Preserve the current planner, official verification links and user control over stops.

## Integration and release boundary

Read root AGENTS.md, the owning repository instructions, and Python Intelligence OS README and QUALITY_GATES for substantive analytical work. Use Experience OS, Experience Investment and Foundry for significant visitor-facing changes. Scope this skill to the authorized task, preserve source rights, canonical Person/URLs, Auto ads, existing dependencies and owning-repository release gates. No new route, cron, paid service, database, push notification, or package install is authorized by loading this skill. Use skill-eval for adoption, compare against baseline, record unrun tests as NOT VERIFIED, and open a reviewed PR; do not auto-merge.

## Upstream references

- [google/or-tools](https://github.com/google/or-tools)

Reference only; no upstream code is vendored. Verify license, maintenance, compatibility and data rights at the selected revision before any implementation adoption.
