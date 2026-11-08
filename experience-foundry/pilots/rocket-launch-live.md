# Foundry pilot 02: Rocket Launch Live | source-first next verification

**Run date:** November 8, 2026  
**Foundry:** v0.2.0, `discover` → `plan` custom handoff → product-specific implementation → test → CI → release proof  
**Owning repo:** `izworskic/chrisizworski-com`  
**Existing canonical:** https://chrisizworski.com/national-tools/rocket-launch-live/  
**Source implementation:** `api/rocket-launch-usa.js`, `public/synced-national-tools/rocket-launch-live/`, `public/assets/rocket-flight-desk.js`  
**Foundry runtime:** `node scripts/experience-foundry.mjs`; the `rocket-foundry-pilot.yml` workflow actually executes `discover` and `plan`, validates the isolated packet and retains it as a GitHub Actions artifact. That is a bounded offline development run, not an AI agent or a production publisher.

## Problem and pre-run evidence

The national Rocket Flight Desk was live and source-bound across six regions. Its three questions, pad/when, shore/access, and sky/weather, were visible. Its national schedule comes from a signed shared LL2 snapshot; separate NASA, military, city, visitor-center and NWS evidence lives lower down. The first-screen actions were generic: locate rocket, inspect viewing options, change coast, official link, region guide. A newcomer still had to determine which unresolved verification is the **first** thing to do about the selected mission. A schedule, even with a precise hour, does not authorize entry.

**Foundry blocker:** The national rocket canonical and all six region guides existed in the national hub and source code but were absent from the central `benchmarks/tool-network-registry.json`. That prevented `foundry plan --owner rocket-launch-usa` from resolving the actual product and prevented `discover` from describing its connected handoffs. The registry now gives the national page one unique owner and six distinct regional specialist intents, with two-way evidence/access handoffs and a cannibalization rule. The Michigan/Great Lakes-specific `/tools/` directory is untouched; the rocket card already exists at `/national-tools/`.

**Behavior baseline:** November 5 GSC Web export for October 7–November 3: 29 impressions, zero clicks, average position 20.41 on the national rocket canonical. This predates both the Flight Desk and Foundry step. On November 7, PR #1560 repaired Vercel route pageview tracking and added real mission/map/source events. This Foundry run does **not** claim an engagement, CTR or revenue improvement.

## Visitor question

“I selected a rocket launch. What evidence is still missing, and which official source or regional access guide should I consult before deciding to travel?”

**Useful completed action:** Read the single next verification relevant to the selected mission and follow the linked primary range authority or existing regional viewer. A click is an information handoff, never proof of a legal viewing trip.

## External comparison and source-rights inventory

Checked November 8, 2026 from public pages:

