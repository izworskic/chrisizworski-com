# Gatlinburg Winter — production contract

Canonical surface: `https://chrisizworski.com/gatlinburg-winter/`

## Decision architecture

`official/live data -> hard gates -> finite candidate universe -> candidate bundles -> schedule realization -> fully schedulable option set -> JEV closed-set choice -> sealed-fact writer -> UI`

The final JEV pass never receives permission to create attractions, events, schedules, prices, weather, closures or transportation facts. It sees only itinerary options that have already been materialized onto the visitor's clock. Any alternative that has to drop a stop to fit is removed before the final closed-set choice. The shared harness rejects choices outside the supplied set, low-confidence responses and high prompt-injection dependency. If JEV fails, the first fully scheduled deterministic option is used.

The writer receives only the final selected itinerary and sealed facts. It cannot change the plan. If Anthropic is unavailable, the server emits a deterministic explanation.

## Source truth and authority

Source authority is explicit rather than flat:

1. **Primary official:** National Weather Service and National Park Service.
2. **Official destination/operator:** Gatlinburg Convention and Visitors Bureau plus SkyPark, Anakeesta, Ober Mountain and Ripley's.
3. **Transit registry:** Transitland, used to establish the Gatlinburg Trolley GTFS/GTFS-Realtime data surface. Official Gatlinburg trolley information still governs service and hours.
4. **Market context:** AirDNA, used only to show the scale of Gatlinburg's short-term-rental market. Trailing occupancy is never treated as a live crowd sensor.
5. **Supporting/calculated:** deterministic solar timing and other non-operational context.

Operational inputs:

- National Weather Service point/hourly/grid forecasts and active alerts — live/cached with timestamps.
- Great Smoky Mountains National Park temporary road/facility closure page — live/cached with timestamps. Only an explicit Newfound Gap Road/US 441 closed phrase hard-gates that candidate.
- Gatlinburg Convention and Visitors Bureau — published 2026-27 Winter Magic and major seasonal event dates.
- SkyPark, Anakeesta, Ober Mountain and Ripley's — official attraction pages. Same-day pages are checked for explicit open/closed language. Future dates are **unverified** and never labeled open.
- NOAA solar calculation method — deterministic sunrise/sunset planning input.

Supporting context:

- Transitland operator record for the City of Gatlinburg Trolley, including registered static GTFS and GTFS-Realtime feeds.
- NPS Great Smoky Mountains datasets/current-conditions/webcam surfaces. NPS webcam imagery updates approximately every 15 minutes and park-specific meteorological/visibility data can differ materially from lower-elevation Gatlinburg conditions.
- AirDNA Gatlinburg market overview. The September 22, 2026 public snapshot reported 7,317 active short-term rentals and 57% average occupancy; these figures are background market context, not date-level demand or live crowd evidence.

Each source uses one of the product states `live`, `cached`, `stale`, `degraded`, `unavailable`, `published` or `calculated`. The UI exposes state, authority class and timestamp/verification notes.

## Candidate scope

The controlled catalog contains 20 options: Winter Magic/light experiences, a few major mountain attractions, Ober snow activities, Ripley's Aquarium/indoor fallback, Great Smoky Mountains gateway/scenic options, Arts & Crafts, a small number of generic food stops and two major date-specific events. The product deliberately does not ingest every Gatlinburg business, restaurant or park trail.

## Default-answer behavior

A zero-input visit still produces a useful first answer, but the assumptions are visible: first-visit profile, selected date, time window, balanced weather preference and normal crowd tolerance. Once the visitor changes a control, that default-assumption notice disappears and the plan is rebuilt from the explicit inputs.

The UI also exposes a `What changed the answer` layer so the visitor can see which constraints actually altered or sequenced the result — for example daylight, season, weather, budget, crowd tolerance, walking preference, snow priority, transit support or mountain-condition monitoring.

## Safety and failure behavior

Official closure data outranks preference and AI. The product never says roads, driving, trails or snow are safe. If a live source fails, the UI labels the failure rather than substituting fabricated values. If weather is outside the forecast window, it says so. If future attraction hours cannot be verified, the itinerary carries an explicit verification requirement and links to the official source.

## Release benchmark

`tests/gatlinburg-winter.test.js` exercises the required 15 benchmark personas plus hard-gate and source-contract tests. It checks family fit, late arrival, snow priority, rain response, budget, multi-day scope, stroller/low-walk behavior, Ober priority, Christmas lights, New Year's, crowd avoidance, three-hour feasibility and late-January Winter Magic validity.

`tests/gatlinburg-winter-v2.test.js` adds schedule-completeness and explanation-layer tests. It verifies that overscheduled alternatives are excluded from the final option set, source authority is ordered correctly, AirDNA remains market context rather than a live crowd input, zero-input assumptions are explicit and the answer-change layer identifies material constraints.

The release standard is decision usefulness rather than encyclopedic coverage: the plan must be feasible, grounded, responsive to a changed assumption and materially more useful than a static winter list.
