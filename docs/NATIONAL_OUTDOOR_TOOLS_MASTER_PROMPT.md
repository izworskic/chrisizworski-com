# National Outdoor Tools — Master Build Prompt and Loss Function

Updated: August 31, 2026 (America/Detroit)

## Mission

Build a separate national outdoor decision-tool network at `/national-tools/` on ChrisIzworski.com without weakening, cloning, renaming, restructuring, or cannibalizing the existing Michigan & Great Lakes tools.

The product is not “a collection of widgets.” It is a shared national decision engine:

**Where are you? → What is happening there? → What decision are you trying to make?**

Phase 1 consists of four product families:
1. Frost & Planting Planner
2. River Conditions
3. Aurora Tonight / Northern Lights Forecast
4. Fall Color Tracker / Fall Foliage Map

The Michigan ecosystem remains the deeper local authority. National pages should route Michigan-specific intent toward the established Michigan tools when those are already the better canonical answer.

## Build doctrine

Act simultaneously as a product architect, data engineer, reliability engineer, search strategist, accessibility engineer, and skeptical end user.

Do not optimize for page count. Optimize for useful decisions, source truth, repeat use, qualified search impressions, CTR, and durable authority.

Every product answer must distinguish:
- official observation;
- official forecast;
- historical climatology;
- derived estimate;
- recommendation.

Never collapse those categories into one number that appears more certain than its inputs.

## Hard vetoes

Any one of these is a release blocker:

1. A national page duplicates or competes with an established Michigan canonical without materially different intent.
2. A live value is shown without source time/freshness, or stale data are silently presented as current.
3. A derived estimate is represented as an official NOAA, NWS, USGS, USDA, EPA, NASA, USFS, or other agency forecast.
4. A river score or badge claims that paddling, swimming, wading, fishing, or boating is “safe.”
5. Kp alone is represented as a local aurora-visibility probability.
6. USDA Plant Hardiness Zone is represented as a local spring planting date or last-frost date.
7. Fall foliage is expressed with fake precision unsupported by observations/model confidence.
8. Thin city/ZIP/date/crop pages are mass-created merely to increase index count.
9. An external feed is called on every page view when it can be centrally cached or precomputed.
10. A page omits canonical authorship/entity linkage to `https://chrisizworski.com/#person`, a truthful source/method section, or crawlable core explanatory content.
11. Titles/meta descriptions violate the repository guardrails.
12. Existing active search experiments are changed to accommodate the national build.
13. Missing upstream data are converted into a neutral/default score instead of “unknown/unavailable.”
14. A source/license/attribution requirement is ignored.
15. A failure mode creates confident-looking but unsupported output.

## Loss function

Minimize the following weighted loss. Lower is better; a hard veto above overrides the numeric score.

| Loss component | Weight | Zero-loss condition |
| --- | ---: | --- |
| Factual & data integrity | 25 | Every output is traceable to the right source class and uncertainty is explicit |
| Michigan cannibalization & experiment protection | 20 | Existing Michigan canonicals and frozen treatments remain intact |
| Decision usefulness | 15 | The first screen answers a real user decision, not just displays raw data |
| Freshness & failure transparency | 10 | Source timestamps, stale states, degraded states, and unknowns are visible |
| Source / licensing integrity | 10 | Official sources are preferred, attributed, and used within terms |
| Search distinct-value quality | 10 | Every indexable URL has unique utility and satisfies a distinct intent |
| Performance & accessibility | 5 | Mobile-first, keyboard usable, resilient, and fast |
| Shared-platform maintainability | 5 | Location/data/scoring logic is reused instead of copied |

### Scoring interpretation

- **0–10 loss:** release-quality
- **11–20 loss:** acceptable beta only if no hard vetoes and limitations are explicit
- **21–35 loss:** do not index; continue building
- **>35 loss:** redesign

When feature breadth conflicts with truth, ship less. A smaller truthful tool has lower loss than a larger misleading one.

## Shared national platform

Create common primitives instead of four isolated applications.

### Location object

A city/ZIP lookup should resolve to:
- display name;
- latitude/longitude;
- city/place;
- state/state code;
- postal code when available;
- timezone when available;
- elevation when available;
- attribution.

Do not require precise browser location. Manual city/ZIP is the default; geolocation may be optional later.

