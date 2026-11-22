# ShoreFeel visual investment, 2026-11-22

**Mode:** Experience Investment IMPLEMENT with Experience OS v1.2.1, Experience Foundry improvement rationale, and Playwright Browser QA. Owning repository: `izworskic/chrisizworski-com`.

## Visitor decision and baseline

**Job:** A visitor who has already chosen a named Great Lakes beach wants to know the currently modeled air feel near that beach before deciding what to wear, whether to go, and which official conditions/advisory source to check.

**Baseline screenshots:** Actual mobile live page screenshots inspected at 390px, Grand Haven and Park Point on Nov 22. Michigan's generic 600px-tall Sleeping Bear photo occupied nearly the entire first phone screen. The numeric model reading was below the photo, source ribbon, and unrelated beach status cards; a tiny temperature link was not adequate. The U.S. page put the number near the top, but a large oval pseudo-element crossed the valid-period text. The issued/valid time also wrapped into oversized repeated prose. The owner reports AdSense placing ad creatives within hero imagery. That account-controlled in-page injection cannot be audited for all users with an ad-free test browser.

## Two serious directions

1. **Photo-led banner with a floating thermometer.** A photo, translucent weather panel, and safety/source strip across the hero. Weak here: 50 Michigan destinations share one representative Sleeping Bear image; adds visual competition to the number; retained image region can still intersect Auto ads. Requires place-specific image rights to be truthful. Rejected until exact-place images are sourced.
2. **Condition-first field instrument plus supporting landscape.** Named beach in compact heading, high-contrast temperature within first viewport, air/wind and issue time alongside, short interpretive meaning below, then separate real photo and official safety report. When source fails, show plain unavailable text, never a numeric substitute. Selected: smallest coherent implementation and best for visitor's immediate question.

Comparison: Michigan Beach Report is a *destination comparison and swimming advisory* tool with map/ranking; ShoreFeel is an *individual place air-comfort read*. Michigan Snow Totals is an *accumulation and ranking* visual; ShoreFeel prioritizes a single model reading, wind interpretation and offshore evidence rather than bars or snowfall maps. Both experiences intentionally reuse typography and source conventions but not screens or interactions.

## Implementation

- **50 Michigan pages:** authoritative `scripts/generate-beach-pages.mjs` and committed generated HTML now put `.shorefeel-primary` immediately inside main, before BeachGuard/NWS score and ancillary source cards. Explicitly sizable modeled apparent air figure; secondary wind and source time; water and lake explanations below. A credited photograph stays available in a dedicated `.shorefeel-landscape` figure *after* primary conditions and other evidence, with an honest caption that this photo shows Sleeping Bear Dunes, **not** the named beach. No giant generic hero with an ad over it.
- **16 other U.S. + 18 Ontario pages:** shared stylesheet `shorefeel-beach-detail.css` removes the obscuring oval and large gradient and makes the modeled comfort number dominant. Shared client uses a concise UTC forecast-hour label; source and expiry rules remain unchanged.
- Existing official advisories, public access warnings, Canada ECCC licence, analytics, image attribution, Person ID, canonicals, sitemaps, Google Maps links and map exploration remain.
- No additional weather source, paid service, Redis, installed production package, extra API, AdSense loader change, user tracking or new client framework.

## Advertising truth and the remaining account step

All source changes avoid explicit ad tags, altering the AdSense auto loader, hiding injected ads or claiming the account settings have been changed. Moving the photo out of the hero and making the answer a separate region reduces opportunities for an in-page ad to appear *in the middle of a hero image*, but it does **not** guarantee that AdSense itself will not select an intrusive placement.

Per `docs/AUTO_ADS_NETWORK.md` and official AdSense guidance (https://support.google.com/adsense/answer/12626543), the owner should verify **AdSense → Ads → site Edit → Excluded areas** on representative Michigan, U.S., and Canada beach pages and exclude the top forecast/photo sections as needed. Stable selectors: `body[data-beach-report-page="detail"] .shorefeel-primary`, `.shorefeel-landscape`, and `.shore-answer`. **Excluded areas control in-page Auto ads only**, not anchor/vignette overlay formats. Preserve Auto ads sitewide and user's preferred anchor/vignette formats, no global disable. Account-side confirmation and real filled-ad overlap testing remain UNVERIFIED until tested with actual ad delivery.

## Technology fit

- HTML and CSS: **keep**. Fast, indexable, keyboard and no-JS source guidance with purposeful hierarchy.
- Browser JavaScript: **keep existing** to update one actual modeled result, time and failure state.
- Node weather endpoints: **unchanged**. They already supply source-qualified forecasts and official next actions.
- Python: **reject** for this visual issue; useful offline only if model calibration undertaken independently.
- Rust/WASM: **reject**; no profiled performance bottleneck or numeric improvement.
- Java: **reject**; no JVM owner or advantage for reading typography/AdSense layout.
- New frameworks, WebGL, 3D and fake charts: **reject** as added weight rather than a better answer.

## Verification and release gate

Run existing `tests/shorefeel-every-beach.test.js`, `scripts/verify-shorefeel-network-browser.cjs`, and `scripts/verify-shorefeel-every-beach-browser.cjs` at 360, 390, 768 and desktop widths with source-good and source-missing fixtures; inspect actual screenshots, font size, content order, photo placement, overflow, absence of oval, source timestamp, keyboard and lack of new manual ad slots. Also require full `npm run verify:all`, source hash audit and production public-page checks. Code test evidence is **not** an actual AdSense account verification and is **not** a measurement of visitor outcomes.

No automatic merge. Rollback is the parent commit's source generator/styles and regenerated pages.
