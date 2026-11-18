# Experience brief — Gardening hub "this-week desk"

- Date / owner: 2026-11-18 · Chris Izworski ("Yes for us tools and garden tools")
- URL: https://chrisizworski.com/michigan-gardening/ · stacked on the U.S. Tools desk PR (shared `tool-stars.js`)

## Approach: adapt, don't clone

The gardening hub is a photo-led Freighter View Farms notebook with its own planner, saved-plants list and a browser verifier pinning its behaviour. Concept A was adapted rather than copied: nothing was removed or restyled, the welcome keeps its seasons, photographs and town lookup, and the planner is untouched.

| Phone, 390 px | Before | After |
| --- | --- | --- |
| Search box | 2,340 px | 687 px |
| Featured questions | 2,114 px (after the 1,111 px welcome) | 1,059 px |
| Month's garden jobs | inside the collapsed planner | directly under search |

## Changes

- Search lifted out of the questions section to sit under the title (same hub search engine; still searches the featured tools).
- **Garden jobs for <month>**: built from the planner's existing month-tagged `#pnJobs` list (no new content); hidden in months with no tagged jobs (e.g. January) and without JavaScript. Fail-safe so it can never block the planner code that follows.
- **Your garden tools**: stars on the 16 guide and tool cards that link to a tool (the blog link-out card is skipped), keyed by link via the new `data-id="href"` option of `tool-stars.js`.
- Questions ("What brings you to the garden today?") now come before the photo welcome.

## Verification

- Playwright 21/21 at 360/390/768/1440, November, May and January dates, no-JS; `scripts/verify-garden-home-browser.cjs` passes unchanged at all four widths; both run on the `vercel build` output too.
- U.S. Tools (26/26) and /tools/ (39/39) re-run on the build output because `tool-stars.js` changed.
- `tests/garden-this-week-desk.test.js`, existing garden tool tests and `benchmark:garden-tools`; `npm run verify:all` 60/60.
