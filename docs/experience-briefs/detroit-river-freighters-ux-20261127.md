# Detroit River freighters: answer-first redesign (2026-11-27)

Mode: IMPLEMENT (owner: "Production engineering OS review and maximize the Detroit page UX/UI
using all we've learned from our other freighter tools").

## Visitor job
A Detroiter or visitor asks: "Is a freighter coming past the RiverWalk or Belle Isle, and when
should I be at the water?" The decision is to leave now, leave later, or not go. The first
useful answer is a time window at a named spot, plus enough context to trust it.

## Evidence from the live page before this change (390 px and 1280 px)
- 7,245 px tall on a phone. The first screen was a distance-only engine card, e.g. "BBC GENEVA
  · ~9.1 mi · possible passage now". That ship was downriver near Wyandotte and heading away, while
  the tested board further down listed different ships (ALGONOVA 3:01–3:41) for the RiverWalk.
  Two answers that seemed to disagree, with the stronger one below the fold.
- The lede described the internal engine ("safety-gated Detroit Outdoors engine…").
- Raw ISO timestamps were shown twice ("2026-11-27T19:14:57.000Z").
- Six methodology panels at full height; no named place to stand beyond "the Riverwalk".
- The shared Detroit nav linked the page to itself as if it were a peer.
- No season context: in February a quiet river looks like a broken tool.

## Lessons carried over from the other freighter tools
- Soo Locks (the network's highest-traffic page): season band on top, then "next ship" with a
  planning window as the first card.
- St. Clair River Ship Watch: tested windows per named spot, map of every ship plus viewing
  spots and cameras, drawn from one request.
- Seaway: evergreen season state, so the page is right in every month.
- Cuyahoga: named public viewing places with addresses and sources.

## Two concepts
1. **Answer-first river page (chosen).** Season band → tested next-ships board → map of every
   ship and both spots → cameras → the existing live signal, framed as "Is a moving ship already
   close?" with an explicit distance-not-direction note → where to stand → engine read → folded
   method. Works with the shared Detroit Outdoors client untouched.
2. **One merged answer card.** Make the engine card itself direction-aware and fold the
   windows into it. Rejected for now: `detroit-intent.js` is shared by four Detroit pages and
   pinned by the Anthropic smoke workflow and the discovery governance gate. That is a server
   and engine change, not a page change, so it belongs in its own PR if wanted.

## Protected
Title, H1, meta description, canonical, Person/FAQ JSON-LD, ads and analytics, the live signal's
ids and copy, the `/10 minutes/`, `active reported movement` and `roughly 12 miles` text, the
relation map and its privacy note, the pinned script versions, and every method panel's text.
The panels are folded with `<details>`, not deleted.

## Technology fit
HTML/CSS plus the browser JS already in use. No Python, Rust or Java: there is no compute
problem. Leaflet is self-hosted and loaded once: the new map and the relation map share one
copy via `data-detroit-leaflet`. No new Vercel function, no new API calls. The season band and
the timestamp cleanup are page-local and need no network.

## Known trade-offs
- The page still has two maps: "the river right now" (every ship and the spots) and the
  relation map ("where is the ship relative to you", with opt-in location). They do different
  jobs; merging them means editing the pinned relation bundle.
- The engine's "possible passage now" stays distance-based. The new framing says so plainly.
