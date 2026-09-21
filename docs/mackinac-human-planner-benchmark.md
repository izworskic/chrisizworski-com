# Mackinac Island human-planner benchmark v2

Date: 2026-09-21

## Product rule

A Mackinac planner should behave like a competent trip designer, not a form connected to a dashboard.

The visitor should never have to provide information the planner can calculate, interpret internal scoring, or understand the site's architecture. The planner should ask only for facts or preferences that materially change the trip, then explain the resulting plan in normal travel language.

## Human sequence

1. **Trip shape** — exact stay length and whether the date is fixed.
2. **Getting there** — real starting point or the specific side of the Straits; leave time is optional and only represents a real constraint.
3. **People + movement** — party type and walking/hill tolerance.
4. **What matters** — up to two priorities and the main failure mode to avoid.
5. **Plan** — calculated leave time, mainland port, dock-ready time, ferry, island arrival, a short usable sequence, return strategy, and the next useful decision.

JEV remains bounded to ranking/classification among valid supplied choices. Deterministic logic owns schedules, travel feasibility, mobility constraints, weather facts, dates, openings, and route truth.

## Human acceptance scenarios

| Scenario | Required behavior |
| --- | --- |
| First-time Bay City day trip, fixed date, no leave time | Planner compares both ports and calculates when to leave. It does not require the visitor to guess a departure time. |
| Visitor cannot leave before 8:00 AM | 8:00 AM is a **not-before constraint**, not an exact departure. A later calculated departure is allowed when it improves the trip. |
| 3-night stay | Planner stores and plans 3 nights. It must not collapse “2–3 nights” into an arbitrary 2-night trip. |
| 5-night stay | Planner explicitly collects the number of nights instead of silently assuming 4. |
| Already in Mackinaw City | Planner knows the Lower Peninsula side; it does not treat Mackinaw City and St. Ignace as geographically identical. |
| Nearby and either port works | Both ports remain eligible and the schedule can decide. |
| Date still flexible | Planner produces a trip framework but does not fabricate exact ferry, weather, attraction, or timing claims. |
| Trip length still undecided | Planner does not force an overnight model. |
| Limited-walking multigenerational trip | Movement is a core input and the plan reduces unnecessary hills/backtracking before ranking activities. |
| Overnight trip | Arrival-day ferry and return-day ferry are separate decisions. |
| Returning visitor | Saved trip reopens as the plan, not Question 1. |
| Live-data or schedule failure | Planner stops at the truth boundary and says what needs a recheck instead of inventing a ferry. |
| Adjustment after plan | “More relaxed,” “less walking,” etc. rerun the same trip instead of restarting intake. |
| Mobile at 390 px | One obvious next action, no competing planner/dashboard, no horizontal dependence. |

## Score

Each dimension is scored 0–10:

- Cognitive clarity
- Question necessity
- Constraint semantics
- Travel feasibility
- Movement realism
- Result actionability
- Explanation quality
- Cross-page continuity
- Recovery / fail-closed behavior
- Mobile usability

Release target: **>= 92/100**, with no individual dimension below **8/10**.

## Hard failures

Any of these blocks release regardless of aggregate score:

- requiring a leave-home time when the planner can calculate one
- treating a not-before time as an exact departure
- ambiguous stay length silently mapped to a different number of nights
- nearby users treated as equally close to both ferry ports without asking which side
- exact ferry output without enough date/origin information
- primary result led by a score instead of an actionable journey
- saved trip reopening at the beginning of intake
- JEV modifying deterministic schedule, route, accessibility, weather, or feasibility truth
- downstream pages creating a second unrelated trip state

## Result hierarchy

The first completed-plan screen must answer, in this order:

1. **Where am I going first?**
2. **When should I leave / head to the dock?**
3. **Which ferry am I targeting?**
4. **When do I actually reach the Island?**
5. **What are the few anchors that fit this trip?**
6. **How is the return handled?**
7. **Why did the planner choose this?**
8. **What should I decide next?**

Detailed score components, source diagnostics, webcams, full ferry tables, map detail, and advanced controls are secondary disclosure—not the primary trip story.
