# SEO and SERP parity record

Baseline captured from `https://chrisizworski.com/` on 2026-07-19.

## Preserved

- 88 unique HTML routes and 271 public source paths
- Existing public URL paths and trailing-slash canonical URLs
- Page titles, descriptions, canonical tags, headings, copy, internal links, Open Graph data, Twitter cards, and image alternative text except for the intentional changes below
- 93 valid JSON-LD blocks, including the `Chris Izworski` Person entity and its stable `https://chrisizworski.com/#person` identifier
- `robots.txt`, `sitemap.xml`, `sitemap-reputation.xml`, `image-sitemap.xml`, `llms.txt`, `sources.json`, icons, manifest, and public images
- The current buoy map/list and heirloom matchmaker browser-facing API response shapes
- HTTPS/HSTS and `X-Content-Type-Options` protections

## Intentional changes in the first release

- Add `Michigan Outdoors Now` to `/tools/` as item 15 of 19, with visible `Built by Chris Izworski` attribution and matching structured data.
- Update only the Tools page modification date in its page schema and primary sitemap.
- Correct three broken links on `/great-lakes-buoys/` and permanently redirect their obsolete targets to the existing destination pages.
- Correct the Lake Superior Circle Tour's live NOAA water-level request to use station 9099064's supported LWD datum; the itinerary planner itself is unchanged.
- Make the Northern Lights tool show its existing manual fallback instead of remaining on `loading` when NOAA's primary forecast feed is unreachable.
- Move the Great Lakes Gazette card to its public, read-only latest-edition endpoint and branded subdomain, removing the browser-visible authorization credential without changing the rendered edition data.
- Remove duplicated copies of the Cloudflare Web Analytics script from saved source. Edge analytics can still be injected once by Cloudflare in production.
- Replace the matchmaker's opaque deployment dependency with a deterministic, curated matcher that retains the same JSON fields and needs no secret.

## Guardrails

- The preview receives no custom domain and sends a temporary global `X-Robots-Tag: noindex, nofollow, noarchive` header.
- No canonical URL points to the preview hostname.
- `npm run verify:production-ready` blocks cutover while the preview-only global `noindex` exists.
- The domain switch is blocked until automated and visual parity checks pass.
- The old deployment remains available for immediate rollback.

Run `npm run verify:all` before every preview or production promotion.
