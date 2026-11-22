# Soo Locks Lock Watch: plan your platform time (2026-11-21)

Mode: **IMPLEMENT** (Experience Investment, Experience OS 1.2.1, Foundry 0.3 improve/prove, Playwright browser QA).
Owner: `izworskic/chrisizworski-com`, canonical `https://chrisizworski.com/soo-locks/`, registry id `soo-locks`.
REA was not used: there was no architecture problem to investigate. Penpot was not used.

## Visitor job

A ship-watcher or traveler near Sault Ste. Marie wants to know **when to be on the viewing platform, for how long, and which named ship to expect**, then drives or walks over.

## Baseline (51a831f)

- The first screen answers "what is the next ship" well: one pick, an in-chamber line and an arrival window (`#soo-next-ship`).
- Every other approaching ship is folded into one "Also heading in" sentence. They cannot be selected, compared or focused on the map from the card.
- Nothing relates a window to when the visitor can arrive, to the posted park hours (9 a.m. to 6 p.m. November through April), or to darkness. In November a 6:15 p.m. ship is after closing and after sunset; the page did not say so.
- The card always offered "Boat hotline 906-202-1333". USACE maintains that hotline only while the Visitor Center is open, May 1 to October 31 (checked 2026-11-21). In November that action was wrong.
- At 390px the live map starts near 4,300px, after the checklist, fleet links, Gazette, hero photo, prose and season panel.

Screenshots: before/after at 390 and 1280 are in `artifacts/soo-lock-watch/` (see PR).

## Opportunities investigated

| id | visitor outcome | effort | risk |
| --- | --- | --- | --- |
| visit-lineup (selected) | Choose arrival and stay; see which ships fall inside the visit, park hours and daylight; one-tap adjustment to cover a window | medium, static JS/CSS on the existing feed | windows read as a schedule; mitigated by estimate wording, no probabilities, beyond-view caveat |
| map-forward | Map beside the answer | medium | reorders a page carrying ~30% of site impressions; section order pinned in tests; repo is additive by default |
| season-truth | Hotline only in season | small | low; a repair, carried inside the selected work |

## Two concepts

**A. Visit timeline (selected).** Directly under the next-ship card: two chip groups (how soon, how long), a plain-language verdict, then a shared time axis with dark and closed-park bands, the visit band, and one row per ship (in-chamber dot or window bar). Selecting a row opens a dossier and can focus the ship on the live map. A missed visit offers "Plan around 11:30 AM to 1:40 PM", which snaps both choices to cover it.

**B. River schematic.** Lake Superior above, Lake Huron below, ships placed by channel miles converging on the locks, with a visit slider dimming ships that will not arrive in time.

**Why A:** the question is about time, not place. A time axis holds park hours, darkness, the visit and every window in one frame. B duplicates the Leaflet map, needs label-collision work on phones, and cannot show park hours or daylight naturally.

## Distinctiveness (veto check)

| | Duluth Canal Park | Welland Canal | Soo Lock Watch |
| --- | --- | --- | --- |
| Decision | Is a freighter coming to the bridge next? plus a published harbor forecast | Where to watch along eight locks; official order of turn | When to be on one platform, for how long, and which ship |
| First-screen hierarchy | Status card then forecast | Dark hero, map CTA, photo | Next-ship answer, then visit controls and verdict |
| Interaction | Read card, refresh | Map and lock explorer | Visit inputs change the verdict; rows select a ship dossier; one-tap cover adjustment |
| Visual identity | Light cards | Navy hero, gold CTA | Two-direction time strip with closed-park hatching, dark bands and a visit band |

Shared on purpose: the AIS engine, map focus, estimate caveats, page typography and colours.

## Technology Fit Review

- **Visitor outcome:** a decision that needs existing windows compared with time-of-day facts. Measured performance problem: none (NOT MEASURED; no claim made).
- **HTML/CSS: keep.** Static section with readable posted hours and a no-JS path.
- **Browser JS: keep.** ~600 lines, dependency-free, reads the data `soo-ais.js` already fetches via a `soo-ais:data` event. No extra network request.
- **Existing Node API: keep unchanged.** `/api/soo-ais` and `lib/soo-locks-next.js` untouched; no new Vercel function, cron, env var or build step. No added Vercel cost beyond two small static files.
- **Python: reject.** No offline analysis needed; sunrise math is a few lines and is tested.
- **Rust/WASM: reject.** Under ten rows; no CPU problem.
- **Java: reject.** No JVM in the stack and no need.
- **Revisit trigger:** if the engine starts returning many more candidates, or a published USACE schedule feed appears.
- **Rollback:** remove the section, two asset tags and the `share()` call in `soo-ais.js`; the card's seasonal hotline logic is independent.

