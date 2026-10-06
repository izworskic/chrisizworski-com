# Creator Authority System

Updated: October 5, 2026

## Purpose

Give every useful first-party tool a consistent, quiet connection to Chris Izworski while preserving each tool's own search intent and usefulness. The central identity is:

- Person ID: `https://chrisizworski.com/#person`
- Primary branded result: `https://chrisizworski.com/`
- Profile and creator-credit destination: `https://chrisizworski.com/chris-izworski/`

The shared identity makes the tools legible as one connected body of work. It does not make every page a personal-profile page.

## Value function

Score authority implementation from 0–100:

| Dimension | Weight | What earns credit |
| --- | ---: | --- |
| Canonical entity integrity | 25 | Tool author and creator markup resolves to the one Person ID; no conflicting definitions or dangling references. |
| Discreet visible attribution | 25 | A compact contextual byline or footer credit links to the profile. Keep the product interface first. |
| Contextual network | 20 | Useful paths connect the tool to the tools/projects hubs and to adjacent tools where the visitor journey continues. |
| Legitimate name SERP | 20 | Exact-name and close-name coverage is measured by independent domains/accounts, with the home page protected as the primary result. |
| Qualified discovery and use | 10 | Branded impressions, clicks, CTR and referred tool engagement are measured in comparable windows. |

Target at least 90/100 for a covered release. Any hard stop below overrides the score. The machine-readable definition is `benchmarks/creator-entity-contract.json`.

### Loss function

Start with `100 - score`, then apply the relevant penalties:

- **−35** for a production tool missing from the creator contract or lacking an accountable source.
- **−35** for a broken, dangling or conflicting Person/profile reference.
- **−25** when a tool has neither compact visible attribution nor a verifiable contextual author surface.
- **−15** when a tool is isolated from a relevant discovery path.
- **−20** when same-domain or same-platform duplicates are counted as extra branded SERP slots.

Hard fail for false attribution, a second Chris Person ID, thin name pages, doorway pages, unrelated cross-links, or unreviewed changes that weaken protected winning search surfaces.

## Benchmark and operating rules

1. Count every active first-party tool in `benchmarks/creator-entity-contract.json`; pending audits count as incomplete.
2. Verify visible attribution and structured data in the actual production tool, not only in the registry.
3. Link creator credit to the canonical profile. Keep the Person node's `url` at the homepage to preserve the one-entity contract.
4. Use contextual links for real visitor needs. The tools/projects hubs provide portfolio-level discovery; footer links alone do not prove a useful cross-tool journey.
5. Protect the exact-name home page at position one when it is already winning. The identity page supports it; do not force one to displace the other.
6. Count only one result per independent root domain or controlled platform account. Additional same-root pages and subdomains are supporting surfaces.
7. Measure branded queries separately from tool/topic queries over comparable 28-day Search Console windows; use seven-day data only as an early signal.
8. Do not promise a specific ranking or attempt to suppress unrelated pages through duplicate content. Strengthen truthful, useful, independently verifiable profiles and owned work.

## Current audit snapshot

The central site already has a canonical Chris Izworski Person entity, an identity/profile surface, cross-property `rel=me` links, a tools directory, and explicit rules for page titles, structured data, footer attribution, and branded result counting. Search results sampled on October 5 surfaced the main site, the project/profile surfaces, and substantive author pages on independent properties.

The creator contract lists 18 separate-host properties. Two remain `pending-audit` because their active source repositories were not discoverable:

- `ausable-field-map` — `ausable.chrisizworski.com`
- `pictured-rocks` — `picturedrocks.chrisizworski.com`

Keep these visible as audit gaps; do not claim complete tool-wide verification until their source ownership and production attribution are confirmed. Repo-level entity coverage is not the same as a current SERP rank, and a search snapshot is not a ranking guarantee.

## Next execution sequence

1. Keep the already-verified shared Person/profile policy stable.
2. Resolve source ownership for the two pending tools, then inspect production HTML, visible credit, canonical, and Person schema.
3. Repair only concrete attribution or contextual-link gaps in their owning repositories.
4. Add or refresh a branded SERP snapshot using the same query, engine, locale, and device; count independent origins.
5. Review GSC branded impressions/clicks/CTR and tool handoff events after a comparable window. Make no broad title or homepage change from a single snapshot.
