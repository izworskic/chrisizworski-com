# Gatlinburg Winter — five-persona devil's-advocate review

The old planner treated eleven buttons as personas even though several were priorities or trip lengths. That creates the appearance of personalization while preserving almost the same candidate universe and itinerary shape.

## First visit
Failure: a first-time visitor can receive a high-scoring attraction stack without understanding Gatlinburg's basic shape: elevation/daylight first when useful, compact downtown as one block, and seasonal lights after dark.

Product contract: when a feasible complete plan exists, prefer a representative day shape over a generic indoor stack. A classic first visit should normally combine one daylight-dependent/scenic block with one after-dark seasonal block while minimizing pointless car movement.

## Family with kids
Failure: child-fit scores alone reward kid-friendly attractions but do not price in family fatigue. Four individually good stops can make a bad family day if they add zone changes, walking, outdoor exposure, parking churn, or too many transitions.

Product contract: family energy outranks attraction count. Penalize zone changes, travel minutes, walking, and excess stops. Young children and stroller/low-walk settings should materially favor compact or weather-resilient plans.

## Couple
Failure: a couple receives nearly the same attraction bundle with a different explanation. That misses the actual use case: a coherent rhythm and fewer transitions often matter more than maximizing paid stops.

Product contract: distinguish scenic, festive, and low-key couple trips. Scenic should prefer daylight/scenic anchor + meal buffer + evening atmosphere when feasible. Low-key should penalize major event magnets and paid-attraction stacking.

## Christmas atmosphere
Failure: `mustLights=true` is too weak. It allows Christmas to become one interchangeable light stop inside a generic trip. Major fixed holiday events also need to alter the whole schedule, while crowd-averse users should not be pushed into the same event magnets.

Product contract: the seasonal component must materially anchor the plan. Event-seeking visitors can make a fixed event the clock anchor; crowd-averse visitors should preserve Christmas atmosphere while penalizing the largest crowd magnets.

## Snow / winter activities
Failure: `snow` is semantically overloaded. Downtown forecast snow, natural high-elevation snow, Ober snowmaking/tubing operations, and NPS road safety are not the same condition. Treating them as one signal creates bad advice.

Product contract: an activity/tubing persona requires an actual Ober snow block whenever a complete feasible option exists. Natural-snow interest is a separate goal and never treats downtown snowfall as proof of mountain operations or road safety.

## Architecture after correction

Hard source/safety gates → explicit persona policy → persona-qualified complete schedules → JEV chooses among valid complete plans → deterministic enrichment → one final Haiku desk-editor pass.

The writer explains the tradeoff. It does not decide the itinerary or invent destination facts.
