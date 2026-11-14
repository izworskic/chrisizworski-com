# Discoverable photography in U.P. Waterfall Explorer results

Date: November 14, 2026.

## Problem
The waterfall explorer had 40 fully provenance-verified photographs in dedicated guide pages but the 80-entry search results were text-only. Visitors choosing a day trip could not see which cascades looked interesting without opening every guide.

## Implemented
- Insert one compact **actual-source waterfall photograph** beside each of the 40 image-verified waterfall cards in the existing HTML-first list. The 40 unphotographed cards remain text-only, with no duplicate or placeholder scenery.
- Match by the curated waterfall `data-id` to exact `data/up-waterfall-photo-provenance.json` IDs, not name similarity or a location guess.
- Use original verified image URL and complete author/source/license in the card's visible tiny caption. Each photo itself links to the actual guide. Preserve headings and first text links before image links.
- Every thumbnail is native browser lazy-loaded and async decoded with low fetch priority. Image ratio preserved with object-fit:contain (no editorial crop). Compact 122px width on desktop and 108px on narrow phones.
- Keep existing access badge, stop-saving button, map pin, public parking/tourism source links and detail control. Float clearing confines thumbnails to their own cards. Native HTML still works without JS.
- Keep original 3-photo hero gallery and the map beneath it.
- Add regression coverage proving exact 40/40 split, one-to-one ID/source/alt/licensing, correct source links and no fallback photos for unresolved destinations.

## Boundaries
No change to the 40 guide pages, source ledger, itinerary engine, map coordinates, public access cautions, ads, canonical intent, title or meta description. No runtime network dependencies or new API calls. The main hub was already modified on 2026-11-14, so its `dateModified` and sitemap lastmod remain the same.

## Verification
Run full repository test gate, waterfall mobile browser smoke (with list visible and scrolling), SEO/name protection, Rust source parity and Vercel preview. Check live page has 40 card previews and that first-screen/map controls remain functional after deployment.

A photograph documents an earlier scene, **not** real-time current opening or water flow. Source description/rights and photo credit are always linked.
