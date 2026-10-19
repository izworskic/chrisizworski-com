# Sitemap and search-growth audit — October 19, 2026

## Growth objective

The existing owner-approved goal remains 1,000,000 Web impressions and 50,000 clicks per rolling 28 days. Newly retrieved account performance and submission records are retained in the owner's private report and are deliberately not published in this repository. No uplift has been measured for these changes.

## What was reviewed

Robots discovery and sitemap XML were fetched across 20 owned root/subdomain hosts, plus the publicly reachable legacy 911ai WordPress map. GitHub profile infrastructure is not an owned site and is excluded. The initial network discovery yielded 51 valid sitemap files, including an existing XC ski index and two empty WordPress news maps. Empty news maps outside a publishing window are not ordinary-page discovery failures. The 1,592 unique listed page URLs are coverage counts, not indexed-page counts. See `audit/sitemaps-2026-10-19.json` for the dated per-file inventory.

| Sitemap | HTTP | Type | Listed entries |
| --- | ---: | --- | ---: |
| https://aibreakdown5.wordpress.com/news-sitemap.xml | 200 | urlset | 0 |
| https://aibreakdown5.wordpress.com/sitemap.xml | 200 | urlset | 23 |
| https://ausable.chrisizworski.com/sitemap.xml | 200 | urlset | 1 |
| https://chrisizworski.com/fall-color/destinations-sitemap.xml | 200 | urlset | 30 |
| https://chrisizworski.com/fall-color/national-sitemap.xml | 200 | urlset | 16 |
| https://chrisizworski.com/fall-color/sitemap.xml | 200 | urlset | 16 |
| https://chrisizworski.com/image-sitemap.xml | 200 | urlset | 353 |
| https://chrisizworski.com/sitemap-aurora-states.xml | 200 | urlset | 49 |
| https://chrisizworski.com/sitemap-beaches.xml | 200 | urlset | 52 |
| https://chrisizworski.com/sitemap-blue-spring.xml | 200 | urlset | 4 |
| https://chrisizworski.com/sitemap-breakout-live.xml | 200 | urlset | 12 |
| https://chrisizworski.com/sitemap-cbbt.xml | 200 | urlset | 1 |
| https://chrisizworski.com/sitemap-fall.xml | 200 | urlset | 1 |
| https://chrisizworski.com/sitemap-ice-out.xml | 200 | urlset | 9 |
| https://chrisizworski.com/sitemap-manistee.xml | 200 | urlset | 1 |
| https://chrisizworski.com/sitemap-melvin-price.xml | 200 | urlset | 4 |
| https://chrisizworski.com/sitemap-niagara-border.xml | 200 | urlset | 5 |
| https://chrisizworski.com/sitemap-niagara-rainbow.xml | 200 | urlset | 2 |
| https://chrisizworski.com/sitemap-nyc-crossing.xml | 200 | urlset | 1 |
| https://chrisizworski.com/sitemap-petoskey-wine.xml | 200 | urlset | 33 |
| https://chrisizworski.com/sitemap-reputation.xml | 200 | urlset | 37 |
| https://chrisizworski.com/sitemap-white-christmas.xml | 200 | urlset | 65 |
| https://chrisizworski.com/sitemap-winter.xml | 200 | urlset | 92 |
| https://chrisizworski.com/sitemap.xml | 200 | urlset | 326 |
| https://daily.michiganbirdingreport.com/sitemap.xml | 200 | urlset | 9 |
| https://daily.michigantroutreport.com/sitemap.xml | 200 | urlset | 99 |
| https://freighterviewfarms.com/news-sitemap.xml | 200 | urlset | 0 |
| https://freighterviewfarms.com/sitemap.xml | 200 | urlset | 262 |
| https://greatlakeslevels.org/sitemap.xml | 200 | urlset | 58 |
| https://izworskic.github.io/sitemap.xml | 200 | urlset | 6 |
| https://lawn.chrisizworski.com/sitemap.xml | 200 | urlset | 40 |
| https://michiganbirdingreport.com/sitemap-authored.xml | 200 | urlset | 1 |
| https://michiganbirdingreport.com/sitemap.xml | 200 | urlset | 107 |
| https://michiganoutdoorsnow.chrisizworski.com/sitemap.xml | 200 | urlset | 124 |
| https://michigantroutreport.com/sitemap-authored.xml | 200 | urlset | 1 |
| https://michigantroutreport.com/sitemap.xml | 200 | urlset | 126 |
| https://morel.chrisizworski.com/sitemap.xml | 200 | urlset | 10 |
| https://phenology.chrisizworski.com/sitemap.xml | 200 | urlset | 14 |
| https://picturedrocks.chrisizworski.com/sitemap-pictured-rocks.xml | 200 | urlset | 1 |
| https://saginawbay.chrisizworski.com/sitemap.xml | 200 | urlset | 11 |
| https://tcwine.chrisizworski.com/sitemap.xml | 200 | urlset | 81 |
| https://weekend.chrisizworski.com/sitemap.xml | 200 | urlset | 7 |
| https://whitetail.chrisizworski.com/sitemap.xml | 200 | urlset | 8 |
| https://xcski.chrisizworski.com/forecast-sitemap.xml | 200 | urlset | 8 |
| https://xcski.chrisizworski.com/midwest/sitemap.xml | 200 | urlset | 1 |
| https://xcski.chrisizworski.com/minnesota/intent-sitemap.xml | 200 | urlset | 4 |
| https://xcski.chrisizworski.com/minnesota/sitemap.xml | 200 | urlset | 70 |
| https://xcski.chrisizworski.com/sitemap-index.xml | 200 | sitemapindex | 7 |
| https://xcski.chrisizworski.com/sitemap.xml | 200 | urlset | 74 |
| https://xcski.chrisizworski.com/wisconsin/intent-sitemap.xml | 200 | urlset | 4 |
| https://xcski.chrisizworski.com/wisconsin/sitemap.xml | 200 | urlset | 61 |

