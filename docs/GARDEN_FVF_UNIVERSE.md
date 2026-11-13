# Garden and Freighter View Farms: one visual universe

Owner request, November 13, 2026: the garden tools on chrisizworski.com should match the look
and feel of freighterviewfarms.com (type, seal, masthead), keep the tools' green answer
colors, and the blog's stark black can soften so both read as one place.

## Baseline measured before the change

- Blog (WordPress.com, Nook theme, no custom global styles): Playfair Display headings,
  Instrument Sans body, black `#000000` on white, teal `#1a7a89`, band `#edf1f4`. Masthead is
  three bands: a dark place line, an italic 600 wordmark, an uppercase nav band. The round
  line-art seal is the site icon only.
- Hub: 19 garden pages in four styling dialects. Seven load `garden-kit.css` (pine, clay,
  cream, system fonts), about eight carry inline Georgia or system styles, the gardening hub
  uses the main site's Fraunces and DM Sans, Pest Watch has three stylesheets of its own. The
  seal appeared on none of them.

## Two concepts compared

1. Literal blog skin: black, white and teal everywhere. Rejected. It would repaint the
   "plant now / wait / not yet" answer states, which are meaning, not decoration.
2. Shared identity, softened (selected): the blog's type, seal and three-band masthead on the
   tools; the tools' pine, gold and clay answer colors unchanged; one softened ink, cream
   paper, sage mist band and quieter teal applied on both properties.

## Shared tokens

| Role | Value | Was (blog) | Was (garden kit) |
| --- | --- | --- | --- |
| Ink (text, top band) | `#22302c` | `#000000` | `#26302b` |
| Paper (page) | `#fffdf8` | `#ffffff` | `#fffdf8` cards |
| Mist (nav band, quiet panels) | `#e9f0ec` | `#edf1f4` | `#e8f0ea` |
| Teal (reading links, accent) | `#1f6f78` | `#1a7a89` | none |
| Pine (actions, go answers) | `#3f6b55` | none | `#3f6b55` |
| Display type | Playfair Display 600 | same | Georgia |
| Body type | Instrument Sans | same | system-ui |

Contrast on paper: ink 13.5:1, teal 5.7:1, pine 6.0:1, muted `#5a6661` 5.9:1.

## Implementation

- `public/assets/garden-tools/fvf-universe.css`: opt in with `class="fvfu"` on `<body>`,
  loaded after `garden-kit.css`. Static CSS only: no script, no build step, no function.
- `public/assets/garden-tools/fonts/`: three latin variable woff2 files (107 KB total),
  SIL Open Font License 1.1, license text alongside. Self-hosted, so no third-party request.
- `public/assets/garden-tools/freighter-view-farms-seal.webp`: the blog's own seal, recolored
  to the shared ink with a transparent ground (6 KB).
- Markup contract for a page: the place line, then the existing `header.site-header` holding
  the seal, the wordmark and the unchanged `Chris Izworski` home link, then the existing
  `nav.site-nav` with its links untouched. Creator identity, canonical, title, description,
  schema, ads and every tool control stay exactly as they were.

## Rollout, one page at a time

1. `/michigan-frost-dates/` (this pilot).
2. The other garden kit pages: soil temperature, planting calendar, tomatoes, seed starting,
   variety matchmaker.
3. The inline-styled guides: seed saving guide, heirloom vs hybrid, native plants, seed
   libraries, last spring freeze, companion planting, heirloom tomatoes.
4. Seed Saving Lab, leafcutter bees, Pest Watch and the gardening hub last. Each has a
   purpose-built layout; they take the tokens and the seal, not a common page shell.

This is a shared identity layer, not a page template. Layouts, interactions and each tool's
own composition are not standardized by it.

## Pest Watch (November 13, 2026)

Owner asked for Pest Watch to join now rather than last. It keeps its purpose-built layout,
paper, answer colors and every control. It takes the place line, the seal and wordmark in its
existing `header.masthead`, and Playfair Display and Instrument Sans in place of Fraunces and
DM Sans across its three stylesheets. Heading tracking that was tuned for Fraunces was eased,
because Playfair at -.05em ran words together. The rules live in `garden-pest-watch.css`
rather than a new stylesheet link, and the edit avoids the head lines that open PR #1500
(cabbage maggot validation) changes, so that PR still merges cleanly. Follow-up after #1500
lands: its new stylesheet should use the shared families, and the now-unused Google Fonts
link on this page can be removed.

## Status

- `/michigan-frost-dates/`: merged in PR #1664, deployed, public page and assets verified.
- `/michigan-garden-pest-watch/`: merged in PR #1666, deployed, public page verified.
- Soil temperature, planting calendar, tomatoes, seed starting, variety matchmaker:
  implemented, each checked in headless Chrome at 390 px. The matchmaker keeps its own
  centered masthead and takes the seal, wordmark and shared colors.
- Remaining: the inline-styled guides, Seed Saving Lab, leafcutter bees, the gardening hub.
  No visitor outcome is claimed for any of this.
