# Lake Superior Circle Tour — independent Tool Network Bridge

**Owner:** izworskic/chrisizworski-com | **Date:** November 8, 2026 | **Status:** implemented on a review branch, production unverified until PR release | **Canonical:** https://chrisizworski.com/lake-superior-circle-tour/

**Governing principle:** Standardize the quality. Never standardize away the imagination.

## What the visitor needs

After choosing a day, stop or interest on the existing 31-stop Circle Tour, the visitor needs to answer: **Which independent expert check should I make before deciding that this specific stop belongs in my trip, what does that check not establish, and how can I return to my unfinished itinerary?**

The present stop cards, Journey Atlas, 7/10/15-day itineraries, map, Today engine and contextual trip stack already serve other tasks. They are not the new connection system and are not rewritten. The new bridge is a route-aware narrow handoff rail, not a second map, cloned itinerary, or generic directory.

## Evidence and opportunity comparison

Three investigated opportunities:

1. **Connect the existing tools.** The Tool Network Registry on November 8 contains 136 registered products, nine outbound Circle Tour relationships and mature Pictured Rocks, Apostle Islands, LSPP, Pukaskwa, Isle Royale, Gooseberry, Soo and Duluth experiences. Yet the Circle Tour visitor still sees disconnected tool entry points. High network-fit, low source risk; chosen first.
2. **Road closure and overnight intelligence.** Four state/provincial official 511 systems exist. They vary in coverage, source age, rights and routing. A low-cost authoritative source *handoff* helps immediately, but claiming a live integrated road verdict or lodging availability requires separate validated APIs and release gates. No false "all clear" will be shown.
3. **Develop geographic specialists for uncovered stretches.** Ontario Highway 17, the Minnesota North Shore and Keweenaw warrant candidate work. New tools need separate intent evidence, source research, independently verified canonical URL and owner review. Do not use a network build as pretext to rewrite the old tools.

Two credible approaches:

- **A — build a second master planner that embeds specialist engines:** attractive single-screen scenario planning, but duplicates rule ownership, freshness and operating dependencies. Rejected now because a faulty copied access signal could wrongly govern an entire route.
- **B — create an isolated, contextual connection rail:** uses approved registry links, an explicit stop/date/interest filter, existing trip-selection events, official sources and a return-trip URL. It does not claim live access or require specialist changes. Selected. It complements, rather than duplicates, the photo-led Journey Atlas and the numeric Today planner. Its distinct primary interaction is "choose the next expert decision and preserve this exact trip."

## Scope and architecture

~~~text
Existing Circle Tour 31-stop planner + events (unchanged)
                        |
                        v
         Isolated browser bridge and CSS
             |                    |
             v                    v
    Committed approved-only   Official 511 source links
    tool catalog (static)     (external, read-only)
             ^
             |
     Deterministic compiler
       |                |
       v                v
  Network Registry    Curated stop-intent seed
  (canonical owner)   (explicit human approval)
~~~

- **Published catalog:** public/assets/circle-tour-tool-catalog.json. Generated from 22 reviewed specialist connections and four independently checked official highway-source URLs. The output contains no user data, API secrets, location, cookie or live status.
- **Compiler:** lib/circle-tour-network.mjs. Requires exactly 31 known stops, unique registered owners, a meaningful separate visitor decision, explicit stop IDs, safe first-party HTTPS tool canonical, seasonal metadata, and approved-only publication.
- **Automatic new-tool onboarding:** a future Tool Network Registry node may declare a circleTour object with approval, productionVerifiedAt, stopIds, theme, decision and caveat. A production date attestation is required, as is a published canonical and separate verification. Candidate/geography matching only appears in audit output. Adding approved metadata automatically regenerates the catalog during build; no edit to the Circle Tour runtime or any specialist is necessary. Do not infer validated current access from the approval.
- **Foundry workflow:** node scripts/experience-foundry.mjs connections --owner TOOL_ID displays candidate/approved status and actionable missing evidence. node scripts/build-circle-tour-network.mjs --audit discovers possible next destinations. The release process enforces npm run verify:all, the independent UI regressions and owner review.
- **Runtime:** public/assets/circle-tour-bridge.js + .css, attached exclusively to the existing Circle Tour page. Reads CircleTourPage.selectedIds() and existing trip-change, stop-open and filter-change events. Never calls or patches specialist APIs or renders over the map. No Redis, new server, Supabase or geolocation.
- **URL-only state:** ctDate, ctTheme and ctStop are namespaced; the original planner's plan, direction and itinerary query fields are untouched. The existing browser tab retains the active trip when a specialist opens in a new tab. "Copy return link" preserves the current URL. Old specialist pages have NOT gained embedded back-to-trip controls and are not represented as bidirectional API clients.
- **No-JavaScript fallback:** visible, canonical specialist and state-road sources remain in HTML. Catalog failure leaves them, all 31 stops, map and itineraries unaffected. Catalog entries are escaped through DOM text nodes; no untrusted HTML interpolation.
- **No ad/search changes:** no new page, duplicate indexable URL or tool ownership; no title, canonical, schema Person or AdSense setting changes.

