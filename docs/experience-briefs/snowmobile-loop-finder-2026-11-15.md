# Experience brief: Michigan snowmobile loop finder

- Date / owner: November 15, 2026. Chris Izworski approved the build in chat ("Yes. Build it").
- Owning repository / canonical URLs: `izworskic/chrisizworski-com`, the seven existing pages under `/snowmobile/regions/`. Base commit `8b8681c`.
- Scope: a new interaction inside the existing "Plan your trail route" panel. No new URL, sitemap entry, Tools card, Vercel function, dependency, ad or schema change.
- Non-goals: turn-by-turn navigation, parking-to-trail connectors, cross-region loops, any claim about snow, grooming or permission to ride.
- Research last checked: November 15, 2026.
- Baseline: the planner routes between 2 to 12 junctions the rider picks, with a "Return to start" button that closes a hand-built route. A rider who knows how far they want to ride, but not which junctions make a loop of that length, has to guess stops and rebuild.
- Connected interaction contract: applies. State matrix is section 5.

## 1. Visitor question and decisive action

A rider staging from one place asks: "What can I ride from here that is about 60 miles and brings me back to the trailer?" The first useful answer is a short list of closed rides with their real mileage, how far each is from the requested length, and how much trail is ridden twice. This site can answer it because it already holds the closure-filtered official DNR trail graph and a tested router.

## 2. Inputs, evidence and data contracts

| Input or displayed claim | Source and rights | Kind | Time and valid age | Unavailable behavior |
| --- | --- | --- | --- | --- |
| Trail geometry, trail numbers, junctions | Michigan DNR designated snowmobile trail layer, already loaded by `/api/snowmobile` | Official mapped geometry | `generatedAt` of the region bundle, 5 minute cache | Loop search disabled, DNR map link remains |
| Closed segments | DNR closure feed and status, via `buildTrailGraph` | Official status | Same bundle; page shows whether the closure feed was verified | Unverified closure state is stated in the result and in the GPX |
| Ride length | Rider input, whole miles 5 to 300 | Preference | n/a | Out-of-range input cannot search |
| Loop mileage and repeated miles | Sum of official line-part lengths, recomputed in JavaScript for every option | Measured on mapped geometry | Same bundle | An option that cannot be proved is not shown |
| Ride time | Distance at the existing assumed 30 mph | Labeled estimate | n/a | Always labeled as assumed |

## 3. Outside references

| Reference, checked Nov 15 2026 | What the user can do | Lesson | Not copied or assumed |
| --- | --- | --- | --- |
| Garmin "Creating a Round-Trip Course" manual, https://www8.garmin.com/manuals/webhelp/fenix66s6xpro/EN-US/GUID-D39D8539-1FE6-492E-B9F2-7B71DA432E8E.html | Enter a total distance and a heading; the device offers up to three courses to choose from | Distance-first input and a small set of options to compare is an established pattern | No heading input (trail networks are too sparse for it to help), no Garmin UI or routing data |
| Polaris RIDE COMMAND ride planning help, https://www.polaris.com/en-us/off-road/owner-resources/help-center/article/KA-02234/ | Drop waypoints that snap to trail and drag the line to change the path | Waypoint planning is what this page already does; the gap is the rider who has a distance, not waypoints | No account, no proprietary trail data, no snap-anywhere points (junctions only) |

Counterexample: a generic "round trip" that happily returns an out-and-back and calls it a loop. Here an out-and-back is always labeled as one, and a ride that repeats more than 30% of its length is never called a loop.

## 4. Two concepts

- Concept A, separate loop page: its own URL with a map and a distance slider. Rejected: it would be a second canonical for the same intent, duplicate the map and junction data, and need its own Tools card, sitemap and registry work for no added decision.
- Concept B, collapsed panel inside the existing planner (selected): "Find a loop of a set length" sits above the map it draws on. One start junction, one length, up to three loops plus one out-and-back as a radio group. The chosen option uses the same map line, result block and GPX export as a hand-built route, so there is only ever one plan on screen.

### Originality review

