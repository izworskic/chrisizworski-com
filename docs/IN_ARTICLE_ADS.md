# In-article ads

Owner: Chris Izworski. Replaces the September 20 horizontal display pilot (slot
1011148508, removed). On September 27 Chris approved Google's current loader and
central controls to restore the previous loader or disable ad loading.

**Current setting: `legacy`.** The September 27 production trial of `standard`
successfully served ads, but live DOM inspection also found Google Auto ads
inside a fall-color card and a contextual-link grid. Our manual slot stayed at
reviewed boundaries. The prior loader was restored pending an AdSense account
review of unwanted in-page/intent-driven formats. The account was signed out in
the available browser, so no account settings could be changed. A legacy loader
is not a guarantee that Auto ads are disabled; formats must be managed in AdSense.

## How ads are served
- One AdSense In-article unit, slot `8700232579`, fluid layout.
- Every eligible page gets one asynchronous AdSense loader with the configured
  publisher ID and `/assets/in-article-ads.js`. `lib/adsense-eligibility.js` applies
  the same configuration in `scripts/inject-ga4.mjs` and `lib/public-tool-page.js`.
- The build injector runs after all HTML generators. It removes duplicate loaders
  and stale placer tags before adding the configured versions, including on pages
  that already contain ad code. Repeated runs produce the same result.
- The script runs only on chrisizworski.com, 1.5s after load, and places at most
  `maxPerPage` (3) ads.
- Intentional seams may be declared with an empty
  `<div data-in-article-ad-break aria-hidden="true"></div>`.
- When no marker exists, the placer can use complete top-level `<section>` boundaries
  or headings that are direct children of plain page-content flow. It skips headings
  inside sections, cards, articles and grids.
- Pages without a reviewed marker, safe section, or safe content-flow heading receive no in-article ad.

## Placement rules
- The insertion point's parent is normal block flow (not grid, flex or table), is at
  least 300px and at least 60% of the viewport (max 560px) wide, and no ancestor is a
  card (rounded with background/border, or shadowed) or a wide multi-item grid/flex row.
- Never inside header, nav, footer, aside, form, dialog, table, list, details, figure,
  a map, or anything marked `data-no-ads`.
- Markers and section boundaries are accepted only when their parent and ancestors pass
  the card, grid, width, and block-flow checks.
- All placement paths stay after the primary tool. Explicit seams may begin after
  1.25 screens; discovered content boundaries wait until after two screens.
- Never within 400px of the end, and keep at least 1.5 screens (1000px minimum) between ads.
- Only insert while the seam is still below the visible screen, so nothing the reader is
  looking at moves. A seam is not discarded merely because it was observed before it was
  eligible. Unfilled units collapse.

## Controls

Edit **`config/in-article-ads.json`**, then commit and deploy. Individual pages do
not need editing. The modes below are exercised against both previously built
static HTML and upstream HTML returned through the shared public tool shell.

| Goal | Setting | Result |
| --- | --- | --- |
| Current Google code | `"loaderMode": "standard"` | One loader with `?client=ca-pub-8222782620788075` and `crossorigin="anonymous"` |
| Restore the previous loader | `"loaderMode": "legacy"` | One plain loader without `?client=`; our reviewed placements still work |
| Stop all ad loading in this integration | `"loaderMode": "off"` | Remove both the Google loader and our placement script, including existing copies |
| Stop only our in-article placements | `"enabled": false` | Keep the configured Google loader; remove our placement script |
| Change our maximum placements | `"maxPerPage": 3` | Shared placer limit on every covered page |
| Exclude a route from our placements | Add the route to `excludeRoutes` | Remove its placement script; keep the configured Google loader |

One page can also opt out of our placements with
`<meta name="in-article-ads" content="off">`. Publisher verification metadata,
analytics, content, and empty reviewed seam markers remain when ad loading is off.

### Scope and rollback

This configuration covers pages built by this repository (including all Michigan
fall-color pages) and HTML composed by `lib/public-tool-page.js`. Direct rewrites
to independent deployments and separately hosted subdomains bypass that shell;
their owning repositories still control their ad code. This is not an account-wide
or network-wide kill switch.

For a loader regression, change `loaderMode` to `legacy` and deploy. For an urgent
stop to ad loading in the covered pages, use `off` and deploy. Restoring `standard`
re-enables the current loader without rewriting pages. A Vercel rollback to the
last healthy deployment is also available if the build itself cannot complete.
Already-open pages retain their loaded scripts until refreshed. Composed tool
responses can retain cached HTML for the configured 300-second cache and
600-second stale window.

Auto ads, anchor/vignette formats, and ad intents are managed in the **AdSense
account**. Neither `legacy` nor `enabled: false` guarantees those formats are off.
Account settings are separate from this configuration and were not changed by
the September 27 loader update. Google's current code supports manual units as
well as Auto ads; its documented optimization benefits do not guarantee earnings.

References:
- https://support.google.com/adsense/answer/12003870
- https://support.google.com/adsense/answer/9261307
