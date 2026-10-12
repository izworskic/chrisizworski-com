# Epic / Ikon Pass Access Decoder — Decision Engine Spec
Policy snapshot: October 12, 2026. 2026/27 North American season. Canonical: https://chrisizworski.com/epic-ikon-pass/

## Data sources, operational databases, and freshness
| Data / variable | Primary source | Status |
| --- | --- | --- |
| Epic blackout sets by tier/date | https://www.epicpass.com/info/peak-restricted-dates.aspx | Official 2026/27; static, reviewed 10/12 |
| Epic Local Vail + Beaver Creek + Whistler combined 10-day cap | https://www.whistler.com/skiing/lift-tickets/passes/ | Official tourism partner; reviewed 10/12 |
| Epic resort roster, Day all-resort tier | https://www.epicpass.com/regions/.aspx and https://epicpass.zendesk.com/hc/en-us/articles/4412234491803-Does-the-Epic-Day-Pass-have-any-holiday-or-peak-day-restrictions | Official; exclude regional/day limited 22/32 options until individually sourced |
| Ikon resort-by-pass matrix, 7-day/5-day/unlimited and special pools | https://www.ikonpass.com/en/compare-passes | Official 2026/27; reviewed 10/12 |
| Ikon blackout sets | https://www.ikonpass.com/en/shop-passes/ikon-base-pass/ and https://www.ikonpass.com/en/shop-passes/ikon-session-pass/ | Official 2026/27 |
| Ikon lift reservations required at Deer Valley, Jackson Hole, Loon | https://www.ikonpass.com/en/how-to-use-your-ikon-pass | Official, no reservation inventory |
| Resort tentative opening dates | https://www.ikonpass.com/en/opening-closing-dates | Future layer only: NOT present in eligibility verdict |
| Personal pass day bank, owned variant, reservations | Self-reported user input | No account access; not retained |
| Live weather, mountain operational status, parking, roads | Future first-party resort/NOAA/DOT integrations | NOT PRESENT; must NEVER imply mountain open |

**Versioning:** All rules are stored in public/assets/epic-ikon-2026-27.js as a curated source snapshot, with policy review date, named pass tier, named mountain, brand, blackout applicability, day-bank group, limit, reservations and exception note. Review official rules weekly and before Thanksgiving, Christmas/New Year, MLK and Presidents Day weekends. Any stale or incomplete rules must result in UNKNOWN/CHECK, never a false eligible claim.

**Normalized future schema:** pass_seasons (id, year, source, reviewed_at), pass_products (brand, tier, total-day option, holiday selection), resorts (stable_id, region, brand), access_rules (pass_id, resort_id, capacity, pool_id), restricted_dates (pass_id, resort_id, day), reservation_rules (resort_id, pass_id, requirements), operating_snapshots (source, captured_at, open_status). V1 requires no paid database or API. Do not scrape account data.

## Distinct decisions + user personas
1. HOLIDAY FAMILY: "Can I ski Vail with Epic Local Dec 31?" Separate premium resort blackout (NO) from unrestricted Breckenridge option.
2. LIMITED VISITOR: "I have already used 8 of 10 Vail/Beaver/Whistler combined days." Confirm pool, remaining days and no false green.
3. BASE HOLDER: "Can I ski Aspen with Ikon Base?" Snowmass is special permitted destination; Aspen Mountain and Aspen Highlands are not.
4. RESERVATION TRAVELER: "Does an Ikon Pass mean I can just show up at Deer Valley?" Pass eligibility and lift reservation are different gates.
5. EPIC DAY BUYER: 1–7 day total and purchased peak option are mandatory inputs; never silently assume holiday access.
6. SKI WEEKEND COMPARER: identify allowed same-state options without claiming routes, lift openness, or reservation availability.

**Differentiation:** Existing https://travelmagma.com/tools/epic-vs-ikon-pass-calculator/ already provides four-pass price comparison. Our advantage must be exact date+resort verdict, explicit DAY POOLS, reservation gate, why/next action, safely grouped alternatives, source traceability, and privacy. Do not market ordinary Epic/Ikon comparison as unique.

**Inputs:** pass_product, resort, ski_date ISO (Nov 2026–May 2027), used_days (integer, optional/unknown), epic_day_days_purchased (1–7), epic_peak_yes_no, ikon_session_days_purchased (2–4), lift_reservation_self_report (yes/no/unknown). No personally identifiable data or pass numbers.
**Outputs:** YES (published pass rules permit, resort not verified), NO (restricted/excluded/exhausted), CHECK (days used unknown), ACTION (must reserve), UNKNOWN (outside model or missing configuration). Every answer includes explanation, policy source URL, uncertainty caveat and revision date. Compare alternate passes and same-region resorts.