### Data contract

Every live/derived response should expose, where applicable:
- `source_name`
- `source_url`
- `source_updated_at`
- `retrieved_at`
- `age_minutes`
- `stale_after`
- `source_status`
- `confidence`
- `method`
- `degraded`

### Caching

- Historical climatology: precompute and store.
- Government live feeds: cache centrally.
- Location geocoding: cache aggressively.
- Never have thousands of browser clients independently hammer a government endpoint.
- Preserve last-known-good data only when clearly marked stale.

## Product contracts

### 1. Frost & Planting Planner

Primary sources:
- NOAA/NCEI 1991–2020 U.S. Climate Normals and freeze-probability products
- NWS forecast/API for current cold risk
- USDA Plant Hardiness Zone as perennial-survival context only
- Curated Cooperative Extension crop biology/timing rules

Must answer:
- What is my historical spring freeze risk?
- What is my historical first-fall-freeze risk?
- Is a freeze currently forecast?
- When should I start/transplant/direct-sow this crop?
- Why can the recommendation differ from an “average last frost date”?

Separate climatology from the current forecast in both data and UI.

Use probability language such as:
“Historically, only 10% of years recorded a 32°F freeze this late or later.”

Do not say:
“Frost is over after this date.”

The integrated application may power two search-intent entry points:
- `/national-tools/frost/`
- `/national-tools/planting/`

Do not create indexable ZIP × crop × date combinations.

### 2. River Conditions

Primary sources:
- USGS Water Data APIs / Water Services for current and historical observations
- NOAA National Water Prediction Service for official forecasts/flood context where available
- National Water Model only when explicitly labeled model guidance

Must answer:
- What river/gauge is near me?
- What is the current flow/level?
- Is it rising or falling?
- How fresh is the reading?
- How unusual is it for this time of year when historical statistics are available?
- Is there an official flood category/forecast where supported?

Never infer recreational safety from gauge values.

### 3. Aurora Tonight

Primary sources:
- NOAA SWPC OVATION 30–90 minute nowcast
- NOAA SWPC Kp/current space-weather products
- NWS local cloud forecast
- darkness/sun timing
- moon context when useful

Must answer the human question:
“Can I see the northern lights from here tonight?”

The answer must decompose:
- aurora signal;
- cloud obstruction;
- darkness;
- best window;
- confidence.

Kp is context, not the answer.

### 4. Fall Color Tracker

Primary sources:
- USDA Forest Service observations/reports where available
- defensible satellite/remote-sensing inputs when implemented
- weather/elevation/historical timing only as documented model features

This tool has a higher uncertainty floor than the other three.

Do not manufacture a nationwide “percent peak” API.

If the model is not calibrated well enough:
- label the surface beta;
- show source age and confidence;
- prefer broad stages/ranges over false percentages;
- withhold or noindex location families that do not pass the distinct-value/truth gate.

A truthful “estimate, medium confidence” is preferable to a precise unsupported claim.

## Search and URL architecture

Visible section name:
**U.S. Outdoor Tools**

Hub:
`https://chrisizworski.com/national-tools/`

Phase 1:
- `/national-tools/frost/`
- `/national-tools/planting/`
- `/national-tools/rivers/`
- `/national-tools/aurora/`
- `/national-tools/fall-color/`

Use query language in titles/H1s:
- First & Last Frost Dates / Freeze Risk
- Planting Calendar / When to Plant
- River Level, Flow & Forecast
- Northern Lights Forecast Tonight
- Fall Foliage Map / Peak Color

The permanent URL must not include the year.

Do not create an indexable location page until it passes all of:
1. distinct decision;
2. search/evidence basis;
3. materially unique local data;
4. cannibalization safety;
5. two-way network fit;
6. valid canonical/discovery;
7. stated measurement target.

Michigan handling:
- frost → established Michigan frost pages
- planting → established Michigan planting pages
- aurora → established Northern Lights Michigan tool
- fall color → established Michigan Fall Color tool
- river/fishing intent → established Michigan river/fishing properties where they are the better match

Do not automatically delete national functionality for Michigan users; provide the deeper local handoff clearly.

## First-screen UX

The first interaction should be consistent:

**Enter city or ZIP**

