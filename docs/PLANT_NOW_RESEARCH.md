# What to Plant Now in Michigan: Phase 1 research

**Status:** research complete, **stopped for owner review** before any build. **Recorded:** October 24, 2026.
**Verdict:** **NO-GO as written; conditional GO on a revised design** (section 6). Nothing in Phase 2 should start until the owner decides the three questions at the end.

## 0. What I could and could not read

MSU Extension's site (`canr.msu.edu`, and its `bluedynamo.msu.edu` mirror) refuses automated fetching: every request from this session returned a bot-protection page or a robots refusal. No browser was connected to this session to read them as a person would. So:

- **Read in full:** MSU's archived bulletin E-1769 *Planning a Vegetable Garden* (1985, MSU Library copy), MSU's *How to Plant Vegetables* tip sheet (2009, via a mirror that served it), an MSU Extension Master Gardener answer on Ask Extension (2017), NWS Gaylord's spring freeze page, the PRISM/OSU hardiness-zone data page, and the live `/national-tools/planting/` tool.
- **Found but not readable from here:** MSU's 2020s frost-free date table PDF, the *Michigan Fresh* crop bulletins (E3174 *Growing Tomatoes*, E3176 *Starting Seeds* and siblings), the *Upper Peninsula Gardening Calendar*, *Garden Planning Calendar*, *Planting a Smart Vegetable Garden*, and MSU news pieces such as *October is garlic planting time*. Their titles and URLs are listed in section 1 so they can be read in a browser and added to the record.

Everything below is labelled with which of those two groups it comes from. Nothing here is taken from a source I could not read.

## 1. Crop database sources

