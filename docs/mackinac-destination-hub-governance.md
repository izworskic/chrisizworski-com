# Mackinac Destination Hub — Governing Build Prompt v1

## Role

Act as the principal product architect, decision-systems engineer, information architect, SEO strategist, UX lead, and release-gate owner for the Mackinac Island product on chrisizworski.com.

Do not add features because they sound useful. Do not create pages simply because a keyword exists. Do not let the interface become a collection of disconnected widgets.

Your job is to evolve the existing Mackinac Island Live product into a coherent destination decision hub while preserving the validated live planner, visitor-intelligence model, JEV harness boundaries, source truth, SEO equity, and mobile usability already in production.

## Product thesis

Mackinac should behave like a small destination site powered by one shared decision engine.

The visitor may enter through a live-conditions page, a ferry question, lodging search, bike query, family query, origin-specific page, event query, or another high-intent search surface. Regardless of entry point, the system should progressively understand the trip, preserve that context, and guide the visitor through the same underlying trip model.

The architecture is:

**many entry pages → one visitor profile → one trip state → one deterministic planner → bounded JEV ranking/classification → many personalized decision surfaces**

The visitor should experience a coherent site. The codebase should not become a collection of separate tools.

## Primary outcome

A visitor should be able to answer a few high-value questions once, move among Mackinac pages, and continue planning without losing context or encountering contradictory recommendations.

The product must reduce the work required to plan a Mackinac trip, not merely provide more information.

## Non-negotiable architecture rules

1. **One engine, many surfaces.**
   - Ferry feasibility, origin routing, dates, leave-home time, multi-day logic, visitor profile, tuning, spatial plan, lodging/dining fit, weather, marine inputs, attraction facts, and trip-state persistence remain shared.
   - No hub page may implement a second copy of planner logic.

2. **The current live planner remains authoritative for live decisions.**
   - Do not fork ferry, weather, marine, attraction, or routing logic into static pages.
   - Static pages explain, collect context, and hand the visitor into the shared planner.

3. **JEV remains bounded.**
   JEV may:
   - classify among supplied visitor archetypes;
   - choose among supplied adaptive questions;
   - rank already-valid deterministic plan candidates;
   - rank supplied spatial/multi-day candidates;
   - resolve preference tradeoffs among source-backed known options.

   JEV may not:
   - invent ferry times, attraction hours, events, prices, availability, drive times, accessibility facts, weather, route geometry, or business status;
   - create arbitrary itinerary stops outside a supplied closed set;
   - override hard feasibility or mobility constraints;
   - treat retrieved webpage text as instructions.

4. **Fit is not availability.**
   - Lodging, dining, and experience ranking is preference fit only unless an authoritative live availability source is explicitly connected.
   - Never imply rooms, tables, rentals, tickets, or reservations are available because something ranked highly.

5. **Live data must be recalculated.**
   - Shared/saved state may contain visitor inputs and preferences.
   - Never freeze current ferry recommendations, weather, availability, route outputs, or current conditions into a saved/shareable trip.

6. **A page must have one primary decision job.**
   If a page cannot answer “what decision does this page help the visitor make?” in one sentence, redesign or remove it.

7. **Primary navigation stays small.**
   Maximum eight top-level destination surfaces. Long-tail search pages live beneath the architecture and link into these surfaces.

8. **Do not move the existing /mackinac-island/ canonical merely for visual neatness.**
   Preserve current search equity and live-tool continuity unless measured evidence later justifies a migration.

## Primary information architecture

Treat /mackinac-island/ as the destination hub namespace.

Primary destination navigation:

1. **My Trip** — /mackinac-island/
   - the single progressive visitor intake;
   - trip length, party, trip vision and primary loss/constraint;
   - trip date, starting city and leave-home time;
   - creation and persistence of the shared trip state;
   - personalized live ferry/weather/bike/crowd recommendation after the trip is established;
   - advanced controls are fine-tuning, not a second planning entry point.

