# November 9, 2026 — Freighter Growth Engine, sprint 3

## Mission

Strengthen established shipping destinations and qualified visitor decisions, not create another AIS dashboard or revive the retired Freighter Watch Desk. The existing Nov 9 shipping growth push already linked some pages, so this release only addresses remaining gaps. Main-site shipping pages own these source changes. The Great Lakes tracker and separate vessel data providers are not changed.

## Evidence and limitations

Source: user's private **ChrisIzworski.com Growth Command Center**, copied from the Nov 9, 2026 Google Search Console Web export. Page and query totals cover the *longer available export*, not November-only, and their dimensions are not directly interchangeable.

| Canonical page | Impressions | Clicks | CTR | Avg. position |
| --- | ---: | ---: | ---: | ---: |
| /soo-locks/ | 39,185 | 2,041 | 5.21% | 6.44 |
| /great-lakes-freighter-tracking/ | 26,286 | 355 | 1.35% | 8.35 |
| /welland-canal/ | 3,871 | 102 | 2.63% | 7.82 |
| /duluth-canal-park/ | 3,169 | 16 | 0.50% | 10.03 |

Disclosed sitewide query evidence includes "duluth shipping schedule" (271 impressions, 1 click, position 9.94), "duluth ship schedule" (194, 0, position 10.03), "welland canal live map" (248, 0, position 7.04), "welland canal ship schedule today" (188, 8, position 8.06). These are **sitewide query rows**, not joined page/query evidence; no claims about page-attributed searches or current earnings.

## Choices

A new combined ship tracker adds little beyond the established five-lake map, and the user explicitly retired the former freighter watch desk. Wholesale title/snippet changes would restart experiments on established pages. Choose an answer-first schedule fallback and narrow, relevant handoffs instead.

**Duluth:** Its live watch gives only a near-term candidate supported by fresh AIS, not every anticipated arrival. A visitor who sees no supported watch must have a separate way to check published later movements. Add an independent Harbor Lookout schedule link *after the live watch card and before the map*, outside the card's JS-replaced region; pair it with the existing Canal Cam and explain uncertainties, Superior Entry, shifting plans and stale AIS. In the existing related area, add distinct winter layup and Welland links. Preserve live-map/camera sources, original title, near-term logic and three existing related cards.

**Welland:** The official Seaway order-of-turn is already first and remains authoritative; keep the live map, lock viewing desk, eight-lock simulator and 2026 pleasure craft guidance. Inside the existing maritime resource section add direct next-task links to the five-lake map, dated documented winter layups and the Freighter Central ports hub. AIS positions do not confirm scheduled passage or winter berths.

**Soo Locks:** Protect the strongest original traffic page and first-screen USACE/BoatNerd/live-ship answer. One lower-page related entry points to Duluth's published schedule/cameras beside the existing Welland entry. No first-screen experiment or title change.

## Safeguards and acceptance

- No AIS provider/API, ship arrival forecast model, map, camera engine, Redis, ad placement, canonical, title, index directive or newly invented content route.
- Preserve visible author and canonical Person ID. Modified page and root sitemap dates stay aligned.
- Existing tool-engagement attributes identify planned visitor-path events; they are **not evidence** GA4 or Vercel actually delivered them.
- Run new narrow regression, full repository verification, rendered public-page audit, preview and production deployment, then independently inspect fresh live HTML and the accessible direct links.
- No claim about Google indexing or AdSense uplift from code deployment. Compare finalized, like-for-like 7/28-day GSC Web page+query windows after release; control for rank and shipping-season changes. Compare actual analytics events and AdSense earnings only when connected reports exist.

The intended outcome is less visitor dead-ending, not a guaranteed traffic or revenue increase.
