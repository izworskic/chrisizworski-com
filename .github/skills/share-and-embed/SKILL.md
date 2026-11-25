---
name: share-and-embed
description: "Make a tool worth passing on: share links that reopen the same answer, static share images, and a small embeddable widget other sites can place, without runtime image functions. Use when launching or redesigning a tool, when asked how people could share, link to or embed a tool, or when adding Open Graph images."
---

# Share and embed

People find outdoor tools through friends, forums, group chats and local sites. A link that reopens the same answer, a preview image that shows it, and an embed a marina or snowmobile club can put on its own page all bring visitors back and earn links. Everything here is static.

## 1. Share links that carry state

- The URL holds what the visitor chose: place, date, mode (`?beach=grand-haven&day=2026-07-04`). Opening it shows the same answer, or says plainly that the data has moved on and shows the current one.
- Use the shared place IDs from `tool-handoffs`, not free text.
- A native share button (`navigator.share`) where supported, with a copy-link fallback. No third-party share widgets or tracking pixels.
- The canonical URL stays the plain tool URL; state parameters never create new indexable pages.

## 2. Share images

- Every tool page has an `og:image` and `twitter:image` at 1200 by 630 px, with matching `og:title` and `og:description`.
- Make them ahead of time, not per request: render once when the page or its data is built (for example Satori to SVG, then resvg to PNG, run locally or in the tool's existing data workflow) and commit the PNG. No runtime image function and no `@vercel/og` route.
- An image that shows a live answer refreshes inside the tool's existing data commit, never on a new cron. Put the date on it so an old preview cannot pass for today.
- Keep text large enough to read in a phone chat preview, and include the site name.

## 3. Embeds

- One small static embed page per tool that earns it (for example `/embed/beach/`): the core answer, its timestamp and source, and a visible link back to the full tool.
- `noindex` on the embed page and a canonical pointing to the tool, so the embed never competes with it in search.
- A copy-paste `<iframe>` snippet with a fixed height and a `title`, shown on the tool page.
- Embed pages carry no ad units. AGENTS.md requires the Auto ads loader on every eligible page, so add each embed path to `pageExceptions` in `config/in-article-ads.json` (see `docs/AUTO_ADS_NETWORK.md`) in the same PR. Whether ads may show inside another site's iframe was not checked; do not add them.
- Allow framing for embed paths only; every other page keeps its framing protection.

## 4. Measure

Count shares and embed traffic with the existing GA4 setup (referrers from embedding sites, `utm_source=embed` on the embed's link back). Report counts with their windows; no uplift claims.

## Output

The state parameters and their behavior, the share image files and how they are regenerated, the embed page, its ads exception and framing rule, and any measurement. Unchecked items NOT VERIFIED.

## Boundaries

web-quality-seo (canonical, meta tags), return-visit-design and Experience OS apply. No new Vercel function, cron, route handler or paid service. Do not auto-merge.

## Sources

vercel/satori and yisibl/resvg-js (both MPL-2.0; fine as unmodified build tools), the Open Graph protocol. Reference only.
