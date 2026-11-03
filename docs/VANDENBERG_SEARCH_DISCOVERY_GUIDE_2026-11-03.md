# Vandenberg Rocket Launch Viewing Guide: Search Discovery Release

**Release date:** November 3, 2026

## Purpose and separation of search intent

Give people searching "where can I watch a Vandenberg rocket launch?" a directly useful, server-pre-rendered field guide. The editorial page contains real public-site and access information in the first HTML response, including six visitor candidates and seven questions. The existing interactive mission planner remains the sole source of launch timing, forecast scenarios, pad bearings and mission-specific verdicts.

The guide answers WHERE TO WATCH. The national engine answers WHEN / WHICH MISSION / DIRECTION / WEATHER. Do not clone the live schedule into the guide.

- Article: https://chrisizworski.com/vandenberg-rocket-launch-viewing/
- Planner: https://chrisizworski.com/national-tools/rocket-launch-live/?region=california#rl-vandenberg
- One canonical URL and one listing in public/sitemap.xml, truthful November 3, 2026 modification date.
- Direct internal links from the national California tool and the Guides > Beyond the Great Lakes directory.
- Both URL forms resolve directly through the site's established paired Vercel rewrites; the slash URL is the sole canonical and sitemap URL.
- Authored HTML Article, WebPage, BreadcrumbList and FAQPage structured data, with the same source-visible answers.

## Grounding

Use https://explorelompoc.com/best-places-to-view-a-rocket-launch-in-lompoc/
for the venue inventory: Ocean Park, Surf Beach/Surf Station, Allan Hancock College,
Beattie Park, Riverbend Park, Ryon Memorial Park. These mirror the six candidates
in lib/vandenberg-viewing.js, but none is promised to be open for any attempt.

Do not send users to top of Harris Grade Road, Hawk's Nest, Marshallia Ranch Road
or Highway 246: Explore Lompoc lists these closed for launch viewing. They
are identified in an explicit warning.

Other primary sources:
- https://www.vandenberg.spaceforce.mil/About-Us/Environmental/ (Surf Beach 8 a.m.–6 p.m., changes and wildlife restrictions)
- https://www.vandenberg.spaceforce.mil/News/ (range notices)
- https://www.hancockcollege.edu/police/parking.php (campus permits and regulations)
- https://www.cityoflompoc.com/government/departments/community-development/parks (city parks)
- https://www.weather.gov/ (regional gridded forecasts, not rocket-specific marine-layer or trajectory visibility)

The historical hero photograph is U.S. Space Force Falcon 9 / Starlink 17-20,
January 25, 2026, credited to 2nd Lt. Andrew Taller. The agency explicitly
describes this image as public domain, subject to DoD imagery limitations.
Source: https://www.vandenberg.spaceforce.mil/News/Photos/igphoto/2003864850/
This is not a current launch camera or the selected upcoming mission.
No U.S. Space Force endorsement is implied.

## GA4 engagement tracking

The lightweight, deferred guide.js sends:
- Event: vandenberg_guide_planner_open, with fixed guide identifier and allowlisted placement (nav, hero, decision, weather, check-schedule, bottom).
- Event: vandenberg_guide_faq_open, with a question number 1–7.

No new analytics SDK or database is installed. The normal site build injects GA4.
No visitor location, launch identifier, search query, email or personal information
is transmitted by the guide script. The HTML itself makes no NASA, LL2, NWS
or other expensive launch-status API call on page load.

## Release benchmarks

- Search-indexable primary answer visible with JavaScript disabled.
- Six sourced venue explanations and no unsupported claim of a venue currently open.
- Seven human-visible FAQs, with JSON-LD answers matching the visible wording.
- Four closed viewing areas explicitly excluded.
- Correct official photography citation and image rights acknowledgment.
- One canonical and one main sitemap location; Guide hub and article lastmod synchronized with dateModified.
- Two-way linking between editorial page and interactive planner.
- Dedicated SEO / source / engagement regression suite and full repository build both pass.
- Production HTTP status 200 for both URL forms, each with the same canonical link pointing to the slash URL.
- No misleading SEO traffic-lift statement before measured Google Search Console data exist.

## Measurement

Use Search Console URL-scoped page queries to evaluate:
- where to watch vandenberg rocket launch
- lompoc rocket launch viewing
- surf beach launch viewing
- vandenberg rocket launch tonight
- where to watch spacex launch california

After a complete 28-day window, compare organic non-brand clicks,
impressions, CTR and average position of this article to the national launch
engine, and measure the guide-to-planner click event rate. This is a true
search-discovery test, not a promised ranking improvement. Use the site's
existing daily Search Growth Watch rather than create a duplicate automation.
