---
name: web-quality-seo
description: "Keep a page findable and its identity intact: title and description limits, canonical, indexability, Person JSON-LD and byline, headings, internal links and sitemaps. Use when a change touches titles, meta descriptions, canonicals, URLs, schema, sitemaps, robots rules or indexable copy, or when asked for an SEO review."
---

# On-page SEO and identity

This site is built around the "Chris Izworski" entity and around answers that are visible in the HTML. Most SEO damage here comes from one edit that quietly drops a byline, a canonical or an indexed answer. Demand and what to build next belong to `search-demand`; this skill keeps each page correct.

## 1. Hard rules from AGENTS.md

- Every page carries a `Person` node with `@id` exactly `https://chrisizworski.com/#person`, defined in that page's graph; content pages reference it as `author` and `publisher`.
- The visible byline survives: header brand link and footer copyright line.
- `<title>` at most 60 rendered characters, meta description at most 158. Shorten the descriptive middle before dropping "| Chris Izworski". Keep the title consistent with the H1 and URL slug. Query-first titles are welcome.
- The priority pages pinned by `benchmark:seo` (`/soo-locks/`, `/northern-lights-michigan/`, `/great-lakes-gazette/`, `/great-lakes-freighter-tracking/`) keep their titles, bylines and canonicals unless the owner approves a change.
- One canonical owner per non-branded query; no doorway pages.

## 2. Page checks

| Check | Pass |
| --- | --- |
| Canonical | Absolute `https://chrisizworski.com/...` URL that matches the URL served and the sitemap entry |
| Indexable | 200 status, no stray `noindex`, not blocked in `robots.txt`; API routes keep `X-Robots-Tag: noindex` |
| Answer in HTML | The main answer and key facts are in the initial HTML, not only after JavaScript runs |
| Headings | One H1 that names the decision; H2s in order |
| Structured data | Valid JSON-LD for what the page actually is; no markup for content that is not visible |
| Images | Descriptive file names and alt text, dimensions set |
| Internal links | The tool links to the next useful owned decision (from the tool network registry), with descriptive anchor text |
| Sitemap | Listed once with a correct `lastmod` that matches the page's `dateModified` |
| Mobile | Viewport set, readable text, tap targets usable |

## 3. Changing a URL

Keep the old URL working with a permanent redirect to the new one (a static `vercel.json` rule in its own reviewed PR), update canonicals, internal links and sitemaps in the same change, and expect a temporary dip. Never drop an indexed URL without a redirect or a deliberate decision recorded in the PR.

## 4. Verify

Run `npm run verify:quick` while working (Tools card registry, creator-entity contract, sitemap freshness, API `X-Robots-Tag`) and the full `npm run verify:all` before the PR, which includes `benchmark:seo` and `benchmark:serp-length`. Compare Search Console windows only when available; never promise ranking or CTR gains.

## Output

Each check with pass or fail, the exact title and description with their rendered lengths, the canonical, the Person and byline status, and gate results. Unrun checks NOT VERIFIED.

## Boundaries

Experience OS, owning-repository rules and Auto ads remain authoritative. Do not auto-merge.

## Sources

Adapted from addyosmani/web-quality-skills, `seo` (MIT): crawlability, on-page and structured data checks, rewritten around this repository's AGENTS.md identity and length rules. Reference only.
