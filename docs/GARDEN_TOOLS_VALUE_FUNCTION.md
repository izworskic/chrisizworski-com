# Garden tools: one value function, held to the Seed Saving Lab bar

**Gate:** `npm run benchmark:garden-tools` · **Tests:** `tests/garden-tools.test.js` · **Recorded:** October 24, 2026

The owner asked for every garden tool to be brought up to the Seed Saving Lab. This is the shared bar. Each tool scores 0 to 100 on eight behaviours, driven through `scripts/lib/garden-tool-harness.mjs`, which runs the page's own scripts (inline and `/assets/garden-tools/`) against a small DOM on fixed dates. Gate: every tool at least 90. These are automated task proxies, **not** human usability results, search data or revenue.

| Dimension | Weight | What is checked |
|---|---:|---|
| Answer first | 15 | A specific answer on load; the answer card sits before the refinements |
| Personal | 15 | Your station, zone or garden changes the answer |
| Refine | 10 | A second input (a date, readings, a crop, a growing space) changes it again |
| Plain answer | 15 | Dates or a concrete action across nine dates through the year; no botanist jargon; grade 9 or below |
| Picture | 15 | A chart that redraws with the answer, with a text alternative |
| Correct | 10 | Tool-specific invariants against the source data (below) |
| Share | 10 | A copied link reopens the same answer; a calendar file or print to take away |
| Access and trust | 10 | Labelled controls, a status region that speaks the answer, linked sources, no em dashes, no inline handlers |

**Correctness invariants.** Planting calendar: every window equals the station frost date plus the published offset, for all 78 stations and 47 crops, and the tables agree. Frost dates: the risk curve passes through the published 75, 50 and 25 percent dates and never rises through spring, at every station; all 78 table rows remain. Tomatoes: seed start, harden off and plant out come in order at every station, and soil and forecast readings flip the answer correctly. Seed starting: zone frost dates run in order (colder zones later) and the intro no longer sits inside the site header. Matchmaker: three different picks for all 256 zone, sun, space and goal combinations, matching the API, with no server call.

## Before and after

"Before" is the shared bar applied by hand to `main` on October 24, using measured facts from a 390 px Chromium session (sideways scroll, control position, charts, status regions, link state). The old pages have none of the ids the automated gate drives, so running it on them would only report zeros. The "after" column is the automated gate.

| Tool | Before (manual) | After (gate) | Defects found and fixed |
|---|---:|---:|---|
| Michigan Zone 6a planting calendar | ~60 | 100 | No chart; answer below the fold on a phone; custom frost date not kept in links |
| Michigan last frost dates | ~44 | 100 | A table only: no personal answer, no chart, no share link |
| When to plant tomatoes | ~36 | 100 | No tool at all; the page scrolled sideways on a phone (453 px) |
| Seed starting guide | ~36 | 100 | Intro rendered inside the site header, above the nav; zone 6a frost dates out of order (May 10, later than zone 5); empty table cells showed ", "; inline click handlers |
| Heirloom variety matchmaker | ~45 | 100 | Five screens and a server call before any answer; sideways scroll on a phone (396 px); no sources |
| Seed Saving Lab (reference) | 100 | 100 | Its own gates: `benchmark:seed-lab-usability`, `benchmark:seed-lab-features` |

## What each tool does now

- **Shared pieces** in `public/assets/garden-tools/`: `garden-kit.js` (DOM builders, year-agnostic dates, copy-a-link, `.ics` download, season timeline chart), `garden-kit.css` (the soft Seed Saving Lab look), `michigan-frost.js` (the 78 State Climatologist stations, now with the 75 percent date, and the 47 crop offsets, used by three tools so they agree), `heirloom-matchmaker.js` (the matchmaker rules, now used by both the page and `lib/matchmaker.js`).
- **Planting calendar:** station first, then "this week" (most urgent first, the rest folded), coming up in two weeks and the station's frost facts; typical or cautious date and your own date; a crop lookup; a season timeline with frost-free band and today; tables kept; link, `.ics` and print. Older `?safe=1` links still open.
- **Frost dates:** your station's dates in plain words, "Is it safe to plant on..." with plain odds ("about 1 spring in 5"), a frost-risk curve (dashed where it extends past the table), and a dot chart of all 78 stations that switches station on tap. Every table and paragraph stays.
- **Tomatoes:** a tomato check under the protected short answer: seed start, harden off and plant out from the station's cautious date (Bay City May 16 to 30, which contains the page's May 25), and optional soil and forecast readings that turn it into go or wait.
- **Seed starting:** zone buttons or your own frost date, "this week" for that zone, a timeline per tab, the table rebuilt without the ", " cells, a pointer to station dates for Michigan zones. The intro paragraphs moved below the tool, word for word; only an empty "Timing Your Start" heading was dropped.
- **Matchmaker:** three picks on load from sensible defaults, every answer on one screen, reasons tied to each answer, a "will they ripen before frost" chart, a link into the Seed Saving Lab for each crop, link and print. The `/api/matchmaker` endpoint is unchanged and still passes its contract test, but the page no longer calls it, so it uses no function invocations.

## Browser evidence (local Chromium, not CI)

All five at 1280 × 900 and 390 × 844 on a fixed date (April 20, 2026): no JavaScript errors, no sideways scroll, answer heading at 307 to 776 px on the phone (all inside the first screen).

## Limits

No real gardeners were observed. The frost-risk line between published points is an estimate and is labelled so. Zone frost dates on the seed starting guide are rough by nature; the page says so and points Michigan gardeners to station dates. Days to harvest in the matchmaker are typical catalog figures.
