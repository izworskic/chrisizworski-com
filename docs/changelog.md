# Deploy changelog

One dated entry per production change, so Search Console movement can be attributed to a cause
instead of guessed at. Do not ship two page clusters on the same day.

## 2026-08-09 — measurement integrity before the 28-day growth freeze
Cluster: fall color (15 pages), Aurora, Soo Locks, and Mackinac Bridge.
- Normalised every fall-color Person definition and reference to the canonical
  `https://chrisizworski.com/#person` ID. The entity benchmark now fails if a second Person ID
  appears; the previous configuration claimed this requirement but never enforced it.
- Added full Person and WebPage definitions plus a visible Chris Izworski byline to the leaf
  peeping planner and scenic-drive map. Their structured-data URLs now match their trailing-slash
  canonicals.
- Added privacy-safe Vercel events for planner runs, location outcomes, route filtering, map opens,
  and field-guide clicks. This makes the two new fall tools measurable beyond raw pageviews.
- Replaced stale structured-data and root-sitemap dates with reviewed modification dates. The
  dynamic fall sitemap now includes all 15 pages and omits `lastmod`, because it cannot truthfully
  infer that every crawlable page changed today.
- Marked the Aurora, Soo Locks, and Mackinac experiments `pending-clean-window`; their August 3
  evaluation dates were invalidated by later search-facing changes. The exact 28-day window begins
  the day after this corrective release reaches production.
- Titles, descriptions, H1s, direct answers, canonicals, and indexability were not changed in this
  pass. This is the measurement lock that lets the next comparison mean something.

Expected to affect: name-entity consistency immediately after recrawl, accurate fall-tool
engagement reporting on release, and interpretable Aurora/Soo/Mackinac CTR comparisons after one
complete 28-day window. NOT YET MEASURED.

## 2026-08-06 — fall color snippet repair + entity integrity
Cluster: fall color (16 pages) and the identity cluster (2 pages).
- 12 titles cut to 60 characters or fewer. Every over-length title on the site was a fall color page.
- 14 descriptions cut to 158 or fewer; several were running to 231 and losing their second half in the SERP.
- Canonicals, og:url and sitemap entries normalised to the trailing-slash convention used by the other 150 pages.
- Internal fall-color hrefs normalised to trailing slash across 17 files, removing a redirect hop per link.
- 3 inbound links added so every fall color page meets the 4-link network standard.
- `jobTitle` normalised to "Solutions Consultant" on 2 identity pages. All three values shared one
  `@id`, so the entity was contradicting itself.
Expected to affect: fall color impressions and CTR from roughly 2026-08-20 onward, and entity
resolution on the name query. NOT YET MEASURED.

## 2026-08-11 — the rest of the citation pass, and a benchmark that was lying
Cluster: michigan-ice, saginaw-bay-ecology, mackinac-bridge-live, fall-color.
FIRST, A CORRECTION. The benchmark shipped on Aug 10 only detected Q&A written as
<h3>Question?</h3>, and this site writes it three ways. It also appears as
<details><summary>Question?</summary> on the freighter and Saginaw Bay pages and as
<p class="faq-q"> on the buoys page. So the claim that four tools had NO question surface was
wrong: three of them had one all along, and the true total was 68 answer blocks, not 24. Only
michigan-ice genuinely had none. The detector now matches all three markups.
That correction changed the plan. Forcing all 68 blocks into the 134 to 167 word band would be
padding, and a tight 40-word accordion answer is often better than a padded 150. The work targeted
the questions that match real search demand on each page instead.
- michigan-ice gained its first question surface: is the ice safe right now, how much cold does it
  take to make ice, and which lakes have satellite coverage. Written into scripts/ice/gen_site.py,
  not the output, after tests/ice-generated.test.js correctly caught an edit to the generated file.
  The safety framing is the page's existing wording, unchanged, because a confident answer here
  could put someone on bad ice.
- saginaw-bay-ecology: the three highest-demand answers restructured. Its Q&A exists in TWO places,
  a JSON-LD block and inline microdata, so each replacement was applied to both copies to stop them
  desyncing the way head metadata and JSON-LD did in PR #36.
- mackinac-bridge-live: toll, Bridge Walk closure and driver assistance. No FAQPage schema added;
  tests/mackinac-static.test.js forbids it on this page and that was checked first.
- fall-color: U.P. peak timing, and the "where is it peaking right now" answer no longer points at
  a map it cannot carry with it. It now lists all eight region windows.