- Closest existing tools: the stop-by-stop planner on the same page, and the Petoskey wine loop planner (`/petoskey-wine/`), which orders rider-chosen stops on roads.
- Reused on purpose: junction search, map, result block, evidence wording, GPX export, closure rules.
- Material differences: (1) the decision is distance-first, with the planner choosing the junctions; (2) the answer is a comparison of rides by mileage gap and repeated trail, a measure no other tool on the site shows; (3) the interaction is a radio group that redraws one shared plan, not an accumulating stop list.
- Gate result: PASS as an addition to an existing tool. It adds a new decision without cloning a layout.

## 5. Interaction contract and state matrix

| Action (keyboard equivalent) | What changes | Shared state | Failure behavior | Test |
| --- | --- | --- | --- | --- |
| Open the panel (Enter or Space on the summary) | Controls appear | Native `details` | Works with no JavaScript; `noscript` links the DNR map | Browser script, no-JS context |
| Search and choose a start (type, Tab, Enter) | Start line shows the junction label | Junction id from the route API | Any earlier loops and any in-flight search are retired | Browser script, stale reply case |
| Set miles (type, or preset buttons) | Preset shows pressed; Find loops enables | Input value | Out of range disables search | Unit and browser |
| Find loops | Options listed; first is drawn | Option ids within one reply | Closed segment in reply, failed request or timeout shows a reason and no options | Browser script |
| Choose an option (click, arrow keys) | Map line, detail, export all follow the checked option | Selected option id | A, B, A restores the first plan exactly | Browser script |
| Start the stop-by-stop planner | Loop is deselected, result and export cleared | One shared plan | No stale GPX | Browser script |

## 6. Composition

- Phone (360 and 390 px): collapsed one-line summary above the map; opened, the fields stack, buttons are full width, options are one column. All targets are at least 44 px.
- 768 px and desktop: start and length side by side; options in a row.
- Map: existing OpenStreetMap tiles and attribution. With tiles or Leaflet missing, the options, mileage and GPX still work.
- No photography, no motion. Scrolling to the map after a choice respects reduced motion.

## 7. Technical decision

- Search runs in the existing `/api/snowmobile-route` function (`loop=lat,lon&miles=N`), so no new function and the same 5 minute region cache.
- The solver lives in the existing Rust module (`rust/snowmobile-routing`, new `sm_loops` export, existing ABI untouched) with an identical JavaScript implementation as fallback and parity reference. Whichever engine proposes rides, JavaScript re-proves every walk against the closure-filtered graph and recomputes every distance.
- Compared with keeping JavaScript only: on live data the Rust proposals take about 30% less time than the JavaScript search, but graph building dominates and whole requests are 3 to 11 ms either way. Rust is kept for consistency with the existing router, not because the speed is needed.
- Python was considered for precomputing a graph and rejected: routes must use the live closure-filtered graph, so a committed graph would go stale.
- The compiled module grows from 14,953 to 35,706 bytes.

## 8. What the search can and cannot do (measured November 15, 2026)

The search builds rides from shortest-path legs (start to A, A to B, B to start, plus one circuit per off-tree trail part). It is bounded, not exhaustive.

Tested from 180 to 198 sampled junctions per region at 30, 60 and 100 miles, on the full mapped network with seasonal closure flags ignored (test only): the best loop was within 15% of the requested length in 31% to 59% of samples depending on region, and a loop was offered in 58% to 100%. Where no loop fits, the page says so and offers the out-and-back. These are properties of the trail network and the bounded search, and the interface reports the real mileage instead of rounding to the request.

Observed while testing, not changed here: the live off-season bundle marks 22 to 291 segments per region as legally closed with DNR status "Open". The loop finder respects that flag like the router does, so off-season loop choices are thinner than they will be if those flags clear in season. Worth a separate look at the closure matching.

## 9. Acceptance

- `node --test tests/snowmobile-loops.test.js`: square loop, lollipop, tree network, closed segments in both engines, Rust and JavaScript parity on fixture and 150 random graphs, walk re-proof, API validation, browser helper fail-closed cases, GPX export, generated pages.
- `scripts/verify-snowmobile-loop-browser.cjs`: real Chrome at 360, 390, 768 and 1440 px plus a no-JavaScript context. Also run once against a saved production Keweenaw bundle with the real map; screenshots inspected.
- Scorecard and release stages are recorded in the pull request. Production deploy and visitor outcomes are NOT VERIFIED until after merge.

Transferable lesson: when two engines must agree exactly, give both the same integer graph and a total ordering for every tie, then test equality of raw output rather than "close enough" mileage.
