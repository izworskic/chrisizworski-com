# ShoreFeel at the beach: first regional rollout and five-lake architecture

**Implementation:** new source-controlled interpretive layer on all 50 existing Michigan beach detail pages, plus a revised Saginaw Bay ShoreFeel pilot. This is **not** yet every public beach on all five Great Lakes.

## Visitor intent and design-investment choice

Question: "What will it feel like when I step onto the beach?" The first answer distinguishes modeled air comfort from nearby open-water observations; the next thing a visitor can do is read the wind and verify official safety notices. A beach is a place, not just a temperature record.

Two viable compositions were reviewed:

1. Stand-alone ShoreFeel cards and a duplicate map for hundreds of shoreline destinations. Rejected at this stage: repeats the Beach Report's canonicals and visitor map, doubles SEO intents and maintenance, and would disguise missing sources outside Michigan.
2. **Interpretive field note within each existing beach page**, linked from the current beach hero, with one modeled air-comfort answer, forecast wind, grounded local beach setting and separate offshore water provenance. Selected. It retains the existing safety decision first, adds a distinct beach-air question, and avoids a second card dashboard.

The Saginaw Bay flagship keeps its purpose-built evidence map, beach-feel verdict and science detail; the 50 beach reports inherit only the source-proven, generalizable layer. The 50 note pages are generated from the authoritative `scripts/generate-beach-pages.mjs`, not maintained as independent new tools.

## Science and official-source register

- NWS lake-breeze primer: https://www.weather.gov/apx/lake_breeze . Air moving over colder water can moderate shoreline heat; direction and timing matter. Our generic beach network does **not** infer onshore wind without a verified offshore bearing and local observation.
- NOAA GLSEA: https://coastwatch.glerl.noaa.gov/satellite-data-products/great-lakes-surface-environmental-analysis-glsea/ . Covers all five lakes with satellite-assisted surface analysis, **not** air at the sand or a swimming-area water thermometer. The flagship's NOAA coastal water evidence remains separate.
- NOAA buoy observations: https://www.ndbc.noaa.gov/ . Buoy records belong to a particular station and time. Existing Michigan Beach Report station-distance and freshness rules stay unchanged.
- Existing Beach Report weather feed: https://open-meteo.com/en/docs . Open-Meteo current modeled `temperature_2m`, `apparent_temperature` and 10-m wind, already retrieved for the 50 Michigan beaches. These numbers are a **model forecast at the approximate beach coordinate**, not NWS observations or real measurements at the sand. The new `valid_at_utc` comes from the source's local clock and `utc_offset_seconds`, then undergoes a two-hour validity gate.
- Swim risk: https://www.weather.gov/greatlakes/beachhazards ; Michigan water quality: https://mienviro.michigan.gov/nsite/beach/map/results . These independently control the Beach Report's safety interpretation. ShoreFeel does not override them.

### What the displayed air number means

The feature selects the Open-Meteo apparent air temperature when valid; otherwise the modeled 2-m air temperature. No adjustment uses the buoy's water temperature. Wind and independently identified offshore water inform descriptive exposure text only, never an unsupported numeric beach-air correction. A stale or missing location forecast produces an explicit unavailable state. A missing buoy report does not become zero, a Lake Huron-wide average, or a beach-water reading. The label "At the beach" names the visitor question, **not** the provenance of a thermometer.

## Coverage and honest expansion

The currently published catalog contains **50 Michigan destinations**:

| Lake | Existing beach pages with new ShoreFeel note |
| --- | ---: |
| Michigan | 23 |
| Huron | 14 |
| Superior | 11 |
| Erie | 2 |
| Ontario | 0 |

Five-lake support is explicit in `lib/shorefeel/beach-network.js`, but eligibility for display also requires a *verified* location forecast. Lake Ontario has not yet been onboarded; neither have most US beaches outside Michigan or Canadian shorelines. No pages are invented for beaches without park access, water-quality coverage and source attribution.

**Phase 2, US expansion:** Build independently verified destination catalogs in Wisconsin, Illinois, Indiana (Lake Michigan); Minnesota/Wisconsin (Superior); Ohio/Pennsylvania/New York (Erie); and New York (Ontario). Identify official park, public access, management authority, latitude/longitude, weather provider, local NWS beach risk coverage, and independent local health-department swimming notices. The Michigan EGLE BeachGuard API applies only to Michigan; never report it as Ohio/NY/etc water-quality authority.

**Phase 3, Canadian expansion:** Great Lakes Ontario beaches need Environment and Climate Change Canada weather context, provincial/municipal beach quality sources and correct Canadian regional notice language; no US NWS/Michigan alert metadata may be represented as Canadian coverage. A weather provider location forecast by itself is not a current beach-safety product.

**Phase 4, actual beach-microclimate accuracy:** Geographically verified nearshore water pixels, local shore aspect/wind measurements and independent instrumented on-sand/inland air observations, validated through event-blocked holdouts. Before then: do not promote old NOAA HRRR/URMA selected land-grid differences to beach temperatures or percentage confidence. The real three-season archive data is saved at `research/shorefeel/noaa/`.

## Experience QA / technology fit

- HTML and scoped CSS: selected for indexed interpretation, concise jump link, semantic first answer and disclosure; no new splash image, map tiles, framework or template-wide CSS migration.
- Browser JavaScript: selected for source-dependent fields and fallback, using `textContent`, no new external request.
- Existing Node API: selected to reuse the 50-beach catalog and strict forecast validity rather than reproduce logic in the browser.
- Python: existing NOAA research-only offline analysis is retained; no runtime numerical model until measured field validation exists.
- Rust and Java: rejected, no measured bottleneck or scientific evidence advantage. No Redis, cron, new Vercel function or paid service.

Compared with the existing all-five-lakes water-temperature desk and Michigan Beach Report: this is a compact interpretive weather field note *inside* an existing destination and an action from its hero, not another big water-number dashboard or a sortable risk score. A broad locator map would be a duplicate and is intentionally not added.

### Required verification and rollback

- All 50 pages: canonical/Person attribution, original BeachGuard/NWS actions, skip links, weather and source-error behavior preserved; no duplicate canonical.
- Saginaw Bay: copy names the experience "At the beach", while detailed source disclosure states the NWS land forecast is not sand thermometer data.
- Unit tests: DST/UTC offset, stale and future weather, missing offshore reports, windy/calm response and full catalog presence.
- Full repo gate, actual browser at 360/390/768/1280/1440, and loaded-source failure states required before declaring visitor UI verified. CSS markup or static tests do not prove a live-browser pass.
- Rollback: revert the PR; no permanent paid service, data migration, key or new route.

**Source checks:** 2026-11-21. NOAA Great Lakes GLSEA and NWS lake breeze official materials reviewed. Design originality is constrained to the actual beach-visit decision; no traffic or CTR uplift asserted.
