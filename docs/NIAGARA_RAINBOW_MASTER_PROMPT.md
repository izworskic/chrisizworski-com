# Niagara Falls Rainbow Predictor — Master Execution Prompt

## Mission
Build a production-quality decision engine that answers one concrete visitor question:

**Will I see a rainbow at Niagara Falls, what time should I go, and where should I stand?**

Do not build a generic weather dashboard. Weather, astronomy and geography are inputs; the output is a visit decision.

## Product contract
The first useful screen must answer, from live data:
1. Today's rounded rainbow opportunity score.
2. The strongest viewing window or best instant if no sustained window clears the threshold.
3. The best public viewpoint and the mist source/falls it uses.
4. Confidence and a one-sentence recommendation.
5. Source freshness.

Never ship synthetic live weather. If live data fails, withhold the score and expose a retryable degraded state.

## Data and model
Use Niagara Falls as a fixed-location physical model. Fetch the U.S. National Weather Service `/points/{lat},{lon}` endpoint server-side and follow `forecastGridData`. Consume sky cover, wind speed, wind direction, precipitation probability, relative humidity and visibility where available. Cache upstream requests conservatively and expose fetch/update times.

Compute the sun's azimuth and elevation at 10-minute intervals in the Niagara Falls local timezone. Model the primary-rainbow cone at approximately 42 degrees from the antisolar point. For each public viewpoint and each mist source, compute line-of-sight geometry to the effective mist plume. Shift the mist plume downwind as a bounded function of wind speed. Score the angular fit, then combine it with modeled direct-sun availability, mist/wind suitability and visibility/weather interference.

Seed at minimum:
- Terrapin Point
- Prospect Point
- Luna Island
- Table Rock
- Queen Victoria Park

Seed mist sources for:
- Horseshoe Falls
- American Falls
- Bridal Veil Falls

The score is an **experimental opportunity score**, not an empirically calibrated probability. Display rounded five-point increments and state that small cloud/mist changes can invalidate a forecast. Do not display decimal-place certainty.

## Decision logic
Generate the model every 10 minutes during daylight for today and the next four days. For each instant, choose the strongest viewpoint/falls pair. Group consecutive strong instants into viewing windows, preserve the peak instant, and rank up to three windows. If no sustained window qualifies, still return the day's best instant and viewpoint. If a later day is materially better than today, tell the user.

## UX
Use a large, credible Niagara Falls rainbow hero photograph. The page should feel like an editorial travel/nature product, not an administrative dashboard or AI template.

Required sections:
- Hero + live decision card
- Today's time curve
- Ranked viewpoints
- Four explainable components: optical geometry, direct sunlight, mist + wind, visibility
- Five-day outlook
- Secondary/collapsible model explanation
- Source and freshness block
- Search-intent FAQ

Design mobile-first for 390px. Use semantic HTML, keyboard-visible focus, WCAG-AA-oriented contrast, reduced-motion support, stable media dimensions and a clear error/retry state.

## Search and entity contract
Canonical intent: **Niagara Falls rainbow forecast / best time to see a rainbow at Niagara Falls today.**

Canonical URL:
`https://chrisizworski.com/national-tools/niagara-rainbow/`

Requirements:
- Query-first title <= 60 rendered characters.
- Meta description <= 158 rendered characters.
- Open Graph and Twitter large-image metadata.
- Full `Person` JSON-LD node with `@id` exactly `https://chrisizworski.com/#person`.
- WebApplication and FAQPage structured data where valid.
- Visible Chris Izworski branding.
- GA4 `G-Y5D2V2W7HN` inherited by the site build injector.
- No thin date/city doorway pages.

## Value function
Release score is 100 points:
- Decision clarity: 20
- Data + physics integrity: 25
- Usefulness: 15
- Mobile + accessibility: 10
- Visual quality: 10
- Resilience + freshness: 10
- SEO + schema + analytics: 10

Target: **>= 92/100**.

Until empirical Niagara rainbow observations exist for calibration, cap data + physics integrity at 22/25. This keeps the release honest about model certainty.

## Loss function
`L = 100 - V + 100 × hard-veto-count`

A release fails regardless of numerical score if any hard veto is present:
- fake live data or hard-coded live score
- no best-time answer
- no best-viewpoint answer
- missing GA4 production contract
- no degraded-data state
- broken mobile experience
- unsupported precise probability language

## Benchmark scenarios
Automated tests must cover:
1. Clear-sky live-grid fixture returns five days, a best instant and ranked viewpoints.
2. Heavy overcast materially suppresses the score.
3. NWS failure produces HTTP failure state with `noSyntheticFallback`.
4. Displayed scores are rounded rather than falsely precise.
5. Page contains canonical/entity/schema/hero/decision contracts.
6. Browser UI contains timeout, retry, source freshness, timeline, viewpoint ranking and five-day rendering.
7. Mobile/accessibility guards exist.

## Release sequence
1. Implement on a feature branch.
2. Run the Niagara tests and benchmark.
3. Open a PR; do not bypass repository-wide gates.
4. Verify the Vercel preview UI and live API response.
5. Confirm representative built HTML contains GA4.
6. Only after the live route is proven should it be added to national-tool discovery/sitemaps.
