# Michigan gardening hub: a value function for each section

**Owner:** `public/michigan-gardening/index.html` · **Gate:** `npm run benchmark:hub-features` · **Recorded:** October 24, 2026

Each section of the hub scores 0 to 100. Interactive sections run the page's own scripts in `scripts/lib/garden-tool-harness.mjs` on fixed dates (nine dates through the year, three places). Static sections are checked against the pages and data they describe, so a guide card cannot claim what its page no longer says. **Gate:** every section at least 90 and the mean at least 95. Automated proxy, **not** human usability research.

## Scores, same gate, before and after

"Before" is `main` at 8192319d (the hub as merged an hour earlier).

| Section | Criteria (weight) | Before | After |
|---|---|---:|---:|
| Search surface | Query-first title, 60 characters or fewer, matching the H1 (25); Description 158 characters or fewer and about this week's planting (20); Canonical and the Person node (20); The lede says how the answer is made (20); No em dashes (15) | 100 | 100 |
| Location | ZIPs and towns resolve to the nearest station (25); An unknown place gets a plain message and keeps the last answer (25); Distance to the station is stated when it is not in town (20); The choice is remembered, safely (15); Labelled field with town suggestions (15) | 100 | 100 |
| This week | An answer naming the station on every date and place (20); Every answer gives a date or a job to do (20); No jargon or broken text (20); Reads at grade 9 or below (15); The status region speaks the answer (15); Answer card sits right after the place picker (10) | 100 | 100 |
| Make it fit | "Can you work the soil?" turns hardy crops into plant now (35); Soil temperature gates the warm-season and root crops (35); Labelled, keyboard reachable controls (30) | 65 | 100 |
| Season chart | One row per crop with dated windows (30); Redraws for another station (30); Legend and today marker (20); Text alternative and the open-ended bars explained (20) | 100 | 100 |
| Crop table | One row per crop, status matching the engine (30); Not reported rows give the reason and no dates (30); Every other row cites its MSU rule (25); Readable on a phone (scrolls inside its box) (15) | 100 | 100 |
| Station facts | Facts equal the station table (60); An unpublished fall date says not reported (40) | 100 | 100 |
| Sources and honesty | Each rule is quoted with its source (35); MSU sources linked on the page itself (25); The 1-in-4 reading, the July boundary and no borrowing are disclosed (25); Harvest timing said to be not reported (15) | 100 | 100 |
| Take it with you | A copied link reopens the same answer (40); Calendar file with one event per dated window (40); Hand-off to the national planting tool (20) | 100 | 100 |
| Garden jobs by season | All seven national garden decisions linked (30); Jobs in season now come first and are marked (40); Link labels are questions a gardener asks (30) | 60 | 100 |
| Guide catalogue | Every garden tool on the site is in the catalogue (25); Descriptions agree with the pages they describe (30); Every card link points at a page that exists (20); Section counts match their cards (15); Clean link labels (no doubled arrows) (10) | 20 | 100 |
| About and Freighter View Farms | No stale season figures (40); Links on the dark block are styled to be seen (35); Freighter View Farms authority page linked (25) | 25 | 100 |
| Structured data | All JSON-LD parses, with the Person node (30); hasPart lists every page in the catalogue (35); FAQ answers agree with the station table (35) | 30 | 100 |
| Freshness and footer | Footer "Updated" month matches dateModified (60); Byline and Built by Chris Izworski (40) | 40 | 100 |
| Access | Every input and select labelled (35); Status region for the answer (25); Focus styles and 44px controls from the kit (20); No inline click handlers (20) | 100 | 100 |
| **Mean / lowest** | | **76.0 / 20** | **100 / 100** |

## What was wrong and what changed

- **Guide cards said things the pages do not.** The planting calendar card said "30+ vegetables, 8 herbs, 7 flower types" for the Bay City area; it is 47 crops at 78 stations. The frost card promised "50% and 10% thresholds"; the page has 75, 50 and 25 percent dates. The freeze card promised "NOAA's full probability table, 90% down to 10%"; that table was replaced today with station values. The seed starting card described a backward-from-transplant calculator. All four now describe what the page does.
- **Two garden tools were missing from the hub:** the Seed Saving Lab and the Heirloom Variety Matchmaker. Both are now in the Seeds section and in the page's structured data, along with the seed libraries page, which had been left out of it.
- **Stale figures:** "148-day growing season" and the FAQ's "140 to 150 day growing season" now use the Bay City station's 154 frost-free days, median to median.
- **An invisible link:** the Freighter View Farms link on the dark green block had no color rule and disappeared into the background. It is now white and underlined.
- **Small faults:** section counts did not match their cards (Tomatoes said 2 with 3; Seeds said 2 with 3, now 5); the seed libraries card used the wrong class, so it had no border; one card link had a doubled arrow; the footer said "Updated August 2026".
- **Engine:** crops held back only by cold soil (for example snap beans with 55°F soil after the frost date) dropped out of the weekly list. They now show under "Waiting on the soil".
- **Garden jobs by season:** the seven national garden decisions now sort by season, with the ones in season this month first and marked "In season now" (garlic, cover crops and bulbs in October; frost cover, soil temperature and hardening off in spring).

## Browser evidence (local Chromium, not CI)

1280 x 900 and 390 x 844 on October 24, 2026: no JavaScript errors, no sideways scroll, the answer heading at 634 px on the phone.

## Not changed, and worth a look

The Freighter View Farms block and `/michigan-last-spring-freeze/` both mention a specific May 8 frost at the farm (the freeze page gives May 8, 2023, 29°F). That is a first-person anecdote this review cannot verify. It was left as written for the owner to confirm or remove.
