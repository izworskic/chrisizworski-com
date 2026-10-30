# Sleeping Giant Provincial Park Explorer — site integration ready

**Date:** October 29, 2026. **Branch:** `feature/sleeping-giant-decision-engines-20261028`. **Pull request:** [#1273](https://github.com/izworskic/chrisizworski-com/pull/1273), stacked on the baseline repair [#1274](https://github.com/izworskic/chrisizworski-com/pull/1274). **Release status:** source committed, checks green, **unmerged/unpublished**.

## Canonical page and ownership

- Planned canonical: `https://chrisizworski.com/sleeping-giant-provincial-park/`.
- Primary search intent: choosing a Sleeping Giant Provincial Park walk by **complete official return distance, legal bike-to-hike portions and published duration evidence**. The [Lake Superior Circle Tour](/lake-superior-circle-tour/) continues to own the broader road-trip itinerary.
- `public/sleeping-giant-provincial-park/index.html` is a checked-in, crawlable six-option source-first guide. This exists so standalone GitHub discovery/governance checks see a real published-document candidate before any build.
- `scripts/build-sleeping-giant-site.mjs` upgrades that source page during `npm run build:site`, generating the richer responsive HTML/CSS/JavaScript Explorer from the **same tested official route engine** rather than a parallel client-side ranking algorithm. The build emits six static route cards, four research-only GIS overlays, **70** source-evaluated planning combinations, and full official-distance and access notices.
- `verify:all` now reads the checked-in source page without generating over it. The build still creates the enhanced site version through `build:site`; targeted integration/browser tests generate their own disposable outputs.
- Other source owners: `previews/sleeping-giant-explorer/`, `data/sleeping-giant/`, `lib/sleeping-giant/`.

## Search, analytics, discovery and ads integration

- Unique self-canonical and URL in `public/sitemap.xml`, date reviewed October 29, 2026.
- Article/page-style OG metadata plus `WebPage`, `ItemList`, `BreadcrumbList` and Person JSON-LD. Both `author` and `publisher` point to `https://chrisizworski.com/#person`. Six `#trail-*` anchors exist in both static and generated versions.
- The official tool network includes `sleeping-giant-provincial-park` with directed Circle Tour in/out relationships, a distinct park-level intent, and a separate LSPP park alternative, **not a duplicate Circle Tour canonical**.
- Crawlable links from `public/tools/index.html`, `public/guides/index.html`, and the *Thunder Bay* stop of `public/lake-superior-circle-tour/index.html`. The old Circle Tour summary describing the 7.5-km named trail as the whole outing and a blanket May–October park-opening claim was corrected to published complete route length and camping/day-use distinctions.
- The site builder emits **exactly one standard AdSense Auto Ads loader** matching existing publisher settings. No new custom in-article placements, changes to `config/in-article-ads.json`, page exceptions, or ad UX logic. The normal `build:site` pipeline subsequently runs existing GA4 and creator-attribution integrations. Presence of a tag does not prove actual AdSense delivery.
- Licensed hero photography remains credited to Justin Meissen, CC BY-SA 2.0 (Wikimedia Commons); image is externally hosted and displayed as a crop.

## Safety and mapping limits retained

- **No public parking driving coordinates or Google Maps directions.** The signed South Kabeyun parking lot is officially described, but its precise park-owned driveway and verified legal pedestrian connector remain unknown.
- Four OTN research overlays are read-only with turn-by-turn disabled and a visible unresolved mapped-versus-official trip-length gap. Two trails have no mapped research overlay.
- The South Kabeyun cycling cutoff at Kabeyun/Talus is official, but no independently verified signed intersection GPS waypoint is supplied. Top, Head and Nanabosho have distinct published bike/walk splits and storage caveats.
- No current road/trail opening, storm safety, permit status, parking availability or real-time ECCC forecast is inferred. The official alerts link always remains accessible.
- Ontario Parks operates distinct day-use, seasonal camping and winter programs; the page must not conflate published operating dates with individual trail opening or safety.

## Last verified release gate

- [Full green GitHub Actions run 40900851727](https://github.com/izworskic/chrisizworski-com/actions/runs/40900851727): **53/53 Sleeping Giant contracts**; all **59/59 `verify:all` stages passed** on the combined feature + baseline branch; full **`npm run build:site` passed**, followed by explicit standard Auto Ads audit and six new integration tests; real Chromium in desktop, phone and no-JavaScript modes passed, including source vs site page states.
- [Independent Detroit discovery governance run 40900851747](https://github.com/izworskic/chrisizworski-com/actions/runs/40900851747) passed after the checked-in public page was included. Its success is not a claim of Google indexing.
- **Prior green executable commit:** `35418f8ccaa398640118d81e8ea8b1890322236c`. Two later code-review fixes are committed: route-dependent accessible SVG descriptions and removal of the source-mutating `preverify:all` hook, with regression coverage. Re-run CI on the revised commit before release.

## Release ordering and postmerge validation

The repository auto-deploys on merge to `main`. **Do not merge just to preview.** First merge baseline repair PR #1274 or reconcile it into current main, retarget/rebase PR #1273 onto the actual updated main (which may have new changes), and rerun all full-site, browser, SEO, source, ad and governance checks on the final merge SHA.

After the user explicitly approves release, verify a live HTTP 200 at the canonical URL, real emitted HTML canonical/schema, 6 source cards, 70 planner states, the route-map fallback, sitemap visibility, surrounding directory links and a production ad-loader audit. Monitor GSC after sufficient crawl latency; do not claim measured traffic or rankings before data arrives.

**Next release gate:** confirm all revised PR checks, reconcile against the latest `main` including subsequent field-guide fixes, and run final production-build/SEO checks. Merge only when that final candidate is green. Do not add unverified parking route or live weather logic as a shortcut.
