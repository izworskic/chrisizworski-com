# ChatGPT Search Acquisition System

Updated: 2026-10-01 (America/Detroit)

## Mission

Treat ChatGPT Search and other answer-engine referrals as an attributable acquisition channel for the existing decision-tool portfolio.

The objective is not to manufacture "AI SEO" prose or guess an unpublished ranking formula. The objective is to make useful canonical tools easy to discover, safe to cite, worth clicking, measurable after the click, and monetizable without degrading the product or existing Google winners.

OpenAI's public publisher guidance says public sites can appear in ChatGPT Search, OAI-SearchBot controls search discovery, and referral URLs can carry `utm_source=chatgpt.com`. GPTBot training controls are separate from OAI-SearchBot search discovery. Those documented contracts are the technical starting point; everything beyond them must be measured rather than assumed.

Machine-readable benchmark and loss function: `benchmarks/chatgpt-search-acquisition.json`.

## Current baseline

Settled Google Search Console window: September 1-28, 2026.

| Surface | Impressions | Clicks | CTR | Role |
| --- | ---: | ---: | ---: | --- |
| Soo Locks | 9,912 | 839 | 8.46% | Winning operational-intent reference |
| Northern Lights Michigan | 12,090 | 139 | 1.15% | Primary AI-search acquisition pilot |
| Mackinac Bridge Live | 5,740 | 35 | 0.61% | Authority + synthesis pilot |

Soo Locks is the reference because the product is already strong at matching a concrete operational question to a direct, source-transparent answer and deeper live utility. It should be studied, not churned.

Northern Lights has the largest combination of exposure and conversion headroom. It is the first product surface for answer/citation/click-value experiments.

Mackinac Bridge is a different test. The Mackinac Bridge Authority owns the authoritative open/closed fact. The ChrisIzworski.com product earns value by preserving that official answer while adding cameras, weather context, vehicle-specific interpretation, traffic, and timing synthesis.

## Bottlenecks found on 2026-10-01

### P0 — Wrong-host citation leakage

Search testing surfaced `picturedrocks.chrisizworski.com/mackinac-bridge-live/` instead of the intended `chrisizworski.com/mackinac-bridge-live/`. Additional main-site paths were also reachable on the Pictured Rocks hostname.

This is a hard loss because it can split discovery signals, attribution, canonical destination integrity, and monetization reporting. The branch adds a narrow Pictured Rocks-host redirect guard for the tracked flagship/search routes while preserving the actual Pictured Rocks root product.

### P0 — Measurement blindness

GSC Wizard currently has Search Console access but its Google authorization does not expose GA4 for the site. Therefore the system cannot yet produce a trustworthy ChatGPT landing-page -> engagement -> revenue funnel from that connection.

Do not substitute estimates. Until the main GA4 property is available to the analytics connection, report referral/revenue measurement as incomplete.

### P1 — OAI search eligibility should be explicit

The existing wildcard `User-agent: * / Allow: /` did not block OAI-SearchBot, but the branch adds an explicit OAI-SearchBot allow stanza. This is primarily an auditable contract and regression guard, not a claim that the previous robots file prevented discovery.

### P1 — Citation readiness is already partially governed

`scripts/benchmark-citation.mjs` already ratchets self-contained answer blocks across nine important tools. Preserve it. Its answer-length band is a local heuristic and must not be represented as a known OpenAI ranking factor.

## Plan

### Phase 1 — Eligibility and destination integrity

1. Keep OAI-SearchBot explicitly allowed on intended public surfaces.
2. Verify canonical, indexability, status 200, and non-preview ownership for every pilot.
3. Prevent cross-host copies from remaining valid citation destinations.
4. Preserve one canonical owner per non-branded intent.
5. Keep `llms.txt`, sitemaps, structured data, and the visible product aligned with real canonical ownership. `llms.txt` is an internal discovery aid here, not an asserted OpenAI ranking requirement.

Exit gate: zero hard vetoes.

### Phase 2 — Measurement

1. Restore access to the main GA4 property in the analytics connection.
2. Segment `chatgpt.com` referrals and `utm_source=chatgpt.com` where present.
3. Report by landing page, tool family, engaged session, second useful action, and revenue.
4. Keep Google Search Console as the guardrail for conventional search performance.
5. Add Bing/IndexNow observation only after credentials/configuration are available; do not claim it is active before then.