## State matrix (selection spine = ship MMSI)

| Input | Verdict | Rows | Dossier | Map |
| --- | --- | --- | --- | --- |
| Load, Now / 1½ hr | In-chamber ship leads; offer to plan around next window | in-chamber dot plus window bars | in-chamber ship | unchanged until "Show it" |
| 2 hr | Best bet: BURNS HARBOR | BURNS pressed | BURNS, inside park hours, daylight | focus BURNS on request |
| Tap ALGOMA row | unchanged verdict | ALGOMA pressed | outside posted hours, after dark | focus ALGOMA on request |
| Tap BURNS row (reverse) | unchanged | BURNS pressed, one pressed row | identical to before | |
| 30 min / 45 min | No reported ship due; next window named; beyond-view caveat | | best remaining | |
| Tap "Plan around" | Best bet restored, chips at 1½ hr / 3 hr | | BURNS | |
| Feed 503 first load | Unavailable, BoatNerd link | hidden | hidden | existing fallback |
| Refresh fails later | retained windows plus failed-refresh note | retained | retained | retained |
| Jan 15 to Mar 24 | Closed for winter shutdown, reopen date | hidden | hidden | |
| No JS | static explanation, BoatNerd link, posted hours | hidden | hidden | existing |

## Truth boundaries

- Windows are the engine's estimates, shown unchanged. No probability, score or confidence number is displayed (unit-tested).
- Posted park hours are labelled "posted" and sourced; they are not an open-now claim.
- Darkness is sunrise/sunset for Sault Ste. Marie (NOAA equation, within 3 minutes of published tables); twilight and cloud are ignored.
- A ship in a chamber is never promised to a later visit ("likely gone before you arrive").
- The view is limited to ships already in the St. Marys River approaches; the verdict says later visits can gain ships not yet listed.

## Protected contracts

Title, meta description, H1, canonical, all JSON-LD (Person, WebPage, FAQPage, WebApplication) unchanged except the freshness stamp. Existing sections, links and identity links unchanged; the only content change outside the new section is the footer month (August to November 2026). Auto ads: no loader or config change; the single `data-in-article-ad-break` marker is unchanged; the new interactive section carries `data-no-ads` like the next-ship card and lock simulator. Sitemap URL count unchanged.

## Experience OS QA scorecard

| Area | Weight | Grade | Evidence |
| --- | ---: | ---: | --- |
| Visitor can answer the decision | 25 | 5 | verdict + adjustment across now/later/missed/closed/failed |
| Distinct composition | 15 | 4 | time strip with park/dark bands; differs from Duluth and Welland |
| Causal interaction | 15 | 5 | chips change verdict; rows change dossier; A to B to A identical |
| Truth and provenance | 15 | 5 | posted-hours source, estimate caveats, seasonal hotline, no numbers invented |
| Visual execution | 10 | 4 | inspected at 360 to 1440; long on phones |
| Mobile, keyboard, a11y | 10 | 4 | arrow keys, Enter, focus rings, no-JS, reduced motion; screen-reader pass NOT MEASURED |
| Performance and resilience | 5 | 4 | no new request; feed failure and season tested; field CWV NOT MEASURED |
| Site integrity | 5 | 5 | full `verify:all` (see PR) |

Total about 92/100, every area at least 4/5.

## Release record

| Stage | Status | Evidence |
| --- | --- | --- |
| Implemented | CONFIRMED | PR #1825 |
| Verified | CONFIRMED | all PR checks green on `3706bc0c`, including Soo Locks Lock Watch browser QA run 44917688025 |
| Merged | CONFIRMED | squash commit `5fba3ad0` |
| Deployed | CONFIRMED | Vercel `dpl_8VJ2RQomSDqD2r3eFHha8zQHgH8a` READY, aliased to chrisizworski.com |
| Live public check | CONFIRMED 2026-11-21 10:22 EST | real AIS: verdict named BURNS HARBOR 12:09 to 1:41 PM and G3 MARQUIS; real map tiles loaded; one Auto ads loader; SEO identity intact; no page errors at 390 or 1280 |
| Visitor outcome | NOT MEASURED | needs a comparable post-release GSC / Vercel Analytics / AdSense window |

