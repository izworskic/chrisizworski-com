# Niagara Border Crossing — Value/Loss Rebuild

Date: 2026-10-04

## Product objective

The tool exists to answer one human question quickly:

> Which Niagara crossing should I use for this trip, and can I trust that answer enough to act on it?

For the normal passenger-vehicle traveler, the useful answer must be reachable in no more than two intentional taps: direction, then corridor. Specialized travelers may need one additional choice because eligibility materially changes the answer.

## Personas

1. Passenger car/SUV traveler going to Canada.
2. Passenger car/SUV traveler going to the United States.
3. Niagara Falls visitor deciding between Rainbow and another crossing.
4. Buffalo/Fort Erie traveler naturally using Peace Bridge.
5. Lewiston/Queenston traveler naturally using Lewiston–Queenston.
6. NEXUS auto traveler who may legitimately use Whirlpool Rapids.
7. Commercial truck driver.
8. Vehicle towing a trailer / special vehicle.
9. Pedestrian or bicycle traveler.
10. Traveler who only wants to visually confirm queues before committing.

## Value function — 100 points

### V1. Fast decision — 20
- Normal passenger flow needs <=2 intentional choices.
- Current recommendation remains visible immediately after those choices.

### V2. Decision clarity — 20
- One dominant answer, one short reason, one current freshness statement.
- Alternatives are secondary, not four equal competing cards above the fold.

### V3. Trust and reliability — 20
- No blocked map/API surface.
- No invented camera or eligibility data.
- Source failures degrade explicitly rather than pretending precision.

### V4. Interaction locality — 15
- Camera click opens the camera where the user clicked it.
- No scroll jump to another section and no context loss.

### V5. Readability/accessibility — 15
- Primary text contrast >= WCAG AA for normal text.
- No pale-blue text on light surfaces.
- Critical mobile text is >=14px; decision copy is >=16px where practical.

### V6. Progressive disclosure/persona fit — 10
- Normal passenger path is simple.
- NEXUS/truck/tow/walk/bike controls exist but do not dominate the normal path.
- Long narrative, rules, source diagnostics and full comparisons are collapsed until requested.

## Loss function

Hard losses are release vetoes even if total score is high.

| Failure | Loss | Veto |
|---|---:|---:|
| Map shows API blocked / tile-auth error | -40 | yes |
| Camera marker scrolls user away from map | -25 | yes |
| Primary text is unreadable / low contrast | -20 | yes |
| Normal passenger needs >2 mandatory choices | -15 | no |
| Four crossings are presented as equal clutter before the answer | -10 | no |
| Long narrative/detail is open by default | -10 | no |
| Specialized-traveler controls overwhelm normal passenger path | -10 | no |
| Camera or crossing is invented when source does not exist | -30 | yes |
| Stale/unavailable source is silently treated as current | -30 | yes |

## Baseline audit of the current production design

Observed structural losses before this rebuild:

- Keyed CARTO tile URL can display `API blocked`: -40 veto.
- Map camera action calls `scrollIntoView()` on the separate camera viewer: -25 veto.
- Light-blue and very small text survives in important mobile surfaces: -20 veto.
- Direction + traveler + corridor compete as equal primary controls: -15.
- Journey, comparison, map, camera, eligibility, approach, weather and source sections are all exposed as full sections: -20 combined clutter loss.

Baseline product score: **approximately 20/100 and FAIL because hard vetoes are present.**

## Target

Release only when:

- benchmark score >= 90/100;
- zero hard-loss vetoes;
- normal passenger path is <=2 taps;
- map contains Peace, Rainbow, Whirlpool Rapids and Lewiston–Queenston;
- nine official camera points remain available without inventing a Whirlpool camera;
- camera interaction stays in-place in a modal/lightbox;
- primary text uses high-contrast dark text on light surfaces and white text on dark surfaces;
- secondary detail is progressively disclosed.

## Execution prompt

Operate as a combined principal product engineer, transportation decision-product designer, senior frontend engineer, mobile UX designer, accessibility engineer, reliability engineer and skeptical product critic.

Do not preserve complexity merely because it already exists. Preserve authoritative decision logic, source hierarchy and eligibility rules, but rebuild the interaction around human value.

1. Audit the current Niagara page against the value and loss functions above.
2. Fix every hard-loss veto before aesthetic work.
3. Replace the blocked keyed CARTO basemap with the proven OpenStreetMap Leaflet tile pattern already used successfully elsewhere in the repository.
4. Keep all four bridges visible. Keep exactly the official camera set; do not invent a Whirlpool road camera.
5. A camera click must open an in-place camera modal/lightbox. Never scroll the user to another section.
6. Make the normal passenger flow two taps: direction, then natural corridor. Passenger car/SUV is the default traveler type. Put NEXUS, commercial, tow, bus, pedestrian and bicycle behind an explicit “change traveler” control.
7. Keep one dominant recommendation and short reason. Push full comparisons and narrative below progressive disclosure.
8. Make all primary text comfortably readable on a phone. No pale blue on white/light backgrounds and no critical 8–10px copy.
9. Preserve authoritative backend decision semantics and stale/unavailable guards.
10. Add a static benchmark/test that fails the repository gate if the product regresses below 90/100 or reintroduces a hard-loss veto.
11. Run the repository verification gate, merge only when green, then verify the exact production SHA is READY.
