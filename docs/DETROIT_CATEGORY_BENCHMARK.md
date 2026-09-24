# Detroit Outdoors — category benchmark

Canonical product: `https://chrisizworski.com/detroit-outdoors/`

Research date: 2026-09-24

## Product thesis

Detroit Outdoors should not try to become AllTrails, Windy, MarineTraffic, eBird, or a tourism directory. The product advantage is the combination those products do not provide on one local page:

`live evidence -> safety gates -> finite opportunity pool -> JEV board selection -> useful local explanation -> exact specialist handoff`

The release standard is **decision usefulness**, not data volume. A person opening the page should be able to answer four questions quickly:

1. What is unusually worth doing around Detroit now?
2. When is the useful window?
3. How much travel friction is involved?
4. What live source should I verify before committing?

## Benchmark set

The benchmark uses major category leaders plus strong adjacent decision products surfaced in current search research.

| Product | What it does especially well | Gap Detroit should exploit |
| --- | --- | --- |
| AllTrails | Extremely scannable destination cards; time/distance/difficulty context; trail-specific conditions | Strong for choosing trails, weak as a cross-activity local opportunity desk |
| Windy | Excellent live-condition density, models, layers, alerts, and forecast transparency | Requires the user to interpret data and already know what activity/place they care about |
| MarineTraffic | Live vessel position, movement state, speed, freshness and detailed drill-down | Excellent specialist source, not a Detroit outing decision product |
| eBird | Recent sightings, hotspot depth, species history and place-specific planning context | Excellent specialist evidence, not a cross-activity same-day recommendation layer |
| Detroit Riverfront Conservancy / Visit Detroit | Strong local place context, access information, maps, amenities and destination storytelling | Mostly static; does not tell the user what has an unusually good live window now |
| Compath / Bouldi / Wandercast class | Best-window logic, activity scoring, route/condition framing, concise go/no-go interaction | Broad/generic geography; limited Detroit-specific editorial and local-source depth |

Research references:

- AllTrails: `https://www.alltrails.com/` and `https://www.alltrails.com/welcome`
- Windy: `https://www.windy.com/menu`
- MarineTraffic live-map documentation: `https://support.marinetraffic.com/en/articles/9552656-vessels`
- eBird hotspot documentation: `https://support.ebird.org/en/support/solutions/articles/48001280356`
- Detroit Riverfront visitor information: `https://www.detroitriverfront.org/plan-your-visit/visitor-info/visitor-info`
- Visit Detroit outdoors: `https://visitdetroit.com/things-to-do/outdoors/`
- Compath: `https://compath.store/`
- Bouldi: `https://bouldi.app/features`
- Wandercast: `https://wandercast.io/`

## Scoring model

Each dimension is scored 0–5. Scores are an internal product benchmark, not claims about company quality or market share.

| Dimension | AllTrails | Windy | MarineTraffic | eBird | Detroit tourism/riverfront | Best-window apps | Detroit release target |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Immediate first-screen answer | 4 | 3 | 4 | 3 | 3 | 5 | **5** |
| Live/fresh evidence | 4 | 5 | 5 | 5 | 2 | 4 | **5** |
| Activity-specific fit | 5 | 3 | 5 | 5 | 4 | 5 | **5** |
| Detroit/local specificity | 2 | 2 | 4 | 4 | 5 | 2 | **5** |
| Best-time-window clarity | 3 | 5 | 4 | 3 | 2 | 5 | **5** |
| Travel/access friction | 4 | 2 | 2 | 4 | 5 | 4 | **5** |
| Safety + uncertainty | 4 | 5 | 4 | 3 | 4 | 4 | **5** |
| Source/freshness transparency | 4 | 5 | 5 | 5 | 4 | 4 | **5** |
| Specialist depth / handoff | 5 | 5 | 5 | 5 | 4 | 4 | **5** |
| Mobile visual scannability | 5 | 5 | 5 | 4 | 5 | 5 | **5** |

**Release requirement:** 48/50 or better against the internal rubric, with no critical dimension below 5 for the main board. Critical dimensions are immediate answer, live evidence, best window, travel friction, uncertainty, and specialist handoff.

## Required main-page behaviors

The main board must expose, without opening a detail page:

- a plain-language lead answer;
- the current board update time;
- the lead opportunity's usable time window;
- drive-time band from central Detroit;
- evidence confidence/freshness state;
- live weather/condition facts that materially affect the decision;
- why the opportunity made the board;
- one explicit uncertainty / final verification step;
- a direct focused-page or specialist handoff;
- official place information when available.

The score is secondary. It cannot be the primary explanation.

## Visual benchmark

The page should read like a compact local decision desk rather than a generic card grid:

- one clearly dominant lead opportunity;
- secondary opportunities visually subordinate but still complete;
- dense facts in small structured bands, not paragraphs of dashboard copy;
- useful labels (`BEST WINDOW`, `DRIVE`, `CONFIDENCE`, `CONDITIONS`) instead of decorative UI;
- no gradients, animated decoration, fake urgency, or oversized hero text that pushes the answer below the fold;
- mobile baseline approximately 390 px wide;
- focused Detroit questions presented as distinct decision routes, not a sentence of links.

## Non-negotiable truth rules

- Hard safety logic remains deterministic and outranks JEV/writer output.
- JEV may choose only from the sealed candidate universe.
- Haiku may explain but cannot create source facts, places, live conditions, or safety claims.
- Missing evidence must remain visible as missing/degraded.
- AIS freshness rules stay hard-expiring and cannot be relaxed for prettier UX.
- A visually stronger page is not allowed to add unsupported certainty.