## Implemented in this branch

- Added `/sitemap-index.xml`, generated deterministically from same-host robots declarations. Existing submitted maps and their URLs remain intact; the cross-host Pictured Rocks map retains its separate robots declaration. No invented sitemap modification timestamp.
- Extended freshness discovery to all root page sitemaps. Corrected 13 entries across Aurora, Blue Spring, CBBT, Melvin Price and Niagara maps from the existing page/history contracts. Six already stale page stamps were also reconciled by the existing stamper.
- Expanded `audit:canonical-indexing` from only `sitemap.xml` to all root sitemaps: duplicates within files, missing local documents, redirect sources, canonical conflicts, noindex metadata, missing robots targets and sitemap limits now fail the check. Overlap across specialist maps is allowed. Delegated routes are counted and explicitly require live verification; they are never presented as locally checked pages.
- Added the index and full sitemap audit to the required repository gate. Fixture tests exercise failure cases and automatic discovery of a newly named specialist sitemap.
- No content page, title, H1, canonical, navigation, advertisement, or decision engine is rebuilt by this work. Page-count growth is not the objective.

## Search recommendations

Use a fresh private GSC Web page/query/device baseline to prioritize existing near-page-one pages before new content. Review Michigan Aurora, Mackinac tolls/live conditions, freighter tracking and the White Christmas forecast for query-to-snippet matching. Preserve useful utilities, truthful live-data limits and canonical ownership. Keep fall seasonality separate from change effects. The private report contains the dated priorities and supporting metrics.

## Sitemap recommendations

1. After the PR is merged and the canonical index returns HTTP 200 with the expected XML, submit `https://chrisizworski.com/sitemap-index.xml` in the verified domain property. Submission and Google processing have not been performed in this session. Keep existing specialist submissions while validating the new index.
2. Replace legacy HTTP submissions with HTTPS in reporting, and replace retired birding/trout host submissions with the current canonical host maps after verifying their redirects. Removing a sitemap submission does not deindex its pages.
3. Fix missing `dateModified` in owning generators for the Petoskey, Blue Spring child and Melvin Price child exports. These three maps were outside the old checker. Their existing dated entries can now synchronize when a matching source date exists, but absence of a date in a delegated export is explicitly outside local schema enforcement. Do not insert fabricated fresh dates or edit vendored product content here.
4. Keep the existing winter and seasonal maps. Extra sitemap files are useful for coverage diagnostics, not a ranking multiplier. There is no reason to create a new sitemap per small tool or mass-produce city/date variants.
5. Maintain meaningful lastmod values. Google ignores priority/changefreq, so adding or inflating those tags is not a growth tactic. No routine bulk refresh of dates on each build.
6. Use working contextual links from seasonal hubs and directories; XML is not a substitute for a useful, crawlable page and a sensible visitor journey.

## Measurement and release

Compare the same Web property and complete 28-day windows after release. Track submitted/discovered versus indexed separately, plus impressions, clicks, weighted CTR, page/query/device/host segments and engagement. Seasonal spikes and other releases prevent simple before/after causal claims.

