# Utah Ski Access — Million Impressions / Revenue Go-No-Go Gate
**Date:** 2026-10-09 (America/Detroit)
**Status:** CONDITIONAL PILOT / RESEARCH HOLD — not production-approved.
**Owner:** Chris Izworski
**Source of operating criteria:** \`MILLION_IMPRESSIONS_PLAYBOOK.md\` on main (merged PR #878); \`docs/GROWTH_SESSION_LOG.md\`.

## Decision in one paragraph
The four-resort Utah Cottonwood Ski Access prototype has a distinct user decision: *Can my group actually get to a specific ski area, comply with access and parking rules, and use my pass on this date?* Keep the offline engine and validated scenarios. Do NOT build a second road dashboard or launch live "open"/"safe" outcomes. Before launch, verify a real UDOT feed and establish search demand with data, not statewide skier-visit extrapolation. Put the single canonical decision first; reserve separate resort pages for demonstrated distinct intents.

## Scope and intent
Primary hypothetical canonical: https://chrisizworski.com/utah-ski-access/ (NOT deployed).
Primary question: "Can I get to Alta, Snowbird, Brighton or Solitude, park and ski on my trip?"
Core inputs: resort(s), trip date and Utah-local arrival hour, travel mode, occupancy, pass type, self-reported pass days and parking reservation, vehicle traction information **only once legally validated**.
Core outputs: full list of blockers, actions, unverified items, official citations, observation timestamps and safer alternate *checks*; never a safety or parking guarantee.
Canonical target only after launch approval. No keyword-variant doorway URLs, fake freshness, invented live parking spaces or fabricated keyword volume.
Owning implementation: the validation prototype currently sits on PR #858 in chrisizworski-com. Before release, determine authoritative implementation repo and integrate only the shell/routing/national discovery in the hub according to AGENTS.md.

## Verifiable research and competing products
- UDOT Cottonwood road-and-parking authority already covers real-time road information, cameras, signs and official travel advice: https://cottonwoodcanyons.udot.utah.gov/road-information/
- Official feed documentation: https://udottraffic.utah.gov/developers/doc ; developer key required, limit 10 API calls per 60 seconds. Feed fields describe **individual events**, not guaranteed canyon-wide closures.
- UpCanyon has traffic/road/weather, plows, ski bus positions, live signs and capacity gauges: https://apps.apple.com/us/app/upcanyon/id6759510732
- Ski Roads publishes cameras, plows, traction and road conditions: https://www.skiroadsutah.com/
- PowderLogic publishes a Cottonwoods conditions dashboard and *parking reservation alerting* across resorts: https://powderlogic.ai/ and https://parking.powderlogic.app/
- Published resort policies: https://www.alta.com/getting-here/parking-info ; https://www.solitudemountain.com/discover-solitude/getting-here-parking ; https://www.brightonresort.com/getting-here-and-parking ; https://www.snowbird.com/the-mountain/parking/parking-overview/
- UDOT's distinction between **full closure**, **uphill restrictions with exceptions**, and **partial upper-canyon restriction** is nonnegotiable: https://cottonwoodcanyons.udot.utah.gov/road-closures-uphill-restrictions/
- Special 2026–27 pass products (e.g. Alta-Bird Ikon add-ons) differ from normal Ikon and must not be treated as interchangeable: https://www.alta.com/tickets-and-passes/alta-bird

**Differentiation to retain:** day-specific pass eligibility + resort lot/roadside policy + current road restriction interpretation + traveler-specific transport/traction + a fallback decision. A composite road dashboard, camera grid, or parking-release alerts alone do not differentiate us.

## Data access — verified state
- **No UDOT environment variable matching UDOT, UTAH, SKI or CANYON** was found among the visible names of the connected Vercel project's current variables on 2026-10-09. This does not prove credentials do not exist elsewhere. No credentials were viewed or exposed.
- No authorized/working UDOT key was provided to this validation run; **live event recall, precision and API availability cannot be claimed**.
- No licensed/current parking inventory, ski bus seating inventory or resort ticket inventory is verified.
- Historical test matrix and source model from PR #858 are synthetic/research validation, not live UDOT winter replay.

## Search: measured vs unknown
Search intent clusters to measure separately:
1. "little cottonwood canyon road conditions", "big cottonwood canyon road conditions" and "is [canyon] open" — **dominant official / app competition**.
2. "alta parking reservation", "brighton parking reservation", "solitude parking reservation", cancellation and opening times — **official resort/parking services and PowderLogic compete**.
3. "Ikon [resort] access", "[resort] blackout dates", "does Ikon base work at Alta" — high decision relevance, actual volume unverified.
4. "ski bus [resort]", "canyon traction law rental car" — stronger end-to-end fit but accessibility and safety caveats.

**GSC baseline:** NOT AVAILABLE (no Utah Ski Access production URL exists).
**Verified search volumes, CPC, keyword difficulty, seasonality:** NOT AVAILABLE. Semrush connected subscription lacks API units for requested reports as of this research; do not present hypotheses as measured demand.
**Actual AdSense/GA4 attribution:** NOT AVAILABLE.
Do not claim rankings, impressions, clicks or SEO improvement for this unpublished product.

## Business economics (illustrations, NOT forecasts)
Using only illustrative assumptions of 5% Google Search CTR, 1.5 pageviews per organic click and $10 page RPM:
- 10,000 GSC impressions / 28 days => 500 clicks => 750 pageviews => ~$7.50 / 28 days.
- 50,000 => 2,500 clicks => 3,750 pageviews => ~$37.50 / 28 days.
- 100,000 => 5,000 clicks => 7,500 pageviews => ~$75 / 28 days.
These numbers are **not forecasts** and have not been matched to real user economics. Paid parking referrals/affiliate programs are NOT verified; avoid claiming a monetization contract. Development/maintenance cost, API rate limits, user safety trust and winter seasonality are real costs.

## Playbook decision matrix
- Unique decision: YES, if eligibility + parking + road + action are integrated.
- Feasible code architecture: YES (offline research code plus previous passing CI), but live feed **not proven**.
- Quantified reachable search demand: **UNKNOWN**.
- Reliable authority source: documented, **not live validated**.
- Monetization evidence: **UNKNOWN**.
- Search and name-SERP governance fit: YES, conditional on one canonical, useful initial HTML, true creator attribution, valid Person id, no thin pages and working internal links.
- Production launch: **NO-GO today**.
- Research-only pilot: **GO**.
- Expansion into more resorts/regions: **HOLD** until actual organic demand and visitor outcomes.

## Specific release acceptance gates
1. Credential/terms: official UDOT developer key available server-side; permissions documented; no secrets in source, browser or logs. Centralize polling to stay under documented 10/min cap across *all instances*.
2. Live field trial: capture at least 20 varied authentic source snapshots, including actual restriction/closure events when available, with UTC time, source IDs, and authoritative UDOT comparison; where critical closure class cannot yet be observed, leave gate PENDING rather than treating a synthetic substitute as proof. Zero false "open/safe" statements.
3. Road semantics: validated canyon/segment/milepost and direction coverage, freshness, active windows, recurrent-event handling, contradictory signs and official-status fallback. Unknown -> unknown.
4. Resort rules: audited 2026–27 calendar, differing parking zones, pass blackouts, early/late windows, carpool requirements, refunds/fees, reservation proof; changes tracked by source timestamp. Explicit inventory absence.
5. Usability: phone-sized first screen, actual user journeys (drive/UTA bus, Ikon Base/full/other, parking/no parking), no sideways overflow, step-level actions and official links, no fake booking.
6. SEO: evidence-backed canonical intent ownership, initial HTML with useful answer, fast loading, visible sources, accurate title/meta/H1, internal national hub links, structured data/creator entity, and sitemap/indexability checks **only upon launch**.
7. Ads: one shared AdSense loader where eligible; no ad placement over hazard or route verdict; measure true delivery and revenue after launch.
8. CI and release: tests + full verify:all green on fresh main base, READY production deployment, exact route and rendered HTML checked. Track 7/14/28-day GSC + GA4 + real AdSense before further expansion.

## Exactly one next action
**Obtain an authorized UDOT developer key, store it in a secure development/preview environment, and execute a capped, read-only collection of genuine SR-190/SR-210 data with event/sign/road-conditions schema and timestamps.**
Done only when sanitized snapshots, a real-source classification report, and a comparison against the official Cottonwood road status are committed to the validation branch (without credential material). If there are no actual restrictions during the sampling interval, state that the restriction-specific live validation remains unproven.

Only after this gate, obtain reliable external monthly query measures before deciding whether to invest in an indexable production tool. Do not automatically merge PR #858.
