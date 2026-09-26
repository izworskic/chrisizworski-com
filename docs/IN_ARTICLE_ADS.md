# In-article ads

Owner: Chris Izworski. Replaces the September 20 horizontal display pilot (slot
1011148508, removed) and Google Auto ads (turned off in the AdSense account).

## How ads are served
- One AdSense In-article unit, slot `8700232579`, fluid layout.
- Every eligible page gets the plain loader and `/assets/in-article-ads.js`, added
  at build by `scripts/inject-ga4.mjs` and on proxied tools by `lib/public-tool-page.js`.
- The script runs only on chrisizworski.com, 1.5s after load, and places at most
  `maxPerPage` (3) ads.
- Intentional seams may be declared with an empty
  `<div data-in-article-ad-break aria-hidden="true"></div>`.
- When no marker exists, the placer can use complete top-level `<section>` boundaries
  that pass the safety checks. It never guesses from headings inside a section or card.
- Pages without a reviewed marker or a safe semantic section receive no in-article ad.

## Placement rules
- The insertion point's parent is normal block flow (not grid, flex or table), is at
  least 300px and at least 60% of the viewport (max 560px) wide, and no ancestor is a
  card (rounded with background/border, or shadowed) or a wide multi-item grid/flex row.
- Never inside header, nav, footer, aside, form, dialog, table, list, details, figure,
  a map, or anything marked `data-no-ads`.
- Markers and section boundaries are accepted only when their parent and ancestors pass
  the card, grid, width, and block-flow checks.
- Both placement paths stay after the primary tool. Explicit seams may begin after
  1.25 screens; automatic section boundaries wait until after two screens.
- Never within 400px of the end, and keep at least 1.5 screens (1000px minimum) between ads.
- Only insert while the seam is still below the visible screen, so nothing the reader is
  looking at moves. A seam is not discarded merely because it was observed before it was
  eligible. Unfilled units collapse.

## Controls
- Everywhere off: `"enabled": false` in `config/in-article-ads.json`, commit, deploy.
- One route off: add it to `excludeRoutes` (e.g. `"/soo-locks/"`).
- One page off from its own HTML: `<meta name="in-article-ads" content="off">`.
