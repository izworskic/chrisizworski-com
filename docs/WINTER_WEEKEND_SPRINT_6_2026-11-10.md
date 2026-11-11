# Sprint 6 — A Michigan winter weekend worth the trip

November 10, 2026. Change owner: `izworskic/chrisizworski-com`, canonical `/michigan-winter-weekends/`.

## What shipped

- A compact, accessible weekend decision desk above the existing four experience doors. A person chooses outdoor interest, peninsula, and next weekend vs general winter. They may enter a starting Michigan town or ZIP.
- The selector ranks **only** the 12 already-published 2-day base towns using a small, explicit editorial suitability map plus the existing town `data-region` and `data-window` metadata. It shows up to three options, each with the original published Saturday outing, a bad-weather alternative, the access caution, and a link to the full guide card. No invented destinations, snowfall totals, probabilities or claimed live opening reports.
- Destination reference and park/agency links come from the existing published card source or a linked agency page. `/michigan-snow-depth/`, `/michigan-cross-country-skiing/`, `/michigan-ski-hills/` and the shipping tools remain the respective specialist owners. On snowy interests, a user-supplied origin can be passed to the existing snow-depth tool for its *own* analysis and editable drive-time setting; the guide never computes travel time.
- Good no-JavaScript experience: the full twelve-card guide, photos, Saturday/Sunday plans, map fallback, plus three static entry links remain readable.
- A failed or missing condition is never turned into a green 'go' signal. June weekends have no winter-activity picks. NPS winter-road rules prominently linked.

## Access and source review

Official NPS winter roads: https://www.nps.gov/piro/planyourvisit/winter-road-closures.htm
Official NPS winter activities: https://www.nps.gov/piro/planyourvisit/winteractivities.htm
MiDrive / road caution: https://www.michigan.gov/msp/services/safetytips/travel-information-for-motorists

Pictured Rocks plows Sand Point Road only; other park roads and stretches of H-58 have vehicle restrictions in winter. The tool does **not** output trailhead turn-by-turn directions or claim that a summer drive route is passable. Manager status, Nordic grooming, resort operating hours and public lot plowing require confirmation on an official operator source immediately before departure. A park's general destination coordinate is **not** a winter parking validation.

The 50-route `winter-hike-snowshoe-lab` stays research-only/noindex. This sprint does not activate its unverified trailhead decisions or the intentionally retired `michigan-snowshoe-conditions` route.

## Release gates / growth

Protect the canonical URL, schema entity count (12), the four visual doors and blueprint lessons, map/photos, sitemap, site-wide ads, and other tools. Run `node --test tests/winter-weekend-sprint6.test.js`, `npm run verify:all`, emitted-page audit, browser QA, and a production SHA check.

The metric is qualified clicks and useful visitor handoffs, not assumed monetization. Compare post-release complete 7-day and 28-day GSC cohorts with season/event context, and use verified page-specific earnings only if such a source exists.

### Route handoffs

The quick cards reuse each existing Google Maps **base-town search** link and label it explicitly *not winter parking*. For Pictured Rocks alone, NPS publishes the Munising Falls Visitor Center routing address at **1505 Sand Point Road, Munising, MI 49862** (https://www.nps.gov/piro/planyourvisit/directions.htm). A separate map link on Munising's quick card routes to that published point but is labeled as an NPS address needing confirmation, **not** the nearby Sand Point Beach lot or the Munising Snowshoe Trail lot. No other destination is assigned an unverified winter trailhead point.
