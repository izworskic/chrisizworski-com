# Traverse City Winery Map Growth System

Updated: August 29, 2026

## Objective

Turn the existing Traverse City wine-country planner into the strongest search and decision product for **Traverse City winery map** intent, then grow adjacent intent only when Search Console and product behavior demonstrate real demand.

The operating target is aggressive: thousands of qualified daily impressions and hundreds of daily clicks are a north-star outcome, not a guaranteed forecast. The system is designed to earn that scale by improving search fit, CTR, useful map behavior, and topical/entity authority without manufacturing thin pages.

## Canonical search ownership

| Search family | Canonical owner |
| --- | --- |
| Traverse City winery map / wineries map | https://tcwine.chrisizworski.com/ |
| Old Mission Peninsula winery map | https://tcwine.chrisizworski.com/old-mission-peninsula-wineries |
| Leelanau Peninsula winery map | https://tcwine.chrisizworski.com/leelanau-peninsula-wine-trail |
| Old Mission vs Leelanau wineries | https://tcwine.chrisizworski.com/old-mission-vs-leelanau-wineries |
| Traverse City wineries with food | https://tcwine.chrisizworski.com/traverse-city-wineries-with-food |
| Traverse City wineries with views | https://tcwine.chrisizworski.com/best-traverse-city-wineries-with-views |
| Traverse City fall color winery map | https://tcwine.chrisizworski.com/fall-color-wine-tour |
| Traverse City tasting-room hours | https://tcwine.chrisizworski.com/venues |

Do not create city/town/venue landing pages merely to increase page count. A new indexable map state needs distinct query evidence and distinct utility.

## Product advantage

The map is the acquisition product, not a widget beneath an article.

The primary differentiation is:

1. 40 wineries mapped across Old Mission, Leelanau, and Traverse City.
2. Wine is the default layer.
3. Search landings open the relevant map state immediately.
4. Visitors choose their actual stops.
5. The planner orders stops on real roads.
6. The resulting day is checked against posted tasting-room hours and realistic dwell time.
7. Cider, beer, spirits, beaches, hikes, overlooks, and lighthouses remain optional layers.

The search promise is therefore **not just pins. Build the day.**

## Semantic truth

Winery counts must remain literal:

- Old Mission Peninsula: 11 wineries.
- Leelanau Peninsula: 27 wineries.
- Traverse City area outside those peninsula groups: 2 wineries.
- Total winery layer: 40.

Non-winery tasting venues remain useful optional layers but must not be counted as wineries in winery-map titles, H1s, snippets, or list counts.

## Photography

Regional photography supports trust and place recognition but never displaces the map as the useful first-screen product.

Current imagery is from Wikimedia Commons with visible source/license attribution:

- Old Mission Peninsula vineyard and Grand Traverse Bay, CC BY-SA 2.5.
- Leelanau vineyard, public domain.
- Chateau Chantal / Old Mission landscape, attribution license.

Rules:

- one strong regional image is normally enough per search landing;
- avoid stock imagery and generic wine-glass photography;
- alt text describes the actual photographed place;
- keep visible source/license attribution;
- preserve `max-image-preview:large`;
- do not use imagery to make unsupported venue claims.

## Chris Izworski entity strategy

Canonical Person entity: **https://chrisizworski.com/#person**

The wine property identifies Chris Izworski as author/creator and links to the canonical identity and Works surfaces.

Central governance treats `tcwine.chrisizworski.com` as a supporting controlled property on the existing chrisizworski.com root. It reinforces the branded entity but does not count as a separate controlled SERP-moat slot.

The primary branded homepage, canonical profile, /tools/, and other snapshot-governed Chris surfaces remain protected through their active measurement windows. Do not modify those surfaces simply to force wine authority. Existing public discovery plus machine-readable tool/name governance provide the additive connection during the protected period.

After the protected window closes, central discovery can be reconsidered based on measured search value rather than urgency.

## Measurement

Acquisition:
- Google Search Console impressions;
- clicks;
- CTR;
- average position;
- query family;
- landing page;
- branded vs non-branded.

Product:
- `wine_landing_viewed`;
- `wine_map_loaded`;
- `wine_filter_changed`;
- `wine_stop_toggled`;
- `wine_starter_loaded`;
- `wine_route_built`;
- `wine_plan_saved`;
- `wine_plan_removed`;
- `wine_plan_resumed`;
- `wine_plan_shared`;
- `wine_summary_copied`.