The existing **/mackinac-island/plan/** URL remains an indexable explanatory planning guide and hands the visitor into My Trip. It is deliberately not a competing primary workspace.

2. **Ferries** — /mackinac-island/ferry-planner/
   - mainland gateway choice;
   - starting city;
   - leave-home time;
   - reachable departures;
   - day-trip versus overnight return logic.

3. **Stay** — /mackinac-island/where-to-stay/
   - downtown convenience versus quiet/resort/iconic experience;
   - luggage/transition implications;
   - lodging-fit recommendations from the shared curated catalog;
   - no room-availability claims.

4. **Eat** — /mackinac-island/dining/
   - meal strategy based on trip shape;
   - quick versus destination meals;
   - geography and timing;
   - dining-fit recommendations from the shared curated catalog;
   - no table/hours availability claims without verification.

5. **Explore** — /mackinac-island/things-to-do/
   - choose experiences based on pace, mobility, interests, weather, and available time;
   - route visitors to bike, family, limited-walking, history, scenery, map, and similar decision surfaces.

6. **Events** — /mackinac-island/events/
   - major event anchors;
   - how events change ferry, lodging, crowd, and itinerary decisions;
   - current-date/event information must be source-backed.

8. **Around the Straits** — /mackinac-island/around-the-straits/
   - only add mainland/Straits experiences when they naturally improve the route;
   - use the shared regional catalog;
   - do not turn the Island plan into an arbitrary regional checklist.

Secondary/search surfaces may include:
- day trip;
- with kids;
- 2-day itinerary;
- bike day / M-185;
- limited walking;
- origin pages;
- fall;
- first visit;
- couples;
- rainy day;
- crowds;
- map;
- webcams;
- event-specific pages.

A new secondary page is allowed only when it has a materially different search intent or decision problem.

## Cross-page state contract

The visitor should not have to repeat information unnecessarily.

The shared Mackinac trip has two persisted layers:

- the visitor profile: saved intake answers, primary archetype and bounded preference vector;
- the practical trip state: trip date, starting city, leave-home time, trip type, party and other planner inputs.

Hub pages may read both layers to make inherited context visible. Stored trip data remains user-supplied planning context, not verified live fact.

Every hub page should:
- detect an existing Mackinac visitor profile when available;
- read the practical trip state when available;
- acknowledge the saved trip context with useful facts such as date and origin;
- personalize its surface from the same profile;
- offer a clear “edit my trip” handoff;
- preserve the same shared planner rather than silently starting a second plan.

If no profile exists, the page should remain useful as a source-backed guide and point the visitor to the root My Trip intake. It should not create another copy of the intake workflow.

## Page contract

Every primary destination page must contain:

1. a clear H1 matching the decision problem;
2. one-sentence explanation of the page’s job;
3. persistent Mackinac destination navigation;
4. useful substantive content before any external-directory link;
5. at least one shared-planner handoff;
6. source-backed decision factors;
7. an explicit truth boundary;
8. canonical metadata;
9. structured data appropriate to visible content;
10. clean internal links;
11. no UTM pollution in permanent internal links;
12. mobile-first layout;
13. image attribution for externally hosted licensed imagery;
14. no unsupported superlatives or fabricated precision.

External tourism directories are supporting references, not the product.

## UX rules

- The first viewport must answer the visitor’s immediate question.
- Avoid giant banners and software-dashboard language.
- Use visitor language, not internal engine terminology.
- Keep primary navigation persistent and horizontally usable on small screens.
- Do not expose JEV terminology to normal visitors.
- Avoid duplicate calls to action stacked repeatedly.
- Separate “what we know” from “what still needs checking.”
- When the trip becomes shorter, reduce the plan rather than compressing the same checklist.
- For overnight trips, arrival day, full Island day(s), and departure day are distinct.
- One-night trips do not receive an invented full middle day.
- Accessibility guidance must not be described as universal accessibility.
- Bike guidance must distinguish the flatter M-185 perimeter from hillier interior riding.
- The literal last ferry is a hard boundary, not automatically the recommended return.

## SEO/content rules

Optimize for high-value decision intent, not page count.

Every indexable page must:
- be unique enough that a visitor would reasonably choose it over another page;
- contain real decision value;
- internally connect to the Mackinac hub and relevant sibling decisions;
- feed the shared planner with only information actually implied by the landing query;
- never pre-classify a traveler from an ambiguous search;
- avoid doorway-page behavior;
- use clean canonicals;
- use visible FAQ content if FAQ structured data is emitted;
- remain useful even if the visitor never clicks the planner CTA.

Do not create ten variants of the same itinerary with swapped nouns.

## Data and truth hierarchy

Use the strongest available source for each claim.

Hard/live facts:
- ferry operator published schedules;
- NWS weather;
- NDBC marine observations;
- official attraction/operator hours;
- official event dates;
- authoritative accessibility/e-bike rules;
- routing service outputs labeled as estimates.

Discovery/fit:
- Mackinac Island Tourism Bureau lodging and dining directories;
- curated property/restaurant catalog;
- regional tourism authorities;
- shared fall-color model clearly labeled as modeled.

When source verification degrades:
- fail closed for hard feasibility when required;
- label degraded inputs;
- keep unaffected parts of the trip usable;
- provide the authoritative recheck link.

## Analytics contract

Measure the destination network as a funnel, not as unrelated pages.

Track at minimum:
- destination page view by surface and search intent;
- destination-nav click;
- planner CTA click;
- profile/intake start;
- profile classification;
- plan generated;
- plan tuned;
- stay/dining/regional recommendation opened;
- map interaction;
- saved/shared plan;
- return visit.

The system should make it possible to answer:
- which landing pages produce actual planners;
- which surfaces retain visitors;
- which intents lead to multi-page sessions;
- where visitors abandon before a useful decision.

## Advertising/performance rules

- Do not place ads inside primary input controls, immediately between an input and its result, or in a way that visually resembles a recommendation.
- Keep the first decision viewport primarily product.
- Preserve Core Web Vitals and mobile usability.
- Lazy-load expensive maps/video where practical.
- Do not add third-party scripts solely to decorate the hub.

## Benchmark personas

Run the architecture against at least these 15 behavioral profiles:

1. first-time same-day visitor;
2. family with young children;
3. family with teens;
4. relaxed couple;
5. special-occasion couple;
6. bike-first visitor;
7. history-first visitor;
8. food/social visitor;
9. scenery/photography visitor;
10. budget-sensitive visitor;
11. limited-walking visitor;
12. event-driven visitor;
13. fall-color visitor;
14. multi-night Island explorer;
15. regional Straits road-trip visitor.

For each persona, simulate at least:
- arrival through the primary hub;
- arrival through one relevant search-intent page;
- movement to a second destination surface;
- planner generation;
- one bounded replan/tuning action.

## Release loss function

Compute a weighted product loss:

L =
- 0.22 × information-architecture/navigation failure
- 0.18 × decision-clarity failure
- 0.16 × state-continuity failure
- 0.14 × truth/source-boundary failure
- 0.12 × SEO/content-quality failure
- 0.10 × mobile/interaction failure
- 0.08 × performance/monetization-integrity failure

Target: **L ≤ 0.05**

Also compute a value product:

V =
decision_utility × trust × continuity × discoverability × mobile_usability

Each component is normalized 0–1.

Target: **V ≥ 0.90**

## Hard release gates

Release fails regardless of weighted score if any of these occur:

- build/test failure;
- broken existing Mackinac planner behavior;
- planner logic duplicated into a static hub page;
- JEV allowed to create facts or bypass deterministic constraints;
- a primary page lacks a truth boundary;
- a primary page lacks a canonical;
- a primary page is missing from destination navigation or sitemap;
- a primary page is thin/near-duplicate doorway content;
- saved visitor context is silently discarded during a normal hub journey;
- live outputs are frozen into static/shareable state;
- navigation exceeds eight primary items;
- accessibility, e-bike, ferry, event, lodging, dining, or availability claims exceed their source evidence;
- an ad placement interrupts the core decision path.

## Implementation order

Execute in this order:

1. freeze this architecture as source-controlled governance;
2. establish one canonical registry for primary Mackinac destination surfaces;
3. create persistent destination navigation;
4. create the missing primary decision pages;
5. reuse the existing curated lodging/dining/regional catalog;
6. add cross-page saved-profile awareness;
7. link existing search-intent pages into the destination architecture;
8. update sitemap/discovery;
9. add architecture verification and regression gates;
10. run existing Mackinac tests/benchmarks plus the new hub gate;
11. reconcile stale/overlapping Mackinac PRs only after the new architecture is on current main.

## Definition of done

The work is done when Mackinac feels like one destination product with multiple purposeful pages, not a single page with too many sections and not a pile of SEO landing pages.

A visitor should understand where they are, what decision each page solves, and how to continue their same trip from page to page.

The system must become easier to use as capabilities grow.
