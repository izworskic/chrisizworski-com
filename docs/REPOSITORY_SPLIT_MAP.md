# Repository Split Map

Status: migration contract. Public URLs must remain stable during the split.

## Goal

Reduce agent navigation cost and blast radius by making each national decision engine and Isle Royale independently owned, tested, and deployable.

## Destination repositories

| Repository | Owns | Source of truth during migration |
| --- | --- | --- |
| `izworskic/isle-royale-outdoors` | Isle Royale guide/map, data layers, water intelligence, route/weather APIs, Isle Royale tests/benchmarks | PR #264 head `fix/isle-royale-guide-layers` |
| `izworskic/national-aurora` | National aurora UI/API/tests | `main` |
| `izworskic/national-rivers` | Rivers UI, river context API, USGS site index generator/data, tests | `main` |
| `izworskic/national-frost` | Frost UI/API/tests | `main` |
| `izworskic/national-planting` | Planting calendar UI/engine/crop data/tests | PR #268 head `agent/national-garden-expert-logic-20260902` |
| `izworskic/national-fall-color` | Fall color UI, USA-NPN observations API, tests | `main` |
| `izworskic/national-coastal-water` | Coastal Water Window UI/API/tests | `main` |
| `izworskic/national-snowpack-melt` | Snowpack & Melt UI/API/tests | `main` |
| `izworskic/national-white-christmas` | White Christmas UI/API/tests; consumes snow intelligence through an explicit package/API contract | PR #272 head `agent/white-christmas-confidence-resilience-20260902` |
| `izworskic/national-outdoor-tools-hub` | National tools landing page plus fall/garden/water/night-sky hubs and cross-tool navigation only | `main` |
| `izworskic/national-outdoor-core` | Shared location/geocode contract, freshness/source helpers, shared CSS/client shell only | `main` |

## Public URL rule

Do not change canonical public URLs merely because code ownership changes.

Examples that must stay stable:
- `/national-tools/aurora/`
- `/national-tools/rivers/`
- `/national-tools/frost/`
- `/national-tools/planting/`
- `/national-tools/fall-color/`
- `/national-tools/coastal/`
- `/national-tools/snow/`
- `/national-tools/white-christmas/`
- `/isle-royale-map/`

Use Vercel/edge rewrites or equivalent composition so repository boundaries are invisible to search engines and users.

## Ownership rules

1. One decision engine per repository.
2. Tool-specific APIs, UI, tests, benchmarks, docs and data move together.
3. Shared code may live in `national-outdoor-core` only if at least two tool repos consume the same stable contract.
4. No tool repo may import source files directly from another tool repo.
5. White Christmas must consume Snowpack/Melt through a versioned contract rather than `require("./national-snow")`.
6. Tool hub repo owns navigation and discovery, not decision logic.
7. The main `chrisizworski-com` repo becomes the site shell/portfolio/router and must not regain national tool implementation code after migration.

## Immediate source boundaries

### Isle Royale
- `.github/workflows/isle-royale-*.yml`
- `api/isle-royale*.js`
- `benchmarks/isle-royale-map.json`
- `docs/isle-royale-*.md`
- `lib/isle-royale/**`
- `public/assets/isle-royale-*.js`
- `public/isle-royale-map/**`
- `scripts/*isle-royale*`
- `tests/isle-royale-*.test.js`

### National shared core
- `api/national-geocode.js`
- `lib/national-outdoor.js`
- shared national CSS/client shell only after dependency review

### Aurora
- `api/national-aurora.js`
- `public/national-tools/aurora/**`
- aurora-specific shared library functions/tests required by this endpoint

### Rivers
- `api/national-rivers.js`
- `api/national-river-context.js`
- `public/national-tools/rivers/**`
- `public/data/national-usgs-streamflow-sites.json`
- `scripts/generate-national-usgs-streamflow-index.mjs`
- `tests/national-rivers.test.js`

### Frost
- `api/national-frost.js`
- `public/national-tools/frost/**`
- `tests/national-frost.test.js`

### Planting
- `public/assets/national-planting-engine.js`
- `public/data/national-planting-crops.json`
- `public/national-tools/planting/**`
- planting benchmark/docs/tests from PR #268

### Fall Color
- `api/national-fall-color.js`
- `api/national-fall-observations.js`
- `public/national-tools/fall-color/**`
- `tests/national-fall-observations.test.js`
- tool-specific benchmark coverage

### Coastal Water
- `api/national-coastal.js`
- `public/national-tools/coastal/**`
- `tests/national-coastal.test.js`

### Snowpack & Melt
- `api/national-snow.js`
- `public/national-tools/snow/**`
- `tests/national-snow.test.js`

### White Christmas
- `api/national-white-christmas.js`
- `public/national-tools/white-christmas/**`
- White Christmas tests/benchmark/docs from PR #272
- replace the direct Snow module import with a stable contract during extraction

### Hub
- `public/national-tools/index.html`
- `public/national-tools/fall/**`
- `public/national-tools/garden/**`
- `public/national-tools/water/**`
- `public/national-tools/night-sky/**`
- `public/assets/national-dashboard.js`
- `public/assets/national-hubs.js`
- national hub benchmark/tests

## Migration order

1. Create destination repos.
2. Seed `national-outdoor-core`.
3. Extract Snowpack/Melt, then White Christmas and break their direct source import.
4. Extract Rivers, Aurora, Frost, Fall Color, Coastal, Planting.
5. Extract Isle Royale from PR #264.
6. Extract National Tools hub.
7. Deploy each repo independently.
8. Add stable-path routing from `chrisizworski-com`.
9. Run production smoke and canonical/SEO checks.
10. Remove migrated implementation files from `chrisizworski-com` only after routed production verifies green.

## Hard vetoes

- No canonical URL changes solely for repo organization.
- No deletion from the monolith before destination deployment verifies.
- No duplicate writable source of truth after cutover.
- No shared grab-bag repo that becomes a second monolith.