## Source checks — not data ingestion

The route desk links to actual official operator pages, not an unreliable copy of a weather/road API:

- WI: https://511wi.gov/map (WisDOT traveler information and conditions).
- MI: https://mdotjboss.state.mi.us/MiDrive/ (Michigan Mi Drive). Lane closures on I, M and US routes are more complete than local side roads.
- ON: https://511on.ca/ (Ontario Ministry of Transportation; incident/closure/road condition map).
- MN: https://511mn.org/ (MnDOT 511; primarily state-maintained route coverage).

Both Sault Ste. Marie and Pigeon River/Grand Portage border stops show checks for both road jurisdictions. This is not a real-time wait-time source or guarantee that a highway is open, nor a safe-ice/boat access assessment.

## Visitor state matrix and acceptance cases

| State | On-page response | Forbidden interpretation |
|---|---|---|
| No trip selected | Approved specialists across route, in stop order | All tools are immediately relevant or open |
| Stops 11 and 15 selected | Pictured Rocks / LSPP and other specifically intersecting specialists | Copy local park engine or ask visitor to restart |
| Date selected | Usually in-season tools first, out-of-season clearly cautioned | 2027 ferry seats/hours guaranteed |
| Interest + stop with zero matches | Honest empty state, preserved trip and official sources | Invent a recommendation or hide route |
| Sault / Pigeon border selected | Both relevant official highway sources | Live border wait or all-clear assertion |
| Catalog fetch 404, timeout or invalid JSON | Existing route, no-JS specialist links and conditions source fallbacks work | Whole-page error or silent blank planner |
| Specialist clicked | Opens canonical tool in a separate tab | Mutated tool logic or fake return integration |
| Copy return | One URL with original plan, date, interest and focus stop | Cookie, localStorage, cross-domain tracking |
| New tool geography only or status candidate | Candidate visible only in Foundry audit | Auto-index a nonexistent or unapproved URL |
| New approved verified specialist | Included at configured stops on next build | Rewriting other tools or instant production publish |

## Protecting the existing site

Hard vetoes: any specialist file change; unapproved/wrong canonical; any new long-running database/queue; stale or invented "live" statuses; loss of 31-stop route or selected-plan behavior; external context injection; changes to ads; any red existing repository CI gate. Regression test suite checks future insertion, candidate-only quarantine, foreign URLs, calendar validity, URL-only return state, road jurisdictions, the existing canonical and no-JS fallback.

Browser release QA must cover 360, 390, 768 and 1366px, keyboard focus, long 31-stop selections, date/theme filtering, simulated catalog failure, no horizontal overflow, preserved map and original trip, and external link target behavior. A green compilation or static benchmark is NOT evidence that these journeys or visual distinction passed.

## Verification and measurement record

- Registry/tool count as reviewed: 136. Approved seeded connections: 22. Four road operators. Geographic candidate currently identified by audit: Edmund Fitzgerald tool, **not automatically published**.
- The map, Contextual Trip Stack, Journey Atlas, original trip engine, specialist pages and APIs are untouched.
- A future separate road-intelligence or overnight-decision phase is outside this release. It requires independent evidence and validation rather than reusing specialist internals.
- GSC clicks, impressions, CTR, tool handoff conversion, return rate, session impact and AdSense revenue: **not measured**. Test passing must not be described as growth.
- Production CI and browser QA: not claimed until PR head is tested and merged. Deployment and public page must be checked against exact merge SHA.

**Next action:** Run the full repository test gate and purpose-built browser regression on the PR head; resolve failures before any merge or production deployment.
