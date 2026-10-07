# Coverage repair — October 7, 2026

The owner supplied the aggregate Search Console export
[chrisizworski.com-Coverage-2026-10-07](https://docs.google.com/spreadsheets/d/1XBnQub6vSkgebUyVHDtsyqNPp17iETjrJNQ1HvGkk0g/edit).
Its latest daily row is October 3: **710 indexed / 653 not indexed**.
Indexed pages rose from 531 on September 17 to 710 on September 21.
The export does not show a site-wide indexing loss.

## Report triage

| Report reason | Pages | Treatment |
| --- | ---: | --- |
| Not found (404), validation failed | 132 | Investigate live broken links and public routes; the export has no per-URL examples. |
| Redirect error | 12 | Check old aliases and redirect destinations; do not assume every ordinary redirect is an error. |
| Duplicate without selected canonical | 8 | Inspect the actual examples before changing canonical ownership. |
| Blocked by other 4xx | 2 | Requires affected URL examples; no general access restriction was observed. |
| Alternate with proper canonical | 155 | Expected when alternate URLs identify the correct canonical. |
| Page with redirect | 75 | Expected for moved pages when the redirect reaches the correct destination. |
| Excluded by noindex | 3 | Preserve intentional utility/lab exclusions; do not remove noindex wholesale. |
| Crawled, currently not indexed | 82 | Google-side selection; verify usability and canonical availability first. |
| Google chose a different canonical | 9 | Requires affected URL examples to distinguish legitimate duplicates from conflicting signals. |
| Discovered, currently not indexed | 175 | Repair broken canonical destinations before requesting indexing. |

## Verified defects and changes

- All **395 unique main-domain page URLs in the committed sitemaps** returned
  HTTP 200 with their declared canonical and no unexpected noindex.
- Following links from those pages exposed **40 national location pages** whose
  public directory URLs returned 404. Each existing `index.html` document
  returned 200 with the matching public canonical. The five affected families
  are rivers, frost, fall color, coastal conditions, and snow.
- The same problem affected `/isle-royale-map/sources/`.
- Add explicit, allowlisted owner-document rewrites for those **41 existing
  pages**, including both slash forms, before the generic owner wildcards.
  Owner content, APIs, canonical URLs, and specialized nested routes are preserved.
- Five old Michigan fall-color aliases returned 404 with a trailing slash.
  Preserve both forms and redirect directly to each destination's canonical URL.
- `/michigan-outdoors/` returned 404 and remained linked from the boat-launch
  and snow-depth navigation. Point those links directly to the registered live
  Michigan Outdoors Now tool; permanently redirect both old URL forms there.
- The 22 top-level Michigan fall-color aliases already resolve successfully.
  Intentional noindex on the Niagara best-time utility and publisher page remains.

The observed 404s are documented in
`benchmarks/coverage-route-repairs-2026-10-07.json`; they cannot be matched
one-for-one to Google's reported 132 without the issue-detail URL exports.
No content pages, schema nodes, or links were removed. Two link targets changed;
the main sitemap URL count remains 241.

## Verification and release

The regression tests validate both public URL forms, canonical redirect
destinations, ordering before owner wildcards, and exclusion of sitemap files,
unpublished cities, and nested coastal tools. Run `npm run verify:all` and
`npm run vercel-build` before release.

After the approved merge deploys, recheck all repaired public URLs with GETs.
Then inspect the 404/redirect-error examples in Search Console and validate only
the applicable fixes. The historical spreadsheet counts remain unchanged.
The 82 crawled and 175 discovered exclusions cannot be promised indexed by a
code change; observe Google's recrawl and selection separately.
