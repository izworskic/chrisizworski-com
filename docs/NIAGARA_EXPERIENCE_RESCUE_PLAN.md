# Niagara Falls Today — Experience Rescue Plan (V3)
**Status:** Implementation-ready plan, not a claim of working production changes  
**Date:** October 12, 2026  
**Canonical:** https://chrisizworski.com/niagara-falls-today/  
**Source of truth:** \`Niagara_Falls_Today_Product_Spec.md\` (original v1), \`lib/niagara-falls/\`, existing Niagara planner/API.  
**Author/entity rule:** Chris Izworski · https://chrisizworski.com/#person · visible \`Built by Chris Izworski\`.

## 1. Diagnosis — a content architecture failure, not a missing-photo problem

The existing decision engine is the product. V2 buried it beneath visuals:

- A dark hero background depends on an externally hosted \`upload.wikimedia.org/.../1600px-NiagaraFallsPanorama.jpg\` thumbnail, without locally validated image bytes or a real fallback. The original CC-BY-SA image exists on Commons; **that does not establish the website's specific thumbnail request actually renders**. The user reports a broken hero.
- Four static picture-led introductory cards repeat waterfall subject matter, independently of chosen country, visit time, or feasible schedule.
- The itinerary renderer injects another place picture for every stop; a 4-stop route can present four more photos of waterfalls, duplicating the above cards.
- Two video tiles are appended below unrelated photo tiles. At least one film identifier was unverified and needs an isolated correction. A video preview does not establish playback or editorial relevance.
- Existing V2 tests explicitly *require remote Wikimedia thumbnail URLs* and verify strings rather than HTTP response, image decoding, identity, mobile layout, or user comprehension. They would not detect the reported failure.
- The prose offers short sensory phrases, but not enough orientation or expert insight to answer: "What am I looking at?", "Why this viewpoint and not another?", "What will it feel like?", "How does this fit my time?".
- Licensing labels dominate tiny cards instead of supporting a coherent story.

**Specific failure mode:** media inventory is mistaken for visitor experience. Do not solve by adding more cards, images, adjectives, AI-generated scenery, fabricated park-ranger endorsements, or a second static tourism guide.

## 2. Product goal: one guided visit, not a gallery

The visitor has a **job**, not a desire to scroll pictures:
> "I have limited time at Niagara Falls. Show me where to stand, what I will actually experience, what I should notice, how to fit it together, and what not to waste time on."

The page should feel like an observant local naturalist walking beside the visitor, explaining *what is remarkable in front of them*, while the source-backed decision engine remains firmly in charge of the recommendations. Tone: precise, warm, economical, grounded; never performative, florid or pseudo-ranger branding.

**Narrative arc (single personalized storyline):**

1. **Orient:** "Which side am I on? What makes this particular view different?"
2. **Decide:** date, side, time, priorities → result in <=30 seconds.
3. **Arrive:** one meaningful, correctly labeled visual; clear directions, first action and time.
4. **Experience:** each *selected* stop has a reason, a sensory detail, a "notice this" explanation and a concrete practical tip, progressively presented within the actual timeline.
5. **Understand:** one focused interpretive chapter, not four photo cards; explain the three cataracts, Niagara River/gorge, where different viewing positions change what you see.
6. **Make a smart choice:** what to skip and why, uncertainty, source verification, linked border/rainbow specialist tools.
7. **Optional preview:** one relevant **verified** official video in a deliberate location, not two detached generic tiles.

## 3. New page layout — deliberate scarcity

\`\`\`
HEADER: Chris Izworski | National Tools

[ ONE real establishing Niagara image, locally hosted; measured crop + text fallback ]
"Niagara Falls Today"
"Choose the view worth your time."
One specific opening paragraph, not three teaser paragraphs.

[ COMPACT PLANNER ]          [ FIRST VERDICT + ONE CLEAR ACTION ]
Date · Arrival · 2/4/6h       Best first stop + why / time
Start US / CA · Priority       Keep/skip and verified schedule confidence
                            [a short route timeline]

[ ONE PERSONALIZED EXPERIENTIAL STORY ]
"Here's what your visit will feel like."
Selected stop 1: arrival, geometry + river/lens description + what to notice
Selected stop 2: contrast from stop 1; where to walk + how it changes
Selected stop 3: if feasible. No redundant photography.

[ ORIENTATION: KNOW WHAT YOU'RE LOOKING AT ]
Small factual illustrated/diagrammatic orientation, ideally text-first;
New York vs Ontario perspective conditioned on chosen starting side.
This is orientation, not a navigational map.

[ ONE OPTIONAL VIDEO ]
Only if footage is relevant to the selected feasible attraction.
Click to play; source title and operator; safe fallback to official page.

[ SKIP / LIMITS / SOURCES / RELEVANT TOOLS ]
Reasons, no invented hours, queues or border permissions.
\`\`\`

**Default visual budget:** 1 genuinely excellent establishing photo, and **at most 1 additional photo** where it materially changes understanding of the user's selected stop. No image grid, no scrolling gallery, no repeating the same falls image inside cards, no default videos with big thumbnails stacked. Dynamic imagery should only render if it has a verified subject and a specific narrative job. Where it cannot beat a short paragraph or clear diagram, omit it.

**Mobile:** hero image and first decision visible without decorative scrolling; no full-screen aesthetic filler before planner; first verdict not pushed below a gallery.

## 4. Editorial contract (each selected stop)

Every stop needs a structured, source-traceable content record independent of the dynamic schedule engine:

- \`where_you_stand\`: exactly where and from which side/viewpoint, not a generic shot of Niagara;
- \`what_you_see\`: subject and spatial orientation, verified from operator/park material;
- \`what_you_hear_or_feel\`: honest sensory cue, no guarantee dependent on wind, mist or seasonal deck;
- \`what_to_notice\`: one genuinely informative and specific interpretive insight;
- \`why_this_stop\`: value *relative to the prior and next stops* and this user's selected priority;
- \`visitor_tip\`: conservative, operationally useful tip;
- \`conditions_and_limits\`: whether admission, step-free route, seasonal access, time slot or operator check matters;
- \`official_source_url\`, \`reviewed_at\`, \`uncertainty\`;
- \`photo_asset_id\` optional: actual viewpoint, media rights, alt text, visible credit and no false "live".

Use the existing planner's \`stops\` and schedule/price/border outputs. Do **not** independently invent opening or closure claims in client text. Paragraphs must substantively explain a place; no arbitrary character/word-count quota. Vary by visitor type (2-hour, boat, easy pace, photo-first, late arrival, winter, New York, Ontario). Avoid claiming a licensed ranger/NPS affiliation: Niagara Falls State Park is a New York state park; Ontario attractions are run by Niagara Parks.

**Example of depth, not final published copy:**

> **Table Rock — where the river ends.** You're standing near the rim of Horseshoe Falls, not simply looking across the gorge. The broad green current gathers speed and bends out of sight at the brink. Watch the line where its surface changes from smooth to broken white water; that's the moment to stay put instead of chasing another photo angle. If your route includes Journey Behind the Falls, Table Rock Centre is also where that experience begins. The viewing area is not the same thing as admission to Journey Behind the Falls—check the operator's published access details separately.

This is one explanation of one stop, not a separate card repeating an already shown image.

## 5. Media reliability and licensing — hard gates

**P0 — no broken media**:
- Reuse the existing Welland local-import pattern (\`scripts/fetch-welland-hero.cjs\`, \`.github/workflows/welland-hero-import.yml\`) rather than hotlinking generated Commons thumbnail paths.
- Choose one high-quality photo *after visually inspecting the exact scene* for correct geography, original photographer, age, legibility with text and photo rights.
- Source image from verified Commons file/original or separately licensed asset; import JPEG/WEBP into \`public/assets/niagara-falls/photos/\`; limit size and dimensions without distorting; preserve metadata and exact credit.
- Offline build validates magic bytes, dimensions, file size, correct extension and required license registry. CI must fail if hero asset missing or no longer in emitted build.
- Production smoke must request **our domain's exact hero asset**, check 200, image content-type and a successful real browser decode. CSS/text gradient remains attractive if media fails or user disables images.
- Confirm hero image and responsive crop on narrow mobile (375px), tablet (768px), and desktop (1440px) **through rendered screenshots**, not HTML string assertions. Crop must show the subject rather than empty sky or over-darkening.
- Use correct author credit, source, license and crop disclosure. Put concise credit in accessible caption/details without intrusive full-width overlays.
- Audit OG and Twitter image URL separately; social card must resolve to actual first-party image.

**Rights:** Niagara Parks' publicly available media library restricts copying/usage to non-commercial uses without separate authorization. This ad-supported site **must not** treat that library as unrestricted stock photography. Link to or embed permitted official videos via platform players rather than rehosting them; use only verified identifiers and note if embeds are disabled.

**P1 — one purposeful video**:
- Verify clip title, publisher, footage subject, full playback and embed permission.
- Link from relevant stop/interpretive chapter only; do not autoplay, preconnect or show duplicate 16:9 promotional cards on initial load.
- If video unavailable, show useful source link and keep the planner functional.

## 6. Release phases and concrete work items

### Phase A — Stop the damage, restore trust (first PR)
1. Remove 4 static photographic experience cards and their long caption blocks from the primary scroll.
2. Remove default photo injection from each itinerary stop; retain text-first, useful route.
3. Remove detached 2-card video grid until editorial purpose and rights/playback are proven.
4. Install **one local, verified** establishing hero photo with image-error and CSS fallback, and correct OG/X. Use a deliberately chosen photo, not an arbitrary substitute.
5. Test it on a real 375px and desktop rendering; verify initial verdict still appears quickly.
6. Do not change existing decision engine's date or safety logic.

**A completion gate:** user sees **one functioning excellent image**, one clear route, no static photo grid, no broken hero, no repetitive attraction imagery.

### Phase B — Build the actual guided experience (second PR)
1. Author and fact-check side-aware editorial modules for all eight attractions.
2. Build the **route narrative** from actual selected stops, not a static sightseeing brochure. Include geographical orientation, specific interpretation, pacing and "what to notice".
3. Make the route coherent: explain transitions ("You have seen the water from above; now see the force from below") when selected combination justifies it.
4. Display one meaningful comparison of US vs Ontario perspectives where it helps decisions; do not promise border crossing.
5. Preserve confidence and operator-sourced cutoffs alongside story, not buried at the bottom.
6. Shorten visual wrappers; show long-form explanation progressively within selected stops.

**B completion gate:** a user can describe the difference between Prospect Point, Terrapin Point and Table Rock; knows first action and why; route content responds to time/side/priority and not inaccessible closures.

### Phase C — Add video only if it earns its place (third PR)
1. One publisher-verified clip relevant to a route stop.
2. Click-to-play at the narrative moment; attribution and direct source link.
3. Confirm embed playback in browser; replace with official-page link if blocked.
4. Track voluntary play events, not impression inflation.

**C completion gate:** video adds new understanding, is never an empty rectangle, does not obscure route and does not add unnecessary load.

### Phase D — Measure, trim, and ship
1. Full \`verify:all\` and emitted-page audit, frontend image-decode test, browser screenshots, alt text, keyboard and screen reader check, source/rights audit, mobile network performance.
2. Replay six distinct scenarios: 2h New York overview, 4h U.S. boat, 4h Ontario views, easy/step-free, winter shoulder season, late arrival with attractions unavailable. Also **images disabled**, **slow network**, and **video blocked**.
3. Side-by-side editorial review: read the page on a phone with no screenshots of the existing version; identify any decorative element not improving a decision. Cut it.
4. Preview only → manual photo/phone review → green CI/Vercel → merge to main → production and image URL smoke tests → observe GSC and real engagement. Roll back layout without touching itinerary API if visual regression occurs.

## 7. Hard vetoes, loss and value functions

### Hard vetoes (any one fails the release)
- Broken or unverified hero/photo/video, unsupported location identity, deceptive "live" or official claims.
- Media copied without authorized rights; photographer or license missing.
- Static gallery reintroduced above or alongside the route.
- Wrong side / wrong viewpoint narrative; paid attraction presented as free; closed attraction presented as open; unsupported step-free or queue assertions.
- First decision blocked by an external video/image/API failure.
- No mobile screen capture and production image fetch check.
- Canonical changed or Chris Person identity duplicated/altered; existing deterministic visit logic regressed.

### Score 100 (after veto screening; target >=90)
| Dimension | Weight | Evidence required |
|---|---:|---|
| Correct and defensible visitor decision | 30 | Scenarios + route/date/source assertions |
| Narrative coherence, nonrepetition and depth | 25 | Human editorial read across visitor personas |
| Place specificity and interpretive accuracy | 15 | Stop/source crosswalk and fact review |
| Visual purpose, composition and restraint | 10 | Screenshots at 375/768/1440 and subject matching |
| Usability / first-action speed | 10 | Mobile task test, target first action <=30sec |
| Media delivery, response, decode, fallback | 5 | First-party 200/content-type/decoded image; blocked video fallback |
| Attribution, rights and date honesty | 5 | Source/license ledger reviewed |

**Weighted loss:** \`L = .30*decision_error + .25*narrative_fragmentation + .15*place_inaccuracy + .10*visual_noise + .10*time_to_action_penalty + .05*broken_media + .05*rights_risk\`, normalized to [0,1]. Each hard-veto above supersedes this numeric score. These are **project quality targets**, not claimed measured usability or Google Search uplift.

**A media decision rule:** keep a photograph or video only if its specific *new explanatory value* exceeds its load, screen-space and repetition cost. Score media item on subject accuracy (40%), explains an otherwise hard-to-understand feature (25%), visual quality (15%), visitor decision relevance (10%), performance (5%), provenance (5%). Hard veto broken/different-location/unlicensed image, regardless of score.

## 8. Source and audit ledger

- Original product contract: \`Niagara_Falls_Today_Product_Spec.md\`: one flagship decision engine, first action <=30 seconds, no generic tourist content or invented operational facts.
- Existing implementation: \`public/niagara-falls-today/index.html\`, \`public/assets/niagara-falls-today.css\`, \`public/assets/niagara-falls-today.js\`, \`public/assets/niagara-falls-media.js\`, \`tests/niagara-falls-experience.test.js\`.
- Operator: https://parks.ny.gov/visit/state-parks/niagara-falls-state-park
- Operator: https://www.niagaraparks.com/visit/welcome-centres/table-rock-centre/
- Current image: https://commons.wikimedia.org/wiki/File:NiagaraFallsPanorama.jpg (the licensed source file exists; **not** proof the deployed 1600px URL works).
- Usage rule: https://www.niagaraparks.com/media-room/library/ (media library non-commercial-use limitation).
- Precedent: \`scripts/fetch-welland-hero.cjs\`, \`.github/workflows/welland-hero-import.yml\`, and Welland October 11 log entry documenting broken remote thumbnails and local import repair.
- PR #921 remains a separate film-link correction; coordinate or supersede explicitly rather than leaving contradictory IDs in merged code.

## 9. Ownership, rollbacks and measurement

- Preserve the current deterministic \`/api/niagara-falls-today\` and its source/unknown state contracts.
- Release a coherent **minimum high-quality editorial experience** before expanding. The initial image count is **one** unless a second adds a novel, clear interpretation.
- Keep one canonical page and the existing National Tools hub discovery. No thin attraction SEO satellites.
- Keep GSC performance claims strictly evidence-based; measure meaningful planner submissions, source check clicks, save/map actions, scroll-to-first-result, and optional video plays, not raw image impressions.
- **Next action:** Phase A only: replace the vulnerable image path via first-party validated asset and remove the repeated galleries, then visually review mobile and desktop **before** Phase B narrative implementation.
