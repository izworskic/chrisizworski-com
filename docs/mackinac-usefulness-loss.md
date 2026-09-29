# Mackinac Island: usefulness loss (experiential)

Chris's verdicts on the tool ("hard to understand", "clunky", "answering seemed to make
nothing happen", "asks too much of the user") were all given while the existing persona
benchmark (`docs/mackinac-persona-benchmark.md`) was passing at loss ≤ 0.05. That
benchmark grades the engine output and the HTML source. This one grades what a visitor
actually experiences: it drives the real page in a browser, as eight personas, and scores
what is on their screen.

Run: `node scripts/benchmark-mackinac-usefulness.mjs` (starts the local server, runs the
real API handlers, needs Playwright/Chromium). Results: `benchmarks/mackinac-usefulness.json`.

## Loss

`L = Σ wᵢ·Lᵢ / Σ wᵢ`, each `Lᵢ ∈ [0,1]`, lower is better. Measured on a 390px phone
viewport, because that is how the Island gets planned in the car and on the dock.

| Term | w | What it measures (per persona, then averaged) |
|---|---|---|
| `complexity` | 15 | Mean of: page length `clamp((screens−6)/14)`; visible controls `clamp((n−25)/55)`; visible words `clamp((w−800)/1800)`; kinds of moving feedback seen (toast, floating bar, preview, flash) `clamp((k−1)/3)`. Measured after the plan is built; closed `<details>` content does not count. Added 2026-09-28 after Chris: "way too complex, can't decipher what's happening." |
| `react` | 18 | After every tap or field, within 4s: **0** if plan content inside the viewport changed; **0.4** if the change was only announced (toast); **1** if nothing visible happened. Chris: "answering seemed to make nothing happen." |
| `correct` | 20 | Share of persona assertions that fail on the **visible** final plan: the right port, a ferry reachable from their leave time, the constraint they named (kids, walking, bikes, overnight, history) reflected. |
| `ask` | 12 | `0.6·clamp((taps − 4)/10) + 0.4·wasted/taps`: taps and fields needed before the plan reflects them, and the share of those asks that changed nothing. Chris: "asks too much of the user." |
| `clarity` | 12 | Mean of: primary answer not visible on first screen; jargon on the page (`clamp(n/5)`, terms like JEV, deterministic, vector, archetype); words on first screen (`clamp((w−90)/150)`); competing CTAs on first screen (`clamp((n−2)/4)`); how far down the first question sits (`clamp((screens−1)/2)`). Chris: "hard to understand", "couldn't follow the flow." |
| `distinct` | 8 | Mean pairwise Jaccard similarity of the personas' final plan signatures (stops + ferry), `clamp((sim−0.35)/0.65)`. "Their own Mackinac page." |
| `continuity` | 7 | After building a trip, on `/where-to-stay/`: saved trip shown in the hero strip; personal focus loaded. "Rebuild every page." |
| `speed` | 4 | Time to a real (non-placeholder) primary answer: `clamp((ms − 1500)/4500)`. |
| `stability` | 2 | Layout shift not within 5s of an input (async rebuilds after a tap count as the tap's response): `clamp(CLS/0.25)`. |
| `truth` | 2 | A visible "Updated <time>" freshness line. |

## Personas

Eight visitors, each answering the real questions by tapping the real buttons and filling
the real fields. Trip date is a fall Saturday so the schedule and closures are real.

| id | Visitor | Expected on screen |
|---|---|---|
| detroit-first | Couple, day trip from Detroit leaving 6:00 AM, "see the icons", hates rushing | Mackinaw City; first ferry at least 3h after leaving home |
| gr-family | Young family, day trip from Grand Rapids leaving 7:00 AM, walking is the worry | kids/family pacing; carriage or low-walking movement |
| tc-couple-night | Couple, one night from Traverse City, slow + food, dislikes crowds | overnight shape; dinner |
| lansing-bikes | Friends, day trip from Lansing, bikes, weather worry | bike / M-185 loop |
| saginaw-multigen | Three generations, day trip from Saginaw, history, walking worry | Fort; carriage/taxi |
| marquette-solo | Solo from Marquette (Upper Peninsula), scenery, crowds | St. Ignace |
| baycity-late | Couple from Bay City leaving 11:30 AM, icons, fear of missing out | ferry at least 2h after leaving; not a morning boat |
| chicago-teens | Family with teens, 2–3 nights from Chicago, bikes + history | multiple days; bike; Fort/history |

## Results (2026-09-28)

Same harness on both sides; local server running the committed engine.

| Run | Loss | react | correct | ask | clarity | distinct |
|---|---|---|---|---|---|---|
| `main` before this change | **0.257** | 0.528 | 0.417 | 0.292 | 0.160 | 0 |
| after | **0.068** | 0.125 | 0 | 0.222 | 0.067 | 0 |

What moved it, largest first:

1. **Every answer lands on screen (react 0.53 → 0.13).** The questions sat about two screens
   below the answer they change, so each tap only produced a toast. Now the question card
   shows "Your day so far" (the live itinerary's first stops) between the question and its
   options, a bottom live bar keeps Ferry · Back · Your day on screen whenever the answer
   scrolls away, and both flash when a tap changes them. The toast no longer covers the
   answer when it is already visible.
2. **The ferry answer is right for where you start (correct 0.42 → 0).** Starting city used
   the public Nominatim geocoder, which rate-limits (HTTP 429). When it failed, the plan
   silently ignored the visitor's city: 6 of 8 personas got an unreachable or wrong-port ferry.
   `lib/mackinac-island/origins.js` now resolves 61 common starting cities offline with
   measured OSRM drive times; the live geocoder is only the fallback. A late start from far
   away (Bay City leaving 11:30) used to get "We can't confidently choose a ferry"; it now
   gets an honest short visit (4:00 PM boat, about 3.2 hours) with the fuller options named.
3. **Fewer asks (ask 0.29 → 0.22, 8–10 taps → 6–8).** Starting city and leave time are one
   tap each in the hero, the most outcome-changing inputs asked first. The plan builds as soon
   as both are known: no separate date/city/time form and no Build button. Every base question
   is one tap (trip style was pick-two-then-Continue).
4. **Clarity (0.16 → 0.07).** The first input now sits on the first screen, directly under the
   answer; the answer's reason is plain language ("About 6.2 hours on the Island, with great
   conditions for getting out, and room to spare on the way home"), and the banner no longer
   says "un-dated quick plan".

What is left: opening "Other city" / "Other time" is a tap that changes nothing by itself; a
few trip-style answers only reshape stops further down the day (announced, not shown).

## Simplification pass (2026-09-28, later)

After #643 Chris said the page was "way too complex, can't decipher what's happening". The
loss had no term for that, so it rewarded piling on feedback. With `complexity` added, the
live page scored **1.0** on it: 25 phone screens, 86–90 controls, ~2,800 words, and four
kinds of moving feedback at once (flash, preview, floating bar, toast).

| Run (same weights) | Loss | complexity | react | correct | screens · controls · words |
|---|---|---|---|---|---|
| production after #643 | **0.212** | 1.000 | 0.141 | 0 | ~25 · ~87 · ~2,780 |
| simplified | **0.077** | 0.158 | 0.112 | 0 | ~9 · ~23 · ~1,030 |

The page now tells one story: the answer and the way home, two start choices, four one-tap
questions with "your day so far" beside them, your day hour by hour, then "More about today"
as eleven closed rows (why, all ferries, weather, cameras, crowds, events, map, stay, eat,
Straits, sources). Removed: the floating bar, the toast, the score ring and "day at a glance"
card on phones, the two hero buttons, the intake intro, the section tab rail. Nothing was
deleted from the engine; folded sections keep their content and open on demand.
