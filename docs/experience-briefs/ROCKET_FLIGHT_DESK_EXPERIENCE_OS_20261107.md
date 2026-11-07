# Rocket Launch Live: Flight Desk Experience OS pilot
Date: 2026-11-07
Owner: izworskic/chrisizworski-com
Canonical: https://chrisizworski.com/national-tools/rocket-launch-live/
Source: public/synced-national-tools/rocket-launch-live/
Framework: EXPERIENCE_OS_V1 1.2.1 (main manifest)
Baseline: National page has a tall photographic hero, national atlas, a separate mission picker, three evidence cards, official notice desk, regional access guide, rocket-photo story, source chronology and forecast. Mission-origin rocket pins were released in PR #1546. Existing CI/browser records prove technical behavior, not visitor adoption.

## Visitor question, selection and action

“I have heard there is a rocket launching. Which one is it, where does it leave the ground, and what needs to be true before I travel to watch it?”

One authoritative selection ID: `selectedLaunchId` returned by `/api/rocket-launch-usa`. The hero Flight Desk, original mission selector, map-origin marker, visual context, launch-truth timeline and regional access/forecast all follow that ID. The visitor can select a mission in the first-screen selector, focus its source-grounded rocket marker, and inspect official access alternatives. No visitor-side LL2 calls, GPS permission or second source.

## Evidence inventory and honest boundaries

| Claim | Primary owner and current source | Kind and freshness | Failure behavior |
| --- | --- | --- | --- |
| The rocket, pad, region, clock and mission ID | Shared `/api/rocket-launch-usa` backed by a signed Postgres LL2 snapshot; https://ll.thespacedevs.com/ | Third-party schedule; server returns `scheduleCheckedAt`, `netPrecision`, source freshness | Stale or missing schedule becomes unverified; do not claim a launch is cancelled or “go” |
| Florida visitor viewing permissions | https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing | Official event rules; checked 2026-11-07; a ticket option does not guarantee launch | “Check mission-specific KSC tickets and NPS closures,” never automatic admission |
| Wallops visitor-center opening | https://www.nasa.gov/wallops/visitor-center/view-a-launch-from-nasa-wallops-visitor-center/ | Official mission-specific event opening, checked 2026-11-07 | No schedule listing or general opening hours can certify actual entry |
| Regional spectator sky | https://www.weather.gov/ and regional NWS forecast grid referenced by existing API | Forecast, limited by server's seven-day and target-time precision contracts | Missing/partial grid is not a clear-weather claim |
| Rocket/map origin | `public/assets/rocket-map-pins.js` validates region bounds; LL2 pad geometry when reported | Source geometry, not survey or public access | Label unknown pad GPS “approximate launch region” and do not provide military directions |
| Archive image | https://www.vandenberg.spaceforce.mil/News/Article-Display/Article/3738319/ussf-62-mission-launches-from-vsfb/ | Historical context/photo rights handled by original page | Photo is contextual and never a current selected-mission photograph |

The original weather, mission news, access and visual engines retain authority. No new GO verdict, weather model, mission forecast, departure estimate, trajectory, ticket recommendation, fake live stream or paid feature.

## External product comparison, checked November 7, 2026

