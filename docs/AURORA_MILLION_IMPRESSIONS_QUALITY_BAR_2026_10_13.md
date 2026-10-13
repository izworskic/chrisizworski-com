# Aurora Network — Million Impressions Publication Gate
_Engineering and editorial quality benchmark · October 13, 2026_

## Definition of the bar

**Business/search target:** 1,000,000 Google Search Web impressions in a comparable rolling 28-day period **across the site**, at **5% sitewide organic CTR**. These are targets, not the measured result of this aurora update. The aurora network consists of five regional state hubs plus 39 local destination pages (44 live URLs); 23 of the destinations were added on October 13.

**Publication-quality gate:** each authoritative state owner runs `scripts/audit-aurora-quality.mjs` after its generator during `npm run build`; any failed check causes `scripts/validate-build.mjs` and the production build to fail. The hub is scored on 10 binary checks worth 10 points each, and each location on 20 checks worth five points each. **All checks are required** (100/100) — a 95 does not pass. Results are emitted as `artifacts/aurora-quality-gate.json` in that build's workspace. The report includes `gscImpressions: null` and `gscCTR: null` until independently measured; it must not use forecast traffic numbers.

The gate verifies emitted HTML, not just declarations: query-first titles and unique snippets; indexable self canonicals; structured `WebApplication`, five-step breadcrumb and shared Person identity; functional live score/cloud/dark-window wiring; honest regional model and Kp limitations; a location-specific trip judgment, northern sky angle and safe-access treatment; three described named sites; at least one linked destination source; five genuinely local FAQ answers; Maptoolkit/OSM key-free interactive map, NOAA auroral-oval image and real NOAA Kp forecast with unavailable states; and working state/sibling navigation. The state hub gate verifies identity, metadata, live region controls, map/chart/oval, field guide, and links to each destination.

**Important blind spots:** static gates do not prove the visual components work in a browser, that every external source link currently resolves, that all local parking/access options are open now, Google has indexed or ranked a page, field conditions match the regional proxy, or that Google's ranking systems consider the content helpful and authoritative. For those checks, use the live-browser and Search Console program below. Avoid replacing meaningful research with mass-generated boilerplate merely to raise a score.

## Verified release on October 13, 2026

| Owner | State hub | Destination pages | Quality PR | Exact production commit |
| --- | --- | ---: | --- | --- |
| `montana-aurora-live` | Montana | 7 | #9 merged | `1d8b91d9203fe568d4b1e1e8c721eeab93f577d1` |
| `minnesota-aurora-live` | Minnesota | 8 | #9 merged | `a2cf6026bb643e447678d59bf769dee49decbda0` |
| `north-dakota-aurora-live` | North Dakota | 8 | #9 merged | `85a1fc5a4536945b92fb9dc6398c06186e8c2af8` |
| `maine-aurora-live` | Maine | 8 | #9 merged | `54f548857b2d24e97a59ea7f1a321ae92347adcd` |
| `alaska-aurora-live` | Alaska | 8 | #9 merged | `001dda441d612daac6177b31e48900fa3e384776` |
| **Total** | **5** | **39** | **5 merged** | **5 READY production deployments** |

All five owner CI Verify workflows and Vercel previews passed for their PR heads, and production READY was confirmed for each merged commit. The publishing gates passing demonstrates the declared static criteria for all 44 pages at build time. No measured GSC CTR, impression gain, rankings, indexing or real-browser Lighthouse result was available or attributed to this change.

## Practical decision/loss benchmark

- **Search identity:** a malformed canonical, misleading location title, duplicate title, hidden author, untrusted Person identity, missing sitemap or orphaned destination blocks release. Loss is discoverability and trust.
- **Visitor value:** a generic site description, no local horizon/access tradeoff, fewer than three explained site choices or generic FAQs blocks release. Loss is a frustrating trip decision.
- **Scientific truth:** treating Kp as a sighting probability, silently inventing NOAA samples or implying a regional cloud prediction is measured at an exact park or lakeshore blocks release. Loss is real-world travel trust and safety.
- **Experience:** missing interactive regional map, real Kp chart, NOAA model, failure states, or sibling navigation blocks release. Loss is engagement, utility and repeat value.
- **Operating cost:** use the owning regional API result and current tile providers; do not add a new metered map service or duplicate live NOAA calls merely to improve this content. Loss is site profitability.

## Measurement needed to close the actual million-impressions/5% bar

For 7 and 28 days after the release, obtain a dated Google Search Console **Web** page/query export for all 44 canonical URLs. Record clicks, impressions, CTR, average position, indexing coverage, branded versus non-branded queries, query-to-title fit and title appearance. Record the same fields for the preceding comparable window where they exist; new pages have no valid pre-release baseline. Supplement with GA4 engaged sessions/outbound park-click events and real mobile LCP/INP/CLS or Lighthouse measurements. Avoid attributing seasonal aurora interest, solar storms or site-wide fluctuations to these page changes without controls.

**Decision rule:** do not expand to a further batch solely because 44 static pages pass their build checks. First compare which canonical destinations earn discoverability and useful engagement. Prioritize repairing any 404, failed image, indexing exclusion, overlapping intents, source-quality error or low-CTR page near page one. Protect the successful Michigan aurora and fall-color URLs. One next action: capture the 7/28-day GSC Web query/page baseline for these exact 44 URLs and select the single strongest evidence-backed page improvement.
