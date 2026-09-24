# Detroit Outdoors observation contract

Date: 2026-09-24

## Purpose

Detroit Outdoors is in observation mode through the earliest expansion review on 2026-10-19. This phase is for measuring whether the five-page cluster is useful, discoverable, trustworthy and monetizable without creating more Detroit canonicals simply to chase impressions.

The live product architecture remains unchanged:

1. deterministic data and safety gates
2. closed-set JEV decisions
3. evidence-bound Haiku writing
4. specialist verification before action

Observation telemetry must not add model calls, live-source calls or browser-location transmission.

## What is now observable

### Broad board

`detroit_board_observation`

Measures the rendered board state: board signature, lead candidate, lead engine, lead place, JEV/fallback mode, verdict, suppressed places and degraded-source count.

### Editorial layer

`detroit_editorial_observation`

Measures whether the evidence-bound card writing is actually additive: writer count, accepted drafts, rejected drafts, retries, treatment reassignments and rendered note count.

This is the primary signal for deciding whether Haiku is earning its operating cost.

### Hero image

`detroit_hero_observation`

Measures selected image, selection mode, candidate-pool size and whether the same hero repeated from the visitor's immediately previous Detroit board session. The server-side JEV image history remains authoritative; the browser measurement is only an observation of what visitors actually receive.

### Focused pages

`detroit_intent_observation`

Measures whether freighter, birding, Lake St. Clair and sunset pages return a live window, a useful no-window answer or a source-unavailable state, along with the bound candidate and confidence.

`detroit_intent_editorial`

Measures the focused-page treatment, whether an editorial note survived, whether session cache supplied it and whether the treatment was reassigned.

### Failures

`detroit_live_failure`

Separates core-board, board-editorial, hero, focused-core and focused-editorial failures. A failed optional layer must not be counted as a full Detroit outage.

### Handoffs

`detroit_outdoors_handoff` and `detroit_growth_handoff`

Carry candidate/source/place context so downstream clicks can be tied to the actual live decision that produced them.

## Review questions

During the observation window, answer these before changing the product architecture:

- Which engines repeatedly earn the lead?
- Which focused pages produce useful specialist handoffs?
- What percentage of Haiku card drafts survive review on the first attempt?
- How often does a draft require retries or JEV treatment reassignment?
- Does hero selection visibly repeat despite the freshness/cooldown policy?
- Are failures concentrated in one optional layer or in the core board?
- Which query families begin receiving Search Console impressions and clicks?
- Which existing canonical owns those queries?
- Are AdSense impressions and earnings increasing without intrusive in-page auto ads?

## Expansion rule

Do not create another Detroit canonical before 2026-10-19 solely because an interesting query appears. A new page requires recurring distinct query demand, useful downstream behavior, a decision problem the current owners cannot answer cleanly, and a non-cannibalizing ownership rule.
