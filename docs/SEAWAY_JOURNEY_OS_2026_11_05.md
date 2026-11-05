# Seaway Journey OS — Deep Research to Implementation Prompt
**Baseline:** November 5, 2026 · Source: [Google Search Console export](https://docs.google.com/spreadsheets/d/1NTZ8TmB_FAGDBPHTtmaSTSMl9Pss4ssXPiTnlainO_Y/edit).
**Primary product:** `/st-lawrence-seaway/` (Montreal–Lake Ontario); preserve `/welland-canal/` and `/eisenhower-lock/` as independent search-intent owners.

## Mission (implementation prompt)

Act as a maritime interpretive guide, product designer, geospatial engineer, source-reliability engineer, technical SEO specialist, accessibility reviewer and skeptical measurement scientist. Make the Seaway hub **the connective tissue of a Great Lakes freighter voyage**. Do not clone Welland or compete on raw AIS density with commercial vessel trackers. Solve five questions in one coherent experience:
1. Which river stretch am I looking at?
2. Which vessels have recently reported here, and how old are those observations?
3. What sequence of locks and waterways connects that stretch toward Montreal or Lake Ontario?
4. Where can I **legally** watch from shore, and what official operational source should I check before going?
5. How do I continue through Welland, the Soo and the broader Great Lakes?

## Evidence, not assumptions

The supplied GSC period October 7–November 3 shows Welland 3,012 impressions/69 clicks/8.16 average position; Seaway 85/1/16.29; Eisenhower 29/1/8.41. The hub launched October 23. This is an *early discovery baseline*, not proof of product rejection, nor a statistically valid SEO forecast. Official orders of turn are not AIS observations and not guaranteed arrivals.

Research sources:
- Great Lakes–St. Lawrence Seaway operators: [official map](https://greatlakes-seaway.com/en/navigating-the-seaway/seaway-map/), [AIS interpretation](https://greatlakes-seaway.com/en/commercial-shipping/transiting-the-seaway/automatic-identification-system-ais/), [opening/closing](https://greatlakes-seaway.com/en/commercial-shipping/seaway-opening-and-closing-information/).
- [U.S. Seaway visitor center](https://www.seaway.dot.gov/explore/seaway-visitor-center) for legitimate public Eisenhower access.
- [South Dundas Iroquois Lock information](https://www.southdundas.com/recreation-tourism/attractions/iroquois-lock) for documented municipal public viewing.
- [Open Waters AIS API](https://openwaters.io/api/ais/): contributor coverage, strict report freshness and attribution; verify API terms/licensing for a monetized property before expanding usage.
- [Google canonicalization](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) for primary-host search ownership.

## Hard constraints

- Preserve original site infrastructure, approved on-page ads and monetization safeguards, SEO canonicals, existing link destinations, camera and lock-model functionality, mobile usability and author's personality.
- Do not add Redis, Supabase, paid infrastructure, unverified photos, fictitious ETA calculations, or fabricated ship history.
- Avoid infinite vessel polling or publishing scraped operator-only queue data without rights.
- Never infer actual upbound/downbound itinerary from a single AIS heading. Explicitly label directions as geographic reference, not prediction.
- A working AIS receiver returning zero reports is *not* an outage; upstream failure is *not* an empty river. Preserve successful partial regions and show errors honestly.
- No destination page unless the new page owns a **different verified public visitor decision** and has credible source data.

## Preferred architecture and languages

- **HTML:** static, crawlable, readable original content with working no-JavaScript links.
- **CSS:** purpose-built, accessible story rail; mobile horizontal chapter selection; no sticky overlays or incidental layout shifts.
- **JavaScript:** currently deployed browser maps, UI controls, source-aware journey model, GA4 interaction events.
- **Node.js:** existing Vercel API, time-bounded concurrent fetches, provenance flags, HTTP/error classification, operational diagnostics.
- **Python:** offline Search Console scorecard and independent source/data QA, not an extra runtime layer.
- **Java/Rust:** *not justified* in this release; introducing a JVM, Rust/WASM or new build stack would increase cost, maintenance and build complexity without improving visitor experience or AIS truth. Reevaluate only if measured throughput or computational needs establish a real bottleneck.

## Acceptance benchmarks

**Truth/reliability:** 100% of outage classifications distinguish request error, rate limit, invalid data and empty success in fixtures. Every selected vessel has source age, observed chapter and no unverified ETA. Region buttons work even without map tiles.

**Experience:** first screen answers three intents — recent ships, documented shore views, follow the journey. Five corridor chapters cover Montreal, Beauharnois, Massena, Iroquois and Thousand Islands. Visitors can continue to Eisenhower, Welland, Soo and the Great Lakes tracker.

**Accessibility/performance:** semantic headings, native links and buttons, keyboard/focus indicators, readable mobile type and contrast, no new third-party client dependency, no new shipping feed or periodic job.

**SEO:** unique corridor intent, correct primary-domain canonical and sitemap discovery, no thin per-lock clones, static internal linking, and dated change evidence. Validate Google-selected canonical for the reported picturedrocks-host duplicates separately; do not change routing blindly without authoritative host ownership.

**Measurement:** stable events for selecting ships and regions, consulting official transit data, requesting directions and following onward corridors. Use non-overlapping 28-day GSC windows **after deployment**, position stratification and actual user actions. No guaranteed impression/click targets.

## Build sequence

1. Preserve generator; add an idempotent post-generation corridor journey enhancement and concise search-facing copy.
2. Add evidence-safe, unit-tested geographical context to vessel selection.
3. Improve AIS error classification, production observability, and partial-failure cache duration.
4. Add repeatable Python GSC scoring against the dated November 5 baseline.
5. Run syntax, regeneration, unit, link and deployment checks before merge.
6. Audit current Vercel runtime logs and Google-selected canonical; if permission is unavailable, document the blocker without claiming repair.
7. Only afterward research Iroquois and Thousand Islands as potential *distinct* destination releases.

## Go/no-go for follow-on expansion

**GO** when source access, legal public directions, unique visitor decision, deployment source truth, and distinct query opportunity are documented; **NO-GO** for generic lock-clone pages, unverified roadside access, speculative vessel ETAs or historical tracks reconstructed from sparse AIS reports.

## Release work log

Initial branch implements the first set of generator, journey-UX, diagnostics, measurement and CI changes. The operational feed's upstream availability, commercial-use permissions, duplicate-host routing and Google-selected canonical need independent production verification; the presence of code is not proof those external conditions are repaired.