1. **[NASA Kennedy Space Center Visitor Complex launch viewing](https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing/)**: Official visitor-complex rules explicitly say missions are announced as official dates and viewing products depend on event, pad and range approval. Even purchased viewing does not guarantee a launch. Source type: public official admission guidance; links only, no scraped ticket availability or imported inventory. Authority: KSCVC for its own venue only, **not every Florida viewing location or spaceport**.
2. **[Kennedy launch viewing locations](https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing-locations)**: Official explanation of variable availability by mission and launch pad, and the restricted Gantry at LC-39 for missions originating at LC-39A/B. The page is an **access reference, not an open-now report**; no inferred parking or drive directions.
3. **[Spaceflight Now launch schedule](https://spaceflightnow.com/launch-schedule/)**: Editorial schedule, NET/TBD, mission detail and streamed-event context. Product benchmark only; no copying imagery/UI, dates or live feed. Differentiation: its calendar does not independently establish lawful local access.
4. **[NASA Wallops launch viewing visitor guidance](https://www.nasa.gov/wallops/visitor-center/view-a-launch-from-nasa-wallops-visitor-center/)**: Official visitor-center event opening can differ from normal operating hours. Link only, no permanent open-now inference.
5. **[Launch Library 2](https://ll.thespacedevs.com/)**: Third-party calendar already consumed by the authoritative server-side signed snapshot; no new API, redistribution or query is introduced by the Foundry pilot.
6. **[National Weather Service](https://www.weather.gov/)**: Existing independently collected sky observations/forecasts are *not* rocket-range approval or a guarantee of seeing the flight. No new provider, interpolation or new weather model is introduced.

Existing historical Vandenberg photo and original source credit are unchanged. All reference URLs are cited as guidance/competitor evidence, not as proof of today's launch, tickets, beach opening or weather.

## Two competing concepts and decision

**A / Countdown-to-GO theatre (rejected):** Expand the time column into a big live-looking countdown with a red/yellow/green readiness dial and simulated route. It would put an unsourced “GO” impression above independently unknown access/sky, contradict month/day-only LL2 precision and duplicate launch calendar competitors. It would also be visually similar to other generic timing dashboards.

**B / Mission evidence handoff (selected):** Keep the existing distinctive `Pad → Shore → Sky` first-screen mission narrative. Just below the three source rails, show one high-priority **“Next evidence to resolve”** action derived from the already selected UUID, region, precision and source failure states. The CTA points to an existing official authority or the correct regional guide; it never claims that a launch, beach or ticket is cleared. There is no new template, API, geolocation, countdown, storage or public page. This adds the missing final step to the existing trip decision without introducing redundant charts.

## Local originality comparison

**Compared to the existing `flight-tracker`:** The latter locates an inbound aircraft by flight number; it tracks operational movements. Rocket's source-verification action assesses three *independent kinds of evidence* plus restricted spectator access. It never presents a rocket as a continuously tracked aircraft.

**Compared to `st-lawrence-seaway`:** The Seaway is a lock and vessel passage narrative. Rocket's selected launch UUID remains tied to one bounded future schedule, with exact-time precision, mission-specific viewing security and potential hold/scrub. The launch-site rocket pin is specifically **not** a public viewing point. The experience shares source-attribution discipline but not the Seaway passage ledger or page skin.

## Causal state matrix, authored before the release gate

| State / case | First-screen answer | Actual next source action | Failure/safety gate |
| --- | --- | --- | --- |
| Precise scheduled Florida A, recent provider | Date and pad are tentative; public viewing still not confirmed | Florida specialist for launch-day ticket and NPS checks | Calendar != KSC event opening, no “GO” |
| Select B with day-only NET | Exact time missing, sky planning premature | Official range/mission source, or existing specialist fallback | No synthetic midnight departure time |
| Reverse B → A | Access verification action returns and correct coast persists | Same Florida guide | No old B decision retained |
| Stale provider or regional feed unavailable | Original time cannot be treated as current | Official range authority | No stale GO or admission |
| Held or scrubbed mission | The earlier arrival plan is not valid | Official range/operator notice | No new attempt assumed |
| Starbase official beach closure reported | Dated city closure is the priority | Starbase regional closure/access guide | No map route to pad or assumed alternative |
| Alaska/Hawaiʻi restricted-range listing | Public launch-viewing area not verified | Restricted-range specialist source desk | No claim that the installation is publicly enterable |
| No mission in bounded schedule | No current selected launch, *not* an inactive range | Current range authority, not guessed rocket | Source absence does not equal cancellation |
| National schedule completely unavailable | No region/time is verified | NASA public launch list, explicitly not comprehensive | No stale, invented rocket or visitor GO |
| Keyboard / screen reader | Action and explanation are native link/text, 44px target | Tab/Enter equivalent | No mouse or animation prerequisite |
| No JavaScript | Static default explicitly says launch is unverified; no-JS regional source links remain | Existing static source links | No fetched mission assumed |
| Missing image, tiles or external NWS | The next evidence action remains readable separately from optional media | Working anchor/link | No blank-image, tile or API prerequisite |
| Annual rollover | No season-specific hardcoded results, selection derives from source | Next real feed record | No 2026 calendar freeze |

## Source and implementation ownership

- **Data and mission choice:** Existing `/api/rocket-launch-usa`; unchanged. Current response remains the only selected mission source. Precise pad and sky remain qualified independently.
- **View model:** Pure `nextCheck(data)` in `public/assets/rocket-flight-desk.js`. It explicitly prioritizes stale/hold/unavailable over travel/access, tentative time over forecasting, and always treats a currently published target as access-not-yet-authorized.
- **UI:** One compact `rl-flight-next` action beneath the three source rails. Responsive, native anchor, reduced motion, good contrast. No reused Field Notes/Passage Log recipe is forced.
- **Measurement:** Existing privacy-limited `Rocket Viewing Next Step` event, coarse `region/surface/destination` only. No mission IDs, GPS, cookies, URL or query parameters in event properties.
- **Refresh and cost:** No new server requests or runtime costs, no background work, no annual maintenance, no Redis or Supabase. If API vanishes, default clearly falls back to public NASA schedule with an explicit coverage warning.
- **SEO and layout:** No new indexable page, title, H1, description, canonical, Person ID, structured data, sitemap or ad modification. National discovery card remains owned by `scripts/ensure-rocket-usa-national.mjs`.
- **Release:** The offline CLI only creates an isolated planning packet. The PR, owner full CI, browser screenshot review, production and public HTML/assets must each be independently verified. A compiled plan is *not* automatic product acceptance.

## Measured release gates

**At brief creation:** Implementation exists on feature branch; source fixture/unit, Foundry CLI, cross-tool registry benchmark, full owner CI, four-breakpoint Chrome tests, preview, production, live smoke and visitor outcomes **NOT VERIFIED**. Update this paragraph only with actual links after the exact-head results. Do not turn a checked script into proof that users navigated the next source.

**One future decision:** When enough non-test pageviews and next-step events accumulate, measure whether the newly prioritized CTA drives real source/guide handoffs, separately from page acquisition. With low visitor counts, optimize discovery before adding another novel rocket interaction.
