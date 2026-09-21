# Mackinac Island trip-orchestration benchmark

Date: 2026-09-21

## Product model

The Mackinac Island experience is one trip with multiple decision surfaces, not a collection of unrelated tools.

The root `/mackinac-island/` is the trip-setting layer:

1. Orient the visitor with a small amount of Mackinac context.
2. Ask four high-value preference questions.
3. Ask only the practical trip facts needed to make timing real: trip date, starting city, and leave-home time.
4. Build and persist one shared trip object.
5. Use that same trip on Ferries, Stay, Eat, Explore, Events, and Straits.
6. Let the visitor tune a downstream decision without making them rebuild the trip.

The `/plan/` URL may remain as an indexable explanatory search surface, but it is not a competing primary workspace. The root is the workspace.

## Baseline

| Dimension | Weight | Baseline | Main loss |
| --- | ---: | ---: | --- |
| Entry clarity | 15 | 6/15 | “Today” presents a live dashboard before the trip is known. |
| Trip-state creation | 20 | 13/20 | Persona answers persist, but logistics are collected in separate hero/full-planner paths. |
| Progressive disclosure | 15 | 5/15 | Live score, ferry details, intake and full planner compete on first load. |
| Cross-page continuity | 20 | 13/20 | Persona persists; practical trip facts are not prominent downstream. |
| Specialized-page inheritance | 15 | 7/15 | Pages personalize, but static page identity leads more strongly than the inherited trip. |
| Local adjustment without restart | 10 | 7/10 | Tuning exists, but the UX suggests multiple planning entry points. |
| Truth/source integrity | 5 | 5/5 | Deterministic feasibility and source boundaries are already strong. |
| **Total** | **100** | **56/100** | Strong engine, weak journey. |

## Release target

Target score: **>= 90/100**.

Hard acceptance conditions:

- Root page identity is **My Trip / Build Your Mackinac Island Trip**, not “Today.”
- Primary navigation contains one trip workspace: **My Trip**. “Plan” is not a competing primary tab.
- A new visitor sees orientation + intake before detailed score/ferry/itinerary surfaces.
- The four base questions still drive the bounded persona/JEV classifier.
- Date + origin + leave-home time are collected in the same root trip-building flow.
- A completed trip persists both profile and practical trip facts.
- Ferries, Stay, Eat, Explore, Events, and Straits visibly acknowledge the inherited trip.
- Downstream pages show practical context when known, not just a persona label.
- A downstream page without a saved trip points to the root trip builder instead of creating a second intake workflow.
- Advanced controls are framed as fine-tuning an existing plan, not as another planner.
- Reset returns the root to the intake state.
- Saved/shared trip restoration skips unnecessary onboarding and rehydrates the plan.
- Published schedules, weather facts, route feasibility, accessibility truth and source authority are unchanged by preference ranking.
- Mobile behavior remains usable at 390 px.
- Repository verification gates pass.

## Loss function

`L = .15E + .20S + .15P + .20C + .15I + .10A + .05T`

Each term is 0 when its acceptance criteria pass and 1 when they fail:

- E = entry clarity
- S = shared trip-state creation
- P = progressive disclosure
- C = cross-page continuity
- I = specialized-page inheritance
- A = adjustment without restart
- T = truth/source integrity

Required: **L <= 0.10**.

## Value function

`V = clarity × continuity × inheritance × truth × mobile`

Each factor must be independently >= .90. Required product: **V >= .90**.

This prevents a high aggregate score from hiding a broken cross-page trip state or a truth regression.
