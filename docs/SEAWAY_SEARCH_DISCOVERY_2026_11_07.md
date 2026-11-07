# Seaway Search Discovery and Canonical Ownership — November 7, 2026

## Purpose and owner
- Repository: `izworskic/chrisizworski-com`.
- Independent canonical intents: `/st-lawrence-seaway/` (Montreal–Lake Ontario ship reports, seven locks, river chapters, shore viewing) and `/eisenhower-lock/` (visitor decision at the Seaway Visitor Center, Massena).
- Do **not** create keyword-variant pages, lock-clone pages or a competing Seaway sitemap for these existing canonical URLs. Welland retains its own dedicated intent.
- User-facing Experience OS is preserved. No new ad, analytics, runtime, AIS provider, Redis or Supabase code.

## Verified preflight
1. Root `public/sitemap.xml` already contained both canonicals exactly once, `public/sitemap-index.xml` included the root sitemap, and `public/robots.txt` advertised the index and image sitemap.
2. The generator set WebPage `dateModified=2026-10-24` for both pages even after the November 5 corridor redesign. The post-generation enhancer selectively rewrote only the hub to `2026-11-05`, leaving two brittle sources of search truth.
3. The primary site and `picturedrocks.chrisizworski.com` are assigned to the same Vercel project; the Pictured Rocks hostname exposed the Seaway hub at its noncanonical path. The existing middleware has an explicit primary-route redirect guard and preserves the separate Pictured Rocks root product.
4. Both pages already supplied a source-credited Eisenhower Lock photo for Open Graph/X but neither was explicitly present in the image sitemap.
5. Baseline GSC export (Web, October 7–November 3, saved November 5): Seaway 85 impressions / 1 click / avg position 16.29; Eisenhower 29 impressions / 1 click / avg position 8.41; Welland 3,012 impressions / 69 clicks / avg position 8.16. Small samples are **not** an established conversion effect.

## Implemented source-owned contract
- `data/seaway/search-surface.json` is the shared title, description and last **significant HTML edit** date. The generator reads it for both pages, and the enhancer checks against it rather than overwriting metadata.
- Unique title (≤60 rendered characters), description (120–158 characters), self-canonical, stable Chris Izworski `#person` entity, WebPage/WebApplication and BreadcrumbList, OG/X description and locally hosted image consistency, descriptive X image alt, and an explicit large-image preview robot directive.
- Both root-sitemap `lastmod` values now match that November 7 substantive revision and each canonical has one entry in the existing image sitemap. Sitemap index/robots declarations are unchanged and accurate. No extra sitemap or fabricated `priority` is added.
- The existing hostname-aware 308 middleware wrong-host guard is extended to only Seaway and Eisenhower paths on Pictured Rocks, leaving the Pictured Rocks canonical root and primary Seaway host untouched.
- `tests/seaway-search-surface.test.js` verifies rendered snippet limits, unique sitemap routes, source image presence, author entity, JSON-LD/SEO agreement, title/description/social parity, primary-host redirect patterns, and cross-tool links. The existing journey test now reads the date contract.

## Independent blockers and measurement discipline
- On Nov 7, Vercel production runtime log inspection of Seaway AIS was denied with HTTP 403. **Upstream failure root cause is not determined**, and this search-only release must not be described as a repair to vessel source reliability. Prior source observations include both stale and recently populated regions. Do not infer empty river, lock queue, ETA or scheduled arrival from AIS.
- The current Open Waters public AIS commercial-use licensing and attribution must be verified before increasing provider usage.
- A 308 redirect and self-canonical on source are implementation facts; **Google-selected canonical is not verified** without URL Inspection. Nor does sitemap membership guarantee indexing.
- Inspect primary-host and picturedrocks-host HTTP status, exact 308 Location and primary page canonical after deployment. Verify the live sitemap/index/robots/image records and that local OG image returns 200.
- After a full nonoverlapping post-release 28-day Search Console Web window, compare page-qualified queries and positions, clicks/CTR and GA4 seasonal/next-step clicks. No claim of improved rankings, impressions, CTR or revenue until measured.

## Release gate
`node --test tests/seaway.test.js tests/seaway-search-surface.test.js`, `npm run build:site`, `npm run verify:all`, GitHub-required CI, Vercel READY and live canonical/redirect smoke checks. The PR and production identifiers are the source of truth for release status; an unmerged PR is not published.

**Single next action:** obtain authorized Seaway production AIS logs (or an equivalent dated, legitimate service-side trace), classify the actual upstream failures by region and HTTP status, and repair only the confirmed cause without adding unsupported sources or fabricated ship positions.
