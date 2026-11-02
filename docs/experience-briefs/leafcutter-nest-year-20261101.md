# Leafcutter Bee Nest-Year — Experience OS 1.2.1 redesign (2026-11-01)

**Owner:** izworskic/chrisizworski-com · **Canonical:** /leafcutter-bees/ · **Source:** existing HTML, no engine replacement · **Manifest version:** EXPERIENCE_OS_V1 1.2.1 on main. There is no verified v2.1 source release.  
**Research date:** November 1, 2026. **Scope:** visitor composition, a connected nesting-year interaction and three evidence classes. Out of scope: new biological emergence thresholds, extra paid APIs, unverified live flowers, GPS, ads, schema URL, commercial bee sales claims or redesign of other tools.

## Visitor question and first answer

1. **Wild-bee gardener with one afternoon** asks: “Do I cut back the stems, buy a bee house or leave occupied tubes alone?” First answer in the first screen is the existing conservative planner verdict expressed in ordinary garden language and the next action; it changes when month, nest status or managed-bee stage changes. HTML-only evergreen fallback recommends habitat before shipping bees.
2. **New naturalist** asks: “What does the little crescent in my rose leaf mean across the whole year?” A purpose-built four-chapter **nest journal** tells an observable story (habitat → leaf pieces and provisioning → sealed cells → protection) without claiming the diagram represents a real occupied tube. The selected chapter synchronizes the existing month and the decision.
3. **Purchased-cocoon owner** asks: “Does a warm forecast mean I can release them?” The existing incubated/dormant stage, open blooms and nest controls remain higher authority than the separate official NWS and USA-NPN context. The dashboard is **after** the garden verdict, not before it.

## Research, real interaction inspirations and rights

