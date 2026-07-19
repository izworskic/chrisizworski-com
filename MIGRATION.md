# Migration and rollback plan

This site must be migrated as a controlled origin change, not as a redesign. The current production deployment remains authoritative until every preview check passes.

## Stage 1: source capture and parity baseline

- Crawl the live origin read-only.
- Preserve every successful public route, image, icon, sitemap, identity file, canonical URL, metadata block, and structured-data block.
- Recreate the live buoy and variety-matchmaker API contracts without copying deployment secrets.
- Remove injected Cloudflare analytics beacon copies from the source because Cloudflare can inject its own production beacon at the edge.
- Fix only the three confirmed internal links that currently lead to 404 pages.

## Stage 2: isolated preview

- Push this source to its own GitHub repository.
- import that repository as a new Vercel preview project.
- Do not attach `chrisizworski.com` or `www.chrisizworski.com` yet.
- Keep every `*.vercel.app` preview out of search results with a host-scoped `X-Robots-Tag: noindex` response header while leaving custom domains indexable.
- Compare routes, response codes, titles, descriptions, canonicals, robots directives, structured data, sitemaps, images, internal links, APIs, layout, and mobile behavior against production.

## Stage 3: reversible cutover

- Record the current Vercel project, deployment, domain assignments, and Cloudflare DNS values immediately before the switch.
- Run `npm run verify:production-ready`, deploy that exact commit, and confirm that Vercel preview hosts plus API paths remain `noindex` while the custom production host does not.
- Promote the verified commit to production on the new Vercel project.
- Move the two existing domains to that project without changing public URLs.
- Purge only Cloudflare's cached HTML after the origin switch; retain normal image caching.
- Re-run the full production checks and inspect Cloudflare/Vercel errors.

## Rollback

If any material check fails, restore the domain assignments or DNS values recorded before cutover, purge cached HTML, and verify the old deployment. The previous deployment and this repository remain intact; no production files are deleted during migration.

## Release discipline after migration

Every future change goes through a Git branch or pull request, a Vercel preview, automated tests, a search-metadata review, and a production smoke test. A content or tool release should never require copying the entire live site again.
