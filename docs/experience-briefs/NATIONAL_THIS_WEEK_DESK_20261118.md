# Experience brief — U.S. Tools "this-week desk"

- Date / owner: 2026-11-18 · Chris Izworski ("Yes for us tools and garden tools" after approving concept A on /tools/)
- URL / source: https://chrisizworski.com/national-tools/ · `public/synced-national-tools/` (the hub repo copy is not what production serves)
- Companion: `TOOLS_THIS_WEEK_DESK_20261118.md` (same concept on /tools/), `HUB_SEARCH_20261118.md`

## What was different here

U.S. Tools already had search near the top (1,035 px at 390 px). Its gaps: nothing said what is timely (57 of 73 cards labelled "in season"), no way to keep favourites, no way to move between ten regional collections on a 40-screen page, and tall cards.

## Design

1. **Worth checking now.** Driven by `data/directory-peaks.json`: 22 reviewed peak windows (MM-DD/MM-DD, year-wrap and multiple windows supported), each with a one-line note that stays true every year. `scripts/build-directory-peaks.py` writes them onto cards and has a `--check` mode used by tests. The page lists up to five tools in their window, shortest (most time-sensitive) window first, then tools starting within three weeks as "Starts …". Dates verified in the browser: Nov 18 (White Christmas first), Dec 28, Feb 15 (Yosemite Firefall), Jul 4, Sep 20 (Elk Rut).
2. **Your tools.** Same `tool-stars.js` as /tools/ (now with a `data-link` option so national cards star their tool link). Browser-only storage.
3. **Region jump menu.** Twelve collections; sticky and swipeable on phones; headings carry `scroll-margin-top` so they are not hidden under it.
4. **Compact phone cards.** Two-line description, one-line signals, single-row intent chips.

Constraint discovered: several build scripts and tests count the literal string `data-search-card` in the page. The new markup must never contain it (the stars section selects `article.directory-card`).

## Verification

- Playwright 26/26 at 360/390/768/1440 plus four fixed dates and no-JS, on source and on the `vercel build` output (73 cards there, all starred).
- /tools/ (39/39) and hub search (36/36) suites re-run on the build output because `tool-stars.js` is shared.
- `tests/national-this-week-desk.test.js`; `npm run verify:all` 60/60.
- Not measured: visitor outcome. Watch `tool_open` with placement `peak-now` and `tool_star` with placement `national-directory`.