| Source | Covers | Zone-specific? | Status | Reuse |
|---|---|---|---|---|
| **MSU E-1769 *Planning a Vegetable Garden*** (J. Lee Taylor, 1985), [MSU Library archive](https://sanweb.lib.msu.edu/DMC/extension_publications/e1769/e1769-1985.pdf) | Table 6: field planting windows, weeks seed-to-transplant, days to maturity for ~40 crops. Tables 2 and 3: spring and fall 32°F probabilities (5 to 95%) for ~85 to 90 stations | **No.** Calendar windows for southern Michigan; "northern plantings should be 1 to 3 weeks later" | Read. Archive copy marked **not for current recommendations**. Parts of the scanned table are garbled (the snap bean row reads Apr 20 to Jun 30, which is not credible for a frost-tender crop) | No license stated; MSU educational publication. Cite, do not republish tables |
| **MSU *How to Plant Vegetables*** (Taylor, adapted Voyle, rev. Hahn, Whitlock, Wilson; updated 4/29/2009), [MSU PDF](https://www.canr.msu.edu/uploads/resources/pdfs/plantingveg.pdf) | Rules, not a chart: hardy cool-season crops go in "as soon as the ground can be worked", late March or early April in southern Michigan and 1 to 3 weeks later north; warm-season crops wait until frost danger has passed; start transplants about 6 to 8 weeks before setting out | **No.** South vs north only | Read | No license; "for educational purposes only" |
| **MSU Extension Master Gardener answer**, [Ask Extension #388149](https://ask.extension.org/kb/faq.php?id=388149) (2017) | Warm-season crops started 4 to 10 weeks before last frost; kohlrabi 6 weeks; onion sets when the ground can be worked | No | Read | Q&A, cite only |
| **MSU *Michigan Fresh: Growing Tomatoes*** (E3174), [MSU](https://www.canr.msu.edu/resources/michigan_fresh_growing_tomatoes); **E3176 *Starting Seeds***, [MSU](https://www.canr.msu.edu/resources/michigan_fresh_starting_seeds); sibling crop bulletins | Per-crop growing guidance; likely the best current MSU timing source | Unknown | **Not readable from here** | Unknown until read |
| **MSU *Upper Peninsula Gardening Calendar***, [MSU](https://www.canr.msu.edu/resources/upper-peninsula-michigan-gardening-calendar); **MSU *Garden Planning Calendar***, [MSU](https://www.canr.msu.edu/resources/garden_planning_calendar) | Month-by-month tasks; the UP one is the only regional calendar found | Region (UP) | **Not readable from here** | Unknown until read |
| **MSU garlic articles**, e.g. [October is garlic planting time](https://www.canr.msu.edu/news/october_is_garlic_planting_time) | Fall garlic timing | Unknown | Title only | Unknown |
| National tool's sources (UMN, Illinois, Penn State, Colorado State, Arizona, Oregon State, Nebraska), as cited on `/national-tools/planting/` | Frost-relative crop timing | No | Not Michigan; excluded by the brief's no-borrowing rule unless the owner allows frost-relative offsets (question 2) | Varies |

**Finding:** no MSU or other Michigan land-grant source found in this pass publishes **crop-by-zone dated windows**. MSU publishes rules relative to frost ("6 to 8 weeks before", "after danger of frost", "as soon as the ground can be worked") plus one archived south-of-state calendar with a north offset.

## 2. Frost data already on the site

| Dataset | Where | What it holds | Source | Problems |
|---|---|---|---|---|
| **78-station spring table** | `/michigan-frost-dates/`, now also `public/assets/garden-tools/michigan-frost.js` (one shared copy since #1153) | 75, 50 and 25 percent dates and latest freeze on record for 78 stations | Michigan State Climatologist via MSU Extension, per the page | Period of record not stated on the page. I could not re-check the values against the MSU PDF (blocked). Spot check against NWS Gaylord (1981 to 2010 averages): Traverse City May 23 vs NWS May 17, Sault Ste. Marie May 22 vs May 23, broadly consistent |
| **Fall dates, 42 published rows** | `/michigan-frost-dates/` fall table | Typical first fall frost, 42 cities | "Typical medians drawn from the 1991 to 2020 NOAA climate normals" | Medians only, no probabilities |
| **Fall dates for the other 36 stations** | `michigan-frost.js` `ff` field (inherited from the planting calendar's data) | One date per station | **Not published anywhere on the site.** Adrian, Allegan, Alma, Alpena WSO, Atlanta, Bloomingdale, Caro, Charlotte, Chatham, Coldwater, East Jordan, Eau Claire, Fayette, Fife Lake, Frankfort, Grand Marais, Greenville, Gull Lake, Hale Loud Dam, Harbor Beach, Harrisville, Hart, Hastings, Hillsdale, Ishpeming, Lake City, Lapeer, Manistee, Milford, Mio, Newaygo, Onaway, Owosso, Paw Paw, Three Rivers, Willis | **Provenance unknown.** Under the brief's rules these 36 are NOT REPORTED until sourced |
| **Second, conflicting table** | `/michigan-last-spring-freeze/` | 50% and "safe transplant (10%)" dates and a zone for 11 cities | Not stated | **Conflicts with the 78-station table**: Traverse City Apr 28 (vs May 23, and NWS May 17), Detroit Apr 14 (vs Apr 24 city / May 3 metro), Bay City May 4 (vs May 2), Sault May 25 (vs May 22). The engine must not use it, and the page should be corrected or retired separately |

**Coverage gaps:** all 78 stations have spring data. Fall data is published for 42, unsourced for 36. No station has a 10 percent (or 90 percent) spring date in our copy, so "safe in 9 springs of 10" cannot be said without the source PDF.

## 3. Launch crop set and decision windows

Windows the engine needs: start indoors, transplant out, direct sow, succession sow, harvest. "Read" means a Michigan source I read supports it; "rule" means MSU gives a frost-relative rule, not a date.

| Crop | Start indoors | Transplant out | Direct sow | Succession | Harvest | Zone-dependent? |
|---|---|---|---|---|---|---|
| Tomato | Rule: 6 to 8 wk (2009 sheet), 4 to 10 wk (MG answer) | Rule: after frost danger; E-1769 south May 20 to Jun 1 (archived) | n/a | n/a | E-1769 days to maturity (archived, partly garbled) | Via frost date only |
| Pepper | Rule as tomato | E-1769 south May 20 to Jun 1 (archived) | n/a | n/a | Archived | Via frost date |
| Cucumber | Rule: 4 to 10 wk (MG answer) | Rule: after frost | E-1769 south May 20 to Jun 20 (archived) | Not reported | Archived | Via frost date |
| Snap bean | n/a | n/a | **E-1769 row garbled**; rule: after frost | Not reported | Archived | Via frost date |
| Squash (summer, winter) | Not reported | Rule: after frost | E-1769 south May 20 to Jun 1 (archived) | Not reported | Archived | Via frost date |
| Lettuce and greens | Not reported | Not reported | Rule: as soon as ground can be worked; E-1769 south Apr 1 to Jul 15 (archived) | Window implied by E-1769, interval not reported | Archived | South vs north offset |
| Carrot | n/a | n/a | E-1769 south Apr 1 to Jul 1 (archived) | Not reported | Archived | South vs north |
| Potato | n/a | n/a | E-1769 south Apr 20 to Jun 1 (archived) | n/a | Archived | South vs north |
| Onion | Not reported | E-1769 Apr 1 to May 1 (archived) | Sets: as soon as ground can be worked (MG answer) | n/a | Archived | South vs north |
| Garlic | n/a | n/a | **Conflict:** E-1769 says Apr 1 to 20 (spring); current MSU news titles say October. Needs the current article read | n/a | Not reported | Unknown |
| Basil | **Not reported** in any Michigan source read | Not reported | Not reported | Not reported | Not reported | n/a |
| Cilantro | **Not reported** | Not reported | Not reported | Not reported | Not reported | n/a |

## 4. Zone model

**Recommendation: do not key the engine on hardiness zones.** Zones describe winter lows, not frost dates; MSU's own guidance and every tool on this site anchor planting to frost dates. Two Michigan places in the same zone can be weeks apart (Detroit city Apr 24 vs Detroit Metro May 3, both southeast). Use **location → nearest frost station → that station's frost dates**, and show the zone as information only.

- **Location to station:** needs station coordinates (NOAA COOP station metadata, public domain) and a ZIP centroid table (Census ZCTA gazetteer, public domain), then nearest station within a distance cap, with the distance shown. Above the cap, say the nearest station is too far to be honest.
- **Zone display:** PRISM/OSU publish 2023 zones by ZIP as CSV ([PRISM PHZM](https://prism.oregonstate.edu/phzm)); free to reproduce and redistribute, with USDA-ARS and OSU logos required only on derived maps. Preferred citation: *USDA Plant Hardiness Zone Map, 2023, ARS, USDA*.
- **Thin areas:** the 36 stations without published fall dates (section 2). The Upper Peninsula has 13 stations but its regional calendar is unread. Spring data has no gaps.

## 5. Honesty rules for the build

Same pattern as `lib/michigan-ski/` (a field is `null` and labelled when unverified, a status names what is missing, a disclosure says what the timestamp does and does not mean):

1. A window is shown only if a cited Michigan source states it, either as dates or as a rule applied to the station's frost date (the rule and the frost date are both shown). Otherwise **NOT REPORTED**, and the crop drops out of "do this week".
2. No interpolation between stations, no smoothing, no borrowing from another state. The frost-risk curve on `/michigan-frost-dates/` is interpolated between published points; the engine must not reuse it for statuses.
3. Archived sources (E-1769) may be used only if the owner accepts them (question 1), and every window from them says "MSU 1985, archived".
4. The 36 unsourced fall dates and `/michigan-last-spring-freeze/` are excluded until sourced.
5. **Existing debt, disclosed:** the planting calendar's crop offsets (47 crops, including the "this week" list made live in #1153) were already on the page before today as "standard horticultural timing" with no per-crop citation. They fail rule 1. The engine should replace them, not inherit them.

## 6. Go / No-go

**NO-GO for the brief as written.** It asks for crop-by-zone dated windows for 12 crops across zones 4b to 6b from MSU or Michigan extension sources. Those do not exist in anything I could read: MSU publishes frost-relative rules and one archived southern calendar. Basil and cilantro have no Michigan source at all. 36 of 78 stations lack a sourced fall date, and the current MSU documents could not be read from this session.

**Conditional GO on a revised design**, if the owner agrees:

- **Station-based, rule-based windows:** each window is a cited MSU rule applied to the visitor's station frost date (for example "transplant tomatoes after the 25 percent date"), never a zone table.
- **A source pack is read first:** E3174, E3176 and the other *Michigan Fresh* crop bulletins, the UP calendar, the current frost table PDF and the garlic article, read in a browser or attached as PDFs, so each rule cites a page.
- **Launch with what is sourced:** crops without a source launch as NOT REPORTED. Basil and cilantro stay off unless a Michigan source turns up.

**Coverage the build would implement** (subject to the source pack):

| | 78 stations, spring | 42 stations, fall | 36 stations, fall |
|---|---|---|---|
| Tomato, pepper, cucumber, squash, bean (after-frost rules) | Yes | Harvest and season end: yes | Harvest and season end: NOT REPORTED |
| Lettuce, carrot, potato, onion (ground-workable rules) | Only if a source defines "workable" in dates or soil temperature; otherwise NOT REPORTED | Fall sowing: needs source | NOT REPORTED |
| Garlic | Pending the current MSU article | Pending | NOT REPORTED |
| Basil, cilantro | NOT REPORTED | NOT REPORTED | NOT REPORTED |

## 7. Conflicts with what already exists

- **`/national-tools/planting/` already answers "What can I plant now?"** for any US city or ZIP, Michigan included, with NWS weather and NOAA 1991 to 2020 normals. It is owned by `izworskic/national-planting` (AGENTS.md section 0). A Michigan hub engine on the same question needs a stated difference (MSU station data and MSU rules) and cross-links, or it will compete with our own page.
- **`garden.chrisizworski.com` Garden Planner** is BUILD_NEXT in the authority portfolio and launch-blocked. It overlaps in purpose.
- **Linking the national gardening pages back to the hub** (garlic, cover crops, harden off, soil temperature, spring bulbs, tomato ripening, cover plants tonight) has to happen in `izworskic/national-planting` and `national-frost`, not in this repo's mirror. Links from the hub to them can be added here.

## Decisions for the owner

1. **Archived source:** may E-1769 (1985, marked not for current use) supply windows, clearly labelled, until current MSU bulletins are read? Yes or no.
2. **Frost-relative rules from nearby land-grants:** may Great Lakes land-grant rules (Minnesota, Wisconsin, Purdue, Ohio State) be used when MSU is silent, labelled by source? The brief says no borrowing; that excludes basil and cilantro and likely succession intervals.
3. **Relationship to `/national-tools/planting/`:** build a separate Michigan engine on the hub, or put a Michigan-station front end on the hub that hands off to the national engine? Either way the cross-links are needed.

**One next action:** read the MSU source pack in a browser (or attach the PDFs) and record each crop rule with its page, then revisit this verdict.
