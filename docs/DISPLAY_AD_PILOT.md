# Horizontal display-ad pilot

Owner: Chris Izworski. Repository: `izworskic/chrisizworski-com`.
Requested September 20, 2026. Release state is determined by the merged commit
and Vercel production deployment, not this document's creation date.

## Single source of truth

`config/display-ad-experiment.json` is the complete placement registry and kill
switch. AdSense name: **General display ad = experiment 1**, slot **1011148508**,
publisher **ca-pub-8222782620788075**. Do not paste additional copies into pages.
No separate service or repository is needed for three hub-owned pages.

| Canonical tool | Placement | Evidence for selection |
| --- | --- | --- |
| `/northern-lights-michigan/` | After the viewing map, before the NOAA oval/guide | Sep 13 stored Search Console export: 142 clicks / 12,998 impressions; data through Sep 10 |
| `/soo-locks/` | After the live river camera, before The Locks | Historical Aug 15 export page table: 272 clicks / 15,904 impressions |
| `/great-lakes-freighter-tracking/` | After the complete AIS/conditions/source section, before How to Find a Freighter | Sep 13 stored export: 80 clicks / 6,628 impressions; data through Sep 10 |

These are observed **search** figures from stored reports, not current pageviews,
an all-site traffic ranking, or comparable-period totals. The registry records
the evidence files. The retired search experiments are not restarted by this ad
pilot. Titles, canonical URLs, structured data, links and all original tool HTML
remain unchanged; only labeled ad blocks and their sizing/initializer are added.

## Operation and removal

```sh
npm run ads:status   # list every registered location and enabled state
npm run ads:off      # set the global switch false and remove all generated blocks
npm run ads:on       # set the global switch true and regenerate enabled placements
npm run ads:apply    # synchronize output after editing individual placements
```

**Commit the configuration change, pass the gates, merge and deploy** for any
switch to affect live traffic. This is a build-time switch, not an immediate
remote control. Existing open browser tabs are not retroactively changed.
For one page, change that placement's `enabled` to `false`. To remove a route
permanently, delete it from `placements`; the injector removes old marked blocks
even on routes no longer listed. It validates all enabled anchors before writing.

Vercel runs `scripts/display-ad-pilot.mjs` **last** in `vercel-build`. Source HTML
is clean; the script adds marked blocks to deployment output. Repeated builds do
not duplicate ads. `lib/display-ad-experiment.js` owns HTML and inline sizing;
`public/assets/display-ad-pilot.js` makes at most one request per placement per
page load. `tests/display-ad-pilot.test.js` covers reversibility, scope, anchors,
and request behavior.

Full removal: switch off and deploy first; then remove the build command, four
`ads:*` npm commands, registry, renderer, runtime and pilot test. Keep this
document as the removal record. Leave the shared AdSense loader, verification
metadata and `ads.txt` in place: other existing ads use them.

## Horizontal sizing and UX

One banner per selected page, after the core tool. No overlay, sticky placement,
interstitial, primary-button adjacency or automatic refresh is introduced.
The existing global AdSense loader is reused; this module adds no second loader.

| Screen width | Requested banner |
| --- | --- |
| Below 360px | Hidden; no pilot ad request |
| 360–379px | 300 × 50 |
| 380–539px | 320 × 50 |
| 540–799px | 468 × 60 |
| 800px and above | 728 × 90 |

These use Google's documented exact-size responsive CSS method. The original
`data-ad-format="auto"` and `data-full-width-responsive="true"` are removed;
horizontal shape alone only governs desktop. Inline sizing reserves space before
ads load. The browser makes a request when within 200px of the slot, only when
the slot fits and the tab is visible. No requests from this initializer occur on
preview/localhost hosts. Ads never become a dependency of the forecast or map.

Reserved space is retained if there is no fill or an ad blocker, avoiding a late
collapse that shifts the guide while someone reads it. The maximum reserved ad
section is 142px plus 32px margins, not a tall rectangle. Existing AdSense account
Auto ads and ad-size optimization settings were **not inspected or changed**;
account-level behavior still needs a live check after release. No revenue,
ad-fill, traffic neutrality or Core Web Vitals result is guaranteed by code alone.

## Revenue and visitor-impact review

In AdSense, use **Reports → Ad units** and select **General display ad = experiment 1**
(slot 1011148508). Review estimated earnings, impressions, impression RPM and Active
View viewability by date/device where available. These three placements share one
slot, so the ad-unit report aggregates them; it cannot rank the three placements
by itself. Page-specific revenue needs URL channels, a suitable page report, or
linked GA4 publisher data. Those account settings have not been created here.
Do not infer earnings from client request counts or invent fill/impression events.

Record the actual production release date and compare the preceding 14 days with
14 complete days afterward. Revenue for this **new unit** has no pre-release
baseline. Review total site/page revenue too: new-slot earnings are not necessarily
incremental if they displace Auto ads. Use longer windows when volume is small.

- AdSense: total earnings, page RPM (for an appropriate page/site report), ad-unit
  impression RPM, viewability and device mix.
- GA4: organic landing sessions, engagement rate, average engagement time and
  existing tool-use events on these same three routes.
- Search Console: clicks, impressions and position; interpret aurora spikes and
  seasonal shipping changes rather than declaring causation from before/after.
- Speed Insights/Search Console: CLS, LCP and INP by device where data permits.

Rollback immediately for blocked map controls, overlap, horizontal page overflow
or a broken tool. Follow `docs/adsense-launch-plan.md` for sustained traffic and
Core Web Vitals stop-loss rules. Inspect spacing against existing Auto ads after
release. The private AdSense dashboard was inaccessible during implementation;
this document describes the reporting setup, not reports already saved there.

## Official implementation references

- https://support.google.com/adsense/answer/9183363?hl=en (exact-size responsive CSS)
- https://support.google.com/adsense/answer/9183460?hl=en (horizontal is desktop-only)
- https://support.google.com/adsense/answer/9274025?hl=en (Ad units report)

## Change record

- 2026-09-20: owner-authorized three-page horizontal pilot; centralized registry,
  build-time injection/removal and tests. No sitewide placement rollout.
