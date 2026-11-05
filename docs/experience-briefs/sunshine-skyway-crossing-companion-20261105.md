# Sunshine Skyway Crossing Companion: Experience OS 1.2.1
Checked: 2026-11-05. Owner: izworskic/chrisizworski-com. Existing canonical: https://chrisizworski.com/sunshine-skyway-bridge/

## Visitor job
Before crossing the Sunshine Skyway, determine the most informed next action from official bridge status, directional traffic, selected vehicle and NWS wind outlook. Confirm operational status on FL511 first; if affected, compare a carefully qualified alternative corridor.

## Baseline
Existing implementation has FL511/FDOT-first bridge status, directional speed layer, NWS fallback, vehicle context, toll calculator and live camera. Its large hero and separate metrics require visitors to assemble a trip decision. This build adds a connected next-move panel and shortens the hero without replacing the established engine.

## Research and external examples (checked 2026-11-05)
* Official operational feed and live map: https://fl511.com/ and https://fl511.com/map . Absence of a closure notice does not certify the bridge open.
* NWS digital forecast: https://forecast.weather.gov/MapClick.php?FcstType=digital&lat=27.61&lon=-82.65&unit=0 . Forecasts are not live operational instructions.
* FDOT I-275 project closure context: https://www.fdottampabay.com/laneclosures/road/i-275 . Generic I-275 events should not be promoted to Sunshine Skyway closures.
* Outside example 1, https://www.skywaybridgestatus.com/ : status-oriented commuter utility. Lesson: single answer, but do not infer affirmative OPEN from partial information.
* Outside example 2, https://tampa.lukealbertson.com/ : regional bridges and corridor context. Lesson: compare the surrounding network, but distinguish nearby conditions from Skyway authority.

## Competing designs and choice
A. Skyway Crossing Companion: preserve authoritative first status, append state-aware next move, Eastern-time NWS forecast periods, and reversible north/south Tampa Bay bypass example. **Selected** because it directly resolves the user's trip decision with minimal dependencies.
B. Tabs for commuter/RV/photographer: rejected because the tabs obscure the urgent shared status, duplicate sources and dilute the established search intent.

## Distinctiveness compared with the existing network
Compared with Mackinac Bridge Live and Maryland Chesapeake Bay Bridge, Skyway uses wind-sensitive personal crossing context and a direction-specific Howard Frankland / I-4 / I-75 contingency, without applying any unsupported vehicle ban or asserting FDOT designated that detour. This is not a copied photo, card grid or generic landing template.

## Source-of-truth and shared state
The FL511 snapshot alone can produce CLOSED, IMPACTED, NO_CLOSURE_SIGNAL_FOUND or UNKNOWN. NWS wind contextualizes caution but never sets bridge status. Only currently healthy speed-layer data can become a live slowdown claim; no fabricated minutes. A direction choice updates the current-traffic perspective, illustrative corridor legs, Google Maps comparison and the shareable direction/vehicle URL. Browser URL query values are allowlisted; no user geolocation is collected.

The bypass is a geographic *example*, never an official detour, confirmed open alternative, or measured best route. The Google Maps link uses representative Bradenton and St. Petersburg endpoints plus corridor waypoints; visitors must verify live conditions, navigation, and actual origins.

## Failure and layout
Default no-JS text says current status is unverified and links directly to FL511. Unknown/stale operational sources never become OPEN. Missing forecast periods show unavailable. No new map or photo dependency; existing licensed/credited hero stays with dark-gradient background fallback. Native select and details controls, no new motion beyond existing scroll behavior. Mobile hero is more compact so the official answer appears earlier.

## Acceptance
Use new dedicated Node unit scenarios plus all existing Skyway tests. Require complete owning-repo verify:all, release evidence validation, 360/390/768/1440 screenshots, A to B to A directions, keyboard, no JS, failed traffic/NWS and image load, full CI, and public deployment verification before claiming live. Do not claim search, visitor or revenue uplift without comparable evidence. Preserve canonical, Person entity, Auto Ads, sitemap, and all existing revenue and source protections. No Redis, Supabase, Python runtime, or new map provider.
