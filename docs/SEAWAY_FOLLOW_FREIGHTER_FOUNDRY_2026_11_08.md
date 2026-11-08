# Follow the Freighter: Experience Foundry pilot 02

**Canonical owner:** `https://chrisizworski.com/st-lawrence-seaway/` in `izworskic/chrisizworski-com`  
**Created:** 2026-11-08. No standalone tool or new public URL.  
**Distinct visitor decision:** *I selected a recent vessel. What does its observed river stretch mean, what locks are there, and where could I responsibly watch from shore?*

## Research / comparison / why this composition

Checked existing sources:

- [Seaway official vessel order of turn](https://www.seaway-greatlakes.com/vessel-transit/order-of-turn) for operator-declared vessel transit planning, **not** an inferred ETA from an AIS coordinate. Source reviewed Nov 8, 2026. Never silently merge a purported queue entry with a separate MMSI unless an identity and timestamp contract can be independently verified.
- [Seaway Visitor Center at Eisenhower](https://www.seaway.dot.gov/explore/seaway-visitor-center), official public viewing and current published hours, reviewed Nov 8, 2026. Do not treat lock markers or restricted operational grounds as public entrances.
- [Official Seaway map](https://greatlakes-seaway.com/en/navigating-the-seaway/seaway-map/) for geographic waterway/lock sequence; not a transit-history feed.
- [Open Waters AIS](https://openwaters.io/api/ais/) for existing public receiver-reported positions, provider attribution and strict 30-minute freshness contract, as already implemented and licensed on this site.

Closest existing site interactions:

1. **St. Lawrence Seaway river-chapter primer** on the same page: five static editorial steps, region filter, map and AIS reports. **Difference:** the Follow layer is bound to **a personally selected observed vessel** and its last actual report, then presents per-vessel area/age, geographic context, locks and verified public destinations. It appears only upon selection; it does not repeat the full river overview as another page hero.
2. **Welland Canal ship and lock tool:** choose one of eight engineering locations and discover local ships/cameras. **Difference:** this new layer does not become another live ship tracker or lock-specific schedule. It is a compact, on-demand journey dossier connected directly to the existing Seaway map/list and its five regional chapter model.
3. **The First Freeze pilot:** seasonal chapters + wildlife location. **Difference:** an AIS observation chooses a geographic river step, with manual river-corridor exploration, official queue/source checks, and no seasonal chronology or generic shared card skin.

We choose a **contextual on-demand passage ledger** over (A) a new standalone ship tracker, which would cannibalize existing search intent, and (B) a large always-visible journey hero above the map, which would crowd the page and repeat existing context. No new photos or speculative ship icon assets are needed. Keep existing map, icons and cameras.

## Exact placement

The generated Seaway page already has a prominent hero and five static river chapters, then the `#ship-watch` map plus `#shipList` recent ship cards, followed by `#regionReports`, cameras, verified viewing planner, and lock education. The new `#followFreighter` panel is inserted **immediately after `.watch-desk` and before `#regionReports`**, not at top of page or over the map. It is HTML `hidden` until a fresh received AIS vessel is selected; one `#followSelectedShip` button also appears below the scrollable list only when a ship is selected. The existing `#mapSelection` then includes a direct “Follow this ship’s journey” action.

This placement answers “what happens after I select a ship?” without showing a large second tool when no ship is selected. It preserves the existing map and cameras and does not create another SEO target.

## Evidence and source contract

Inputs are **only** the currently selected `lib/seaway-ais.js`-validated `mmsi`, `name`, `seen`, coordinates, speed/heading/course (if reported), `regionIds`, and the existing data `checkedAt`. Reference regions, lock data and public viewing sources come from the curated `data/seaway/places.json`.

- AIS report must have a 9-digit MMSI, valid timezone-aware observation and age 0–30 minutes (allow <=60-second future clock skew, same as source validator). Expired or unidentifiable reports must not be presented as live.
- One observed region can be identified only if the source gives a supported region membership. Overlaps are resolved by the existing `SeawayCore.journeyContext` selector; if none is verifiable, do not highlight a corridor step or claim a nearby viewpoint.
- The five region marks are **geographic reference only**. They are not recorded historical stops, a confirmed itinerary, an inbound or outbound direction, next lock, ETA, cargo or destination.
- Show locks **within the observed chapter** only, with explicit disclaimer that they are not confirmed next locks. Show officially researched public viewing locations only where they belong to the same chapter. Other chapters are a manual geographic choice, not a navigation predictor.
- Next action provides a new all-region recent AIS check filtered to that MMSI, the independent operator order of turn, and the original public AIS source. It does not scrape operator queue data into a fake ETA.
- On region changes, map reset, viewing-site selection or filtered/expired observations, hide/reset the follow panel or display a stale warning. Do not retain or promote old reports as current.
- Existing API polling, cache TTL, provider calls, map tiles and attribution remain unchanged. No new data API, Redis, Supabase, credentials, proxy or source scraping.
- GA4 behavior logging remains bounded to semantic anonymous events (no MMSI, position, user location or IP sent by this feature).

## State matrix / outcomes

| Input | Visible output | State protection |
|---|---|---|
| Initial page | Existing map, ship list, cameras, normal educational content | Follow panel hidden, page not crowded |
| Select fresh vessel in Massena | Named, dated AIS snapshot; Massena highlighted on five-step corridor, Snell/Eisenhower reference locks, Eisenhower visitor location | No actual next lock or arrival prediction |
| Select Iroquois-region vessel | Iroquois highlighted; Iroquois lock and South Dundas shore viewpoint | No extrapolated Massena access or future route |
| Select Montreal vessel | Montreal reference and two local locks | No invented public watching site |
| Recheck selected MMSI across corridor | Existing search filter and existing API refresh over all regions | Prior selection clears; results require another verified report |
| Select new river region/viewpoint/lock | Relevant site section becomes current | Previous vessel journey clears, linked URL state preserved |
| AIS ages beyond 30 minutes/source fails | Stale/missing-state warning, official source link | Do not describe old signal as current |
| JavaScript unavailable | Existing SSR five-chapter geographic primer and official visit links still work | No fake static live vessel |
| Mobile 360/390/768 | Compact stacked evidence panels, chapter list and native buttons | No off-canvas drawer, map overlay or horizontal body scroll |

## Implementation & release checkpoints

- `scripts/enhance-seaway-journey.mjs` is the authoritative post-generation injection, not a one-off HTML hack. `scripts/generate-seaway.mjs` still produces the original public page and then runs the enhancer.
- `public/assets/seaway-follow.js` contains a separately testable pure `analyze()` function and a scoped browser DOM renderer. All provider text uses `textContent`, never provider HTML.
- `public/assets/seaway-follow.css` controls only `.follow-*` selectors, does not modify ads or map overlay behavior.
- `public/assets/seaway.js` selects/clears the evidence model using **the existing** `chooseShip`, `setRegion`, `chooseLock`, `chooseView`, and `loadReports` lifecycle. No parallel fetcher.
- `tests/seaway-follow-freighter.test.js` tests exact data bounds, unknown regions, 30-minute freshness, layout, source safety and original page integrity.
- `.github/workflows/seaway-follow-browser.yml` generates the hub, reruns tests and checks 360/390/768/1440 browser behavior, A→B→A ship follow, region reset, a no-report feed and no-JS fallback. Synthetic AIS fixtures must never be called live source verification.
- Full repo `npm run verify:all` and independent production checks after merge are the release gates. Verify production commit, rendered feature assets and selected-ship behavior. SEO/traffic effects are **not measured** by a green build.

## Outcome and transferability

Pilot 02 reuses Foundry's visitor decision, evidence kinds, source confidence, time budgets, two-tool uniqueness comparison and review protocol, **not the first pilot's visual skin**. The next Foundry investment should automate the safe handoff and test-suite scaffolding across owning repositories, not manufacture generic pages.

This document is a build brief. Mark CI, merge and public smoke results only after observing them.