| Checked example | Actual interaction / guidance | Adapted decision mechanism; boundaries |
| --- | --- | --- |
| [USA National Phenology Network visualization](https://www.usanpn.org/data/visualizations), checked 2026-11-01 | Annual AGDD heat time series and plant/animal season calendars by location | Separate **historical gridded modeled warmth** from **forecast NWS hours**; the same month selection must not turn an actual November forecast into imaginary summer weather. No arbitrary biological threshold. |
| [Xerces Save the Stems](https://xerces.org/sites/default/files/publications/22-005_01_web-press.pdf), checked 2026-11-01 | Illustrative year-by-year stem/nest lifecycle with winter protection and spring cutting | Adapt the instructional *mechanism*: four native-button chapters of a simplified cavity nest and a true action for each season. Never copy the original diagram, photographs or imply a universal developmental stage. |
| [Utah State Extension — Making and Managing Wild Bee Hotels](https://extension.usu.edu/planthealth/research/making-and-managing-wild-bee-hotels), checked 2026-11-01 | Practical cleaning/overwintering guidance, including species and season nuance | Keep used nesting tubes cool/protected with stages managed separately. No blanket refrigeration of leafcutter brood. |
| [USA-NPN AGDD products](https://www.usanpn.org/data/maps/AGDD), checked 2026-11-01 | Official current AGDD50, 1991–2020 anomaly, 4-km gridded PRISM weather estimates | Same existing source: no new endpoint or implied sensor of the visitor's garden. If anomaly not mapped, show current AGDD and explicit absence of comparison (existing shared PARTIAL contract). |
| [Existing real bee photo](https://commons.wikimedia.org/wiki/File:Leafcutter_bee_(Megachile_sp.)_collecting_leaves_(7519316920).jpg), Bob Peterson, CC BY-SA 2.0 | Photographs the behavior described in copy; photo taken Florida, Megachile species not established | Preserve actual image URL, crop, author, visible linked credit and explicit geographic disclaimer. Never caption as Michigan bee. Collapse illustration side panel on image load error without losing first answer. |
| [Existing nests photo](https://commons.wikimedia.org/wiki/Category:Megachile_nests), subject leafcutter nesting cells | Genuine detail image already on page | Preserve credit and informative alt; not evidence of present garden occupancy. |

## Two concepts, compared

**Concept A — “The thermal cockpit”:** big GDD gauge, NWS bar graph and action status on the first screen. Advantages: early numerical signal; disadvantages: structurally same as seasonal tools, overemphasizes thermal approximation, invites people to infer a biological emergence date. **Rejected.**

**Concept B — “The Year Inside One Nest”:** compact, real-photo-led introductory vignette with immediate practical advice, followed by a unique illustrated four-season nest journal, then an observation-led decision and clearly distinct source evidence. It invites gardeners to protect, watch and understand without treating a model as a sensor. **Selected.**

### Originality gate against two closest tools

- [Michigan Gardening Tools](https://chrisizworski.com/michigan-gardening/) is a broad planning notebook, crop picker and garden-year hub. Purposeful reuse: location entry conventions and authoritative data qualifiers. Distinction: the new leafcutter page revolves around **one tiny cavity as an illustrated narrative**, with season choices changing species-aware physical actions.
- [Michigan Phenology](https://phenology.chrisizworski.com/) is a broad annual signals/thermal-calendar observatory. Purposeful reuse: verified heat-source and anomaly contract. Distinction: the **first answer is an action about habitat or cocoon stage**, not degree-day ranking, and the historical grid is visually subordinated to local observation and forecast context.

The result is not a recolored generic tool card: it has a bespoke stage illustration, distinct field-note voice, reversible nest-year buttons and a prioritised risk-aware garden verdict.

## Connected experience state matrix

| Scenario | Stable source ID & native control | Hero action / nest story / planner verdict | Weather/source truth and failure behavior | Release proof |
| --- | --- | --- | --- | --- |
| Load now | existing `month` select; `seasonFor(month)` | Current Detroit calendar month drives introductory field note and chapter; static fall chapter still explains habitat if JS unavailable | “No forecast checked” until explicit location check | Browser + unit tests |
| Spring | native `[data-journey-phase=spring]` | Selects representative April if current month is outside spring; story is spring habitat and planner result changes | Previous November NWS outlook explicitly not valid for selected future/historic planning month | Browser A→B |
| Summer | native summer button | Sets July, new story and managed-bee caution; no false promise of release | Current-week forecast, if previously checked, is explicitly disqualified for this non-current planning month | Browser |
| Back to spring | same native spring button | All three locations (chapter, native month, hero/result) restore | Existing verified forecast data is not reinterpreted as July climate | Browser B→A |
| Managed and unknown cocoons | existing `data-path=managed`, `brood-stage` | Original action remains stop/identify exact stage | No automatic refrigeration, shipping or emergence authorization | Existing tests |
| User changes flower state | native `flowers` select | Local observation evidence and planner verdict both update | NWS / USA-NPN still cannot verify blooms | Browser |
| ZIP A→B / PO-box | native ZIP/city and check | Existing location synchronization and fail-closed engine unchanged | Old NWS, heat bars, and USA-NPN metrics cleared; no city substituted | Existing browser tests |
| NPN anomaly missing | `status:PARTIAL` | Heat total allowed; historic average labeled “Not mapped” | No invented reference anomaly, observed blooming or insect threshold | Existing browser tests |
| Remote photo unavailable | existing Wikimedia image | First useful answer and diagram retained with a single-column hero | Image failure collapses figure; no other services depend on photo | Browser/error fallback |
| No JS / reduced motion | HTML explanation, original source links; native controlled button pathway if JS | HTML still says to protect habitat; article/source content persists | No moving data or fake continuous season animation | Browser no-JS, reduced motion |

**Native keyboard behavior:** all year chapters are buttons; focus outlines visible. Selected ID (season) is presented by `aria-pressed` and mirrors original month `select`. Tab, Enter, Space and changing the month direct all produce one consistent selected chapter.

## Technical treatment

- No new framework or runtime dependencies. Existing standalone HTML + CSS + vanilla JS; introductory answer generated from **the original existing safe planner verdict** after every update. No copied/reimplemented biological rules.
- Diagram is a **schematic** constructed with CSS, not a generated or geographically substituted photo and no invented specific instar/timing observation.
- Single actual currently selected month drives journal phase, story, result and high-priority metadata; year-phase button choice changes month to a representative month *only* when selecting a different season.
- Three evidence lanes: what the visitor claims in the garden (self-reported); USA-NPN season-to-date air-temperature estimates (modeled); NWS outlook (forecast). Stale/outside-month/invalid ZIP explicitly noted.
- Existing NPN shared data adapter and official NWS API unchanged. No source key/finance/Redis, no persistent ZIP, no new indexing URL, same ads and Person/Article JSON-LD.
- The Michigan Gardening hub remains a navigational front page; avoid moving the complex editor up into its hero. No separate hub redesign required.
- **Performance:** CSS illustration rather than canvas, SVG animation or heavy JS; actual image from current licensed source retained. Reduced motion CSS disables smooth scroll/transition.
- **Accessibility:** text equivalent of illustration, `aria-pressed` native buttons, aria-live on story, visible focus, sources and no-script action survive.

## Verification / release record

Implementation branch: `feature/leafcutter-experience-os-121-nest-year-20261101`. Relevant tests: `tests/leafcutter-bees.test.js`, `scripts/verify-leafcutter-browser.cjs`; all site-wide CI gates remain required.

- Page output / validated JSON-LD: **pending verification**.
- Browser 360 / 390 / 768 / 1440, A→B→A, fake/stale/invalid weather, image failure, desktop/photo crop, noJS: **pending verification**.
- Human screenshot inspection / QA grade ≥90 and each subscore ≥4/5: **pending measurement**.
- PR checks / merge SHA / Vercel deploy / public HTML and live API: **pending**, not claimed complete.
- Visitor engagement, CTR, revenue and Core Web Vitals improvements: **NOT MEASURED**.
- Lessons to transfer: make observed garden truth lead, frame modeled weather as background, and use a **purpose-built subject illustration** rather than another generic map/metric dashboard.

No part of this brief promotes Experience OS 2.1 as a released repository version; canonical 1.2.1 is the reviewed source.