## Lesson

A visitor's real constraint at a fixed viewing point is time: arrival, stay, opening hours and light. When an engine already produces arrival windows, the cheapest high-value move is to put the visitor's own visit on the same axis as the windows, not to add another map.

## Addendum 2026-11-22: keep the visitor in the tool, and what the repository skills added

**Owner request:** keep the BoatNerd passage list available without making it one of the first ways to leave the tool, and use any repository skill that can make the tool better.

### BoatNerd: incorporate the job, not the data

- **public-data-scout check (2026-11-22):** `ais.boatnerd.com/passage/port/soo-locks` returns only a JavaScript app shell. A fetch shows no list, API, feed, terms, licensing or data provider. Importing it would mean scraping a private app backend, which the skill rules out for production. The repository's own promotion notes also treat BoatNerd as a community to approach respectfully. Decision: do not copy or proxy BoatNerd data.
- **The job is already in the tool.** The Lock Watch lineup is this page's own passage list: every ship in a chamber or heading for the locks in the latest AIS reports, with windows. BoatNerd becomes a credited cross-check after it.
- **Where BoatNerd used to be an early exit, and what replaced it:**

| Place | Before | Now |
| --- | --- | --- |
| Next-ship card, Nov to Apr | "BoatNerd passage list" button | "Plan your platform time" (in page) |
| Lock Watch dossier | "BoatNerd Soo passage list" button | "Watch it lock through" (in page, see below) |
| Lock Watch unavailable / no-ship verdict | link to BoatNerd | "Other ways to check" (in page) |
| Lock Watch no-JS text | link to BoatNerd | link to "other ways to check" (BoatNerd itself needs JavaScript) |
| Schedule sources, card 1 | "Open today's BoatNerd passage list" | "Open the Lock Watch lineup"; BoatNerd is a cross-check line after the three cards |
| Lock Watch sources | none | one credited cross-check inside the collapsed "Posted park hours, sources and a cross-check" |

BoatNerd's wider-map links below the live map and in the resources list are unchanged: a different job, far down the page. The `data-growth-cta="soo-passage-list"` id is kept for measurement continuity.

### Skills reviewed

| Skill | Used? | What it contributed |
| --- | --- | --- |
| experience-investment | yes | scoped the change to the visitor's next step; no redesign |
| public-data-scout | yes | rejected BoatNerd scraping; vetted NWS hourly forecast (owner-published, CORS `*`, gridpoint APX/65,131 verified 2026-11-22, `updateTime` exposed) |
| editorial-diagrams + interactive-2d-scenes | yes | the existing to-scale SVG lock simulator is the right explanatory structure; reused rather than adding PixiJS or a new diagram |
| playwright-browser-qa | yes | browser acceptance extended (see below) |
| design-reconnaissance | no | no restyle in scope |
| rea | no | no architecture problem |
| penpot-design, stitch-concept-review | no | explicit-request only |

### Two in-tool additions

1. **Watch it lock through.** The dossier hands the selected ship to the page's lock simulator. It sets the direction, picks a same-size stand-in hull only when the reported size clearly matches (1,000-footer to Paul R. Tregurtha; saltie to the Seaway saltie; 731 to 899 ft to Arthur M. Anderson; otherwise the hull is left alone), says so in a note, adds "the lockmaster may assign either chamber" when that is true, and focuses "Lock her through". The simulator itself is unchanged apart from the empty note slot.
2. **Platform weather for your visit.** The browser reads the NWS hourly forecast for the Soo Locks grid cell (falling back to a fresh `/points` lookup if NWS re-grids). It quotes the low to high temperature, sky wording, strongest wind and highest precipitation chance across the hours that overlap the visit, with the forecast's update time. It is marked older than 12 hours when stale and says plainly when unavailable or out of range. Nothing is blended or invented. There is no server function and no added Vercel cost.

### Verification (local)

`tests/soo-lock-watch.test.js` 14/14. `tests/soo-lock-watch-browser.cjs` passed with a pinned clock and NWS fixture. It covers: no BoatNerd in the card, verdict or dossier; exactly one, inside the collapsed note; the first schedule source is in-page; weather text for two visits; simulator hand-off for a downbound 740 ft laker (Anderson, either-chamber note, focus on play) and an upbound 1,000-footer (Tregurtha); in-page verdict link and an explicit forecast-unavailable line when both feeds fail. The Foundry replay still shows 4 GAIN and 2 PRESERVED.
