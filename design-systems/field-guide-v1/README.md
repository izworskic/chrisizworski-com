# Field Guide Editorial Design System — v1.0.0

**Reusable design language for places worth visiting, without losing the decision-making value of the tools.**

Stable identifier: `FIELD_GUIDE_V1`  
Live reference: https://chrisizworski.com/michigan-destinations/  
Owner: Chris Izworski  
Source home: `izworskic/chrisizworski-com/design-systems/field-guide-v1/`  
Status: **usable, portable, not a new production route**

## Say this next time

> **Use FIELD_GUIDE_V1** for [new page/tool]. Make it photographic, destination-led, mobile-first, with a map and genuinely useful condition links. Research and implement it; run the full benchmark before merging. Do not modify AdSense.

Or simply say: **"Use my Field Guide design standard."**

An implementation agent must first read `AGENTS.md`, `docs/DESIGN_STANDARD.md`, `docs/PHOTO_STANDARD.md`, `docs/QA_SCORECARD.md` and, if a map is needed, `docs/MAP_AND_TRUTH.md`. Treat this as a *visual/experience system*, **not** a license to copy identical layouts or content across tools. Build around the new user's decision.

## What's inside

| Resource | Use |
|---|---|
| `AGENTS.md` | Rules for coding agents and repeated invocation |
| `manifest.json` | Stable name, version, reference, components and portability |
| `docs/DESIGN_STANDARD.md` | Principles, tokens, layout patterns, accessible interaction |
| `docs/PHOTO_STANDARD.md` | Location accuracy, rights, attribution, crop & photo tests |
| `docs/MAP_AND_TRUTH.md` | CARTO integration, source integrity, fallbacks and date language |
| `docs/QA_SCORECARD.md` | Scored acceptance standard and release gates |
| `docs/IMPLEMENTATION.md` | Adoption steps for new or existing tools |
| `starter/index.html` | Working static, photo-first example; **noindex until adapted** |
| `starter/field-guide.css` | Portable scoped visual primitives and mobile composition |
| `starter/field-guide.js` | Progressive-enhancement filters, map and failure handling |
| `starter/vendor/leaflet-1.9.4.css` | Locally served Leaflet stylesheet (BSD-2-Clause) |
| `scripts/check.mjs` | Dependency-free contract assertions |
| `package.json` | `npm test` for the portable package |

## Separation of concerns

This standard is **not** the Michigan Adventure Finder's production source. That stays in `public/michigan-destinations/` and `public/assets/michigan-destinations.*`. The files here are an independently portable reference implementation, designed to migrate to their own repository whenever a GitHub create-repository action is available.

Do **not** deploy `starter/index.html` unchanged. It deliberately uses `noindex,nofollow`, illustrative source photos, three sample destinations, and a deliberately general heading. Adapt place names, imagery, links, maps, image licenses, data sources and canonical for each real project. The sample never represents live weather, open access, wildlife or safe ice.

## Quick verification

```sh
cd design-systems/field-guide-v1
npm test
```

The starter is plain HTML, CSS and JavaScript. For manual browser testing from its root, use any local static server; never assume file:// will mimic deployed same-origin API routes. External Leaflet JS and remote photos need network access. If JS, image delivery or the map fails, the static descriptions, credits and useful links must survive.

## Reuse without sameness

Retain: authentic photography, thoughtful editorial hierarchy, direct destinations, meaningful first-screen choice, quietly visible credits, accessible map, and separate evidence links.

Vary: hero arrangement, card sequence, amount of prose, image composition, activity inputs, map placement, data graphics, and narrative pacing. No 20-card boilerplate grid merely because the example has cards.

See `docs/QA_SCORECARD.md`: a page is not ready because the build is green; inspect desktop *and* mobile captures with loaded images, map tiles, attribution, ad interference, and the actual task.
