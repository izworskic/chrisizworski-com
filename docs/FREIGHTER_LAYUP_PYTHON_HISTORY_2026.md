# Freighter winter layup: Python evidence intelligence + historical harbor ledger
Date: 2026-11-03  
Status: implementation branch; release truth recorded in PR and growth session log

## Visitor question and ownership

Canonical experience: https://chrisizworski.com/great-lakes-freighter-winter-layup/  
Owning repository: `izworskic/chrisizworski-com`. No new URL or hostname.

Users ask: Where did an individual Great Lakes vessel spend a documented winter, when was it mentioned, and what source supports that? How did the *curated* record change across seasons? The existing map is best for a geographic look at one season. The new document-like harbor ledger lets a reader inspect vessel identities, source dates, and primary articles side by side without interpreting the map as AIS or a fleet census.

Current baseline (curated archive, **not live vessel count**): winter 2025–26 has 12 records in five harbors; 2024–25 has two records in Owen Sound; 14 season-records involve 13 distinct vessel identities. The current 2026–27 live ledger is empty as of the inspected baseline. No fleet population inference or data-freshness claim follows from that empty ledger.

## Architecture choice and differential value

| Approach | Visitor utility (0–5) | Source reliability | Distinctive visual value | Maintenance/cost | Search opportunity | Weighted evaluation |
|---|---:|---:|---:|---:|---:|---:|
| A. Keep Node and JS, add only a raw index | 3 | 4 | 2 | 5 | 3 | 67 |
| **B. Offline Python QA and static manifest + small browser controller** | **5** | **4** | **5** | **5** | **4** | **90** |
| C. Per-request Python service and runtime predictor | 3 | 1 | 3 | 1 | 2 | 41 |

Weights follow Python Intelligence OS (30/25/15/15/15). These are *design-priority assessments*, not measured site performance or forecast accuracy. B wins because data are bounded, offline compilation is deterministic, and the shadow layer can observe disagreements without changing the authoritative Node publication policy.

No new API, dependencies, background service, Supabase, Redis, geolocation, or user reporting. The existing GitHub source-watch fetch cadence is unchanged.

## Python Intelligence OS: two bounded capabilities

**Shadow evidence audit** (`scripts/freighter-layup/shadow.py`): The existing 20-source Node scanner may emit *ephemeral metadata only* when the workflow passes `--shadow-input=/tmp/...`. The Python shadow checks article-title/known-hull mismatches, duplicate links, unsupported dates, planned arrivals, same-ship competing harbor claims on one date, and source retrieval gaps. It ranks cases for editorial inspection without asserting probability. It **cannot** write the public current-season ledger, alter the authoritative source classes, generate confirmed ship positions, or publish source text. The result is a seven-day GitHub Actions artifact, not a public JSON feed, sitemap URL, or database. Unavailable feeds are `PARTIAL` or `UNAVAILABLE`, not zero-vessel observations.

**Historical manifest compiler** (`scripts/freighter-layup/history.py`): Reads the existing version-2 curated registry and emits versioned `freighter-layup-history.json` and a directly crawlable, source-linked HTML fragment inside the existing ship library. The generator fails on duplicate same-season hull IDs, invalid ISO dates, references outside the winter season, unknown harbors, invalid source URLs or unsupported evidence status. `--check` fails when generated outputs drift. No forecast model or external scraping is involved.

## Source register and legal/temporal limits

