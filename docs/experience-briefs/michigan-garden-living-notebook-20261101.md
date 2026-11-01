# A Michigan garden notebook: experience brief

Owner: `izworskic/chrisizworski-com`. Existing canonical `/michigan-gardening/`. Experience OS 1.2.1. November 1, 2026.

## Purpose and concepts

A gardener asks “What might I do in my garden?” or arrives seeking a specific answer. The existing question-led directory already supports the second need; it remains immediately reachable by a prominent skip link. Concept A: another static directory with seasonal badges. Concept B: an editorial notebook with a small seasonal garden photo, a choice of four seasons, locally grounded frost references and direct choices for seed trays, soil, tomatoes and flowers/seeds. B wins because the visitor changes what they see, gains a sense of the season, and can still go straight to a tool without entering a location or building a plan.

This is purpose-built for a gardener's seasonal reflection, unlike the site's seed-saving lab (a two-plant comparison) and Michigan frost tool (a local probability lookup). It does not imitate a map or adventure planner. The small contextual photo is not a map, live view or record of the selected date. Seasonal editorial examples are guidance, not measured conditions. Selecting another season is labeled as exploring, and the current season is computed using Michigan local time.

## Evidence

Michigan-specific climate and crop references remain in the existing PlantNow engine, originally sourced from the [Michigan State Climatologist/MSU frost table](https://www.canr.msu.edu/resources/frost-free-dates) and [MSU garden calendar](https://www.canr.msu.edu/uploads/files/gardenCalendar.pdf). [University of Minnesota Extension's Upper Midwest calendar](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/upper-midwest-home-garden-care-calendar) illustrates changing jobs over the year; it does not establish specific Michigan frost dates. All checked Nov 1, 2026. Local spring frost shows the 25% historical reference, and unavailable fall dates say so; neither is a forecast.

Four visually inspected photos come from Chris Izworski's existing [site photo collection](https://chrisizworski.com/chris-izworski-photos/), which attributes the images to Chris. Files are optimized copies, not AI illustrations. Original paths: `chris-izworski-saginaw-bay-garden-november-2024-bay-city.jpg` (packets); `chris-izworski-vegetable-seedlings-under-grow-lights-bay-city.jpg` (seedlings); `chris-izworski-backyard-garden-flowers-summer-saginaw-bay.jpg` (garden beds); `chris-izworski-garden-produce-october-2024-saginaw-bay-shoreline-2.jpg` (bulbs in soil). Several filenames or gallery descriptions do not match the visible subject, so captions and alt text describe only what is actually shown, without asserting a date. No portrait is included.

## Connected state and failure

One selected season controls caption, image, text and recommended links. One Michigan place is resolved by the existing engine, controls the station reference and soil link, and is synchronized with the planner; invalid places preserve the last valid answer. Missing fall data is explicit. Static links and the complete directory survive JavaScript failure, missing photos or reduced motion. No new external data feed, geolocation, tracking, user-generated content or ad change. Test season A→B→A, invalid town, unavailable fall reference, photo loading/failure, focused controls, no JS, 360/390/768/1440 layouts and live production. Do not claim visitor satisfaction from tests.

Concurrent work: leafcutter bee PR #1389 touches this same homepage and browser test; compare main before merge and preserve both changes. The leafcutter guide itself is separately owned and not included in this release.
