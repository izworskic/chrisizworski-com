# In-article ads

Owner: Chris Izworski. Replaces the September 20 horizontal display pilot (slot
1011148508, removed) and Google Auto ads (turned off in the AdSense account).

## How ads are served
- One AdSense In-article unit, slot `8700232579`, fluid layout.
- Every eligible page gets the plain loader and `/assets/in-article-ads.js`, added
  at build by `scripts/inject-ga4.mjs` and on proxied tools by `lib/public-tool-page.js`.
- The script runs only on chrisizworski.com, 1.5s after load, and places at most
  `maxPerPage` (3) ads. Each goes immediately before an `h2` or the section that
  heading opens.

## Placement rules (all must pass)
- The insertion point's parent is normal block flow (not grid, flex or table), is at
  least 300px and at least 60% of the viewport (max 560px) wide, and no ancestor is a
  card (rounded with background/border, or shadowed) or a wide multi-item grid/flex row.
- Never inside header, nav, footer, aside, form, dialog, table, list, details, figure,
  a map, or anything marked `data-no-ads`.
- Never before the tool: the first ad goes after the last map, camera, chart, embed,
  form or tool block that starts in the top 60% of the page, and never in the first two screens.
- Never within 400px of the end, at least 1.5 screens
  (1000px minimum) between ads.
- Only inserted while still below the visible screen, so nothing the reader is looking
  at moves. Unfilled units collapse.

## Controls
- Everywhere off: `"enabled": false` in `config/in-article-ads.json`, commit, deploy.
- One route off: add it to `excludeRoutes` (e.g. `"/soo-locks/"`).
- One page off from its own HTML: `<meta name="in-article-ads" content="off">`.
