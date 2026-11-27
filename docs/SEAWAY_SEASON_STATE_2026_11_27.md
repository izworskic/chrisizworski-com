# Seaway navigation-season state (2026-11-27)

**Visitor goal:** decide whether to go see a ship now or wait, and understand an empty map once the locks close. **Tool:** `st-lawrence-seaway` and `eisenhower-lock` in this repo. **Mode:** IMPLEMENT via Foundry improve/assess/prove. **Smallest useful outcome:** a season band on the first screen plus one line in the ship watch.

## Diagnosis

On November 27, 2026, neither page said the season was ending. Regular entries stop at 23:59 on December 24, and all ships must be clear of the Montreal–Lake Ontario section by noon on January 5, 2027 ([Seaway Notice #9, Oct 22 2026](https://greatlakes-seaway.com/wp-content/uploads/2026/10/notice20261022_en.pdf)). The only season content was the 2022–2024 monthly history, about 9,500 px down a 14,286 px phone page. From January to March the ship watch would keep asking "Who is out on the river today?" with no explanation.

Other opportunities considered and not taken:

- **Map sooner on phone.** This would undo the deliberate journey-first order from PR #1506.
- **Eisenhower off-season visitor hours.** The hours change without notice, and the official page is already linked.

Concept rejected: adding the dates to the November and December fieldbook cards. It costs nothing on the first screen, but the answer would not be there when the visitor decides.

## Change (evergreen)

- `data/seaway/season.json` holds official dates for each season where they are known (2026 closing, 2027 opening), plus a **typical** schedule taken from recent notices: open about March 22, regular entries end about December 24, all ships clear in early January.
- `public/assets/seaway-season.js` picks the live season or the next opening, using Eastern time. It needs no fetch or storage. Its states:
  - **open**
  - **final-weeks** (35 days or fewer: "N days left")
  - **last-day**
  - **clearing**
  - **closed**: counts down to the reopening and includes the caveat that some ports east of St. Lambert stay open in winter.
  - **opening-week**: for the first 10 days after the opening date, it warns that ice can still hold the first ships.
- When a season has no official dates, the band uses the typical schedule and labels it: "About N days", "around December 24", "by early January". It never shows exact clock times for these, and its link goes to the Seaway notices index. There is no dead-end or expired state. A test checks every day for five years with no official dates.
- The no-JS fallback in both heroes is year-free ("usually open from late March to early January"), so it cannot expire.
- `scripts/generate-seaway.mjs` adds the band, a ship-watch line that links back to the dates, inline JSON and the script tag. The committed HTML got the same three insertions, and its existing generator drift is unchanged.
- `public/assets/seaway.css` styles the band, with an accent colour for each state.
- Measurement: `data-track-tool="seaway-season-notice"`, `data-placement="seaway-season-band"`. There is no baseline, because the element is new. GA4 figures stay private.

**Upkeep is optional:** add `seasons.<year>` when the opening notice (about February) and closing notice (about October) come out. Until then the page keeps working on the labelled typical schedule.

## Proof

- Foundry `prove`: **BEHAVIOR_DEMONSTRATED**. There were three GAINs (late-season hub hero, Eisenhower hero, winter ship watch) and two PRESERVED cases (hero jump links, official order-of-turn link). The adapter is `experience-foundry/examples/seaway-season-state-replay.mjs`.
- `tests/seaway-season.test.js`: 11 cases covering DST and Eastern-time conversion, official boundaries, the winter countdown, opening week, typical-schedule labelling, the five-year no-dead-end sweep and the year-free static markup. All 83 Seaway tests pass.
- `scripts/verify-seaway-follow-browser.cjs` passes on 4 viewports, including the no-JS case.
- Screenshots inspected at 390×844 and 1366×900, with no horizontal overflow, for: final weeks in Nov 2026 (official dates), closed in Jan 2027, opening week in Mar 2027, final weeks in Dec 2027 (typical dates), and the no-JS fallback.
- `npm run verify:all`: all 60 steps passed.

**Identity/search line:** title, description, canonical, Person/WebPage schema and the byline are unchanged. Head markup was not touched.

**Cost:** one static JS file and CSS lines. No function, API, cron or new build step. The generator was already in `build:site`.

Release state: NOT VERIFIED (no PR, no CI, no deploy from this session).