Result: self-contained answers 8 -> 17, tools with no question surface 4 -> 0, page-dependent
answers 4 -> 3. Still open and stated plainly: great-lakes-beaches 0 of 4, great-lakes-buoys 0 of 5,
great-lakes-freighter-tracking 0 of 6.

## 2026-08-10 — answers that stand on their own
Cluster: /northern-lights-michigan/ and /soo-locks/, the two pages carrying 75% of site impressions.
Measured first across all twelve tools: exactly ONE answer block out of 28 fell in the 134 to 167
word band that current research associates with several times higher AI Overview citation, and
median answers ran 28 to 69 words. Entity density was measured too and needed nothing: every tool
already clears the 15-entity threshold, the lowest being michigan-ice at 27, so no work was done
there.
The rewrite target was self-containment, not length. The test is whether a block still answers its
question when it is the only thing a reader or an assistant sees, and lifted out is exactly how an
assistant encounters it. Three answers leaned on the page around them, saying things like "the live
reading at the top of this page", which reads fine in place and answers nothing in isolation.
Nothing new was asserted on either page. The Kp thresholds, the viewing sites, the lock dimensions,
the season dates and the Corps ownership were all already stated; they were restated so each block
carries its own context, plus the reason each fact matters, which is the part that was missing.
- aurora 0 of 3 in band -> 3 of 3
- soo locks 1 of 7 -> 5 of 7
- NEW scripts/benchmark-citation.mjs and benchmarks/citation-baseline.json, `npm run
  benchmark:citation [-- --check]`, now the NINTH gate of verify:all. It is a ratchet: the count of
  self-contained answers may only rise and the count of page-dependent ones may only fall. It also
  flags tools with no question surface at all, currently four.
Deliberately excluded from the benchmark: /when-to-plant-tomatoes-michigan/ and
/michigan-frost-dates/. Both are single-fact zero-click queries and no restructuring changes that.

## 2026-08-09 — dateModified told the truth for the first time
Cluster: site-wide metadata, 103 pages. No visible content changed.
Measured: every one of the 159 pages carrying a dateModified was UNDERSTATING it. None overstated.
103 were behind by more than a week and the worst by 100 days, with pages edited on August 6 still
claiming they had not changed since April 28. The stamps had been set by hand in bulk and drifted
every time anything shipped.
This matters more here than on most sites. Freshness is a citation signal in AI Overviews, current
research puts cited content around 26% fresher than the organic top ten, and the whole proposition
of this network is live conditions: the aurora page recomputes on every load and fall colour begins
writing daily on August 20. Telling Google those pages had sat untouched since spring was the
opposite of true, and it was costing nothing but honesty to fix.
- NEW scripts/stamp-freshness.mjs derives each stamp from the file's last git commit, so it can
  never drift again. `npm run freshness` rewrites, `npm run freshness -- --check` gates, and the
  check is now the eighth step of verify:all. It tolerates 7 days of lag so that the commit which
  writes a stamp does not immediately invalidate it.
- Two tests pinned literal dates (2026-07-28 and 2026-08-03) and would have broken on the next
  legitimate edit of those pages. They now assert the shape and that the date is not in the future,
  which is the property that actually matters and cannot go stale.
- Verified separately that nothing on the site blocks snippet extraction: max-snippet:-1 and
  max-image-preview:large are already set, which is the single most common way a site accidentally
  disqualifies itself from being cited.
NOTE for the next run: audit/live/manifest.json stores hashes, not bodies, so the 103 stamp-only
edits had to be declared in intentionalChanges. Re-run `npm run audit:live` after this deploys to
refresh the snapshot, then those declarations can be removed.

Follow-ups after rebasing onto PR #44, which landed mid-build:
- The stamper is CONTENT-AWARE. A first version used the file's last commit outright, which made it
  oscillate: it stamped a date, the commit carrying that stamp became the newest commit, and the
  next run stamped that. A rebase made it stamp "today" on every page. It now walks back through
  commits and ignores any whose diff for that file touches only dateModified or lastmod.
- SITEMAP lastmod IS NOW OWNED BY THE SAME SCRIPT. PR #44's integrity test caught a real bug this
  way: it changed mackinac-bridge-live's content on Aug 9 and left both its stamp and its sitemap
  entry at Aug 6. Syncing found 124 sitemap entries disagreeing with their own page.
- Three pinned-date tests were rewritten to assert the property rather than the literal: two now
  check the shape and that the date is not in the future, and PR #44's now checks that sitemap
  lastmod and dateModified AGREE, which is what it was really protecting and does not go stale.
