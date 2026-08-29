# Chris Izworski Exact-Name SERP Moat

Updated: August 29, 2026 (America/Detroit)

## Objective

Own the exact-name query `Chris Izworski` with a durable mix of independently controlled results and credible earned authority.

The operating goal is **8 of the top 10 results from independently controlled origins or platform accounts**, with **7 of 10 as the minimum acceptable moat**. Strong independent government, association, publication, media, and civic results are desirable in the remaining slots when they accurately corroborate the same person.

This is deliberately stricter than counting URLs. Ten Chris-owned URLs under one root domain are not a ten-result moat.

## What counts as one controlled moat slot

A controlled slot is one of:

- one independently controlled root domain with a substantive Chris Izworski identity or authorship surface; or
- one independently controlled profile/account on a third-party platform.

For moat accounting, multiple pages or subdomains on the same root domain still represent one controlled origin, not extra moat slots.

- multiple URLs on `chrisizworski.com` count as one controlled origin;
- subdomains of an already-counted registrable domain are supporting surfaces, not additional controlled slots;
- multiple URLs on the same platform account count once;
- GitHub profile and GitHub Pages are conservatively treated as one GitHub-controlled identity for moat scoring;
- third-party media, government, association, conference, nonprofit, and publication pages never count as controlled even when they are favorable.

Supporting surfaces still matter. They can strengthen entity understanding, internal discovery, links, authorship, and the likelihood that a controlled origin earns a result. They simply do not inflate the ownership score.

## Current controllable origin portfolio

The current portfolio already contains enough legitimate assets to pursue the 8/10 operating goal without manufacturing thin profiles.

| Origin / platform | Primary surface | Role | Priority |
| --- | --- | --- | --- |
| chrisizworski.com | `/` | Primary branded result and canonical Person hub | PROTECT |
| LinkedIn | Chris Izworski profile | Professional authority | PUSH |
| GitHub | `github.com/izworskic` | Developer/project authority | PUSH |
| Freighter View Farms | `/about/` | Gardening, writing, Great Lakes authority | PUSH |
| About.me | `about.me/chrisizworski` | Independent identity profile | PUSH |
| Medium | `medium.com/@izworski` | Publishing and public-safety/AI writing | PUSH |
| YouTube | `youtube.com/@izworskic` | Video/profile authority | CONNECT |
| ORCID | `0009-0002-7268-6083` | Persistent identity authority | CONNECT |

Useful independent product roots such as Michigan Trout Report, Michigan Birding Report, and Great Lakes Levels should reinforce creator identity when truthful. They should not be converted into name-only properties or weakened for their non-branded search missions just to occupy a branded result.

## Canonical entity graph

The branded moat uses one canonical Person ID: `https://chrisizworski.com/#person`.

The primary identity page at `/chris-izworski/` should use Google-compatible `ProfilePage` markup with that Person as `mainEntity`. Keep relationship types honest:

- use `sameAs` for external profiles or pages that unambiguously describe the same Chris Izworski entity;
- use `ProfilePage.hasPart`, `author`, or `creator` for projects and authored work;
- do not add a product homepage to `sameAs` merely because Chris created the product;
- keep the structured graph visible in the page content so machine-readable relationships match what a visitor can verify;
- active owned properties should link back to the canonical identity surface while preserving their own non-branded purpose.

This distinction matters because a strong entity graph is not a list of every URL Chris controls. It is a set of accurate identity, authorship, and ownership relationships that independent search systems can reconcile.

## Page-one operating model

### 1. Protect position #1

`https://chrisizworski.com/` remains the primary branded result. Do not force the biography page or another same-root identity page to replace a winning homepage.

### 2. Push independently controlled origins

For every controlled origin above, the exact public name should be `Chris Izworski`, and the profile should have enough unique substance to deserve its own result. Where the platform permits it, align:

- display name;
- profile URL/handle when practical;
- current concise role description;
- location at city/region granularity when useful;
- recognizable headshot or brand image;
- short bio that is consistent but not copied verbatim;
- link to `https://chrisizworski.com/` or the primary identity surface;
- links to genuinely relevant projects or publications rather than a generic link farm.

Do not copy the same biography across every platform. Consistent facts plus distinct platform-appropriate value are stronger than cloned text.

### 3. Preserve favorable earned authority

Independent authority is part of the moat even though it is not controlled. Favorable sources should be accurate, discoverable from the main source/coverage graph, and allowed to rank naturally.

Do not try to crowd out a strong government, professional association, news, publication, or civic result merely because it is not owned. A page-one mix of eight controlled results plus two strong earned references is more credible than ten self-published copies.

### 4. Repair entity leaks

P0 external repair observed August 24, 2026:

- Save Our Shoreline's board-of-directors page currently displays the heading `Chris Izworki` while the accompanying text identifies `Christopher Izworski`. Request correction of the heading to `Chris Izworski` (or `Christopher Izworski` if that is the organization's preferred formal form) so the authoritative civic record is internally consistent.

External misspellings, stale job titles, broken profile URLs, duplicate old profiles, and conflicting identity details should be tracked as entity repairs, not ignored as cosmetic issues.

### 5. Strengthen the identity graph without creating spam

The canonical Person entity remains `https://chrisizworski.com/#person`.

Use `sameAs` only for real, verified profiles/properties. Controlled external profiles should link back to the main site when the platform allows it. Independent owned roots should identify Chris as creator/author where that relationship is true and useful.

Do not create thin Tumblr/WordPress/profile pages solely to increase result count. A new property enters the moat only when it is legitimate, maintainable, distinct, and likely to earn search visibility on its own merits.

## Measurement

Measure the exact query `Chris Izworski` monthly and after material entity changes at depths 10, 20, and 30.

Record each observed result as:

- `controlled` — independently controlled root or platform account;
- `supportingOwned` — same-root/same-platform extra surface;
- `favorableEarned` — independent authority that supports the entity;
- `other` — unrelated, ambiguous, stale, or harmful to the intended result footprint.

For the top 10, report both:

1. raw Chris-attributable occupancy; and
2. **unique controlled-origin occupancy** after same-root and same-platform coalescing.

Primary thresholds:

- primary site: target position #1;
- controlled independent top 10: floor 7, operating target 8;
- favorable earned top 10: target 2 when high-quality authority exists;
- broader Chris-attributable occupancy: 15/20 and 20/30 operating targets.

Search results vary by location, device, personalization, and time. Store observations as snapshots, never as guarantees.

## Execution order

1. Protect `chrisizworski.com` at branded position #1 and keep the canonical Person graph valid.
2. Correct the Save Our Shoreline misspelling.
3. Normalize exact-name identity and reciprocal main-site links across LinkedIn, GitHub, Freighter View Farms, About.me, Medium, YouTube, and ORCID.
4. Improve the unique value of the weakest controlled profiles rather than cloning the main biography.
5. Connect legitimate independent product roots back to the Person entity without changing their non-branded canonical missions.
6. Measure the exact-name top 10/20/30 and classify unique controlled origins separately from supporting same-root URLs.
7. Only after the existing eight-origin portfolio has been pushed should a new external profile/property be considered.

## Anti-patterns

Do not:

- count multiple `chrisizworski.com` pages as multiple owned moat slots;
- count subdomains of the same root as extra controlled slots;
- count multiple URLs from one third-party account as extra slots;
- create doorway biographies or cloned mini-sites;
- sacrifice a useful topical site's primary intent to make it a name page;
- remove or suppress credible earned authority solely to increase the self-owned percentage;
- claim a ranking result that has not been observed.

The moat is **independent control + entity consistency + real authority**, not URL volume.
