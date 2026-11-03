# Seasonal discovery for Tools and Guides

Owner: izworskic/chrisizworski-com. Canonicals: /tools/ and /guides/.
Reviewed November 3, 2026. This is an editorial discovery layer, not a forecast.

## Visitor decision and baseline

“Which of Chris's tools or guides is worth opening at this time of year?”
The tools directory already has 90 month-tagged cards, an opt-in season filter,
a static field-guide shelf and a separate live weekly evidence board. The Guides
directory has seasonal badges but mixes season-specific and year-round entries.
Neither offers a compact, varied shortlist that changes with the calendar and
explains why each choice is relevant. Analytics/task-completion baseline was not
available. Main's Agent branch verification run 41700775737 passed on
322286c432b128e85549070744fc42ca5ba3cbe7 before implementation.

## Concepts and runtime choice

A: Reorder the entire directory automatically. Rejected: visitors lose familiar
category positions, a long collection still overwhelms, and client reordering
could disagree with the existing ItemList.

B: A six-pick editorial field desk before the full collection, with a native
month selector and “Back to this month.” Selected: gives a usable next action,
supports planning ahead, preserves every existing category and source board.

JavaScript-only ranking would be sufficient for simple month comparisons.
Offline Python was selected for reconciling two catalogs, canonical deduplication,
constraint validation and reproducible twelve-month QA. It emits a committed
22.6 KB artifact. Browser JavaScript only selects and renders an already ranked
month. A live Python endpoint would add cost and latency with no visitor benefit.
No new runtime service, database, provider request, cron or scheduled build.

## Evidence and limits

Inputs: public/tools/index.html and public/guides/index.html, existing directory
titles, URLs and calendar tags; original editorial windows and prose in
data/seasonal-discovery-editorial.json. These are site-owned editorial inputs,
not licensed third-party observations. The reviewed date is editorial provenance,
not an “updated live” timestamp. Months mean relevance to planning, never legal
operating dates, actual blooms, snow cover, sightings, traffic or safety.

Each chosen URL must exist in the source catalog. Duplicate canonical URLs are
collapsed. Invalid month windows or missing editorial destinations stop artifact
generation; missing/invalid browser data retain four useful HTML starting links.
Season tags and live tool logic are untouched. Future live boosts need their own
source-age contracts and are deliberately outside this release.

Ranking: current month gets 60 ordering points; next month 38; narrow seasonal
windows add up to 18; reviewed specific prose adds 12. Weights are editorial
priorities, not measured relevance, forecast skill or visitor-visible confidence.
Each month has six unique URLs, at least two tools and two guides, at least three
topics, at most two from any topic, and one upcoming pick when capacity allows.
The default clock uses America/Detroit, independent of the visitor's device zone.
The artifact is annual and includes all months; there is no expiring year stamp.

## Research and distinctiveness

External examples checked November 3, 2026 through public page text, not a full
interactive audit:

| Example | Mechanism used | Limit |
| --- | --- | --- |
| https://www.michigan.org/seasons | Organize discovery around changing seasonal interests | No copied assets/prose; seasonal inspiration is not current conditions |
| https://www.nps.gov/subjects/watchingwildlife/index.htm | Offer a clear next action while retaining responsible viewing context | Not an NPS affiliation, access determination or sighting feed |

Closest site surfaces compared from source: existing /tools/#this-week and
/michigan-destinations/ (directory entries describing destination matching).
This desk differs in decision (which specialist to open rather than whether to
go), hierarchy (six cross-topic editorial links rather than live verdicts or a
destination map), and interaction (month planning rather than location or live
evidence selection). Sand and ink editorial typography supports an almanac,
without cloning park maps, photographs or weather dashboards. Shared quality:
native controls, explicit evidence boundaries, readable text and useful fallbacks.
Patterns P01/P06; avoid A01/A04/A07. No map, imagery or motion is needed.

## Connected state and test matrix

Stable selection is month 1..12; each pick also has a stable canonical-derived ID.
Heading, introduction, list, selected native option, reset visibility and status
must agree. Selection is ephemeral; no location, profile or storage is requested.

| Scenario | Expected answer | Verification |
| --- | --- | --- |
| Initial load | Detroit current-month editorial shortlist | Shipped UI script unit test; browser pending |
| January to July | Winter picks become summer garden/shore/trip picks | Actual catalog + UI harness PASS |
| July to January | Original IDs, links and descriptions return | UI harness PASS |
| Reset | Current month, hidden reset, focus returned to month selector | UI harness PASS |
| December to January | January planning candidates appear as upcoming in December | Python rollover PASS |
| No JavaScript | Four dated-neutral useful links, full existing directory | HTML contract PASS; browser pending |
| Missing/corrupt data | Keep static links and controls hidden; invalid later plan restores prior selector | UI harness PASS |
| Images/tiles unavailable | New desk has neither dependency; existing surfaces unaffected | Architectural N/A |

## Acceptance, operations and measurement

Python tests cover all twelve months, diversity, URL uniqueness, missing catalog
targets, malformed month windows, rollover and representative seasonal choices.
Node tests execute the shipped data and UI scripts and check fallback, selection,
reversal, reset, unsafe URLs and static contracts. Artifact drift is checked by
the normal npm test gate. Regenerate with:

    python3 scripts/build-seasonal-discovery.py

No daily rebuild is necessary. Existing catalog generators can add links without
deleting this independent section; checked artifact generation prevents silent
changes to recommendation inputs. Existing canonical titles, Person graph,
ItemList order, ads and analytics are preserved. No content or links removed.
Rollback: revert this PR; the existing full directory and live board remain.

Full repo gate, actual browser widths and deployment status are recorded in
seasonal-discovery.release.json and the PR. Unmeasured items remain unverified.
Search effects and click-through improvement are hypotheses, not results.
Observe comparable 28-day windows after release, accounting for seasonality.

Transferable lesson: reserve room for both tools and guides before filling a
seasonal shortlist. Unconstrained sorting produced an unhelpful run of similar
winter topics; kind quotas and a topic cap are now tested invariants.

## Rendered review correction

The first actual browser run passed functional checks, but its 390px report
placed the Guides desk at 1,589px below the document start. The long introduction
and collection navigation were responsible. They now follow the recommendations,
without removing their content or links. The Guides heading stays first. Browser
acceptance now rejects a Guides desk below 1,000px; the existing site masthead is
preserved. Prior screenshots showed readable 14px prose, 44px controls and no desk
overflow at all four widths. Final layout QA is linked in PR #1480 checks.

The generic release-record --check-site audit is inapplicable to an existing hub:
it expects a new tool card, own-canonical ItemList node and tool-registry entry.
This release creates no tool or canonical route. Existing hub/catalog invariants
are instead verified by the full gate, unchanged 90/66 card counts and structured
data checks. The ordinary release-record structure checker passes.