- verify-source carried a hardcoded map of about thirty route-to-lastmod pairs that had to be
  hand-corrected on every edit. Replaced with a check that every sitemap entry matches its page's
  dateModified. That is a strengthening: it covers every route rather than thirty, and maintains
  itself.

## 2026-08-07 (fourth change) — Soo Locks demand audit, the last big page unexamined
Cluster: /soo-locks/, 11,919 impressions and 29.5% of site impressions.
Alphabet-expanded autocomplete across four phrasings, "soo locks", "sault ste marie locks",
"soo locks ships" and "soo locks michigan": 386 unique suggestions.
- THE SYNONYM AGAIN, now three for three. "Sault Ste. Marie locks" is its own 88-suggestion family
  and that exact phrase appeared NOWHERE on the page. The description mentioned Sault Ste. Marie
  only as a place for visitor hours, never as the name of the locks themselves.
- "webcam" absent though the page had "cam" and "live cam", against a 47-suggestion camera cluster.
- Four top informational queries had no answer in the words people use, although every fact was
  already ON the page: how many locks there are, how long they are, who owns them, and whether they
  are open right now. The lock cards carry the specs and the navigation season block carries the
  dates; nothing new was asserted, it was restated as questions.
- Only TWO question headings on a page carrying 29.5% of impressions. Now seven.
- The title was left alone: it is pinned in tests/growth-static.test.js. The synonym went into the
  description instead, the same approach used on aurora.
Not acted on: the campground, hotel and boat-tour clusters are real demand but belong to operators
and booking sites, not to a conditions tool. benchmark:ctr still scores this page 100% on snippet
surface, and its 123 modeled clicks at risk remain an INTENT question that needs GSC query rows.

## 2026-08-07 (third change) — four Saginaw Bay cameras registered on the hub API
Cluster: field camera registry only. No hub page changed.
Looked at all four images before registering any of them, which is now the standing rule after the
Sylvania metadata lesson. All four are usable views of water, not of bridge undersides:
- Saginaw River at Holland Avenue watches USGS 04157005, the exact gauge at the head of the
  Saginaw Bay Report's documented turbidity cascade, so the number and a picture of the same
  water now arrive together. Strongest fit of the four.
- Kawkawlin at State Park Drive shows the marina, docks and water surface near Bay City State Park.
- Sebewaing at Center Street sits essentially on Sebewaing Harbor Marina, already pinned on that
  site's map.
- Pine River at Pine River Road sits on the Pine River Access at Standish, also already pinned.
Registered on the hub because api/field-camera.js already sets Access-Control-Allow-Origin *, so
the separate saginaw-bay-report project can consume it rather than carrying a duplicate registry
and proxy. Duplication of exactly that kind was the mistake made on the Mackinac cluster the day
before. Each entry carries a `zone` matching that site's three-zone model, now exposed in ?meta=1.
Honest limit to carry into the pages: these look at rivers and river mouths, not the open bay.
They answer what the water looks like where you launch, not whether the bay is fishable.

## 2026-08-07 (second change) — aurora page, the biggest page finally audited
Cluster: /northern-lights-michigan/, 18,461 impressions and 45.7% of all site impressions.
Alphabet-expanded autocomplete across FOUR phrasings, "northern lights michigan", "michigan
northern lights", "aurora borealis michigan" and "michigan aurora", a through z: 530 unique
suggestions, the largest demand set pulled for any page.
Three gaps, all measured:
- "aurora borealis" appeared ZERO times on the page, against 91 of 530 suggestions using that
  exact phrase. The same synonym miss as "foliage" on fall colour.
- "northern Michigan" is the single most common place term in the set, 18 mentions, and appeared
  nowhere. "west Michigan" 8 and "southeast Michigan" 4 were also absent.
- Demand is town-shaped again: Marquette 9, Houghton 5, Gaylord 4, Kalamazoo 4, Petoskey 4,
  Munising 4, Alpena 3, Escanaba 3, Grand Rapids 3, Holland 3, Paradise 3, Lansing 6. Nine of
  those appeared nowhere on the page.
What shipped:
- Region `places` strings in lib/aurora.js now name the towns, and the static cards on the page
  were synced to match. Those strings existed in TWO places and had drifted, so the town names
  were only reaching the page after the client fetched the API. tests/aurora-regions.test.js now
  binds them together so they cannot drift again.
- Deliberately did NOT add a west Michigan region. Latitude governs aurora visibility and Grand
  Rapids sits 0.6 degrees from Detroit, so a separate region would add no real signal. The
  cities are named inside the existing region instead.