My Wine Day is the continuity layer beneath acquisition. It stores the latest and explicitly saved plans only in the browser, shares exact plans through a URL fragment, and rebuilds a restored plan against current routing and hours rather than treating old timing as permanently valid.

Continuity targets after a meaningful sample:
- >=8% route-build to save rate;
- >=5% route-build to exact-share rate;
- >=20% of resumed/shared plans rebuild into a usable route;
- no regression in map-load or route-build rates.

Events use fixed landing/filter/category/area/share-source values and bounded counts. They do not send free text, precise user location, selected venue IDs or names, exact plan hashes, trip dates/times, or personal identifiers.

## Authority breakthrough layer

The current ranking diagnosis is **BUILD AUTHORITY**, not "publish more pages."

Live SERP review on August 29 showed three durable classes of incumbent:
- official wine-trail organizations with institutional authority;
- Guided Wino, which surrounds its map pages with a broad wine-content graph;
- regional travel publishers with established domain authority and current Traverse City winery guides.

The owned product already has enough depth to compete on usefulness. The breakthrough mechanism is a publisher asset that can earn real referring domains and referral traffic.

Authority assets:
- `/for-publishers` — noindex publisher kit;
- `/embed/traverse-city-winery-map` — noindex embeddable map;
- current GeoJSON and CSV directory exports;
- recommended attribution: **Chris Izworski's Traverse City Winery Map** linking to the canonical planner.

The publisher surfaces must remain outside the sitemap and noindex. Their purpose is off-page authority acquisition, not additional search inventory.

The authority layer now also includes partner-specific embeds for Grand Traverse Resort, Cherry Tree Inn, and Traverse City Tourism plus winery-centered embeds for every current winery. These are noindex utility surfaces.

The existing Old Mission-vs.-Leelanau canonical page also contains an original coordinate-based "driving reality" analysis. It does not change the frozen title/H1/canonical treatment. The analysis provides a citeable finding: local nearest-neighbor spacing is almost identical on both peninsulas, while Leelanau's overall pairwise separation and geographic footprint are materially larger. A noindex JSON export supports journalists and publishers without creating another search owner.

Initial 30-day authority targets:
- 5 legitimate new referring domains;
- 2 live publisher embeds;
- 100 qualified referral sessions;
- 20 referral-origin route builds;
- at least 1 external citation that naturally co-occurs with Chris Izworski attribution.

Do not buy links, trade reciprocal links at scale, or submit to low-quality directories. The flywheel must be earned through utility.

### Directory truth vs. frozen search treatment

The production directory later expanded to **43 mapped winery/tasting-room locations**: 11 Old Mission, 30 Leelanau, and 2 Traverse City.

The original map-first search treatment was launched with the earlier 40-location count. Because its title/H1/meta count is inside the protected measurement window, treat the 40 figure as the **search-treatment baseline**, not the current directory total. Do not silently rewrite the frozen search treatment solely to chase freshness; reconcile the public count at the next approved search-treatment decision point or sooner only if it becomes a factual-risk issue.

## 28-day treatment

Start: 2026-08-29

Hold the following search-facing elements for 28 days unless a production failure or factual error requires a repair:

- canonical URL;
- title;
- H1;
- core meta description;
- winery count;
- primary schema identity;
- indexability.

During the window, UX bugs and data corrections may be fixed without changing the search hypothesis.

## Decision rules after the clean window

**PUSH CTR**
- page has >=500 impressions;
- average position <=12;
- CTR is <2.5%;
- query intent matches the page.

**BUILD AUTHORITY**
- page/query has >=300 impressions;
- average position is 12-30;
- CTR is not the primary constraint.

**EXPAND**
A new indexable map state requires all of:
- >=250 impressions in a coherent unsupported query family;
- >=5 clicks or strong near-page-one position;
- >=10 map loads attributable to the family or parent landing;
- >=3 route builds or another meaningful downstream action;
- no cannibalization of an existing canonical owner.

**UX_REPAIR**
- >=100 landing views;
- map-load or route-building behavior is materially weaker than comparable wine landings;
- search intent is otherwise qualified.

**PROTECT**
- page reaches page one with healthy CTR or is inside a clean measurement window.

**HOLD**
- insufficient evidence.

## What success looks like

The win is not page count. It is a repeatable funnel:

**query → compelling winery-map result → useful mapped answer → stop selection → routed day → save/share → return/resume → external citation/embed → stronger authority → more qualified discovery**

At scale, daily impressions and clicks should grow from multiple related map/decision queries while one clear canonical owner remains responsible for each family.
