# Mackinac Human Planner v2 — Product Benchmark

## Product rule

A visitor should never have to understand the planner's machinery in order to use it.

The product should answer, in order:

1. What trip are you trying to have?
2. What is actually reachable?
3. What should the day protect?
4. What should you do next?

Internal scores, visitor vectors, JEV mode, source degradation and candidate ranking are implementation details unless they materially help a visitor make a decision.

## Human value function

V = Clarity × CausalCorrectness × Honesty × Usefulness × Continuity

Each factor is scored 0–1. Release target: every factor >= .92.

## Weighted benchmark

| Dimension | Weight | Release requirement |
| --- | ---: | --- |
| Cognitive clarity | 20 | One human planning problem per stage; one dominant action |
| Causal correctness | 20 | Do not ask users to supply outputs the engine can calculate |
| Missing-information honesty | 15 | Flexible/unknown inputs stop at a truthful boundary |
| Decision usefulness | 20 | Result leads with leave/port/ferry/arrival and a small usable sequence |
| Recovery + editability | 10 | Adjustments rerun the plan without restarting intake |
| Cross-page continuity | 10 | Ferries/Stay/Eat/Explore/Events/Straits inherit the same trip |
| Truth boundaries | 5 | JEV ranks bounded valid choices; deterministic facts remain authoritative |

Target: >= 92/100.

## Hard acceptance rules

### Entry
- My Trip is the single planning workspace.
- The first screen does not expose a visit score, source-health dashboard, or dense detailed planner.
- A returning visitor with a valid saved trip returns to the trip result instead of Question 1.

### Trip shape
- Day trip, overnight and undecided are distinct states.
- A flexible date does not generate an exact ferry/weather answer.
- An undecided trip length does not silently become a day trip or overnight.

### Getting there
- Starting city is used to compare both Mackinaw City and St. Ignace.
- Leave-home time is optional.
- If no leave time is supplied, the engine calculates a useful leave time backward from ferry departure, check-in and mainland drive.
- The route engine must not model an unconstrained future visitor as leaving at midnight and waiting at the dock.
- If a leave time is supplied, it remains a real constraint.
- If origin is intentionally deferred, the interface does not claim a ferry port is known.

### People + movement
- Party type and walking comfort are part of the primary flow.
- Limited walking changes mobility/route feasibility, not merely explanatory copy.
- Car-free Island movement and interior hills are treated as planning costs.

### Preferences
- Visitor chooses no more than two protected priorities.
- Visitor chooses the main failure mode to avoid.
- JEV can classify/rank only among supplied bounded choices.
- JEV cannot invent schedules, places, accessibility, weather, availability or route feasibility.

### Result
The primary result must make these understandable before detailed data:
1. When to leave, when calculable
2. Which mainland port
3. Dock-ready time
4. Ferry departure
5. Island arrival
6. Return strategy
7. A small, ordered set of Island anchors
8. Why the plan looks this way
9. What decision to make next

The primary result must not require interpreting an internal score.

### Overnight
- Arrival-day ferry and return-day ferry are separate planning problems.
- Without a return deadline, an overnight plan does not invent an exact return ferry.
- Sleeping on the Island removes same-day last-ferry pressure from the Island sequence.

### Adjustment
More relaxed, Less walking, More outdoors, Better dinner, Less downtown, and More history preserve trip state and rerun bounded planning. They do not restart intake.

### Detail
- Full live/source detail remains available for visitors who want it.
- It is secondary to the human plan.
- Source degradation is visible where it changes confidence, but does not become the primary UX.

### Mobile
- 390px is a first-class target.
- Choices do not require horizontal scrolling.
- Result timeline remains readable in one column.
- No large banner pushes the first useful decision below a screen of branding.

## Scenario benchmark

### H1 — First-time Bay City day trip
Inputs: day trip, exact future date, Bay City, no leave time, two adults, normal walking, icons + scenery, hates rushing.

Pass:
- no mandatory leave-time question
- both ferry ports evaluated
- selected ferry produces a calculated leave-home time
- no artificial mainland waiting
- one first move and a compact Island sequence

### H2 — Overnight couple
Pass:
- no same-day return pressure
- arrival day and return day are distinct
- no exact return ferry without a deadline
- Stay is elevated as a next decision

### H3 — Multigenerational / limited walking
Pass:
- mobility becomes limited
- aggressive bike/interior assumptions are removed
- carriage/taxi-oriented movement can enter the feasible plan

### H4 — Flexible date
Pass:
- profile and trip shape are saved
- no exact ferry, weather or attraction operating claim
- next missing decision is visible

### H5 — Origin deferred
Pass:
- no port or reachable ferry is claimed
- adding origin later does not restart the trip

### H6 — Duration undecided
Pass:
- no coercion to day trip or overnight
- Stay/return logic is not fabricated

### H7 — Tune without restart
Pass:
- intake is not replayed
- saved trip survives
- route is recomputed
- result remains in the same human format

## Loss function

L = .20 clarity + .20 causal correctness + .15 unknown-honesty + .20 decision usefulness + .10 recovery + .10 continuity + .05 truth-boundaries

Release requires L <= .08 and no hard-rule failure.

## Design principle

The revolutionary part is not more data on one screen. It is that the tool knows what it is allowed to decide, what the visitor still needs to decide, and what should disappear from the interface until it becomes useful.