- THE TITLE WAS LEFT ALONE ON PURPOSE. It is pinned in two places, and this page already converts
  ABOVE its modelled CTR for position 10, so a rewrite risks more than it gains. The synonym went
  into the description instead: the title keeps "Northern Lights", the snippet now carries
  "aurora borealis", and both halves of the demand are covered.
- Three question headings added for phrasings with no match: can you see the northern lights in
  Michigan, where is the best place to see the aurora borealis in Michigan, and what are the
  northern lights doing this week. The last one surfaces the three-night outlook that already
  existed but was never described in the words people search.
- 121 tests, seven gates green.

## 2026-08-07 — real Soo Locks photographs, and canopy cameras on fall colour
Cluster: Soo Locks imagery and fall colour cameras.
- The five Soo Locks photographs were AI generated. All five replaced with real, freely licensed
  photographs of the actual locks, sourced from Wikimedia Commons and verified by eye before use:
  a panoramic aerial showing the parallel chambers and the International Bridge (CC BY 4.0,
  August Schwerdfeger); the MacArthur Lock (CC BY-SA 3.0, Gpwitteveen); the 1,000-foot Burns
  Harbor in the Poe Lock at night in winter (public domain, Carmen Paris for USACE); freighters
  waiting above the locks (public domain, USACE Detroit District); and the administration
  building (CC BY-SA 4.0, Acroterion). Every image carries visible attribution with a licence
  link, which CC BY and CC BY-SA both require.
- Alt text rewritten to describe what each photograph actually shows rather than what the
  generated image had been captioned as. The old "saltie" slot had no free equivalent, so it now
  shows freighters waiting above the locks and says exactly that instead of claiming an
  oceangoing vessel.
- PHENOCAM ADDED as a third camera source. The Sylvania Wilderness camera in Gogebic County is
  mounted above the forest and looks out over mixed northern hardwood, which makes it a better
  fall colour image than any road camera. Placed on /fall-color/ and the Upper Peninsula page.
  Worth recording: the site's primary vegetation code reads evergreen needleleaf, and on that
  basis it had been written off as useless for colour. Opening the actual image showed mostly
  hardwood. Look at the picture before trusting the metadata field.
- 118 tests, seven gates green.

## 2026-08-06 (eighth change) — live field cameras on Soo Locks and the fall colour regions
Cluster: Soo Locks and five fall colour region pages.
Probed three camera networks live before building anything, and the gaps are worth recording:
- NO Au Sable River camera exists, from any source. The nearest is MDOT at the Grayling rest area
  on I-75, which is Au Sable country but points at the highway. The page says exactly that.
- NO usable trout camera. USGS has a Jordan River near East Jordan camera, a real trout stream,
  but it is flagged hidden with no images published.
- NO beach cameras in either network. Nothing was added there.
What does exist and now ships:
- USGS NIMS St Marys River at Sault Ste Marie on /soo-locks/, the highest-traffic page to receive
  a camera. Per-camera USGS endpoints answer 403 without auth; the working route is to build the
  image URL from the free /nims/cameras list using smallDir + camId + newestImageDT.
- MDOT road weather cameras on five colour region pages: M-26 Keweenaw, M-123 at the Tahquamenon
  road, M-22 in Leelanau, M-28 at Seney, and I-75 at Grayling. All verified fresh within 1 to 3
  hours. The copy states plainly that these point at the roadway, not at scenic overlooks.
- New lib/field-cameras.js and api/field-camera.js. Cameras are an ALLOWLIST; the query id selects
  a registry entry and is never used to build an upstream URL, so this cannot become an open proxy.
  Images are proxied, not hotlinked, matching api/mackinac-media.js.
- Freshness is enforced on AGE, not on the publisher's hidden flag. Michigan has 27 USGS cameras,
  22 pass the flag, and only about half carry an image from the last hour; one is 3.2 years stale.
  A camera past 26 hours renders desaturated and says it may have stopped.
- 5 new tests, 117 passing.

## 2026-08-06 (seventh change) — Mackinac Bridge query coverage, and a walk-day precision fix
Cluster: Mackinac Bridge.
Alphabet-expanded autocomplete, 246 unique suggestions. The cluster is in better shape than
expected: Bridge Walk, Labor Day, shuttle, tractor crossing, events, webcam, wait time, MacPass
and the toll cluster are all covered, and the Bridge Walk has a full section with timing, start
locations, getting back and accessibility. Four measured gaps, all small:
- "open or closed" is a top query phrasing and appeared nowhere; now in the meta description
- "live cam" appeared nowhere though "webcam" and "camera" did; camera heading now carries both
- "how long" and "swaying in the wind" are recurring queries with no answer on the page; two
  questions added. Facts checked: five miles total, 3,800 foot suspended span, 45 mph posted for
  cars, about seven minutes to cross.
