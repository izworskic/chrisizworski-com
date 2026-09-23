# Gatlinburg Winter — production contract

Canonical surface: `https://chrisizworski.com/gatlinburg-winter/`

## Decision architecture

`official/live data -> hard gates -> finite candidate universe -> feasible itinerary bundles -> JEV closed-set choice -> Haiku explanation -> UI`

JEV never receives permission to create attractions, events, schedules, prices, weather, closures or transportation facts. It chooses one of at most six deterministic, feasible itinerary bundles. The shared harness rejects choices outside the supplied set, low-confidence responses and high prompt-injection dependency. If JEV fails, the highest deterministic bundle is used.

The writer receives only the selected itinerary and sealed facts. It cannot change the plan. If Anthropic is unavailable, the server emits a deterministic explanation.

## Source truth

- National Weather Service point/hourly/grid forecasts and active alerts — live/cached with timestamps.
- Great Smoky Mountains National Park temporary road/facility closure page — live/cached with timestamps. Only an explicit Newfound Gap Road/US 441 closed phrase hard-gates that candidate.
- Gatlinburg Convention and Visitors Bureau — published 2026-27 Winter Magic and major seasonal event dates.
- SkyPark, Anakeesta, Ober Mountain and Ripley's — official attraction pages. Same-day pages are checked for explicit open/closed language. Future dates are **unverified** and never labeled open.
- NOAA solar calculation method — deterministic sunrise/sunset planning input.

Each source uses one of the product states `live`, `cached`, `stale`, `degraded`, `unavailable`, `published` or `calculated`. The UI exposes state and timestamp/verification notes.

## Candidate scope

The controlled catalog contains 20 options: Winter Magic/light experiences, a few major mountain attractions, Ober snow activities, Ripley's Aquarium/indoor fallback, Great Smoky Mountains gateway/scenic options, Arts & Crafts, a small number of generic food stops and two major date-specific events. The product deliberately does not ingest every Gatlinburg business, restaurant or park trail.

## Safety and failure behavior

Official closure data outranks preference and AI. The product never says roads, driving, trails or snow are safe. If a live source fails, the UI labels the failure rather than substituting fabricated values. If weather is outside the forecast window, it says so. If future attraction hours cannot be verified, the itinerary carries an explicit verification requirement and links to the official source.

## Release benchmark

`tests/gatlinburg-winter.test.js` exercises the required 15 benchmark personas plus hard-gate and source-contract tests. It checks family fit, late arrival, snow priority, rain response, budget, multi-day scope, stroller/low-walk behavior, Ober priority, Christmas lights, New Year's, crowd avoidance, three-hour feasibility and late-January Winter Magic validity.

The release standard is decision usefulness rather than encyclopedic coverage: the plan must be feasible, grounded, responsive to a changed assumption and materially more useful than a static winter list.
