# Niagara Border Crossing Phase 2 — Research + Build Prompt

Status: **executed on `feat/niagara-approach-experience-layer`**

## Mission

Turn the Niagara Border Crossing Decision Desk from a technically correct wait comparison into a traveler-facing decision product that answers, in order:

1. **ANSWER** — Which bridge should I use now?
2. **PROOF** — What authoritative evidence caused that answer?
3. **EXPERIENCE** — What does that bridge choice mean on the ground?
4. **UNDERSTANDING** — Why does geography, eligibility and the route-switch guardrail matter?
5. **EXPLORATION** — Where can I inspect the official systems myself?

Do not replace the deterministic engine with prose, an LLM judgment, a blended score or an invented travel-time estimate.

## Product question

> Given my direction, traveler/vehicle type and the bridge naturally on my route, should I stay on that bridge or switch — and what should I understand before I commit?

## Existing authority hierarchy — preserve it

- **CBP**: primary structured authority for U.S.-bound border-processing waits.
- **CBSA**: primary structured authority for Canada-bound waits where published.
- **NFBC**: primary operator authority for Rainbow, Whirlpool Rapids and Lewiston–Queenston operations and published traffic context.
- **Buffalo and Fort Erie Public Bridge Authority**: primary operator authority for Peace Bridge operations.
- **NWS / Environment and Climate Change Canada**: weather context; never silently overrides bridge-owner restrictions.
- **511 New York / Ontario 511**: official approach incident/camera context when developer APIs are configured.
- **NITTEC**: official traveler-information and camera link surface; do not republish scraped page content without a separate permission basis.

## Research findings that govern the build

### 511 New York

Official developer API:

- requires a developer key;
- throttles requests;
- exposes events and cameras among other resources;
- current documented event endpoint: `https://511ny.org/api/getevents`;
- current documented camera endpoint: `https://511ny.org/api/getcameras`.

The production product must use the developer API when a key exists. It must not simulate a feed when a key is absent.

### Ontario 511

Official developer API:

- requires a developer key;
- exposes events, construction, cameras, road conditions and other traveler data;
- event endpoint: `https://511on.ca/api/v2/get/event`;
- camera endpoint: `https://511on.ca/api/v2/get/cameras`.

Ontario 511 developer data is governed by its current developer access agreement and licensing terms.

### NITTEC

NITTEC publishes useful current traveler information and bridge-area camera pages, but its Terms of Service restrict copying/publication/transmission of site content outside what is expressly permitted. Therefore:

- **do not build a production HTML scraper of NITTEC travel-time tables**;
- keep NITTEC as an official outbound evidence/camera surface;
- use exact operator-published camera deep links where available;
- revisit direct data integration only if a licensed or expressly permitted feed is obtained.

### Exact operator camera links confirmed by NFBC

- Rainbow Bridge: `https://www.nittec.org/cameras/index.html?cid=1011`
- Lewiston–Queenston Bridge: `https://www.nittec.org/cameras/index.html?cid=1021`
- Queenston Plaza: `https://www.nittec.org/cameras/index.html?cid=1022`

Peace Bridge uses the Public Bridge Authority's official webcam surface.

### Whirlpool confidence rule

NFBC states that real-time wait technology is not currently available at Whirlpool and that its values are updated hourly. Preserve `context_only`; never compare Whirlpool's operator value as equal-confidence live evidence to a current measured wait.

## Human interpretation architecture

The human layer is **downstream** of the decision.

It may:

- explain which eligibility rule mattered;
- show the preferred and recommended waits;
- explain the conservative route-switch guardrail;
- state the engine's calculated comparison advantage when the engine already returned one;
- translate crossing role, geography and published restrictions into normal traveler language;
- surface official approach incidents/cameras separately;
- explain uncertainty.

It may **not**:

- create a different recommended bridge;
- hide an ineligible or closed state;
- promote stale/context-only evidence;
- convert a nearby incident into a precise delay;
- call the route-switch guardrail a live drive-time estimate;
- manufacture a timing forecast from historical volume or generic traffic patterns.

## Crossing experience layer

### Peace Bridge

Interpret as the southern Buffalo–Fort Erie full-service crossing. It supports commercial vehicles and pedestrian/bicycle travel. Switching north toward Falls-area bridges is a meaningful route change, so small wait differences should not trigger diversion.

### Rainbow Bridge

Interpret as the general Falls-district crossing. It is natural for Niagara Falls visitor traffic and allows pedestrians/bicycles but not commercial trucks.

### Whirlpool Rapids Bridge