Then return a concise decision card before secondary data.

Avoid:
- giant hero areas;
- tool-card walls before the user gets an answer;
- jargon-led labels;
- requiring an account;
- asking for precise location permission before manual entry;
- hiding the useful result below explanatory prose.

Every result card should provide:
1. plain-English answer;
2. the 2–4 strongest reasons;
3. updated/source context;
4. “why this answer?” disclosure;
5. next useful action.

## SEO / AI-search rules

Every indexable page must:
- render a useful crawlable answer/context without JavaScript;
- have one canonical URL;
- have one clear H1;
- define the Chris Izworski Person node with `@id=https://chrisizworski.com/#person`;
- use a query-aligned title <=60 rendered characters;
- use a useful meta description <=158 rendered characters;
- include source/methodology text;
- use truthful structured data;
- be reachable through crawlable internal links;
- carry truthful `dateModified` and sitemap `lastmod`.

Do not use generated explanatory filler to make pages “look unique.”

## Phase order

Because the current date is August 31, 2026:

1. Shared national location/data shell
2. Aurora Tonight — operational live data and immediate event demand
3. Fall Color — transparent 2026 beta/calibration surface
4. River Conditions — evergreen USGS/NWPS foundation
5. Frost & Planting — build the climatology/crop model thoroughly for late-winter/spring demand
6. Smoke & Air Quality — next product after Phase 1, using EPA AirNow + NASA FIRMS + NIFC

Phase order does not alter long-term priority:
Frost/Planting and Rivers are the strongest durable SEO/data assets; Aurora is the fastest acquisition/alert asset; Fall Color is the travel/seasonal asset.

## Release gate

Before a PR:
1. Run `npm run verify:all`.
2. Run the national-tools-specific benchmark.
3. Confirm existing protected Michigan pages were not modified.
4. Confirm each external-data endpoint fails explicitly when upstream data fail.
5. Confirm no indexable location-page explosion occurred.
6. Confirm all new sitemap pages have matching `dateModified`.
7. Confirm titles/descriptions pass repo limits.
8. Confirm API endpoints carry `X-Robots-Tag: noindex, nofollow`.
9. Confirm source attribution and disclaimers.
10. Record what is indexable now vs intentionally beta/noindex.

## Success function

The build succeeds when it produces fewer user decisions requiring interpretation of scattered government pages, while increasing qualified national discovery without weakening Michigan authority.

Optimize for:
- useful answer rate;
- repeat/direct use;
- qualified organic impressions;
- CTR at comparable rank;
- alert conversion later;
- source uptime and freshness;
- backlinks/embeds later;
- revenue only after trust/usefulness.

Do not optimize for:
- raw URL count;
- vanity “live” labels;
- exact-looking scores;
- keyword repetition;
- unsupported certainty;
- replacing Michigan tools that already work.

## Final instruction to future agents

Read this document together with `AGENTS.md`, `docs/SEARCH_STRATEGY.md`, `docs/SEARCH_AUTHORITY_PORTFOLIO.md`, the current experiment ledger, tool-network registry, and search-authority portfolio before changing a national-tool search surface.

When uncertain, choose the implementation with the lower loss even if it launches with fewer features.


## Phase 3 platform interpretation

The first five tools now share a common user journey. Future work must preserve these rules:

1. The national hub is a decision surface, not a card directory. One chosen place should load the available tool contracts independently and show the most decision-relevant signals first.
2. Display priority is not a safety score. Flood/freeze/time-sensitive signals may sort ahead of routine context, but the system must never imply a universal safe/unsafe outdoor judgment.
3. One upstream failure must not blank the whole platform. Degraded state belongs to the affected card/tool.
4. Location is user state, not an SEO excuse. Carry city/ZIP context across tools with query/local-device state while keeping canonical tool URLs unchanged.
5. Saved places are not alerts. Do not use alert/notify language until a real future-delivery channel exists.
6. Render decision times in the searched place's timezone whenever that context is available.
7. Maps are supporting spatial context. Core decisions and source truth must remain usable if the basemap fails.
8. No national location page becomes indexable until it passes `benchmarks/national-location-admission.json`, including the hard vetoes and minimum score.
9. Do not add a new national product family merely to increase breadth while these five still have material decision, reliability, or network gaps.
