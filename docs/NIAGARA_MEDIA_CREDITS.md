# Niagara Falls Today V3 photographic source and release gates

- Original: [Horseshoe Falls and Niagara River, Niagara Falls 2026.jpg](https://commons.wikimedia.org/wiki/File:Horseshoe_Falls_and_Niagara_River,_Niagara_Falls_2026.jpg)
- Photographer: Chicken4War. Photographed August 19, 2026, from the Ontario shoreline; the subject is Horseshoe Falls and the Niagara River.
- License: [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/), including permitted commercial use subject to attribution and share-alike terms.
- Transformation: crop and resize to 1600×900 JPEG for hero framing; derivative photograph released under CC BY-SA 4.0. No synthetic scenery and no licensing claim for other works.
- First-party asset: `/assets/niagara-falls/photos/horseshoe-2026.jpg`. Never point the published HTML at an untested Commons thumbnail or Adobe Stock preview.
- Import script: `scripts/fetch-niagara-hero.cjs`, `scripts/optimize-niagara-hero.py`. Branch-only GitHub Action adds binary asset to PR; unit test hard-fails without real JPEG.
- On-site delivery must be tested at the actual public asset URL for HTTP 200, image/jpeg and decoded 1600×900 image before calling live. Responsive screenshot review: 375px, 768px, 1440px. Browser image loading, no-image fallback, operator film fallback.
- Video: [Niagara Parks official Journey Behind the Falls!](https://www.youtube.com/watch?v=DlMgURteL3E), shown by click only for Canadian Table Rock plans, without claiming that Journey is scheduled or included. Do not copy official video or restricted Niagara Parks media-library photo assets.
- Editorial contract: `public/assets/niagara-falls-guide.js` supplies place-specific landscape interpretation **after** the deterministic planner approves selected stops. It makes no independent opening, border or accessibility claims.
- Controls: one hero visual; no duplicated stop pictures, no static four-photo grid; mobile planner before long content. Preserve canonical, Person, generator rules and Auto Ads loader.
