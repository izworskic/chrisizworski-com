# Michigan Seasonal Field Desk

> Repository-internal release brief. This is not public site content.

## Outcome

Fall color, Michigan Ice, and Northern Michigan XC Skiing should feel like three editions of the same Michigan field desk: grounded, useful, restrained, and written by someone who actually knows the place. They should not look identical. The shared system is the decision rhythm:

1. Say what the season is doing without overstating the data.
2. Let the visitor declare what kind of outing they are planning.
3. Put the useful result before the directory or long explanation.
4. Hand off to the next relevant seasonal tool after the answer.

The visual language deliberately avoids generic dashboard gloss. It uses paper-like surfaces, strong local color, serif display type, compact field labels, generous whitespace, and one decisive accent. Fall is warm and photographic. Ice is sober and reportorial. XC is crisp and Nordic.

## The three people we are designing for

| Tool | Primary person | Their first question | First action | Trust boundary |
| --- | --- | --- | --- | --- |
| Fall color | A mobile weekend color chaser | “Where should I go on my dates?” | Nearby color, date-ranked regions, or a named drive | Live canopy and weather refine normal peak windows; they do not promise color at one tree |
| Michigan Ice | A cautious angler screening a drive | “Has it been cold enough at my water?” | Choose one water or read the statewide signal | Weather and lake-wide satellite data never establish safety underfoot |
| XC skiing | A Saturday skier, often without current grooming knowledge | “Which suitable trail has the best snow signal?” | Snow map, rentals, or groomed-center filter | Modeled snow depth is not an operator grooming report |

Secondary people remain supported: photographers and paddlers on Fall; newcomers reading Michigan DNR guidance on Ice; skate skiers, night skiers, and backcountry skiers on XC.

## Implemented release layer

The shared component lives in `public/assets/seasonal-field-desk.css` and `public/assets/seasonal-field-desk.js`.

- Fall keeps its title, description, canonical, H1, first answer, live map, and all active guide content. It gains three immediate outing paths, accessible tab state, privacy-safe decision events, and the seasonal handoff.
- Michigan Ice keeps its safety language and every factual limitation. The safety boundary remains directly below the first answer. The current read moves ahead of the statistics and long explanation, and six water links become immediately scannable.
- Every Ice page gets the same season handoff, so a useful visit does not end at a footer full of unrelated links.
- The XC source is not present in this repository, the connected GitHub repositories, or the connected Vercel project list. `scripts/seasonal/inject-xcski-field-desk.mjs` is a fail-closed, non-overwriting source adapter. It has been tested against the current live HTML and is ready to run when the owning source is available. It adds the same design assets, three skiing decisions, existing-filter wiring, analytics, and the seasonal handoff without changing the XC title, description, H1, schema, trail facts, or snow model.

## Measurement contract

The shared script records only controlled labels. It never records coordinates, typed locations, destination URLs, or weather values.

- `Seasonal Module View` supplies a denominator for each decision surface.
- `Seasonal Decision` distinguishes tool, persona, action, and placement.
- `Seasonal Selection` records only a fixed coarse-region slug.
- `Seasonal Tool Open` measures movement among Fall, XC, and Ice.

The release is successful when, after a complete comparable window:

- at least 12% of decision-module viewers take a primary seasonal action;
- at least 3% open another seasonal tool;
- Fall hub CTR reaches at least 3.0% after 500 comparable impressions, without a material position loss;
- qualified impressions increase at least 20% versus the prior comparable 28 days;
- Ice and XC search CTR are not judged until each surface has at least 250 impressions;
- p75 Core Web Vitals remain green: LCP at or below 2.5 seconds, INP at or below 200 milliseconds, and CLS at or below 0.1.

These are internal decision thresholds, not traffic or revenue promises. Search Console clicks are not pageviews, and no ad-revenue conclusion follows from them.

## Growth logic

The design does not manufacture impressions by itself. It makes the existing pages more useful enough to earn the behaviors that can support growth:

- Persona choices expose descriptive, crawlable links into the strongest Fall and Ice subpages.
- The mobile visitor reaches a useful decision before the long directory, reducing pogo-back risk.
- Cross-season handoffs give a Fall visitor an owned winter destination and give winter visitors a reason to remain in Chris's field-tool network.
- Meaningful action events reveal which intent deserves the next search landing page or tool improvement, instead of guessing from pageviews alone.
- Search-facing winners and active experiment surfaces stay frozen, so the engagement release does not erase the existing CTR evidence.

No ad, affiliate, or sponsor block belongs above the first useful result. A contextual field-kit module can follow a result later, after measured use proves the right persona and placement.

## Stop-loss and rollback

Roll back the affected surface if any of the following occurs:

- the frozen Fall search surface, Ice safety language, canonical, schema, or indexability changes;
- exact location data enters analytics or storage;
- the Ice page implies safety, or XC equates modeled snow with grooming;
- a decision surface records fewer than 5 actions after 500 module views;
- CTR falls by 20% or more after at least 500 comparable impressions while average position is stable;
- any p75 Core Web Vital leaves the green range for seven consecutive days.

The CSS, script, and markup blocks are isolated and reversible. The XC adapter never overwrites its input file.

## Release sequence

1. Review Fall and Ice on the Vercel PR preview at desktop and 390-pixel mobile width.
2. Confirm the frozen search-surface tests and full repository gate remain green.
3. Merge only after owner approval.
4. Obtain or connect the owning XC source, run the adapter to a separate output file, inspect the diff, and deploy it through its existing project.
5. Begin the 28-day UX measurement window the day after each production release. Keep the Tunnel of Trees and Aurora search windows unchanged.

Search evidence is recorded in `benchmarks/seasonal-field-desk.json` from the [August 15 Search Console export](https://docs.google.com/spreadsheets/d/1UTJHLaV2vPnETwbhDxPhSDkUV5o4GYvs1lY-VZe2v64/edit).
