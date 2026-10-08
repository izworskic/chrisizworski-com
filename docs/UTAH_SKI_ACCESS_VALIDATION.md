# Utah Ski Access — engineering validation (2026-10-08)

**Status: research draft. No production page, live UDOT key, parking inventory, or published travel guarantees.**

The proof compares Alta, Snowbird, Brighton and Solitude by relevant canyon signals, ski-pass access and season-specific parking requirements. No public API handler, site card, cron, or sitemap changes were added.

## Prototype modules

- lib/utah-ski/udot.js: offline classification of UDOT traffic events, road conditions and electronic messages, with timestamps and uncertainty.
- lib/utah-ski/udot-fetch.js: explicit diagnostic using a developer key; no per-visitor polling, no URL/key logging.
- lib/utah-ski/policy.js: published 2026–27 resort parking rules and conservative pass eligibility; NOT live inventory.
- lib/utah-ski/decision.js: multiple blockers/actions/unknowns per resort, time-scoped road observations, and no green safe-to-drive verdict.
- tests/utah-ski-access.test.js: offline fixtures.

## Offline test

    node --test tests/utah-ski-access.test.js

Opt-in diagnostic only after credential and terms verification (developer environment):

    const {diagnostic} = require('./lib/utah-ski/udot-fetch');
    const snapshot = await diagnostic({key: process.env.UDOT_API_KEY});

UDOT documents **10 calls per 60 seconds**. A full snapshot uses three calls. There is no global serverless rate limiter in this prototype, so NEVER expose the diagnostic to public traffic until a centrally scheduled, shared-cache ingestion system is built and verified.

## Mandatory gates before any public rollout

1. Obtain a UDOT developer key and verify permissioned access and use terms.
2. Capture winter samples of real traffic events, traction and sign notices; hand-label full canyon closures, uphill restrictions, and ambiguous or absent events.
3. Spatially verify SR-190/SR-210 events against actual canyon corridor and direction, including recurring schedule entries. Generic route numbers alone are not proof of canyon-wide closure.
4. Confirm applicable Utah Class 2/Class 3 traction rules against primary enforcement guidance. Never claim vehicle legality until a separate verified eligibility model exists.
5. Resolve resort-specific season calendars and atypical dates/closing days; resolve Solitude Moonbeam versus other lots and Alta weekday holidays.
6. Verify Ikon Base/full access and destination-specific blackout rules, combined Alta/Snowbird day allowances, and whether lift reservations are needed. Self-reported tickets do not guarantee entry.
7. Obtain an authorized parking-inventory source before displaying actual spaces. Bus locations do not establish seat availability.
8. Quantify winter query demand and likely attainable impressions before generating indexable resort subpages.
9. Run npm run verify:quick and full npm run verify:all in a complete-history checkout. Do not merge with a failing gate.

## Hard output constraints

Only verdicts TRIP_NOT_FEASIBLE_AS_PLANNED, ACTION_REQUIRED and VERIFY_BEFORE_DEPARTURE are possible. There is intentionally no ROAD_OPEN, SAFE_TO_DRIVE, PARKING_AVAILABLE, TICKET_VALID or VEHICLE_LEGAL result. NO_CONFIRMED_BLOCKER never means safe or open.

Road observations are UTC-stamped; planned dates/hours are Utah-local (America/Denver). Current road reports are not projected onto future dates. Freshness/lookahead thresholds are provisional and need real-data validation.

## Official sources

- https://udottraffic.utah.gov/developers/doc
- https://udottraffic.utah.gov/help/endpoint/event
- https://udottraffic.utah.gov/help/endpoint/roadconditions
- https://udottraffic.utah.gov/help/endpoint/messagesigns
- https://cottonwoodcanyons.udot.utah.gov/road-closures-uphill-restrictions/
- https://www.alta.com/getting-here/parking-info
- https://www.brightonresort.com/getting-here-and-parking
- https://www.solitudemountain.com/discover-solitude/getting-here-parking
- https://www.snowbird.com/the-mountain/parking/parking-overview/
- https://www.ikonpass.com/en/faq/

Prototype owner: izworskic/chrisizworski-com, until extraction is explicitly decided. Preserve existing national hub architecture when introducing a canonical URL.