## Loss function and benchmark target
Minimize expected persona-weighted decision loss subject to no false-positive access:
| Bad output | Loss units | Gate |
| --- | ---: | --- |
| Green on blackout, excluded resort or exhausted day bank | 100 | 0 violations in regression + 20k seeded randomized tests |
| Green despite missing mandatory reservation | 90 | 0 violations |
| Unknown represented as confirmed eligible | 80 | 0 violations |
| Static outdated rules presented as real time | 70 | Season/review labels required |
| Wrong denial with known valid rules | 50 | Curated regression cases |
| Missing authoritative link/canonical or Person ID | 35 | Source and SEO tests |
| Unusable mobile and accessible flow | 25 | Manual mobile smoke |
| Cautious CHECK when valid inputs could resolve YES | 12 | Optimize only after safety |

Risk-aware objective: safety first; then minimize mean weighted loss plus 2 x Conditional Value at Risk for the worst 5% of persona cases; then increase solved questions, speed, search impressions and monetization. Benchmark aspiration >=95/100 overall, safety =100 on documented hard gates. These are targets, not measured achievements.

## Search angles, Monte Carlo test and prioritization
No actual seasonal keyword volumes were retrieved because the Semrush account lacks sufficient API units. Below is a **hypothetical** 50,000-draw Monte Carlo stress test seeded 20261012, NOT real search-volume measurements or a traffic projection.

Each segment samples 28-day search-demand, attainable Google impression share and organic CTR from a triangular distribution. Clicks = demand * impression share * CTR. Solved clicks = clicks * assumed decision solution rate. Results rounded.

| Query angle | Examples | Demand low/mode/high (assumed) | Median model clicks | 5th–95th | Median model solved clicks |
| --- | --- | --- | ---: | ---: | ---: |
| Resort entitlement | "does ikon base include deer valley", "ikon base aspen snowmass" | 4k/19k/65k | 402 | 116–1110 | **369** |
| Exact pass+date+resort | "epic local vail christmas week", "ikon base snowmass december 31" | 2k/12k/50k | 388 | 102–1113 | **364** |
| Blackout / holiday | "epic blackout dates 2026 2027", "ikon holidays restricted" | 8k/25k/85k | 214 | 58–644 | 190 |
| Reservations | "deer valley ikon reservation 2027", "loon ikon reservations" | 1k/6k/20k | 155 | 45–418 | 137 |
| Day-pool sharing | "alta snowbird ikon shared days", "epic local 10 days vail" | 1k/4k/12k | 129 | 42–326 | 105 |
| Price shopping | "epic vs ikon 2026", "ikon base vs epic local" | 7k/25k/100k | 134 | 31–443 | 64 |

**Model priors:** resort visibility (.07,.27,.55), CTR (.02,.045,.10), solve .92; exact trip visibility (.10,.35,.65), CTR (.02,.05,.11), solve .94; holiday visibility (.03,.12,.35), CTR (.01,.035,.075), solve .89; reservation visibility (.10,.33,.65), CTR (.02,.05,.10), solve .89; day banks visibility (.12,.38,.65), CTR (.025,.06,.12), solve .82; shopping visibility (.01,.08,.30), CTR (.01,.025,.055), solve .48.

**Optimization choice:** focus one canonical page on **resort eligibility** and **pass+date+resort**, the two strongest modeled useful-click angles. Holiday, reservations and pooled days serve as subanswers. Shopping is secondary because of stronger established competitors. This cannot satisfy a measured >=20k impressions / >=500 organic clicks growth gate until actual GSC and keyword-volume validation.

## Build / launch gates
1. Deterministic static pass-policy engine with source attribution and scope honesty, no live claims.
2. Mobile-first 3-input tool, optional days/reservations and explicit intermediate states, provider link, alternative comparison.
3. Regression for boundaries (11/27, 12/26–31, 1/16–17, 2/13–14), Epic Local combined pool, Ikon Aspen special access, Ikon Alta/Snowbird, session global bank, reservation gates; randomized no-false-green.
4. Run npm test and npm run verify:all, verify source hashes, canonical, one AdSense loader, GA4, SEO Person identity, links and mobile interactions; merge only with green gates and verified Vercel preview.
5. Register owner canonical in site registry and owning National Tools hub, after verification. No thin resort/date doorway URLs.
6. Track 28-day GSC: query cluster impressions, CTR, search position, check-completion GA4, real revenue and support burden; use real metrics to retrain priors.

**Known V1 exclusions:** Epic military, Australia, Tahoe, Keystone Plus, Northeast Value, 22/32-resort Day Pass, international partners, specialty Ikon products, resort real-time operation and lift reservation inventory. Do not mistake excluded model scope for official lack of access.
