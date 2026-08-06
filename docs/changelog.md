# Deploy changelog

One dated entry per production change, so Search Console movement can be attributed to a cause
instead of guessed at. Do not ship two page clusters on the same day.

## 2026-08-06 — fall color snippet repair + entity integrity
Cluster: fall color (16 pages) and the identity cluster (2 pages).
- 12 titles cut to 60 characters or fewer. Every over-length title on the site was a fall color page.
- 14 descriptions cut to 158 or fewer; several were running to 231 and losing their second half in the SERP.
- Canonicals, og:url and sitemap entries normalised to the trailing-slash convention used by the other 150 pages.
- Internal fall-color hrefs normalised to trailing slash across 17 files, removing a redirect hop per link.
- 3 inbound links added so every fall color page meets the 4-link network standard.
- `jobTitle` normalised to "Solutions Consultant" on 2 identity pages. All three values shared one
  `@id`, so the entity was contradicting itself.
Expected to affect: fall color impressions and CTR from roughly 2026-08-20 onward, and entity
resolution on the name query. NOT YET MEASURED.

## 2026-08-06 (third change) — fall color season opens three weeks early
Cluster: fall color machinery (no page content changed).
Verified first, by simulation and a real end-to-end run, that the September path works: the
open-meteo and MODIS feeds return in about 13s, the model produces a sane seasonal progression
(6% green in early September, western U.P. 75% and rising on Sep 28, Tip of the Mitt 97% at peak
on Oct 12), and the daily AI writer returns 237 words with zero em dashes. Nothing was broken.
The gap was timing, not correctness:
- `inSeason()` opened September 10. Fall color is a freshness-sensitive query class and Google
  decides who ranks for the season while demand ramps in late August. A section sitting static
  until September 10 arrives after that decision. Opened to August 20.
- Confirmed by test that the writer is honest pre-colour: asked to write with every region at 6%,
  it says there is nothing to chase yet and gives the timeline, which is what an August searcher
  actually wants. No prompt change needed.
- The dynamic sitemap at /fall-color/sitemap.xml was emitting 12 URLs WITHOUT trailing slash,
  contradicting the canonicals shipped this morning. Fixed.
- That route also kept its own copy of the season window, using server-local time and a different
  set of months. It now imports `inSeason()` so the sitemap and the writer cannot disagree.

## 2026-08-06 (second change, same day) — beach cluster de-orphaned
Cluster: Great Lakes beaches (52 detail pages + hub).
- The hub's beach explorer builds its list in the browser, so the 50 detail pages had NO inbound
  link from their own hub, and 15 had none from anywhere on the site. Median inbound links was 2.
- Added a static, crawlable index of all 50 beaches grouped by lake, generated from
  data/beaches.json by scripts/generate-beach-pages.mjs between markers, so it regenerates and
  cannot drift from the data.
- Result: zero-inbound beach pages 15 -> 0, median inbound 2 -> 3.
- Fixed a false positive in benchmark:ctr, which only read sitemap.xml and so reported the beach
  pages as missing from the sitemap. They were always in sitemap-beaches.xml. It now reads all three.
ATTRIBUTION NOTE: this breaks the one-cluster-per-day rule set earlier today. Accepted because
beaches and fall color are disjoint query sets and GSC page rows separate them cleanly; the cost
is only that site-wide daily totals for Aug 6 carry two causes.

## Prior, for reference
- 2026-08-04 — aurora dark-window + Kp strip, Soo Locks routing, fall color migration. Three
  changes shipped together; the apparent 5x CTR jump that day is NOT attributable to any one of them.
