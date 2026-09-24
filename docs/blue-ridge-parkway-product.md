# Blue Ridge Parkway Today — production contract

Canonical surface: `https://chrisizworski.com/blue-ridge-parkway/`

## Product job

Answer one question better than a generic destination guide:

> From where I am starting, with the time I actually have, which section of the Blue Ridge Parkway is worth driving today?

The page should feel like a well-edited field desk, not a chatbot, an itinerary generator, or a tourism-content page.

## Decision architecture

`official road status -> route hard gates -> finite route catalog -> time feasibility -> route weather -> seasonal context -> deterministic ranking -> JEV closed-set choice -> sealed-fact editorial pass -> UI`

### Deterministic ownership

Code owns and may not delegate:

- Parkway milepost geometry used for route overlap.
- NPS closure and road-note parsing.
- Hard closure vetoes.
- Gateway, route, stop and milepost catalog.
- Modeled outing duration.
- NWS forecast values.
- Fall-color seasonal estimate label.
- Google Maps route handoff.
- Source URLs and freshness labels.

### JEV ownership

JEV may choose only among route candidates that already passed hard road and time gates. It receives a finite option set with supplied facts. It cannot change closures, mileage, timing, weather or seasonal labels.

If JEV auth, confidence or injection-dependency checks fail, deterministic ranking wins.

### Editorial writer ownership

The writer receives only sealed facts for the selected route. Its job is a short practical read: what earns the time, what is optional, and what condition could change the plan.

The writer is rejected if it uses tourism filler such as `breathtaking`, `stunning`, `hidden gem`, `magical`, `perfect day`, `must-see`, or `bucket list`. A handcrafted deterministic paragraph is always available and is the fallback.

The writer never supplies new facts.

## Source hierarchy

1. **National Park Service road-status table** — authoritative road gate/section status and road notes.
2. **National Weather Service hourly forecast** — route-weather input near representative high terrain.
3. **NPS maps/construction pages** — detour and project context.
4. **NPS weather/driving guidance** — elevation, driving-speed and seasonal context.
5. **Public NPS-region GIS Parkway line** — visual map corridor only; a failure must not change the decision.

A source failure must be visible. Do not replace unavailable official status with a guessed state.

## Route-time truth

Route time is a planning model, not traffic navigation. It uses:

- out-and-back Parkway mileage,
- a conservative modeled mountain-road pace,
- listed stop dwell time,
- a small buffer,
- and a per-route minimum established by the route catalog.

The UI must call this a modeled outing or planning estimate.

## Fall-color truth

Fall color is not a live observation in this tool. During the fall window it is a deterministic date + elevation-band estimate informed by NPS seasonal guidance. The UI must say `Seasonal estimate` and must never show a fabricated percent color, exact peak date or live-canopy claim.

## UX contract

Above the fold should contain:

1. What the tool decides.
2. Starting gateway.
3. Date and departure time.
4. Time available.
5. A short interest set.
6. One action: `Build my drive`.

The result order is:

1. Recommended drive and modeled duration.
2. Road consequence.
3. Mountain weather.
4. Seasonal color when relevant.
5. Route map.
6. Stops that earn the time.
7. Alternatives and why they lost.
8. Sources and truth labels.

No chat box. No fake conversational UI. No opaque 0–100 score as the main answer.

## Copy standard

Copy should sound like a person who knows the road and respects the visitor's clock.

Good:

- `This is where an Asheville drive starts to feel alpine.`
- `A waterfall changes the shape of the day.`
- `If you only have two hours, choose this or Moses Cone rather than pretending you can do both well.`

Bad:

- `Embark on an unforgettable journey.`
- `Discover breathtaking hidden gems.`
- `The perfect itinerary for every traveler.`

## Canonical/search boundary

This product owns the broad Blue Ridge Parkway current-drive decision. Gateway choices remain states inside the canonical tool. Do not launch thin `/asheville/`, `/boone/`, date or keyword variants merely to increase index count.

A later supporting canonical may launch only if it serves a materially different decision with its own evidence and utility.

## Measurement

Primary product events to observe after launch:

- tool opens / organic landing impressions,
- planner completion rate,
- change-from-default gateway rate,
- Google Maps handoff clicks,
- map interaction,
- source-link clicks,
- repeat visits during fall/winter closure periods.

Search evaluation should use comparable 28-day windows, with seasonal context noted rather than claiming causality from raw demand growth.