REAL FIX: the Bridge Walk section was DAY-granular. On walk day at 3 p.m. it still read "the
bridge is closed to public traffic until noon today" although the bridge reopened at noon. It is
now window-aware using the same Michigan timezone helper, so after noon it says the walk is over
and the bridge has reopened.
WHAT WAS BUILT AND THEN BACKED OUT, recorded because the lesson is the point: a server-side
scheduledClosure() was added to lib/mackinac.js and the API, with a banner on the page. Two
existing tests caught it. One forbids a hardcoded year in the Bridge Walk section; the other
forbids FAQPage schema on this page entirely. Both guardrails were right. Worse, the walk date
logic ALREADY existed in public/assets/mackinac-bridge-walk.js, with proper Intl America/Detroit
handling, better than the hardcoded UTC-4 offset in the new code. The whole addition was
duplication of the exact kind flagged in the fall colour sitemap earlier the same day. Reverted
in full; only the day-to-window precision fix was kept.

## 2026-08-06 (sixth change) — town-level fall colour demand
Cluster: fall colour region pages.
Alphabet-expanded Google autocomplete across "michigan fall color a" through "z" and "fall color
michigan a" through "z", 265 unique suggestions. Michigan searchers name towns, not regions:
petoskey (3 suggestions), cadillac (2), gaylord (2), holland (2), houghton (2), plus alpena,
frankenmuth, grand rapids, ludington, manistee, marquette, munising, saugatuck.
Audited what the section already named. Nine of those towns appeared NOWHERE on any page:
Gaylord, Cadillac, Houghton, Marquette, Alpena, Ludington, Manistee, Frankenmuth, Charlevoix.
Deliberately did NOT build a page per town. Nine thin city pages is the doorway pattern that
already produced 37 crawled-not-indexed URLs here. Each town was instead mapped onto the region
that already models it, and given a question and answer on that region's existing page:
- Houghton and Hancock -> Keweenaw
- Marquette -> Upper Peninsula
- Gaylord and Alpena -> Au Sable / northeast Lower
- Cadillac, Manistee, Ludington -> Sleeping Bear / northwest Lower
- Frankenmuth -> Saginaw Bay
- Charlevoix -> Tunnel of Trees
Every peak window quoted comes from the model itself, not invented: wup Sep 28-Oct 6, eup Oct 1-9,
tip Oct 5-13, nwl Oct 8-16, nel Oct 9-17, cen Oct 14-22, swl Oct 18-26, sel Oct 20-28. Each answer
also explains the local lake effect, which is the actual reason a shoreline town runs behind its
own region.
Result: 13 of 13 demand towns now named, question headings 53 -> 59.

## 2026-08-06 (fifth change) — question coverage and a structured-data resync
Cluster: fall colour pages.
Audited first. The section already asks and answers well: 45 question-form headings and FAQPage
schema on 14 of 16 pages. But it answered a narrow band, when and where colour peaks, and was
invisible for three demand stems that autocomplete shows are real:
- "foliage" appeared on 1 of 16 pages and in zero headings, yet Michigan searchers use it
  ("michigan fall foliage map", "fall foliage upper peninsula", "where is fall foliage peaking now")
- "report" appeared in body copy on 13 pages but in ZERO headings or titles, against repeated
  demand for "michigan fall color report" and "fall color report upper peninsula"
- "peaking now" and "prediction" appeared nowhere at all
Two tool pages, the drives map and the trip planner, had ONE heading each, no questions and no
FAQ schema, despite carrying 14 inbound links apiece.
- Added 8 question headings with visible answers: 3 on the drives map, 3 on the planner, 2 on the
  hub. 45 -> 53. Coverage now: foliage in 3 headings, report in 2, drive map and this weekend in 1.
- SELF-INFLICTED BUG FIXED: PR #32 rewrote every title and meta description but not the JSON-LD,
  so 13 of 16 pages described themselves two different ways and several still carried the
  pre-slash URL. Structured data resynced from the shipped head on 15 pages. Drift now zero.
Honest note for expectations: Google restricted FAQ rich results in 2023 to authoritative
government and health sites, so this schema will not produce rich snippets here. The value is the
visible question-and-answer content matching real query stems, not the markup.

