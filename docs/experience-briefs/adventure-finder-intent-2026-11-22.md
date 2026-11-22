# Adventure Finder: source-grounded intent search

Date: November 22, 2026. Owner: izworskic/chrisizworski-com. PR: #1851.
Release: IN REVIEW. The owner explicitly requested HOLD MERGE until the planned investments are complete.

## Visitor decision

"I know what kind of Michigan outing I want but not the destination." The original twenty destination cards contain titles, source-backed editorial notes, photos, licenses, region, activity tags, months and official links. The user selects date/activity/region as strict constraints; an optional local description can now discover matching cards within those constraints.

Examples grounded in the existing on-page editorial:
- Mackinac Island: car-free roads and ferries, but no claim that bike rentals or ferry schedules are available today.
- Tahquamenon: a broad amber waterfall and forest trails, not a water quality verdict.
- Marquette: rocky Superior coast, walkable city and restaurants afterward.
- Traverse City: farm roads, shoreline drives, tasting rooms and wine-trip link.
- Detroit Riverfront: a riverwalk, freighters and islands, not an arrival forecast.

## Design alternatives

A. Browser-loaded transformer: REJECT. The previous pinned MiniLM experiment worsened holdout ranking (MRR 0.706 to 0.655), while adding unmeasured mobile asset/download cost.
B. Compact description input using deterministic source evidence: SELECT. Build a small ranked, capped candidate set and a single starting-place link, while retaining original map/cards/SEO/ads. No new hero, cards, data service or artificial confidence.

Technology review: keep HTML/CSS and browser JavaScript. Do not introduce Python build, Java service, Rust/WASM, inference endpoints, a vector database, model weights or new Vercel functions: a 20-card static corpus does not justify them.

## Source and state contract

The browser module public/assets/adventure-intent.js reads only the twenty existing destination cards. Query synonyms must be corroborated by a phrase within the card itself; they cannot assert new facilities, safety, season, proximity, openings or bike rentals. Search returns only cards preapproved by visitor-selected region, season and activity. The map follows the same visible card IDs. The highest-ranked place is a small jump link with up to two source-based explanations; card DOM order is never moved, preserving screen-reader sequence and ad placement.

A brief, optional input appears inside the existing compact finder only when JavaScript and the local matcher are present. The Show places button and Enter submit it. Clear description retains the other controls; Reset clears them all. No typed text is placed in the URL, network, analytics or storage. With missing module/JavaScript, the original cards and filters remain available. Unsupported live/safety services return zero supported matches, never an invented positive result.

## Evaluation and protections

36 authored acceptance questions: 30 location recommendations and six requests for unsupported services or guarantees. Local code-level comparison to the full-field-note lexical baseline: positive hit@3 0.933 versus 1.000, MRR 0.832 versus 0.983, unsupported rejection 0/6 versus 6/6. These authored examples are not independent user data or a blind holdout, and cannot justify an SEO or behavioral improvement claim.

Run node --test tests/adventure-intent.test.js, node scripts/benchmark-adventure-intent.cjs --check, the full npm run verify:all gate, and the scoped real browser QA workflow at 390/1366px. Verify keyboard, mobile overflow, A-B-A, unsupported terms, module failure, no JS, map/list correspondence, loaded photography, correct URLs and no ad changes. Screenshots must be inspected. Do not merge until exact-head checks and owner-directed completion.

Next action: inspect exact PR-head CI/browser screenshots, resolve any failures, keep merge on hold.
