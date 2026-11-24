---
name: movement-intelligence
description: "Use when calculating AIS vessel movement, corridor progress, heading, stops, shipwatching arrival windows or other time-stamped geographic tracks. Not for marker styling alone."
---

# Movement Intelligence

Proposed first pilot: Freighter Central. This is an engineering workflow, not an installed runtime or a claim of improved results.

## Workflow

- Inspect the existing AIS feed, terms for historical storage and reuse, timestamps, identity, coordinate precision, update interval and coverage. Preserve reported positions separately from inferred corridor positions.
- Normalize UTC fixes, longitude/latitude, course over ground, heading and speed units; reject duplicate or impossible jumps using domain-reviewed limits. Handle absent heading, stationary vessels, stale fixes, reverse movement, turns and gaps.
- Compare the current algorithm with Turf linear referencing and offline MovingPandas trajectories. Project onto a verified navigable centerline with direction and ambiguity checks, not straight-line distance across land; avoid snapping unrelated vessels to the corridor.
- Separate observed position, inferred progress, predicted arrival and official schedule. Validate ETA on held-out completed passages against a simple distance/speed baseline; stratify by vessel direction, stopped/moving and bridge or lock constraints. Report median absolute error, interval coverage and freshness.
- No ETA when route, direction, history or freshness is inadequate. No invented AIS fixes, hidden extrapolation or navigation advice. Deliver replay fixtures and stale/unknown behavior; never route viewers to moving vessels.

## Integration and release boundary

Read root AGENTS.md, the owning repository instructions, and Python Intelligence OS README and QUALITY_GATES for substantive analytical work. Use Experience OS, Experience Investment and Foundry for significant visitor-facing changes. Scope this skill to the authorized task, preserve source rights, canonical Person/URLs, Auto ads, existing dependencies and owning-repository release gates. No new route, cron, paid service, database, push notification, or package install is authorized by loading this skill. Use skill-eval for adoption, compare against baseline, record unrun tests as NOT VERIFIED, and open a reviewed PR; do not auto-merge.

## Upstream references

- [movingpandas/movingpandas](https://github.com/movingpandas/movingpandas)
- [turfjs/turf](https://github.com/turfjs/turf)

Reference only; no upstream code is vendored. Verify license, maintenance, compatibility and data rights at the selected revision before any implementation adoption.
