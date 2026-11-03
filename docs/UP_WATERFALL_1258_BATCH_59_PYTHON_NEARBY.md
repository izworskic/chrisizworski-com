# U.P. Waterfall Explorer · B59: Python nearby geographic intelligence

**November 3, 2026 · Issue #1258 · scope: visitor discovery + deterministic offline geographic pipeline.**

## Visitor experience

The hub now lets visitors choose a curated waterfall and see six geographically nearest, source-reviewed destinations within 10, 25, or 50 **straight-line miles**, with a guide, documented arrival source, waterfall map focus and existing six-stop shortlist action. A short map separation does not mean a short drive or legal connecting trail. It does not navigate to raw waterfall coordinates.

## Python implementation

Pure-standard-library Python uses html.parser, json and math to cross-check 74 curated waterfall IDs, map positions and access status between the canonical data and published page cards; exclude closed or incomplete visitor-approach records; and build deterministic Haversine pairs once at editorial time. It outputs a static same-origin JSON index. No runtime Python, database, Redis, Supabase, paid API or separate map key.

Commands:
- Build: python3 scripts/build-up-waterfalls-nearby.py
- Check exact generated output: python3 scripts/build-up-waterfalls-nearby.py --check
- Node regression: node --test tests/up-waterfalls-b59-nearby-python.test.js

Existing catalog source review is dated November 2, 2026. This geographic index is not a live trail-open or flow forecast. Change the canonical inventory and published visitor-approach evidence intentionally before new sites are included; never whitelist a GIS pin.

## Initial eligibility

74 existing curated destinations; 68 meet the exact currently published visitor-arrival verified and non-closed criteria. Six are intentionally excluded: Munising Falls, Sandstone Falls, Lower Silver Falls, Silver River Falls, Twin Waterfalls Memorial Preserve, and Tahquamenon Falls. Tahquamenon has a separate comprehensive park planner but its hub arrival flag is "specialist", not verified within this same card contract. 94 additional unresolved GIS features remain geographic-only research, not suggestions.

## Experience OS acceptance

1. All 68 suggested stops must match a current curated card with documented verified arrival; no closed, research or unsupported parking locations.
2. Each geodesic edge within 50 miles is deterministic and symmetric. Tests independently recompute distances to 0.051 mile tolerance.
3. User can discover nearby source-reviewed destinations and move them into the existing map/shortlist without any invented route, parking coordinate or drive time.
4. Responsive layout, contrast, keyboard focus and original evidence links remain visible.
5. Existing sitemap, canonical, person attribution, adsorption safeguards and map provider remain intact. DateModified is the actual new hub revision date.

**Release gate:** exact-head Node regression, full npm run verify:all, waterfall mobile/map smoke, review checks, successful deployment and live page verification. No traffic or CTR increase is claimed before measurement.
