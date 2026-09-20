# Mackinac Intelligence Foundation v1

## Product boundary

Mackinac is evolving from one large live-decision page into a regional trip intelligence system. The visitor model may interpret preferences and rank already-valid choices. It may not create ferry times, attraction hours, weather, closures, prices, events, routes or business facts.

## Phase-one contracts

### Base intake
1. Trip duration
2. Party composition
3. Trip vision (up to two)
4. Largest trip loss / annoyance

The first useful profile must be possible after these four questions. Additional questions are adaptive and optional.

### Visitor vector
`duration, pace, crowd_avoidance, budget_sensitivity, walking_tolerance, outdoors, history, food, shopping, photography, kids_priority, special_occasion, iconic_priority, schedule_flexibility, weather_tolerance, regional_exploration`

Every value is bounded 0–1 and can be reproduced deterministically from the same answers.

### JEV role
JEV receives:
- normalized answers,
- the deterministic vector,
- a closed set of plausible archetype IDs,
- a closed set of follow-up question IDs.

JEV may choose:
- one archetype ID,
- one follow-up question ID or `NONE`.

JEV may not rewrite the vector or add facts. Confidence and prompt-injection-dependency gates force deterministic fallback.

### Archetypes
The v1 library includes 15 behavior-based archetypes:
- First-Time Island Day
- Young-Family Mackinac
- Active Family Mackinac
- Slow Island Escape
- Memorable Mackinac
- Ride the Island
- Historic Mackinac
- Downtown + Dining
- Scenic Mackinac
- Value-First Mackinac
- Easy-Mobility Mackinac
- Event-First Mackinac
- Fall Mackinac
- Island Stay Explorer
- Straits Road Trip

Archetypes are not demographic labels. They are planning preference profiles.

### Tabs
The system ranks the same bounded navigation set for each profile:
`My Trip, Live, Getting There, Island, Map, Stay, Eat, Events, Around the Straits`.

The app may reorder or emphasize tabs, but canonical URLs and underlying facts stay stable.

### Truth layers
1. **Fact:** ferry schedules, attraction hours, official events, bridge conditions, weather.
2. **Estimate:** routing/travel time.
3. **Modeled:** crowds, fall color and other explicit predictive models.
4. **Human confirmation:** webcams.
5. **Preference interpretation:** deterministic vector + bounded JEV classification.

These layers must remain visibly distinguishable.

## API

### GET `/api/mackinac-profile`
Returns the intake schema, archetypes, vector dimensions, tab set, SEO surfaces and analytics event schema.

### POST `/api/mackinac-profile`
Accepts either an answer object or `{ "answers": {...} }`.
Returns:
- normalized answers
- vector
- primary and secondary archetypes
- confidence
- next adaptive question if useful
- ranked tabs
- deterministic/JEV engine metadata

No profile is persisted in v1.

## Search architecture

The same engine will power durable intent pages rather than generating thin personalized index pages. Initial surfaces include day trip, first time, kids, couples, 2/3-day itineraries, bike route, ferry planner, gateway comparison, where to stay, fall, accessibility, rainy day, crowds, webcams, events and map.

## Analytics

Phase-one event vocabulary is source-controlled in `ANALYTICS_EVENTS`. Intake, classification, plan generation, tab depth, map interaction, stay/eat/event openings, saves, shares and return visits must be measured before ad-layout optimization.

## Loss function

Hard failures:
- invented or stale logistics presented as current facts
- impossible itinerary
- inaccessible plan contradicting mobility input
- broken live surface without fallback
- more questions that do not materially change the plan
- JEV output outside a closed set
- layout/performance regressions
- thin duplicate SEO pages

Optimization priority:
1. decision usefulness
2. persona fit
3. truth/freshness
4. interaction depth
5. search value
6. monetizable depth

## Next implementation phase

After this foundation passes production gates:
1. build the four-question intake UI,
2. store the profile only client-side,
3. apply ranked tabs to the regional shell,
4. generate deterministic candidate itineraries from the existing planner,
5. let JEV rank those feasible plans,
6. add map/stay/eat/event adapters one domain at a time.