Exit gate: ChatGPT referral sessions can be tied to canonical landing pages and monetization data without guessing.

### Phase 3 — Prompt corpus benchmark

Run the 18-prompt corpus in `benchmarks/chatgpt-search-acquisition.json` against current AI-search behavior. For each prompt record:

- whether any Chris-owned source is cited/linked;
- exact cited URL and hostname;
- which competing sources are cited;
- whether the answer uses the page for a fact, synthesis, or interactive follow-through;
- whether the cited page is current enough for the question;
- whether clicking provides material value beyond the answer itself.

Do not turn natural web-search tests into a fake ChatGPT citation metric. They may be used for competitor discovery only.

### Phase 4 — Northern Lights pilot

Do not rebuild the tool. Compare its first crawlable answer and live result against the prompt corpus.

Optimize only evidence-backed gaps:

- direct yes/no framing when evidence supports it;
- exact viewing window when defensible;
- region/location differentiation;
- cloud and darkness constraints;
- source timestamps and uncertainty;
- a clear reason to click: personalized location, map, cloud overlay, regional comparisons, forecast evolution, or other real interaction.

The page should be extractable enough to cite but useful enough that the citation is worth opening.

### Phase 5 — Mackinac authority/synthesis pilot

Preserve the Mackinac Bridge Authority as the controlling status source. The page should never imply that nearby weather data is an official bridge-deck observation.

The differentiation layer is:

- official status;
- vehicle-specific wind/rule context;
- cameras;
- nearby weather context with labels;
- traffic/timing;
- "cross now or wait" support with uncertainty rather than invented precision.

### Phase 6 — Scale only a proven pattern

If prompt-level citation/link evidence and referral business outcomes improve without violating Google guardrails, extend the architecture to snow, ice, snowmobile, Haleakala, bloom, coastal windows, border waits, and other current-decision tools.

Do not apply the treatment site-wide merely because the static readiness benchmark passes.

## Benchmark

The readiness score is 100 points:

| Dimension | Weight |
| --- | ---: |
| Canonical destination integrity | 20 |
| Crawl/index eligibility | 15 |
| Direct answer + conversational intent fit | 15 |
| Provenance + freshness | 15 |
| Unique interactive value beyond the answer | 15 |
| Referral measurement | 10 |
| Monetization continuity | 5 |
| Useful internal decision network | 5 |

Minimum release score: **95/100**, with **zero hard vetoes**.

This score is an engineering/product release threshold. It is not a prediction of how OpenAI ranks sources.

## Loss function

`L = (100 - V) + 100H + 20D + 15B + 10F + 10G`

Where:

- `V` = weighted readiness/product value score;
- `H` = hard-veto count;
- `D` = known wrong-host/duplicate citation destinations;
- `B` = measurement blindness indicator;
- `F` = freshness/provenance failure indicator;
- `G` = material Google guardrail regression indicator.

Any `H > 0` blocks release regardless of the weighted score.

### Hard vetoes

- OAI-SearchBot is blocked from a target canonical.
- A tracked main-site decision page remains indexable/surfaceable on an unintended host.
- Canonical/noindex/robots behavior points away from the intended owner.
- Current data, certainty, thresholds, or authority are fabricated.
- Material provenance/freshness is removed from a risk-sensitive answer.
- Analytics/ad loader contracts are broken.
- A duplicate canonical intent URL is created without materially distinct utility.

## Success metrics

### Acquisition

- AI-search citation/link presence rate for the fixed prompt corpus.
- Canonical citation rate; target **100% of owned citations on the intended canonical host**.
- ChatGPT referral sessions by landing page.

### Product

- Engaged-session rate from ChatGPT referrals.
- First meaningful tool interaction.
- Second useful action / relevant next-tool continuation.
- Return use where measurable.

### Revenue

- ChatGPT-attributed ad/downstream revenue.
- Revenue per ChatGPT referral session.
- Revenue by landing-page archetype.

### Guardrails

- Settled GSC impressions, clicks, CTR, and average position over comparable windows.
- No canonical/indexability regression.
- No deterioration in source integrity or mobile utility.
- No monetization change that makes the decision experience materially worse.

## Execution rule

Fix hard losses first. Then run one evidence-backed product treatment at a time. Preserve winners. Never use increased page count, answer length, schema quantity, or keyword repetition as a substitute for measured citation/referral utility.