1. [Next Spaceflight](https://nextspaceflight.com/) organizes countdowns, streams, launch timelines and launch-site maps. Its app documentation describes a pad manifest and viewing information. Borrow mission-to-pad discoverability, not an unsourced trajectory animation or assumed flight GO.
2. [Visit Space Coast Rocket Launch Experience](https://www.visitspacecoast.com/plan-your-trip/) explicitly guides visitors through “find your launch / find a viewing location / look up.” Borrow the clarity of a sequential decision without replicating its mobile app or treating its venue listings as current launch-day access.
3. [NASA Wallops viewing advice](https://www.nasa.gov/wallops/visitor-center/view-a-launch-from-nasa-wallops-visitor-center/) distinguishes NASA-specific event access, traffic and backup options. Range notices, not a third-party calendar, establish current access.

## Two distinct design concepts

**A / Photo-first countdown theatre (rejected).** A dramatic top-of-page launch timer, video preview and simulated ascent map. This strongly resembles Next Spaceflight and would create a false urgency from date-only, held or stale schedules. It would bury permission and source status on a phone, add dependencies, and risk an unlicensed “live” appearance.

**B / Pad → Shore → Sky Flight Desk (selected).** A compact mission-first operational flight desk within the original photo-led hero. Three spatial stages show published launch target and grounded origin, independently governed public shore access, and time-scoped spectator-sky evidence. Mission picker and “show rocket on map” use the same API response and selected UUID as the existing source and visitor desks. Evidence is explicit even if it is disappointing. Below the fold, existing story, videos, source history and specialist maps remain intact.

## Distinctiveness veto and closest site examples

Closest existing tools: [Sunshine Skyway Crossing Companion](https://chrisizworski.com/sunshine-skyway-bridge/) and [Vandenberg launch viewing guide](https://chrisizworski.com/vandenberg-rocket-launch-viewing/). We reuse status/provenance and accessible native selection, but neither owns a multi-region single-mission three-stage problem. Flight Desk's stable mission-ID handoff from calendar → restricted pad marker → region-specific visitor desk → forecast is materially different from the Skyway's direction-specific crossing decision and from Vandenberg's single-region venue selector. No generic sitewide hero/card template is copied.

**Purposeful motion:** none added. Existing map focus respects reduced-motion preference. Underlying photo and credited rocket-gallery behavior unchanged.

## Interaction state matrix (source contract, not a proof of QA)

| Journey | Selector / map | Primary answer and source-safety meaning | Fallback |
| --- | --- | --- | --- |
| Initial | Choose default scheduled mission of a coast; user can switch coast below | Report original ID, schedule target with timezone/time precision, location confidence, non-clearance of access and sky | No mission → “bounded feed” unknown rather than canceled |
| A → B | Select alternate in the hero native selector | Original selector, source desks, launch map and hero answer change to B on same request; B's timing/source labels are independent | Rapid prior A fetch cannot overwrite B (existing request serial) |
| B → A | Reverse native selector or original mission roster | A, original clock and map selection return; no stale B payload/photo | Empty/invalid ID cannot trigger a new API request |
| Map click | Select mission in rocket marker popup | Original details and top Flight Desk render identical chosen ID | No map tiles → original coast selector and official sources |
| Map focus | Click “Show this rocket” | Focus matching grounded pad/region-origin marker, preserve launch choice and page URL | No map → focus coast navigation; do not invent coordinates |
| Stale | Snapshot stale; hold/scrub; Texas city beach closed | Overt caution, never GO, no independent ticket/access promise | Show official source links |
| No JS | Page HTML renders decision question, evidence limitations, region chooser, NASA/government link below | No simulated current mission verdict | Source links and visitor guidance readable |
| No image | Existing source-credited hero photo fails/slow | Core text answer remains legible | Never overlay image-dependent selected-mission text |

## Page composition and constraints

At 360/390px, the first useful answer and native mission selector should appear before the historical image, national regional tiles and secondary evidence labs; at 768/1440 a coherent Flight Desk is alongside the existing authentic photo. Inspect screenshots at 360, 390, 768 and 1440 with actual loaded UI, no horizontal overflow, visible keyboard focus and usable touch targets. Minimum meaningful text is 13–14px except metadata; display time locally in the range timezone and label all approximate values. Preserve map CARTO key with OSM fallback; do not change ads, JSON-LD Person, canonical, sitemap, map-origin provider or six regional UX engines.

## Acceptance

Full repo verification, region-specific GitHub tests, explicit Flight Desk unit A→B→A/no-source cases, actual Chromium 360/390/768/1440 screenshot and keyboard/disabled-JS testing, QA scorecard, release record and source-backed postdeploy smoke. Record PR/CI/production/live/outcome stages separately; do not invent a CTR lift. The pilot is useful only if a new visitor understands that a rocket location, a scheduled time and a legal viewing trip are three different questions.
