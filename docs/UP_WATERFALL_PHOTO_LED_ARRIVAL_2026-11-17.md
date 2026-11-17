# Waterfall main-page photo-led arrival, November 17 2026

## The visitor problem
The U.P. waterfall hub already had 47 verified photographs in the source ledger and three destination pictures below the map. At the top of the page, however, a visitor initially encountered only text and trip-planning controls. That does little to establish what the waterfall landscapes look like before asking them to pick a destination.

## Experience OS 1.2.1 and Foundry review
- Baseline checked: server-rendered hub, existing 80 destination cards, three-photo gallery, photographer/rights ledger, Penpot-inspired map-first pilot and dedicated regression tests.
- Unfinished task: picture contrasting waterfall settings, then choose a real guide without losing the immediate map and trip-planning options.
- Opportunity A: add a photo-led editorial arrival with meaningful guide links, descriptive place labels and visible licenses. It reuses vetted sources and does not alter the map.
- Opportunity B: add place photography to four regional trip-plan clusters. Useful, but visitors would still encounter the text-only hero first; regional images need separate layout and identity review.
- Opportunity C: expand waterfall-card photographic coverage. Valuable for discovery once using the map/search, but 33 destinations do not yet have safe-to-publish verified imagery. Invented placeholders are prohibited.

Two credible compositions were considered:
1. Full-bleed photograph behind the heading and links: strong first visual, but makes legibility and visible author/license credits harder, especially on narrow screens.
2. Editorial split hero with a photographic wall of three verified destinations: preserves text and map links while distinguishing different landforms. The actual images remain separate from prose and all creator/rights links stay readable.

Selected **2**, keeping the existing three-photo gallery below the map. The Penpot map-first pilot remains the layout basis, not an assertion that Penpot MCP was run. REA was intentionally not invoked because there was no unknown JavaScript or browser behavior requiring reverse engineering.

## Source-verified images
- **Manabezho Falls**: Gittinsj, CC BY-SA 3.0, [Commons source](https://commons.wikimedia.org/wiki/File:Manabezho_Falls.jpg)
- **Wagner Falls**: LadyDragonflyCC, CC BY 2.0, [Commons source](https://commons.wikimedia.org/wiki/File:Wagner_Falls_(36003612295).jpg)
- **Sable Falls**: National Park Service, official-duty public domain, [Commons source](https://commons.wikimedia.org/wiki/File:Sable_Falls_in_Fall_(208f3ca7-00cc-42c2-b113-722e4dd3d977).JPG)

Each linked image uses the specific source and declared license in `data/up-waterfall-photo-provenance.json`. The previews are CSS-framed for responsive layout; destination guides retain the uncropped source view. These historic photographs are not evidence of today's water level, accessibility or trail openings.

## Implementation boundaries and proof
- HTML-first `<figure>` images at the start of the page, direct guide links and accessible alt/credits.
- Responsive CSS split at desktop and stacked mobile arrangement; single high-priority main image, secondary images load lazily.
- No new image API, generated art, map/filter/data/Rust change, ad policy change or canonical/indexability change.
- Regression tests assert all three images against the rights ledger and preserve the existing gallery/map/CTA.
- Updated hub `dateModified` and sitemap `lastmod` together.

**Verification to complete before merging:** `npm run verify:all`, repository GitHub CI including waterfall browser smoke, rendered desktop/mobile image-load and legibility review, and post-deploy production inspection. Structural/static tests cannot prove perceived design quality. No CTR, revenue or engagement uplift has been measured.

**Exactly one next action:** Inspect the PR's deployed preview at 390px and 1440px, including actual image load, credits and map navigation, then merge only after all required gates pass.
