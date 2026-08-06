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

## Prior, for reference
- 2026-08-04 — aurora dark-window + Kp strip, Soo Locks routing, fall color migration. Three
  changes shipped together; the apparent 5x CTR jump that day is NOT attributable to any one of them.