Interpret as a trusted-traveler specialist crossing, not a generic alternate. NEXUS eligibility and operating hours are primary facts. Operator wait remains lower-confidence context.

### Lewiston–Queenston Bridge

Interpret as the northern highway-oriented crossing. It supports commercial traffic and bicycles but not pedestrians. A diversion from the Falls corridor must clear a meaningful route-switch guardrail.

## Approach-data architecture

Create a separate endpoint:

`/api/niagara-approach-context`

Why separate it:

- the bridge-decision endpoint varies by traveler inputs and refreshes frequently;
- 511 APIs are key-gated and throttled;
- approach evidence is supplemental in this phase;
- keeping it separate prevents a failure or throttle from degrading the core crossing decision.

Environment variables:

- `NY511_API_KEY`
- `ONTARIO511_API_KEY`

Requirements:

- no call when the corresponding key is absent;
- cache the approach endpoint more aggressively than the decision endpoint;
- filter the statewide/province-wide feeds to a defined Buffalo–Niagara–Fort Erie corridor;
- return normalized event and camera objects;
- label the entire response `decision_role: context_only`;
- no API key may appear in a response, log message, DOM or analytics event.

## UI build

### Layer 1 — Answer

Keep the existing decision card first-screen useful:

- direction;
- traveler type;
- natural bridge;
- recommendation state;
- wait/status cards;
- freshness.

### Layer 2 — Proof

Immediately below the answer, explain the deterministic evidence:

- preferred crossing wait/state;
- recommended crossing wait/state;
- alternate's route-switch guardrail;
- returned net comparison advantage where applicable;
- why uncertainty blocked a switch where applicable.

### Layer 3 — Experience

Show the role of the selected/recommended bridge in normal language:

- what kind of crossing it is;
- which trips it naturally serves;
- what switching here means geographically;
- the most important traveler-specific operational fact.

### Layer 4 — Understanding

Show:

- north-to-south schematic geography;
- natural bridge highlight;
- recommended bridge highlight;
- static eligibility matrix;
- source roles and limitations.

### Layer 5 — Exploration

Provide direct official links:

- CBP;
- CBSA;
- NFBC;
- Peace Bridge Authority;
- 511 New York;
- Ontario 511;
- NITTEC;
- exact crossing camera links where published.

## Hard safety / truthfulness rules

- Static restrictions survive every live-source failure.
- A stale source never erases a restriction.
- Missing live evidence at a usable natural crossing never becomes a confident diversion.
- Nearby 511 incidents are **not** exact-route incidents unless a separately validated route association earns that claim.
- A count of zero filtered incidents is not rendered as "roads are clear."
- Approach data does not participate in `compareNiagaraCrossings` in this phase.
- NITTEC HTML is not scraped into the production product.
- Do not weaken existing Niagara tests or repository gates.

## Regression harness

Add tests that prove:

1. statewide 511 items outside the Niagara corridor are filtered out;
2. 511 normalization does not invent travel-time or delay fields;
3. full closures remain explicit;
4. camera items outside the corridor are excluded;
5. the approach response is always `context_only`;
6. all four bridges have experience metadata and official proof links;
7. exact NFBC camera links stay pinned;
8. page structure follows Answer → Proof/Experience → Understanding → Exploration;
9. interpretation runs after the deterministic decision;
10. approach code remains isolated from the decision endpoint;
11. production code does not scrape NITTEC;
12. UI copy refuses to convert approach context into an exact route claim.

## Loss function

The build is worse if any of the following increase:

- false confidence;
- false diversion;
- restriction loss;
- source-role ambiguity;
- stale evidence presented as current;
- generic tourism copy before the live answer;
- duplicated or contradictory bridge facts;
- invented route precision;
- mobile cognitive load;
- dependency on brittle scraped HTML.

The build is better when it increases:

- time-to-answer;
- trust in why the answer was made;
- traveler understanding of the physical choice;
- useful official evidence immediately after the answer;
- graceful degradation;
- repeat-use value;
- mobile scanability;
- source provenance.

## Acceptance gate

Do not merge unless:

- targeted Niagara tests pass;
- all existing Niagara tests pass;
- repository verification gate passes;
- Vercel build succeeds;
- preview page renders on mobile and desktop;
- browser console has no new errors;
- the core crossing endpoint remains operational with no 511 keys;
- the approach endpoint fails soft with no 511 keys;
- if keys are present, no key is exposed client-side;
- Whirlpool remains context-only;
- Rainbow remains unavailable to commercial trucks;
- stale/unavailable live waits never erase static eligibility;
- no exact route-time claim appears from incident/camera context.