| Input | Rights / intended use | Time + location meaning | Limit |
|---|---|---|---|
| Existing checked-in registry | Existing curated factual metadata and separately credited primary article links; no additional downloaded media | Historical source's `statusAsOf`, vessel identity, approximate named harbor; never continuous occupancy | Does not cover the entire U.S./Canadian fleet; different seasons have unequal sampling |
| Existing RSS/source catalog | Existing ingestion and published source metadata only; Python adds no additional requests and retains only transient title/source metadata | Article publication date (not arrival time) and source identity | An article mentioning a ship or harbor can be misleading; never automatically confirm |
| Existing winter ledger | Current-season events qualified by Node policy | Source-dated milestone, NOT live AIS location | Previous winters must not be carried into new season |
| [Duluth–Superior Port Authority Jan 2026 roster](https://duluthport.com/news/duluth-superior-tonnage-falls-amid-trade-headwinds/) | Link to authoritative original; no reproduced article body | Six vessels at Superior, **not** all Great Lakes vessels | Point-in-time port subset |
| [BoatNerd annual layup index announcement](https://www.boatnerd.com/news/boatnerd-news-december-29-2025/) | Discovery link only, not imported/rehosted roster | Seasonal compilation, subject to updates | Third-party listing is a review lead, not independent source confirmation |

Sources verified 2026-11-03. Commercial syndication rights to new bulk feeds are not asserted. Any future expansion requires its own provider terms/licensing review.

## Experience OS v1.2 / distinctiveness

Comparison 1: Existing Winter Harbor Map answers which *documented harbor* to explore in one season, with approximate pin locations and hull-scale art. It does not give an immediately scannable chronology of source-dated vessel history across winters.

Comparison 2: Great Lakes Freighter Central/real-time tracking answers what AIS last reported about vessel movements; it has no authority to call a vessel's recent signal a winter berth.

New experience: a restrained shipyard "working manifest" with two physical-year selectors, harbor filters, compact harbor distribution bars, individual vessel records, evidence classes and disclosure of dated events with original sources. Selection year A → year B → A and harbor filters causally update **only source-backed rows**. Rows for both winters and their source links remain in the HTML if JavaScript fails. No animation or predicted movement; dates remain explicit.

- States: initial 2025–26, 2024–25, filtered harbor, no-match harbor, JS-off both seasons visible, unknown current-season arrival always excluded.
- Accessibility: native controls; `aria-pressed` year selectors, `aria-live` selection summary, keyboard-focusable event disclosures, responsive single-column record list, reduced-motion compatibility.
- Failure behavior: no-JS retains the entire historical ledger; invalid source registry makes Python build fail instead of publishing partially invented results; current-season ledger does not depend on history worker.

## Provenance and version contract

Static artifact `/assets/freighter-layup-history.json`: schema 1, `status: PARTIAL` (curated subset), `notFleetCensus: true`, date qualification, source pointers, exact per-season records, counts derived from those records. *No* inferred arrival date or exact berth coordinates. HTML contains exactly one manifest between generator markers; the primary evidence URL of each vessel remains visible as a standard link.

Shadow artifact (private workflow only): schema 1, `mode: SHADOW_ONLY`, `publicationEnabled:false`, `runAsOf`, source success/failure, valid count, review cases and anomalies. Zero reports with failed sources must remain an unknown coverage state. No bridge from this artifact to published ledger is permitted.

## Quality/release benchmarks

- **Data correctness:** 14/14 existing documented season-records retained, 13 distinct hull identities; exactly one record per hull per season; all retained dates/source URLs reference existing data.
- **Audit safety:** zero Python-to-live-ledger writes; planned and contradictory reports stay review-only; tests for missing, duplicate, future, rollover and conflict.
- **Page usability:** at 360, 390, 768 and desktop widths, years and harbor controls are visible, accessible and reversible; no horizontal overflow. No-JS evidence must remain readable. Sources open the original article.
- **Operational cost:** stdlib Python only; no additional network requests; no runtime service; existing source-watch invokes one Python audit on each scheduled scan.
- **Gate:** Python 11-test suite, JS history/source tests, generated-history `--check`, complete site gate and release browser workflow, then production READY and public checks. Stop and repair any red gate.
- **Rollback:** revert the PR. The existing map and Node feed writer remain source-of-truth and are not coupled to the shadow.
- **SEO/metrics:** same URL, title, H1, Person identity, sitemap ownership and ad setting. GSC/CTR outcomes require comparable future 28-day Search Console windows. No uplift is claimed.

## Next evidence investment

Collect several weeks of actual independent editorial dispositions on the shadow's flagged cases, with documented true/false findings, before discussing classifier precision/recall or letting Python influence publication. Historical season snapshots also need materially broader verified coverage before calculating fleet-wide frequencies or predictive layup windows.