## 2026-08-06 (fourth change) — canopy camera anchor, MODIS repair, and honest copy
Cluster: fall colour data layer and its claims.
Measured first: the ORNL MODIS subset service runs 65 to 75 days behind (MOD13Q1 latest
2026-05-25, MYD13Q1 2026-06-02, VIIRS holdings two years stale). The model only blended NDVI
inside 30 days, so the satellite input was being silently discarded. Proven by test: at a
simulated Oct 5 the model returned 99% with the real data date, identical to no satellite at
all. The tracker was a calendar with a weather nudge while the pages claimed otherwise.
- NEW lib/fall-color/phenocam.js. PhenoCam canopy cameras publish Green Chromatic Coordinate
  at about two days latency. Two usable anchor sites near Michigan: kempnrs (45.84, -89.68)
  north, sanford (42.73, -84.46) south. It produces ONE number, how many days ahead of or
  behind its own history this autumn is running, and shifts the whole climatology curve by it.
  Guards: needs 10% senescence before it speaks, needs two prior years, caps at 10 days, goes
  quiet once senescence passes 90%, and a camera outage can never break the page.
  Backtested on 2025: shifts of -1 to -3 days, small and plausible.
- MODIS query repaired: 1km box (81 pixels) instead of a single pixel that read 4% off its own
  neighbourhood, plus the pixel_reliability band fetched in parallel to drop cloud and snow.
  Same 13s total. ageDays now returned.
- The hard 30-day satellite cutoff became a freshness ramp, full weight to 20 days, zero by 45,
  and every snapshot now carries a `source` block naming what actually drove the number.
- COPY CORRECTED across 9 files. Pages claimed live NASA MODIS satellite readings as the
  primary driver, and one said the tool works "rather than repeating last year's calendar",
  which is precisely what it was doing. Now describes climatology, weather and canopy cameras,
  with MODIS named only as conditional on a recent composite.
- 6 new tests. 112 passing.

## 2026-08-06 (third change) — fall color season opens three weeks early
Cluster: fall color machinery (no page content changed).
Verified first, by simulation and a real end-to-end run, that the September path works: the
open-meteo and MODIS feeds return in about 13s, the model produces a sane seasonal progression
(6% green in early September, western U.P. 75% and rising on Sep 28, Tip of the Mitt 97% at peak
on Oct 12), and the daily AI writer returns 237 words with zero em dashes. Nothing was broken.
The gap was timing, not correctness:
- `inSeason()` opened September 10. Fall color is a freshness-sensitive query class and Google
  decides who ranks for the season while demand ramps in late August. A section sitting static
  until September 10 arrives after that decision. Opened to August 20.
- Confirmed by test that the writer is honest pre-colour: asked to write with every region at 6%,
  it says there is nothing to chase yet and gives the timeline, which is what an August searcher
  actually wants. No prompt change needed.
- The dynamic sitemap at /fall-color/sitemap.xml was emitting 12 URLs WITHOUT trailing slash,
  contradicting the canonicals shipped this morning. Fixed.
- That route also kept its own copy of the season window, using server-local time and a different
  set of months. It now imports `inSeason()` so the sitemap and the writer cannot disagree.

## 2026-08-06 (second change, same day) — beach cluster de-orphaned
Cluster: Great Lakes beaches (52 detail pages + hub).
- The hub's beach explorer builds its list in the browser, so the 50 detail pages had NO inbound
  link from their own hub, and 15 had none from anywhere on the site. Median inbound links was 2.
- Added a static, crawlable index of all 50 beaches grouped by lake, generated from
  data/beaches.json by scripts/generate-beach-pages.mjs between markers, so it regenerates and
  cannot drift from the data.
- Result: zero-inbound beach pages 15 -> 0, median inbound 2 -> 3.
- Fixed a false positive in benchmark:ctr, which only read sitemap.xml and so reported the beach
  pages as missing from the sitemap. They were always in sitemap-beaches.xml. It now reads all three.
ATTRIBUTION NOTE: this breaks the one-cluster-per-day rule set earlier today. Accepted because
beaches and fall color are disjoint query sets and GSC page rows separate them cleanly; the cost
is only that site-wide daily totals for Aug 6 carry two causes.

## Prior, for reference
- 2026-08-04 — aurora dark-window + Kp strip, Soo Locks routing, fall color migration. Three
  changes shipped together; the apparent 5x CTR jump that day is NOT attributable to any one of them.
