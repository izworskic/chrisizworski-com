# Mackinac Island Live — 15-persona release benchmark

This release gate turns the product prompt's persona simulation and loss function into executable checks.

## Release contract

The build must satisfy all of the following:

- 15 / 15 benchmark personas produce a feasible answer.
- 49 / 49 persona-specific assertions pass.
- 15 / 15 personas produce materially distinct plan signatures.
- Weighted product loss is <= 0.05.
- Multiplicative product value is >= 0.90.
- The public Vercel build runs both the focused Mackinac unit tests and the persona benchmark.

The benchmark uses the prompt loss function:

```
TOTAL LOSS =
25 × decision_confusion
20 × recommendation_unreliability
15 × stale_or_unverified_data
10 × mobile_friction
10 × generic_travel_content
 8 × unnecessary_clicks
 5 × page_load_cost
 4 × inaccessible_information
 3 × visual_clutter
```

The value gate measures:

```
decision_speed
× decision_confidence
× personalization
× live_relevance
× source_trust
× actionability
× return_visit_value
```

## The 15 visitor simulations

| ID | Visitor | Decision the tool must solve |
|---|---|---|
| A | Grand Rapids first-time couple | Leave-home time, mainland port, ferry, classic first-day sequence |
| B | Family with children 5 and 9 | Realistic day length, meal/restroom break, flex time |
| C | Experienced cyclist bringing a bike | M-185 timing without rental friction |
| D | Overnight photographer | Golden-hour plan without artificial last-ferry pressure |
| E | October 10 shoulder-season couple | Seasonal attraction availability + reduced ferry schedule |
| F | Marquette visitor | St. Ignace vs. Mackinaw City |
| G | Major-event visitor | Ferry arrival margin before a fixed event start |
| H | Last-minute 1 PM visitor | Decide whether a useful same-day trip still exists |
| I | Limited-mobility first-time visitor | Avoid aggressive walking; use horse-drawn transport context |
| J | Multigenerational family | Kids + older adults + low-friction pacing |
| K | Rainy-day family | Weather must materially lower the recommendation and change the day |
| L | History-first easy-paced couple | Protect Fort Mackinac, meal and flex time |
| M | Active scenery day trip | Bike rental + M-185 + Arch Rock if time supports it |
| N | Romantic overnight couple | Sunset + sit-down dinner + overnight pacing |
| O | Fall-color photographer on a bike | Bike window + color/photo light + later return |

## Current measured result

After the late-day and rainy-day fixes:

- Persona passes: **15 / 15**
- Assertions: **49 / 49**
- Distinct plan signatures: **15 / 15**
- Total loss: **0.0000**
- Value product: **1.0000**

The two defects found by the benchmark were real product defects:

1. A 1 PM visitor previously received no plan because the engine enforced a rigid 5.5-hour minimum stay. The planner now allows a shorter late-day visit when the verified ferry window still leaves useful island time.
2. An 80% rain family scenario still scored too highly. Rain now has a stronger nonlinear trip penalty, especially for visitors with children.

## Truth boundaries

- Ferry schedules remain deterministic published-source inputs.
- Origin drive times are planning estimates, never live traffic.
- Weather and marine observations retain source/freshness state.
- Crowd pressure is modeled and never represented as a live visitor count.
- JEV can rank only deterministic feasible candidates; it cannot create ferry times, attraction hours, weather facts, crowd counts or scores.
- The map's itinerary line is orientation only, not turn-by-turn routing.
