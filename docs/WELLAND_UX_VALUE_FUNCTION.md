# Welland Canal — ease-of-use and comprehension value function

Status: implemented, 2026-10-11. Scope: existing `/welland-canal/` only. Owner objective: a maritime-minimalist tool that is easy to **operate** and easy to **understand**.

## Jobs to be done
- **First-time visitor:** "What does Lock 3 do and where can I watch a ship?"
- **Freighter watcher:** "Which lock am I looking at, and do recent AIS reports mean a ship is actually passing?"
- **Engineering-curious visitor:** "Why are Locks 4–6 grouped and what is the Thorold flight?"
- **Phone user:** "I tapped Lock 8 — what is it?" without further scrolling or mandatory actions.
- **Keyboard or assistive-technology user:** choose a lock and receive its role without a mouse or hover.
- **Poor-data user:** distinguish no recent AIS reports, provider unavailable, and actual lock occupancy, which is not reported.

## Value function (0–100)

```
V = 100 × (0.30 E + 0.30 U + 0.15 O + 0.15 T + 0.10 A)
```

All component scores are between 0 and 1.

| Dimension | Weight | Operational definition |
| --- | ---: | --- |
| **E — Effort / ease of use** | 30% | Any of eight locks discoverable beside map, no cluster-zoom prerequisite, useful answer after **one deliberate tap**, reset preserved |
| **U — Understanding** | 30% | Plain-language one-sentence purpose, cue, lock location, photograph identity and optional detailed explanation |
| **O — Orientation** | 15% | Selecting an already visible marker doesn't jump the camera; direct selection uses bounded zoom; map and selected card agree |
| **T — Truthfulness / confidence** | 15% | Image captions explicitly distinguish exact chambers versus regional photos; recent AIS does not imply lock passage; counts and filtered vessel list use the same 1.5 km rule |
| **A — Accessibility / inclusiveness** | 10% | Minimum 44px lock selector targets; buttons are keyboard-operable and labeled; reduced motion, image fallback and closable touch preview |

**Hard gates:** fail the release irrespective of its weighted score if a photo is falsely labeled as the lock, a vessel report is presented as a confirmed lock occupancy or passage, or licensed photo credits are absent. A gate failure caps the *structural proxy* at 49/100.

## Product flow after redesign

1. **At the map:** "Explore the eight locks" introduces the choice. All eight numbered options appear immediately above the map, each with a succinct role cue. This bypasses map-group friction.
2. **Select a numbered option:** a photo thumbnail and concise explanation appear **directly beneath the choice**, before the map, with geographic photo caption. This is one action and no mandatory scroll.
3. **Tap a map marker:** preserves the current map zoom; opens a compact persistent preview with the same one-sentence explanation and photo identity. Grouped markers zoom to separate locations, but the numbered selector bypasses all groups.
4. **Want depth?** Open the full-size photograph, provenance, expanded editorial narrative, shore-viewing information and nearby AIS context with one optional action.
5. **Change your mind:** Choose another number, Next Lock, or Show Entire Canal.
6. **Data degraded:** A blank AIS response does not imply an empty canal or a lock available for passage; an unavailable provider is labeled unavailable.

The former experience put lock selectors far **below** the map and recent-vessel list; on mobile, the selection could show an off-screen detail card or an image-heavy preview without a concise upfront answer. The remedy is choice proximity and progressive disclosure, not bigger markers.

## Acceptance contract and quality checks

`node scripts/benchmark-welland-usability.cjs` calculates a **static code-and-interface contract score**, and is invoked by `tests/welland-canal.test.js` under the repository's existing test gate. It is not a usability-study result or clickstream measure. Each dimension's criteria and truth vetoes are inspectable in that file. Target structural score >=90 with **zero failed required checks**, plus standard CI and emitted HTML audits.

Real-world, not yet measured, targets:

| Behavioral measure | Target | How to measure |
| --- | ---: | --- |
| One-tap mobile lock comprehension | >=95% | Moderated 5-person task test, tap Lock 5 and explain its purpose without opening a second card |
| Correct role + place identification | >=90% | Ask users to state what a selected lock does and name the region |
| Correct photo/live-status interpretation | >=90% | Ask whether the displayed photo is live, whether it depicts the exact lock, and what recent AIS establishes |
| Median time to a usable first answer | <=12 seconds | Screen recordings / timings from first interaction through accurate explanation |
| Keyboard completion | 100% in scripted acceptance | Tab to any lock, activate, inspect purpose, navigate Full Story |
| Accessible mobile targets | >=44px | Computed layout audit at 360, 390, 768 and 1280 CSS px |
| Rendering | No blocking UX regression | Compare LCP/image decode and basic Lighthouse before and after, using real site data |

Do not claim these behavioral targets achieved based on passing static checks. If observational scores disagree with structural proxy, prefer observed user behavior and revise weights/contracts.

## Repeatable scenario tests

| Persona | Inputs / action | Expected answer |
| --- | --- | --- |
| Beginner | Tap **3 · Museum view** | Lock 3, museum platform, vessel rises or descends; image depicts Lock 3 |
| Maritime enthusiast | Tap **5 · Middle flight** | Middle Thorold flight step; photo **nearby Lock 7**, not Lock 5 |
| Shore visitor | Tap **8 · Lake Erie** | Regulating lock; Gateway Park photo and visitor guidance |
| Map-first user | Tap already visible Lock 2 map marker | Nearby-map preview stays visible without zooming away |
| Zoomed-out map user | Tap 3–7 grouped marker, then choose Lock 6 by selector | No requirement to zoom twice to read Lock 6 |
| Data loss | AIS provider fails after selection | Lock explanation remains; AIS labeled unavailable |
| Reduced-motion user | Choose Lock 4 from numbered selector | No animated fly-to |
| Keyboard user | Tab through lock choices, press Enter, activate Full Story | Accessible labels, location, purpose, photo source |

## Search and revenue constraints

Preserve canonical URL, Person ID `https://chrisizworski.com/#person`, indexable page copy, Great Lakes internal linking, existing AIS backend/freshness semantics and ad placements. This work optimizes comprehension and task completion, **not** a claimed or measured uplift in GSC impressions, CTR or AdSense revenue.

Do not publish additional thin location pages to improve an internal proxy score. Test actual visitors and track future improvements as distinct experiments with enough sample size.
