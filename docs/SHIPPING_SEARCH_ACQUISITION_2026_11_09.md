# Shipping search acquisition: render the existing tracker's vessel reports

## Decision and evidence

The November 5 GSC export covers October 7–November 3. The existing Great Lakes tracker received **8,481 impressions, 115 clicks, 1.36% CTR and average position 7.32**. It is the strongest shipping acquisition opportunity in that export by impressions. Soo already converts substantially better (394 clicks / 5,134 impressions); preserve its successful answer and title.

Source: [owner's November 5 spreadsheet](https://docs.google.com/spreadsheets/d/1NTZ8TmB_FAGDBPHTtmaSTSMl9Pss4ssXPiTnlainO_Y/edit), Pages tab. The Queries tab is sitewide, not page-attributed. It includes “great lakes ship tracker” (1,029 impressions), “great lakes freighter tracker” (542), and “great lakes ship tracker live map” (165). These support improving the canonical tracker, not hundreds of new vessel or location URLs. No named-ship demand estimate is established.

Direct GSC/GA4 data through Windsor was attempted November 9. Reads are blocked by the connected account's plan limit (9 accounts / allowance 1). No accounts disconnected, no subscription change, no substitute numbers accepted. The export is not a current seven-day revenue baseline. Earlier overlapping exports cannot establish a clean treatment comparison.

Before this change, the initial tracker HTML contained `Waiting for vessel reports…`; actual names, positions and report times required JavaScript and an API round trip. A November 9 production API read returned usable AIS reports. Search-result review found competing trackers exposing named-vessel/port lists, including [FreighterLog](https://freighterlog.com/) and [Shiptrail Duluth](https://shiptrail.io/port/usdlh-duluth). This is a qualitative feature comparison, not a controlled ranking measurement.

[Google's JavaScript guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) supports server-rendered content for users/crawlers, while explicitly explaining that Google can also render JavaScript. We have **not** established that Google failed to render this tracker. This change removes a dependency; it is not evidence of a ranking penalty or a promised ranking recovery.

## Selected improvement

Render recent vessel names, positions, AIS destinations, speeds, absolute report times and source credits directly into the **existing canonical page**, for every visitor and crawler alike. The map, search, corridor views and selected-ship inspector hydrate from those same reports and continue refreshing normally. No additional indexable pages, title churn, new tracker, or redesigned interface.

Compared with more title/description edits, this supplies the actual answer a ship-tracking visitor requested. Compared with separate ship-name pages, it uses existing demonstrated generic tracker demand without creating unproven competing URLs. It also gives the existing utility a complete no-JavaScript answer.

The shared feed loader preserves the existing API contract, bounded provider area, normalization, optional server token and Detroit specialist freshness behavior. The public HTML fetch has a two-second upstream budget; if it fails, the complete original tool still renders with an explicit unavailable report state. No Redis, database, cron, new provider or paid service.

## Freshness, crawl and compatibility boundaries

- Thirty-second CDN cache, immediate browser revalidation, no stale-while-revalidate. Reports close to 30 minutes old are excluded with a full cache-lifetime margin.
- Absolute report times and a feed-check time in initial HTML; AIS destination is not a confirmed arrival. No-JavaScript readers are told to reload for newer data.
- Browser retains only still-valid seeded reports if refresh fails; stale ships disappear from list and map. A background tab rechecks ages when shown.
- HTML and JSON escaping protects against untrusted AIS strings. No bot-specific rendering or user-agent cloaking.
- The public rewrite remains indexable; the direct `/api/` route and Vercel preview hosts keep their existing noindex policy. Verify actual deployment response headers, not just source configuration.
- Same canonical, title, H1, Person graph, byline, internal links and advertising policy. The function bundles the final built HTML after normal attribution/ads/analytics injection. The source template's no-JavaScript note and script version are updated. No content links or schema nodes removed; sitemap URL count unchanged.

## Acceptance and measurement

Unit coverage: initial answers, identity/link preservation, HTML/JSON injection, 30-minute boundary with cache margin, future/bad report rejection, empty versus unavailable, GET/HEAD/405, timeout signal and public/API/preview routing policy. Existing tracker and Detroit contracts must pass unchanged. Browser acceptance covers 360/390/1440 px with and without JavaScript, map/list/search/corridor/inspector behavior, retained seed during refresh outage, expiry and complete server-outage fallback. Controlled test vessel reports are not live AIS evidence.

Run `npm run verify:all`. Browser script: `scripts/verify-freighter-page-browser.cjs` using Playwright; `CHROME_PATH` and `NODE_PATH` are optional environment overrides. `QA_LEAFLET_CSS` can point to a downloaded **SRI-matching** official Leaflet 1.9.4 stylesheet for restricted-network runs; otherwise the browser loads the actual CDN stylesheet. Do not substitute the differently hashed repository vendor CSS or disable integrity checks.

After authorized release, verify the exact production SHA, initial HTML with usable reports when the feed responds, canonical and robots headers, one built ad loader, and normal browser behavior. Track the percentage of sampled HTML requests containing reports and latency; if the two-second budget nearly always falls back, this has not delivered its intended benefit and should not be reported as successful.

Success is **new search arrivals and earned revenue**, not proof that HTML rendering works. Compare the tracker canonical's next complete 28-day GSC window with its preceding complete 28 days, with daily detail and concurrent releases recorded. Report clicks, impressions, position and CTR together. Use GA4 organic landing sessions and new/returning acquisition; keep internal `tool_open` events separate. Use actual AdSense earnings/available denominators. No multiplier or $300/day projection follows from this engineering change.

PR #1599's handoffs remain supporting work. External acquisition still needs distribution: the ready demonstrations and three matched pitches in `SHIPPING_PROMOTION_2026_11_09.md` have **not been sent**. Sending messages requires Chris's explicit instruction. No outreach, indexing submission or growth outcome is claimed here.

## November 11 resumption

Rebased onto green main `53ef82aa15a545c4d760c7512e84c988b1b605c8`, retaining the newer shipping sprint and tracker hero name-search CTA. Full `build:site` passed in an isolated checkout with real installed owner packages. Invoking the actual page function against its built template verified a rendered report, exactly one standard ad loader, GA4, Person identity and the retained hero CTA. Browser acceptance rerun against built HTML passed all seven scenarios; screenshot timestamps reflect controlled test reports. Client expiry now changes the list only when reports expire, avoiding needless 15-second DOM replacement and lost keyboard focus.

The November 9 export mentioned by newer sprint records spans a longer interval. It is not substituted for this release's explicitly dated 28-day baseline. No new search/revenue outcome claim.

November 11 local release gate: all 60 `verify:all` steps passed in 82 seconds. Full `build:site`, built-template function audit, and seven browser scenarios passed. Production release and measured visitor outcomes remain unverified.
