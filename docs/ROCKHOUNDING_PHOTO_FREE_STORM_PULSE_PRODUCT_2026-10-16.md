# Michigan Rockhounding — photo-free Lake Superior Storm Pulse

**October 16, 2026.** This update answers the product question directly: a rockhounding **weather and shoreline conditions research tool does not need photos** to track the rise, peak, retreat, and repeated bursts of measured offshore waves. Independent photos are an optional science-calibration track, not part of the visitor experience or a prerequisite for meaningful wave-history features.

## The visitor-facing tool now leads with what the measurements do show

The noindex prototype at `/rockhounding-lab/` now leads with **Read the lake's storm story**, using original 2026 GLOS Grand Marais Spotter wave records from the existing source registry:

- **5,243 original wave observations** over **111 dates** from June to October 2026; show the **eight** better-sampled original offshore wave episodes and their actual measured peaks.
- An interactive eight-bar SVG timeline (historical significant wave heights, meters) and episode selector, chronologically ordered newest first. The original October 12, 2026 event reached **2.57 m** measured offshore, while October 5 reached **2.51 m**. These are source observations, not visitor-finding scores.
- Interpret each *original measured wave episode* as **“Waves eased afterward”**, **“Waves built again”**, **“Decline recorded”**, or **“Elevated-wave episode”** using only the existing measured GLOS lifecycle flags. Source-backed recovery versus renewed waves is meaningful context for deciding **when to look more closely at lake conditions**. No guesses about the amount of new sediment or agates are introduced.
- An explicit *dated wave-direction snapshot* from the October 14 buoy reading **329.11° wave-from** versus the **336.74° historically charted Agate shore-facing** direction. The angular difference is **7.63°**; this is a geographic illustration, **not** a locally modeled beach breaker height or a new stone probability.
- Separate Agate Beach (open Lake Superior coast) and Bayshore Park (sheltered harbor setting) cards, both linking to the official township information. The offshore station's height is never assigned as a measured Bayshore harbor wave height.
- Primary calls to **current NWS weather**, **current NWS marine alerts**, and **original GLOS measurements**. Archived 2026 history is date stamped. A recent alert check must precede any current-condition action.

Visitor-facing copy is **positive and practical**, such as “See when Lake Superior waves built, peaked, eased, and returned.” We do not repeat apologies or prominent “we cannot confirm the rocks” messaging. The source dates, appropriate physical domains and basic current-weather/permission context remain clear and honest.

## Photos moved out of the normal tool flow

Historical photo pairing, webcam/media searches, original camera GPS, image rights, USACE bathymetry and other detailed investigations are preserved **inside a collapsed research archive** on the same page. They remain available for transparency and future R&D, but the default main user flow does not load a required before-and-after image pair, ask the user to upload photos, or block wave-history presentation on a photo evidence gate.

No ad implementation, public canonical URLs, sitemap, third-party image requests for the primary section, scraping quota, paid API keys or visitor-time external-weather requests were added. The latest available GLOS wave history is a **frozen 2026 research snapshot**, not a live present-day surf or safe-access bulletin.

## Architecture

- `lib/rockhounding/photo-free-storm-pulse.cjs`: source-validated pure GLOS measured-wave product engine; rejects missing source provenance and impossible peaks, and propagates the pre-existing rock/permission/safety gating flags.
- `scripts/rockhounding/build-photo-free-storm-pulse.cjs`: deterministic static-local JSON build and CI comparison.
- `public/rockhounding-lab/storm-pulse-2026.json`: measured-wave, wave-lifecycle, open versus harbor setting and official-source content only; **no image/photo dependencies**.
- `public/rockhounding-lab/index.html`: main responsive, accessible wave bars and selector; older photo research moved into optional collapsed appendix while retaining its tests and science links.
- `tests/rockhounding-photo-free-storm-pulse.test.js`: independent original-source recomputation, original event/date direction and safety boundaries, tamper checks and primary visitor experience DOM claims.
- `.github/workflows/rockhounding-photo-free-pulse.yml`: primary product and full rockhounding regression tests.

## Release stage

This delivers the photo-free **research tool** without inventing agate detection. The existing 6-hour research collection workflow writes its source-verified observations to the separate history branch; production-current condition publication is a separate deployment/integrity step. Until then the interface correctly labels the history dates. Visitor safety still requires current NWS alerts and posted local access and collecting rules; the tool does not imply that a lull at the offshore buoy proves a safe shoreline.
