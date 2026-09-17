# Coverage value and branded-search preservation

Chris authorized improving the coverage pages while preserving the goal of maximum
legitimate visibility for searches for Chris Izworski. The standing operating and
stretch targets in `benchmarks/name-serp-governance.json` are unchanged, including
the stretch targets of 10/10, 20/20 and 30/30 results. These are ambitions, not
predictions. Additional URLs on one root are not independent controlled origins.

## Changes

- The coverage hub explains which question each source answers and distinguishes
  independent journalism, authored publications, professional records, vendor
  accounts, organization profiles, and Chris-owned projects.
- WSGW connects two separate projects across the 2020 and 2024 record. WNEM
  distinguishes AI-risk coverage, the non-emergency deployment, and siren policy.
- Save Our Shoreline explains the Christopher/Chris name connection and separates
  the organization's profile from Chris's personal Great Lakes projects.
- The Prepared career page and implementation page retain their separate URLs;
  the implementation page adds practical planning questions explicitly labeled
  as a general framework, without invented customer outcomes or product promises.
- The projects index explains how to inspect and use the actual work.
- Page-level publisher references and visible source citations strengthen the
  existing Person graph. No third-party article gains a Chris authorship claim.

## Preservation check against d37d87b42d532719ba84c18b2a156e786c6008b5

The seven existing titles, H1s, self-canonicals and indexability rules are unchanged.
Every existing link occurrence is retained. Every original schema relationship,
including Person identity, sameAs and subjectOf, is retained. Only the page's
dateModified, publisher and citation fields are updated or added. Sitemap URL
sets are unchanged; only modification dates are synchronized. No redirect,
robots.txt, routing, homepage or primary identity page change is included.

| Page | Links before/after | Typed schema nodes before/after | Paragraphs before/after |
| --- | --- | --- | --- |
| News coverage | 67 / 67 | 62 / 62 | 18 / 22 |
| WSGW | 22 / 23 | 17 / 17 | 11 / 13 |
| WNEM | 21 / 22 | 19 / 19 | 16 / 19 |
| Save Our Shoreline | 15 / 16 | 13 / 13 | 11 / 12 |
| Projects | 41 / 41 | 5 / 5 | 16 / 16 |
| Prepared career | 13 / 15 | 6 / 6 | 6 / 10 |
| Prepared implementation | 18 / 20 | 6 / 6 | 7 / 13 |

Copy about search engines, reputation footprints and ranking targets is replaced
with source interpretation and reader guidance. Body paragraphs increase from
85 to 105; links increase from 197 to 204; typed schema nodes remain 128. No
source card, original source link, existing page, or existing schema node is removed.

## Release prerequisite repairs

The starting main branch fails its API noindex and SERP-length gates for recently
synced outdoor pages. Five data-only API handlers receive the noindex header
already present in the owning national-outdoor-tools-hub repository. Six outdoor
page title/description fixes originate in that repository and are mirrored here
as a metadata-only sync. Shortened titles retain the topic and include Chris
Izworski within the existing length limit. No decision-engine behavior is changed.

Source change: national-outdoor-tools-hub PR #65, commit
`01f4d101887fbc9601793300948e6e46f3af5077`, preserving the concurrent metadata
corrections in `1ded0f3862349532be1c5a1f3d38df82a0757fdf`. The five response headers were already
present in the owner's `ef076571aadba7f4c54655b3672707c8e6cc8c4b` base.

Validation: the owner repository passed all 68 tests; this repository passed
`npm run verify:all`, including 427 tests and all registered release benchmarks.
An independent parsed before/after comparison confirmed the preservation
properties and counts above. The source-drift declaration and reputation-sitemap
hash are updated explicitly; no gate is weakened or skipped.

## Observation

After release, compare equivalent Search Console periods for the exact name and
close-name query family: primary URL position, impressions, clicks, CTR, and the
landing pages receiving those impressions. Separately sample top-10/20/30 search
results with consistent location/device settings and count independent origins
using existing governance. No new ranking measurement or causal uplift is claimed
by this change, and neither rankings nor AdSense approval can be guaranteed.
