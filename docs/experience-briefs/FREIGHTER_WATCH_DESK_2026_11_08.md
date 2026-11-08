# Freighter Watch Desk — Experience OS 1.2.1 / Foundry 0.3 release brief

Date: 2026-11-08
Canonical: https://chrisizworski.com/great-lakes-ship-watching-spots/
Owner: izworskic/chrisizworski-com
Baseline: previously published static ship-watching spot guide, preserved in full as the source-first no-JavaScript fallback.
Scope: add a source-aware visitor decision without creating another indexable search page, another AIS proxy, or another model of ship arrival.

## The visitor problem

“I’m near the Great Lakes and want to watch a freighter. Which public shore area should I choose, what vessel evidence is available for the time I can go, how reliable is it, and where can I check the details?”

The existing guide identified good watching categories and linked to specialist tools, but left the visitor to inspect multiple trackers to understand whether a trip was worth considering. The original map engines and local viewing sources retain ownership of facts.

## Reuse inventory and authority

| Input | Authoritative source | New composition | Boundary |
|---|---|---|---|
| Soo approaching passage | /api/soo-ais + lib/soo-locks-next.js | Use its existing pick, candidate identity and complete time window | No recomputation of a new ETA; a lock queue may change |
| Duluth canal passage | /api/duluth-canal + lib/duluth-canal.js | Use its existing watchPick, candidate membership and complete window | Not a lift-bridge schedule or guaranteed entry |
| Remaining corridors | /api/freighter-ais + lib/soo-ais.js normalized Open Waters AIS | Filter reports to bounded general areas; label as observations | No direction-of-travel itinerary, ETA, public access or shore sighting inference |
| Viewing places | Original static guide and specialist visit pages | Location-dependent link and context | No invented parking location, public access or opening |
| Season context | Great Lakes Freighter Winter Layup, existing guide link | Keep static linked alternate for seasonal conditions | A moored vessel does not imply an imminent passage |
| Map | Existing Leaflet dependency plus CARTO tile service | Bigger recognizable vessel icons, original coordinate and report timestamp | Map failure preserves source list and public-access links |

Open Waters AIS observations are not AIS navigation advice; provider reports can be incomplete. API endpoints already supply normalized filtered reports and provider attribution. The Watch Desk has no API keys, direct third-party fetches, Supabase, Redis, database writes, or new runtime.

## Foundry diagnosis — three opportunities

1. **Finish the shore decision.** The static guide cannot answer whether a fresh, supported viewing opportunity exists for the selected place and time. Reuse Soo, Duluth and AIS endpoints. Visitor gain: one actionable result or explicit lack of evidence. Risk: overclaiming a forecast.
2. **Preserve selected vessel through specialist journeys.** Some existing specialist routes do not have verified vessel-selection deep-link support. Reuse the tool network. Gain: eventually follow a ship end-to-end. Risk: a query parameter that does not select loaded data. Defer until destination adapters are verified.
3. **Add weather and public-access status.** Reuse NOAA and land-manager sources where validated. Gain: stronger visit judgment. Risk: stale permits, forecasts and unsupported viewing hours. Defer to a separately evidenced iteration rather than inventing a GO signal.

**Selection:** Opportunity 1 has a direct answer and source adapters already in main. The other two remain important follow-on investments.

## Two credible designs

**A. Annotate the existing nationwide ship map.** Add shore site icons and an arrival side panel to the freighter tracker. It uses one map and is good for vessel-first explorers, but changes a ranking-performing canonical tracker, risks map crowding and makes shore planning subsidiary.

**B. Decision desk above the existing ship-watching guide (chosen).** The visitor first selects a place and a time. A clearly stated confidence class, a modeled window only when available, the source timestamp, a vessel map and two practical next actions follow. The existing source-first guide remains readable without JavaScript and explains places/access independently.

This second concept has a distinct narrative from a tracking map: **the shoreline, the available viewing time, the evidence and the honest next action**. It does not impose a generic Foundry skin.

## Interactions and state matrix

| Case | Required behavior |
|---|---|
| Initial page | Default Soo Today, source state awaiting fetch; full static guide below is readable |
| Valid Soo or Duluth pick | Preserve existing model's bounded window only if candidate ID, report time, and window fields match |
| Candidate not present / weak / expired | Do not claim any modeled window; show fresh observations or unknown |
| Generic Port Huron, Straits, Detroit, Saginaw Bay | Show only observed vessel reports inside local bounding box, explicitly no arrival ETA |
| Within 90 minutes | Only display windows whose modeled start is within 90 minutes |
| Today | Only display current local-day window or an already underway crossing |
| Tomorrow | No future claim from present AIS; no new API request; show planning links |
| Provider outage or source check older than three minutes | Hide previous current claims and mark source unavailable |
| AIS report older than 30 minutes or malformed MMSI | Exclude vessel from live list and map |
| Map dependency fails | Evidence list and specialist links still work; HTML guide is intact |
| Select different corridor during a fetch | Abort and prevent previous response from overriding selected place |
| Mobile or reduced motion | Responsive stacked controls, no map overlay, accessible keyboard interaction and reduced-motion scroll |

**Time model:** source checkedAt must be within 3 minutes, individual AIS seen within 30 minutes. Candidate source/identity and exact model-provided window must match. This is a freshness/consistency rule, not a calibrated statistical probability.

## Engineering and release criteria

- No new canonical URL. Title, original FAQ structured data, creator Person ID, site navigation, visitor sources, and winter layup links remain.
- Source page dateModified and primary sitemap lastmod advance together to 2026-11-08; do not manufacture freshness for other URLs.
- Additive CSS class scope fwd*, no modifications to central ad configuration, network loader, Redis/Supabase, or other products.
- JavaScript uses textContent for upstream ship names; map icon geometry is numeric and source-independent.
- Node tests prove positive decision, stale/offline rejection, generic no-ETA rule, candidate identity, time selection and canonical/no-JS fallback.
- Run npm run verify:all in a complete Git checkout, real 360/390/768/1440 browser acceptance, map/network failure, source response verification, deployment SHA and public smoke checks before declaring released.
- Measure engagement events and comparable GSC windows after release. No traffic or CTR gain may be claimed from code, CI or a preview alone.

## Outstanding beyond this build

- End-to-end vessel selection continuity across canonical specialist pages is not yet proven.
- Reuse verified photo assets by vessel identity only when source rights, correct identity and responsive crop are checked; never use a random boat photo for a real hull.
- The remaining corridors need independently researched route geometry and timed passage holdout data before gaining modeled windows.
- Local access, weather, daylight and parking will be an evidence-owned next phase, not a fabricated “go” verdict.
