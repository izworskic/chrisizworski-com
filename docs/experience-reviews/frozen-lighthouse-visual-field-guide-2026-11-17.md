# Frozen Lighthouse Watch / Snow & Stone visual recovery
Date: November 17, 2026  
Owner: izworskic/chrisizworski-com  
Canonical: https://chrisizworski.com/frozen-lighthouses-michigan/  

## Visitor problem and baseline
The merged v2 weather engine was functional but visually anonymous: dark navy hero, dark-blue controls, dark cards and no lighthouse photograph. The saved 390px mobile screenshot showed title, warning, dark source summary and more dark panels with no visible sense of place. This is an **experienced design deficiency**, not a weather science defect. Do not flatten all tools into this palette.

## Two credible concepts
**A. Snow & Stone Field Guide (selected)**: an ivory editorial first screen anchored by one true St. Joseph winter image; source-backed forecast directly below; three credited photographs with locality-specific buttons and matching forecast state. Earthy lighthouse-red and graphite replace teal monotony. Reuse existing forecast and linked controls. It retains a tangible place without blocking the answer.

**B. Full-bleed Ice Atlas (rejected for now)**: near-full-screen photographic vignettes and a horizontally paginated coast of nine lights. It is feasible but would bury the first answer on 360px devices and require six additional exactly matched rights-cleared photographs. A visual atlas with three correct and six substituted photographs would be deceptive.

## Distinctiveness against existing tools
Michigan Ice Report answers lakewide seasonal freezing with scientific signals; this tool answers **when onshore spray might coat specific named harbor lights**. Great Lakes Buoys shows station observations; this tool joins forecast windows with a photo-led specific lighthouse choice, historical ice context and separate source times. The product’s first screen now uses an actual photographed pier, without converting the page to a generic destination grid. Reused: one source-gated weather API, native hour slider, photo-caption/attribution QA, existing entity/ads and Google Maps light-coordinate links.

## Photo rights verified (November 17)
All three are real, exact-location historic photos on Wikimedia Commons, not AI scenery, stock imagery, live images or third-party embeds.
- **St. Joseph**, Don Ashley (DASH713), February 2021, [Commons](https://commons.wikimedia.org/wiki/File:St._Joseph_North_Pier_Inner_Light_winter_takeover.jpg), CC BY-SA 4.0. Used in the hero and historical gallery.
- **Grand Haven**, Wayne Silver, December 2008, [Commons](https://commons.wikimedia.org/wiki/File:Grand_Haven_MI_Lighthouses_in_winter.jpg), CC BY 2.0.
- **Holland**, Rachel Kramer, February 2014, [Commons](https://commons.wikimedia.org/wiki/File:Big_Red_basking_in_the_sunset_glow_-_Flickr_-_rkramer62.jpg), CC BY 2.0.

Photos were obtained once from their Commons original-image redirect and saved as six responsive 640/1280px WebP images. The 1280px variants measure 138,420, 108,404 and 50,210 bytes respectively. Credit links point to the actual source and license; resizing/website crop are disclosed. Locations without verified photographs remain text-only, not illustrated with another pier.

## Decision & state
A photo choice uses `data-select-lighthouse` and the existing `state.id` selected-pier state; updates the current coast button, hourly model and map-coordinate link using `render(true)`. Photo selection is a native anchor and works as a jump-to-forecast without JavaScript. Historical photograph timestamps never become the weather-as-of time. Missing NWS data remains unknown and existing source safety gates are untouched.

## Design and engineering
No React, Rust, CSS framework, new endpoint, font download, large map library, animation or new ad component. One scoped linked CSS stylesheet applied *after* the prior stylesheet protects the legacy engine's DOM and preserves a reversible feature-specific visual layer. Three exact-location photos, in responsive <picture> markup; hero eager, gallery lazy; explicit width/height to reduce CLS. Gallery images link to the corresponding selected lighthouse forecast, tested at 360/390/768/1440.

Main WCAG contrast pairs independently calculated:
- Dark ink #172c36 on background #f7f6f2: **13.39:1**
- Muted body text #475c66 on background: **6.49:1**
- Links #165775 on background: **7.32:1**
- Rust accent #9e4d3b on background: **5.43:1**
- White text on buttons #204d60: **9.16:1**

These ratios are selected palette checks, not a substitute for a complete visual/a11y browser audit. Potential photo-failure fallback, keyboard navigation and native selection require real browser QA.

## Foundry improvement cycle 0.3
The PR includes a bounded Foundry improvement generator and identical before/after static adapter. On CI it captures an actual pre-rework source commit `1d8cc273b517002fd5a4a414617851fc465f51fc`, documents three opportunities and two viable concepts, runs `assess`, then `prove` on the same five source-preservation and improvement scenarios. Source-only proof is **not** substituted for loaded real images, full browser tests or production validation.

## Release status
Implemented on a dedicated branch. Full CI, Foundry proof, browser screenshots and manual visual inspection are prerequisites to merging. The prior v2 science API and all ads are unchanged. No assertion that CTR or AdSense has improved. One next action after PR: inspect all four live-image browser screenshots, fix any contrast/visual defects, then accept the full CI evidence.