Official references: [Google sitemap construction](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [sitemap indexes](https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps), [Sitemaps report](https://support.google.com/webmasters/answer/7451001).

## Verification

The source checkout is based on main `1d550b54fe6c9a91c8aee3287d80a493d9bc5315`; its Agent branch verification and production smoke runs were green before work and at the pre-PR recheck. The complete local gate passed all 55 steps; the existing production build also exited 0. New sitemap fixtures plus affected Niagara/discovery/package checks passed. No merge, production rollout, GSC submission or measured ranking uplift is implied by those checks.

## Final live coverage findings

**1,617 distinct requested URLs all reached HTTP 200:** 1,592 unique page URLs in the initial map discovery, plus 25 additional candidates from local HTML that were absent from that discovery. This tests reachability and initial HTML metadata, not working upstream feeds, Google-selected canonicals, or indexing. HTTP `X-Robots-Tag` was not collected in this network-wide pass; local production configuration still passes the repository's noindex contract.

Of those 25 candidates, four intentionally redirect to existing canonical destinations: the older speaking and Bay City identity aliases, `/mackinac-island/` to its ferry planner, and the national Yosemite alias to `/yosemite-firefall-live/`. They are correctly omitted. The other 21 are live, self-canonical pages absent from the discovered maps. Three carry the date metadata required for local sitemap admission and are added in this branch: Michigan Snow Depth to the existing winter map, Yellowstone Geysers and Trail Ridge Road to the main map. This adds three unique submitted page URLs without creating content pages.

The remaining 18 are held for their owning source generators to supply truthful `dateModified` metadata under AGENTS.md. Sitemap protocol itself permits omitting lastmod; this repository's publication gate is stricter. Do not evade it by inventing dates or editing outdated deployment mirrors.

| Live canonical awaiting owner metadata | Local implementation/source mirror |
| --- | --- |
| https://chrisizworski.com/ontario-fishing-lake-finder/ | `public/ontario-fishing-lake-finder/index.html` |
| https://chrisizworski.com/old-sow-live/ | `public/old-sow-live/index.html` |
| https://chrisizworski.com/national-tools/northeast-great-lakes/ | `public/synced-national-tools/northeast-great-lakes/index.html` |
| https://chrisizworski.com/national-tools/great-plains/ | `public/synced-national-tools/great-plains/index.html` |
| https://chrisizworski.com/national-tools/columbia-salmon-run/ | `public/synced-national-tools/columbia-salmon-run/index.html` |
| https://chrisizworski.com/national-tools/florida-red-tide/ | `public/synced-national-tools/florida-red-tide/index.html` |
| https://chrisizworski.com/national-tools/rockies/ | `public/synced-national-tools/rockies/index.html` |
| https://chrisizworski.com/national-tools/pacific-northwest/ | `public/synced-national-tools/pacific-northwest/index.html` |
| https://chrisizworski.com/national-tools/space-coast-launch/ | `public/synced-national-tools/space-coast-launch/index.html` |
| https://chrisizworski.com/national-tools/southeast/ | `public/synced-national-tools/southeast/index.html` |
| https://chrisizworski.com/national-tools/appalachia/ | `public/synced-national-tools/appalachia/index.html` |
| https://chrisizworski.com/national-tools/bird-migration/ | `public/synced-national-tools/bird-migration/index.html` |
| https://chrisizworski.com/national-tools/elk-rut/ | `public/national-tools/elk-rut/index.html` |
| https://chrisizworski.com/national-tools/coastal/oregon/ | `public/national-tools/coastal/oregon/index.html` |
| https://chrisizworski.com/national-tools/coastal/oregon/hug-point/ | `public/national-tools/coastal/oregon/hug-point/index.html` |
| https://chrisizworski.com/national-tools/coastal/oregon/thors-well/ | `public/national-tools/coastal/oregon/thors-well/index.html` |
| https://chrisizworski.com/national-tools/coastal/oregon/yaquina-head/ | `public/national-tools/coastal/oregon/yaquina-head/index.html` |
| https://chrisizworski.com/national-tools/coastal/oregon/haystack-rock/ | `public/national-tools/coastal/oregon/haystack-rock/index.html` |

Other findings:

- Freighter View Farms `/seed-shop/` is listed in the WordPress map but has an intentional noindex directive. The owner's closed-store decision is preserved. Exclude it from the WordPress sitemap while it remains noindex; do not turn indexing or sales on to fix this inconsistency.
- Farms `/blog/` and the legacy AI Breakdown home returned no canonical link in the parsed initial HTML. Review these in WordPress before changing plugin/theme settings; this is a consistency recommendation, not evidence of a Google penalty.
- Seven remaining strict string differences concern a bare root URL versus the equivalent `/` root in the final response or canonical (Farms, daily Trout, Levels, Lawn, Birding, Outdoors Now and Traverse City Wine). These are a low-priority normalization issue, not seven broken pages or seven new ranking opportunities.
- The 21 missing canonicals justify filling existing coverage. They do not justify many small new maps. The master index plus the retained specialist maps give useful reporting structure without manufacturing more pages.
