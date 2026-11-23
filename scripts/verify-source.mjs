#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const audit = JSON.parse(await readFile(path.join(root, "audit", "live", "manifest.json"), "utf8"));
const failures = [];
const intentionalRetirements = new Set([
  // Oct 14, 2026: owner-approved Mackinac itinerary-network retirement, ferry-only survivor.
  "/mackinac-island/plan/",
  "/mackinac-island/where-to-stay/",
  "/mackinac-island/dining/",
  "/mackinac-island/things-to-do/",
  "/mackinac-island/events/",
  "/mackinac-island/around-the-straits/",
  "/mackinac-island/day-trip/",
  "/mackinac-island/with-kids/",
  "/mackinac-island/2-day-itinerary/",
  "/mackinac-island/from-detroit/",
  "/mackinac-island/from-chicago/",
  "/mackinac-island/from-traverse-city/",
  "/mackinac-island/from-grand-rapids/",
  "/mackinac-island/limited-walking/",
  "/mackinac-island/bike-day/",
  "/mackinac-island/fall/",
  // Aug 26 2026: same-day rollback of six experimental decision tools. These paths
  // are intentionally absent from source while the clean-live audit still remembers
  // their pre-retirement 200 responses. After the next production crawl no record
  // should remain here.
  "/michigan-stargazing-tonight/",
  "/keweenaw-hiking-conditions/",
  "/michigan-snowshoe-conditions/",
  "/michigan-waterfall-conditions/",
  "/great-lakes-freighter-viewing/",
  "/lake-superior-agate-conditions/",
  "/assets/decision-tool-batch.css",
  "/assets/decision-tool-batch.js",
  "/assets/decision-tool-depth-v2.css",
  "/assets/decision-tool-depth-v2.js",
]);

const intentionalChanges = new Set([
  // November 23: canonical GLERL ice-cover record and measured winter handoffs.
  "/great-lakes-freighter-winter-layup/",
  // New lighthouse winter tool and a relevant directory handoff, November 2026.
  "/frozen-lighthouses-michigan/",
  "/great-lakes-lighthouses/",
  // Nov 13 2026: owner-approved Freighter View Farms shared masthead and skin on the garden guides (docs/GARDEN_FVF_UNIVERSE.md). Body copy is unchanged.
  "/heirloom-vs-hybrid-seeds/",
  "/michigan-native-plants/",
  // Oct 29: owner-corrected Prepared start date and identity context.
  "/chris-izworski-911/",
  // Oct 26: owner-approved lake-effect forecast → winter-decision cards added to source while the clean snapshot predates this release. Existing page audits remain active.\n  "/lake-effect-snow/",\n  // Oct 26: verified Bridge live ribbon answer-jump CSS intentionally differs from older live crawl snapshot; no ad styling changes.
  "/assets/mackinac-bridge-live.css",
  // October 25: reviewed Bridge toll UI and calculator script are intentionally new relative to the older live-crawl snapshot. Retain QA/regression gates until next clean production crawl.
  "/assets/mackinac-guide.css",
  "/assets/mackinac-toll-calculator.js",
  // October 23: usability UX revision of Seed Saving Lab: compare and whole-garden interactions.
  "/seed-saving-lab/",
  // Oct 23 2026: Cross-Pollination Explorer discovery link on existing seed-saving guide.
  "/heirloom-seed-saving-guide/",
  // October 19: ice-viewing companion links on the two local aurora destinations.
  "/northern-lights-michigan/munising/",
  "/northern-lights-michigan/paradise-whitefish-point/",
  // October 14, 2026: owner-approved contextual toll cost link on the U.P. fall-color trip guide.
  // Keep the live-snapshot difference explicit until the next clean crawl after production release.
  "/fall-color/upper-peninsula-fall-color/",
  // October 11, 2026: Welland Canal discovery link added to Freighter Central.
  "/freighters/",
  // Oct 7 2026: repair the two dead Michigan Outdoors navigation targets.
  "/michigan-snow-depth/",
  // Oct 5 2026: existing ice-out shell discovery pilot. Correct child identities in the
  // generator; make planning context, creator attribution and relevant links readable.
  "/national-tools/ice-out/",
  "/snowmobile/regions/west-michigan.html",
  "/snowmobile/regions/keweenaw-copper-country.html",
  "/snowmobile/regions/eastern-up.html",
  "/snowmobile/regions/central-western-up.html",
  "/snowmobile/regions/northeast-sunrise.html",
  "/snowmobile/regions/northwest-michigan.html",
  "/snowmobile/regions/grayling-gaylord.html",
  "/snowmobile/",
  // Oct 24 2026: owner-requested garden tools upgrade (answer-first tools, charts, share links).
  "/michigan-gardening/",
  "/michigan-last-spring-freeze/",
  "/michigan-frost-dates/",
  "/heirloom-variety-matchmaker/",
  // Oct 6 2026: canonical Person identity graph/author reference correction on main-owned pages.
  "/seed-starting-guide/",
  "/when-to-plant-tomatoes-michigan/",
  "/niagara-border-crossing/",
  "/manistee-river-map/",
  // Oct 6 2026: main-owned Michigan Ice identity-only mirror sync from the merged owner graph.
  "/michigan-ice/",
  "/michigan-ice/regions/saginaw-bay.html",
  "/michigan-ice/regions/houghton-lake.html",
  "/michigan-ice/regions/lake-st-clair.html",
  "/michigan-ice/regions/little-bay-de-noc.html",
  "/michigan-ice/regions/grand-traverse-bay.html",
  "/michigan-ice/regions/burt-mullett.html",
  "/great-lakes-freighter-tracking/",
  "/soo-locks/",
  "/great-lakes-beaches/",
  "/au-sable-river/",
  "/detroit-river-freighters/",
  "/detroit-birding-today/",
  "/lake-st-clair-outdoors/",
  "/detroit-sunset-tonight/",
  "/michigan-cross-country-skiing/",
  "/northern-lights-michigan/",
  "/heirloom-variety-matchmaker/",
  "/estivant-pines/",
  "/duluth-canal-park/",
  "/nyc-crossing/",
  // Oct 6 2026: source-owned Petoskey export synced from owner PR #4 build artifact.
  "/petoskey-wine/charlevoix-area-wineries/",
  "/petoskey-wine/",
  "/petoskey-wine/petoskey-distilleries/",
  "/petoskey-wine/petoskey-stone-beaches/",
  "/petoskey-wine/petoskey-wine-region-trail/",
  "/petoskey-wine/tunnel-of-trees-wine-tour/",
  "/petoskey-wine/venues/",
  "/petoskey-wine/walloon-lake-wineries/",
  "/petoskey-wine/winery/1918-cellars/",
  "/petoskey-wine/winery/beards-brewery/",
  "/petoskey-wine/winery/blu-dot/",
  "/petoskey-wine/winery/boyne-city-taproom/",
  "/petoskey-wine/winery/boyne-valley-vineyards/",
  "/petoskey-wine/winery/cellar-1914/",
  "/petoskey-wine/winery/crooked-vine/",
  "/petoskey-wine/winery/elder-piper/",
  "/petoskey-wine/winery/gypsy-distillery/",
  "/petoskey-wine/winery/high-five-spirits/",
  "/petoskey-wine/winery/mackinaw-trail/",
  "/petoskey-wine/winery/mammoth-distilling/",
  "/petoskey-wine/winery/maple-moon/",
  "/petoskey-wine/winery/muskrat-distilling/",
  "/petoskey-wine/winery/petoskey-brewing/",
  "/petoskey-wine/winery/petoskey-farms/",
  "/petoskey-wine/winery/pond-hill/",
  "/petoskey-wine/winery/resort-pike/",
  "/petoskey-wine/winery/royal-farms/",
  "/petoskey-wine/winery/rudbeckia/",
  "/petoskey-wine/winery/seasons-of-the-north/",
  "/petoskey-wine/winery/spare-key/",
  "/petoskey-wine/winery/stiggs/",
  "/petoskey-wine/winery/vanderbilt-vines/",
  "/petoskey-wine/winery/walloon-lake-winery/",
  // Oct 4 2026: reviewed tool-directory discovery/schema synchronization and GA4 tool-open measurement.
  // Mirror changes come from the national hub owner; no specialist engine implementation changes.
  "/assets/tool-engagement.js",
  "/synced-national-tools/",
  "/synced-national-tools/assets/national-tools-directory.css",
  "/synced-national-tools/assets/national-tools-directory.js",
  // Sep 30 2026: shared SERP-length gate repair for the Haleakala sunrise synced route.
  "/synced-national-tools/haleakala-sunrise/",
  // Sep 30 2026: reviewed Michigan Ice decision-engine client update. The public client now
  // separates regional observation, lake-wide trend, thermal history, and forecast forcing.
  // Re-crawl after production release, then remove this declaration.
  "/michigan-ice/ice.js",
  // Sep 23 2026: intentional Mackinac generator resync restored rankable catalog cards and removed generated em dashes. Re-crawl after production release, then remove this declaration.
  "/fall-color/mackinac-island-fall-color/",
  // Sep 21: Mackinac destination UX rebuild. One shared My Trip intake now owns
  // profile + practical trip state and downstream pages inherit that context.
  "/mackinac-island/",
  "/mackinac-island/plan/",
  "/mackinac-island/ferry-planner/",
  "/mackinac-island/where-to-stay/",
  "/mackinac-island/dining/",
  "/mackinac-island/things-to-do/",
  "/mackinac-island/events/",
  "/mackinac-island/around-the-straits/",
  "/mackinac-island/day-trip/",
  "/mackinac-island/with-kids/",
  "/mackinac-island/2-day-itinerary/",
  "/mackinac-island/from-detroit/",
  "/mackinac-island/from-chicago/",
  "/mackinac-island/from-traverse-city/",
  "/mackinac-island/from-grand-rapids/",
  "/mackinac-island/limited-walking/",
  "/mackinac-island/bike-day/",
  "/mackinac-island/fall/",
  "/assets/mackinac-island.js",
  "/assets/mackinac-island.css",
  "/assets/mackinac-hub.js",
  "/assets/mackinac-intent.css",
  // Sep 20: Search Console CTR + branded-authority sprint. Existing publisher credits on
  // priority search pages now link to the canonical Chris Izworski profile; no titles,
  // H1s, canonicals, live logic or ad settings changed. Re-crawl after production release.
  "/soo-locks/",
  "/fall-color/",
  "/northern-lights-michigan/",
  "/mackinac-bridge-live/",
  // Oct 11 V2: intentional restriction-level-only page-alert refinement; keep snapshot checks for all other assets.
  "/assets/mackinac-bridge-live.js",
  "/mackinac-bridge-tolls/",
  // Sep 20: refresh shared Gazette cards and disclose delayed/unavailable editions.
  "/assets/gazette-latest.js",
  // Replace the failing AIS iframe with recent vessel reports and a native map.
  "/assets/freighter-tracker.js",
  "/assets/freighter-tracker.css",
  // Sep 17: accurate advertising, location, storage and contact disclosures.
  "/privacy/",
  // Sep 17 2026: source context and distinct branded coverage value.
  "/chris-izworski-prepared911/",
  "/chris-izworski-save-our-shoreline/",
  "/chris-izworski-wnem-tv5/",
  "/chris-izworski-wsgw/",
  // Sep 16: replace the embed-only Blue Spring shell with visible visitor guidance.
  "/national-tools/blue-spring-live/",
  // Sep 10 2026 (second pass): expanded 5 of the 21 /chris-izworski-* identity/citation
  // pages with facts already published and verified elsewhere on this same site (media,
  // timeline, citations) that hadn't been cross-referenced into the topic-specific page yet.
  // No invented career detail -- see the PR body for exactly which source each addition
  // came from. Re-crawl after production release, then remove this declaration.
  "/chris-izworski-apco/",
  "/chris-izworski-bridge-michigan/",
  "/chris-izworski-gpt-trainer-case-study/",
  "/chris-izworski-nena-the-call/",
  "/chris-izworski-wcmu-public-radio/",
  // Sep 10 2026: added /privacy/ and /terms/ trust pages (AdSense/GA4 compliance gap: the
  // site injects Google Analytics and Google AdSense site-wide but had no privacy or terms
  // page anywhere in the repo). These three existing pages now link to them.
  // Re-crawl after production release, then remove this declaration.
  "/",
  "/about/",
  "/connect/",
  // Sep 8: honest seasonal fallback, feed freshness and existing fall/aurora handoffs.
  "/assets/fall-color-freshness.js",
  // Sep 2 2026: citation-readiness answers rewritten to be self-contained on three tools.
  // Re-crawl after production release, then remove this declaration.
  "/great-lakes-beaches/",
  "/great-lakes-buoys/",
  "/great-lakes-freighter-tracking/",
  // Sep 1 2026: current USA-NPN ground-observation enrichment on the canonical national fall-color tool.
  // Re-crawl after production release, then remove this declaration.
  "/national-tools/fall-color/",
  // Sep 1 2026: add distinct national intent hubs and discovery links from the canonical national tools hub.
  // Re-crawl after production release, then remove this declaration.
  "/national-tools/",
  // Sep 2 2026: connect the water intent hub to the new, distinct national coastal decision tool.
  // Re-crawl after production release, then remove this declaration.
  "/national-tools/water/",
  // Sep 2 2026: Snowpack adds a crawlable handoff to the distinct White Christmas seasonal tool.
  // Re-crawl after production release, then remove this declaration.
  "/national-tools/snow/",
  // Sep 2 2026: the Decision Desk adds Coastal only when real coastal coverage exists.
  // Re-crawl after production release, then remove this declaration.
  "/assets/national-dashboard.js",
  // Aug 28 2026: Michigan Outdoors Now joined the canonical Chris entity/project network.
  // These are additive identity/project links plus freshness stamps; re-crawl after production release, then remove.
  "/chris-izworski/",
  "/projects/",
  // Aug 26 2026: Estivant entered discovery and six same-day experimental tools were retired. Re-crawl after production release, then remove.
  "/sitemap.xml",
  // Aug 25 2026: current State 911 authority source plus the synchronized
  // machine-readable entity graph. Re-crawl after production release, then remove.
  "/chris-izworski-michigan-911-committee/",
  "/sources.json",
  // Aug 22 2026: measured page-one CTR treatment for five distinct beach detail pages.
  // Re-crawl after production release, then remove these declarations.
  "/great-lakes-beaches/warren-dunes-state-park/",
  "/great-lakes-beaches/luna-pier/",
  "/great-lakes-beaches/new-buffalo-beach/",
  "/great-lakes-beaches/pj-hoffmaster-state-park/",
  "/great-lakes-beaches/oscoda-beach-park/",
  // Aug 23 2026: measured entity/discovery CTR treatment. Re-crawl after release, then remove.
  "/timeline/",
  // Aug 22 2026: measured Zone 6a planting-calendar page-one CTR treatment. Re-crawl after production release, then remove.
  "/zone-6a-planting-calendar/",
  // Aug 22 2026: measured page-one CTR treatment. Re-crawl after production release, then remove.
  "/heirloom-tomatoes-michigan/",
  // Aug 22 2026: measured CTR treatment for the distinct Michigan Fall Color Weekend Planner. Re-crawl after production release, then remove.
  "/fall-color/michigan-leaf-peeping-planner/",
  // Aug 22 2026: contextual distribution for the Upper Peninsula fall-color rank experiment. Re-crawl after production release, then remove.
  "/up-north-michigan/",
  // Aug 22 2026: measured Manistee River paddling page-one treatment on the existing canonical guide. Re-crawl after production release, then remove this declaration.
  "/michigan-paddling/manistee-river/",
  // Aug 22 2026: measured Au Sable map/public-access authority expansion on the existing canonical guide. Re-crawl after production release, then remove this declaration.
  "/au-sable-river/",
  // Aug 19 2026: the boat launch finder now ranks on driving distance instead of
  // straight-line distance, caps its reach, and tells an inland destination that
  // it is outside the Great Lakes inventory. Re-crawl after deploy, then remove
  // these declarations.
  "/michigan-boat-launches/",
  "/assets/boat-launch-finder.js",

  // Aug 18 2026: shipwreck explorer/search-trust upgrade.
  "/great-lakes-shipwrecks/",
  // Aug 17 2026: additive Windy webcam context on selected beach, ice, and
  // fall-color guides. Images stay labeled with their actual camera location
  // and are explicitly not presented as safety or on-site-condition evidence.
  "/assets/field-camera.js",
  "/fall-color/keweenaw-peninsula-fall-color/",
  "/great-lakes-beaches/saginaw-bay/",
  "/great-lakes-beaches/bay-city-state-park/",
  "/great-lakes-beaches/caseville-state-park/",
  "/great-lakes-beaches/frankfort-beach/",
  "/great-lakes-beaches/holland-state-park/",
  "/great-lakes-beaches/ludington-state-park/",
  "/great-lakes-beaches/south-haven-north/",

  // Aug 15 2026: one reversible Fall CTR experiment. The Tunnel of Trees
  // description now leads with its existing October 5-13 answer; title, H1,
  // canonical, first answer, live conditions, and guide content are unchanged.
  "/fall-color/tunnel-of-trees-fall-color/",

  // Aug 15 2026: the generated Michigan Ice section gained the site's standard
  // privacy-safe analytics and performance measurement. The hub also gained its
  // missing H1 and an honest crawlable season answer. Re-crawl after deploy, then
  // remove these declarations.
  "/michigan-ice/",
  "/michigan-ice/ice-safety.html",
  "/michigan-ice/freezing-degree-days.html",
  "/michigan-ice/ice-cover-history.html",
  "/michigan-ice/regions/saginaw-bay.html",
  "/michigan-ice/regions/houghton-lake.html",
  "/michigan-ice/regions/lake-st-clair.html",
  "/michigan-ice/regions/little-bay-de-noc.html",
  "/michigan-ice/regions/grand-traverse-bay.html",
  "/michigan-ice/regions/burt-mullett.html",

  // Aug 14 2026: additive gallery pass. Seven new August 2026 garden photographs added to
  // /chris-izworski-photos/ (Monte Gusto pole beans, zucchini + zucchini bread, onion harvest,
  // herb butter). Figure count corrected 169 -> 164 to match the actual number of images on
  // the page (157 before this pass). Re-crawl after deploy, then remove this declaration.
  "/chris-izworski-photos/",

  // Aug 11 2026: factual corrections plus additive FVF distribution from the home,
  // About, and Guides pages. Re-crawl after deploy, then remove these declarations.
  "/about/",
  // Aug 11 2026: citation pass on the remaining tools. Answer blocks restructured for
  // self-containment; michigan-ice gained a question surface via scripts/ice/gen_site.py.
  // Re-run `npm run audit:live` after deploy and remove these.
  "/fall-color/",
  "/mackinac-bridge-live/",
  "/northern-lights-michigan/",
  "/saginaw-bay-ecology/",
  "/soo-locks/",



  // Aug 7 2026: the five Soo Locks photographs were AI generated. Replaced with real,
  // freely licensed photographs of the actual locks, each with visible attribution:
  // a panoramic aerial (CC BY 4.0), the MacArthur Lock (CC BY-SA 3.0), the 1,000-foot
  // Burns Harbor in the Poe Lock and freighters waiting above the locks (both public
  // domain, USACE), and the administration building (CC BY-SA 4.0).
  "/assets/soo-locks/hero.jpg",
  "/assets/soo-locks/lock-chamber.jpg",
  "/assets/soo-locks/freighter.jpg",
  "/assets/soo-locks/saltie.jpg",
  "/assets/soo-locks/observation-deck.jpg",
  // Aug 6 2026: entity integrity. The #person node carried three conflicting jobTitle
  // values under one @id ("Solutions Consultant", "Solutions Consultant at Prepared",
  // "Writer and Publisher"), which reads as one entity contradicting itself. Normalised
  // to the homepage canonical value. See benchmarks/entity-surface-baseline.json.
  "/chris-izworski-author/",
  "/chris-izworski-emergency-management/",
  // selected-tab fix and the seasonal map wash, Aug 5 2026. The selected tab and
  // chip states still carried the old theme colour in rgba form, which the hex
  // sweep missed, so the label vanished into its own pill.
  "/fall-color/",
  // light autumn palette, Aug 5 2026. The whole /fall-color/ section moved off the
  // near-black ground onto warm paper. Every page in the section is touched.
  "/fall-color/",
  "/fall-color/michigan-leaf-peeping-planner",
  "/fall-color/michigan-fall-color-drives",
  "/fall-color/michigan-fall-color-drives/",
  "/fall-color/when-do-leaves-peak-in-michigan",
  // palette repair, Aug 5 2026. The planner and the drives map were built with
  // flat white cards on the section's dark autumn ground. Both now use the same
  // tokens as the landing page and the field guides.
  "/fall-color/michigan-leaf-peeping-planner",
  "/fall-color/michigan-fall-color-drives",
  // leaf peeping planner, Aug 4 2026. New page plus a breadcrumb link to it from
  // every page in the fall color section.
  "/fall-color/",
  // fall color migration, Aug 4 2026. The property moved from
  // fallcolor.chrisizworski.com onto the hub at /fall-color/ with slugs preserved
  // 1:1. These pages carried links to the old subdomain and now point in-tree.
  "/",
  "/tools/",
  "/soo-locks/",
  "/northern-lights-michigan/",
  "/fall-color-northern-lights-michigan/",
  // query-gap pass, Aug 4 2026. Autocomplete shows the aurora page's demand is
  // dominated by "tonight time" and "this week", and the Soo demand splits into
  // visitor intent and "ships today / live cam" ship intent.
  "/northern-lights-michigan/",
  "/soo-locks/",
  "/great-lakes-freighter-tracking/",
  // ice section internal linking pass, Aug 4 2026. The Michigan Ice Report moved
  // onto the hub with exactly one inbound internal link (/tools/), which is thin
  // for a section that has to rank by December. These six add contextual links.
  "/",
  "/great-lakes/",
  // Aug 23 2026: contextual Circle Tour rank-distribution handoff from lighthouse directory.
  "/great-lakes-lighthouses/",
  "/great-lakes-buoys/",
  "/great-lakes-freighter-tracking/",
  "/saginaw-bay-ecology/",
  "/soo-locks/",
  // brand-entity + SERP-length pass, Aug 3 2026
  "/ai/",
  "/blog/",
  "/blog/ai-supporting-911-administrative-work/",
  "/case-studies/",
  "/chris-izworski-ai-911/",
  "/chris-izworski-bay-city-michigan/",
  "/chris-izworski-bay-city/",
  "/chris-izworski-emergency-management/",
  "/chris-izworski-mlive/",
  "/chris-izworski-news-coverage/",
  "/chris-izworski-prepared/",
  "/chris-izworski-public-records/",
  "/chris-izworski-publications/",
  "/chris-izworski-trout-fishing/",
  "/chris-izworski-trout-rivers/",
  "/chris-izworski/",
  "/citations/",
  "/companion-planting-zone-6a/",
  "/great-lakes-beaches/lake-michigan/",
  "/great-lakes-fish/",
  "/heirloom-variety-matchmaker/",
  "/media/",
  "/michigan-911-executive-director/",
  "/michigan-boat-launches/",
  "/michigan-boat-launches/lake-michigan/",
  "/michigan-boat-launches/saginaw-bay/",
  "/michigan-last-spring-freeze/",
  "/michigan-paddling/",
  "/michigan-paddling/manistee-river/",
  "/michigan-seed-libraries/",
  "/michigan-trout-streams/",
  "/press/",
  "/speaking/",
  "/start-here/",
  "/",
  "/tools/",
  "/great-lakes/",
  "/great-lakes-beaches/",
  "/guides/",
  "/great-lakes-buoys/",
  "/great-lakes-freighter-tracking/",
  "/great-lakes-gazette/",
  "/mackinac-bridge-live/",
  "/mackinac-bridge-driver-assistance/",
  "/mackinac-bridge-rv-trailer-wind-rules/",
  "/mackinac-bridge-tolls/",
  "/michigan-border-wait-times/",
  "/gordie-howe-bridge-wait-time/",
  "/ambassador-bridge-wait-time/",
  "/detroit-windsor-tunnel-wait-time/",
  "/blue-water-bridge-wait-time/",
  "/sault-ste-marie-border-wait-time/",
  "/lake-superior-circle-tour/",
  "/northern-lights-michigan/",
  "/soo-locks/",
  "/when-to-plant-tomatoes-michigan/",
  "/michigan-frost-dates/",
  "/saginaw-bay-ecology/",
  "/chris-izworski-freighter-view-farms/",
  "/michigan-gardening/",
  "/great-lakes-birding/",
  "/connect/",
  "/projects/",
  "/sitemap.xml",
  "/image-sitemap.xml",
  "/llms.txt",
  "/robots.txt",
]);

// These files were already committed on main after the crawl manifest was captured.
// Pin their exact source hashes so the known drift passes without broadly exempting
// the routes from future parity checks.
const committedDriftHashEntries = [
  // Nov 22 2026: SHA256 pin for edited seasonal ranking; retain live-source parity protection.
  ["/best-michigan-beaches-today/", "b48bbd305f88bee1dfa295b61d841d2f843eed2de55def4436ffca880af56b4c"],
  // Nov 21 2026: SHA256-pinned shared ShoreFeel JS/CSS and 50 beach guides.
  // Nov 21 2026: reviewed 50 ShoreFeel interpretive beach guides, updated exact
  // body hashes after truthful dateModified/sitemap stamping. Preserve all other
  // live-snapshot parity protections until the next clean production crawl.
  // Sep 29: reviewed Sep 28 Pictured Rocks links + dateModified edits in
  // cff3d4e, c05799d0 and be0973cf; repinned only their three beach routes below.
  // Aug 25 2026: Person entity consolidated. The canonical @id carried FIVE different
  // description values, two url values and an alumniOf that dropped a school on two of three
  // pages. Verified semantically (parsed JSON-LD compared property by property) that nothing but
  // url / description / alumniOf moved on these routes. Re-crawl after deploy and these pins can
  // go back to the live snapshot.
  ["/chris-izworski-biography/", "4158c676804c5621ce1d24f81be5ef9432a2384925ad1d3c063805637325b3a6"],
  // Oct 8 2026: feature four flagship tools and link reviewed engineering evidence.
  ["/chris-izworski-works/", "01fc5627af81f877af40e02a558fcfaf90b832dcfa04bdd37a87688147bfe13a"],
  ["/fall-color/ann-arbor-irish-hills-fall-color/", "ee05322133166c076ca3ec0d02389524f703830e1bd5104c15de67d229490a61"],
  ["/fall-color/au-sable-river-fall-color/", "30927270360c024f9f0c63c492fe276aa9a529ad530563d6f3984edc2623b5a4"],
  ["/fall-color/mackinac-island-fall-color/", "3c7e2b336da1380a9b1501e04b5581fed9c9dbd323d94215f52bd344e802da07"],
  ["/fall-color/porcupine-mountains-fall-color/", "20cd16e7164188f32a27b8e67795731a5453f38f2aa220a2d93de4ff51df2d54"],
  ["/fall-color/saginaw-bay-fall-color/", "b1819775067b66889e154c8ff6a65dbb1dd0968219c2861b5a1baec4252b9d8c"],
  ["/fall-color/saugatuck-southwest-michigan-fall-color/", "41dfca2d305fcc0d33641cc9526d7acafb53248d78414216d7490d5051a2a11b"],
  ["/fall-color/sleeping-bear-dunes-fall-color/", "f573040df0ee00c1a5d0f3b865b4b15af979aa9ed9e1f31cee9af9c9f1efa35f"],
  ["/fall-color/tahquamenon-falls-fall-color/", "dba3bab61486c451fec87e30433f5ce25829a10ca96520a601de3758706b57dd"],
  ["/fall-color/upper-peninsula-fall-color/", "47f23fd4a1936831e73c6e54279d76e13e90615c5d568c29f2b14902aa70f461"],
  ["/fall-color/when-do-leaves-peak-in-michigan/", "636d5d477487af31b94354efb33c77f816449476b7454d841bcde40eeed18a21"],
  ["/great-lakes-maritime-history/", "9bb601c956924248b5906620e61a5af905235c2c89b8324ae30dc6fcc2fd52f2"],
  ["/au-sable-river/", "fa36c47fb8f61618e4f52f8db6ba56e6f3d630e178cc137499f00a6fc4dfef42"],
  ["/edmund-fitzgerald/", "a722575cbf373e9e66c874d48a61dafb089e19a79f2df5e261053940ec3f3f04"],
  ["/heirloom-seed-saving-guide/", "2e5d3c53110102a7f6784f3c7f6ac86b1f9be6840f297a515ead80111c1b6e87"],
  ["/michigan-paddling/pere-marquette/", "9f5d099de514fc829c4315ac3487500f8572761596ba797d66ca463d8df00ec2"],
  // Aug 19 2026: stamp-freshness corrected dateModified and the matching sitemap
  // lastmod on these routes to their real last content commit. Verified line by
  // line that nothing but those date stamps moved. Re-crawl after deploy and
  // these pins can go back to the live snapshot.
  ["/great-lakes-beaches/bete-grise/", "0d640c7b98b6385ab0578a60564154a05b15f86d1a223334535320ba01a21d9a"],
  ["/great-lakes-beaches/bird-creek-county-park/", "8286aa346b13047791ac7cbbe70cc0accfa2f61befa0828000734fdb8ab0bbb1"],
  ["/great-lakes-beaches/black-river-harbor/", "071555b2faa2db832bfc43d8fd127fea572c2d9522024322edb2ec2a9588f939"],
  ["/great-lakes-beaches/caseville-county-park/", "dbd68b0a00bb03592cc9fe82eaa72939335a10a3ffaa679833e160b713da64dc"],
  ["/great-lakes-beaches/cheboygan-state-park/", "bf882cd86e8760de36db6b37a2abb72e5bfd9d2a496a05509b35e63399891204"],
  ["/great-lakes-beaches/crisp-point/", "604be7f3d4a1a87a2a413e11017b7efa209cbf45a3a06efad53d67880d1ae81c"],
  ["/great-lakes-beaches/glen-arbor-area/", "493efb90c41a5a21c7a75c17ad997994788a842f45052d931ddef30acef3b76d"],
  ["/great-lakes-beaches/grand-haven-state-park/", "cb9af247261a6cc4fed3e8e68a1eeb3ae9b76afad0a13499ee6e8f519db2ec8d"],
  ["/great-lakes-beaches/grand-marais-beach/", "4ec870cd87674c1ba755ea208a159736199c8e76180b6d5f3dd0aca279bc6356"],
  ["/great-lakes-beaches/harrisville-state-park/", "514c5503e02a9b4c5815d8c41fdbd05ec6d019c96aad5310821ea1c1318661b4"],
  ["/great-lakes-beaches/hoeft-state-park/", "d7f6aaa63d1db7c8b0bec9f5147fb66032ac7095c74da8f2f669e25c6e362ad3"],
  ["/great-lakes-beaches/lakeport-state-park/", "bab6167fe9df1286fb0ad39a0dec33865240df55a3ce5b9bd01cab9b99f3414d"],
  ["/great-lakes-beaches/luna-pier/", "89ef3debae3dbbcb4692a6c9f1a9cdac8a503aaaf7db28d82ca2d31df5e763de"],
  ["/great-lakes-beaches/marquette-south-beach/", "ee35fb44162211a1190935f6cc0bca099cd21cb8af5b0d63cfc754df27449f0c"],
  ["/great-lakes-beaches/mclain-state-park/", "ee86be0fb92b17772f4b06b427826383226b74f174c938bd6a3a6c5626b0c740"],
  ["/great-lakes-beaches/miners-beach/", "942fee355f3fe10fee4a1dd74266caa6d42a4de9a4a920334bef8cb6d23dfb5e"],
  ["/great-lakes-beaches/muskegon-state-park/", "b153b8115e5c6f7d84a2cf4132808f9c6392252566a1262a9670bc737e1b2e14"],
  ["/great-lakes-beaches/new-buffalo-beach/", "be640fb13945a1a8ad97c3de6d62374ee1f3ed1bb05e7419145008393af000e5"],
  ["/great-lakes-beaches/north-bar-lake/", "6e08d430b47312546b39b88eef8e7b231998ebc74acf5831208aaff0b3de36a8"],
  ["/great-lakes-beaches/oscoda-beach-park/", "7b8447315325f141431cb261dc29a54ce35fb14e1da9cea8658ad8ff403eb8dc"],
  ["/great-lakes-beaches/oval-beach/", "7ab46f1f901afbe48a863e45f907fd27cd3c507b0e4f22baee7f206845c73011"],
  ["/great-lakes-beaches/pentwater-beach/", "9d17cff5b758897695c3ffa5310d6d926d69899461d265e4d250b70fabcdc248"],
  ["/great-lakes-beaches/pere-marquette-park/", "8d2f3805af267e215cc076b7fef85efffa8dc763b7bbd85d4704681179010cc7"],
  ["/great-lakes-beaches/petoskey-state-park/", "a76b6b1db6ab71a0c98e3a1ee8e2a5d9daaf240a958d0f82f02d5133e3eb7acf"],
  ["/great-lakes-beaches/pj-hoffmaster-state-park/", "e3e013033fa72588a309a206674e3c189ec0ab58d51c17a40a2f63f028650470"],
  ["/great-lakes-beaches/port-crescent-state-park/", "d27753d6d3475fde4a20a3f878dd71deb0f4e8d2de80f6ff0eb49619b0d2b582"],
  ["/great-lakes-beaches/presque-isle-marquette/", "a6e626c1c6e400282902153f9ca40655d7a9959b5864306849e08b3874490387"],
  ["/great-lakes-beaches/rogers-city-lakeside-park/", "6e0739660f66e23ece7be4313bafe7ce3b3b3b805da180d7be106f7efe47fb67"],
  ["/great-lakes-beaches/sand-point-pictured-rocks/", "9cf60f034fcd1db5e6b2431ed1a45d5eadfd713b42e2beff2e343c9245892bd3"],
  ["/great-lakes-beaches/sand-point-saginaw-bay/", "d1fb7481cbf8bbe731ed5d60f8513daa3cdb04788ad02c91bcf36a0e8f5d11c4"],
  ["/great-lakes-beaches/saugatuck-dunes-state-park/", "06b4b74c3eeb43368a3423d1ebc6e18e7385b7e3a7e64d387f7d2aced6da64b4"],
  ["/great-lakes-beaches/silver-lake-state-park/", "c74bca2c22998dce292fcb97495b4317c87cac2c5e3396f53d279a08b5ff4bb8"],
  ["/great-lakes-beaches/sleeping-bear-dunes-empire/", "7137722edc1f2a64210b7c386351ea12a457d1d084fe1dea6150cfbdf2b94c60"],
  ["/great-lakes-beaches/sleeping-bear-platte-river/", "b3f91ca3ca1cdbd25063a5b442e91431ae854e16567834b6b842307e7ebb5c22"],
  ["/great-lakes-beaches/stearns-park-beach/", "0224a0078bd5487a07a8fdbbb961c6cd4de9cdb62f63b958496df1f804021218"],
  ["/great-lakes-beaches/sterling-state-park/", "58af4dc7b435aef91a1f8a182209083d9aa63743b972ff0f54590c78b9f1a30d"],
  ["/great-lakes-beaches/tawas-point-state-park/", "40ba404549b9be3a948609fe56c3e8d82e2fe9d5b8c53a40e6717a7c441fbfe1"],
  ["/great-lakes-beaches/tunnel-park-holland/", "be4438dc67a1bdab453d6d2bb9508678dc9dd9b751512026a8ae28915476817c"],
  ["/great-lakes-beaches/twelvemile-beach/", "065ff11d8ca663837170c15da496ba18f542efb98efd0f58c79bcf79b73f808f"],
  ["/great-lakes-beaches/van-buren-state-park/", "ca87acae128427c3b21e826199383ddd7b64bf0273ed39599fc5bb57e2ec65cc"],
  ["/great-lakes-beaches/warren-dunes-state-park/", "8185c7bf9a4db545a18daa930ab301e44d8a3a2e70fdf9a16dc04c551f6bdbdf"],
  ["/great-lakes-beaches/wenonah-park/", "fe2d6383afbd88ca0249617bc1214b2caf1bae6d5d8fedf25bcca91c148a2325"],
  ["/great-lakes-beaches/whitefish-point/", "74db52b313c7f5ed7d0e48da942e2a00bcf26806cad3fcfe5e174fd1f68e9dd4"],
  ["/great-lakes-beaches/wilderness-state-park/", "5caea63bf19bea813d01fa935317acd020edfcd0c8e41357af67c1dc35c9802e"],
  // Nov. 12 owner-approved homepage dateModified/lastmod correction updates the exact reputation sitemap SHA-256; retain strict parity protection, not an exemption.
  ["/sitemap-reputation.xml", "2a4595494b15680fa4fde24102a89c96803f24e7cb078888a9675c34848ede2a"],
  ["/zone-6a-planting-calendar/", "3b34180a82558e2df887dc238ad31dc8d1995e465b3e5d81972ddec260414565"],
  ["/great-lakes-beaches/ludington-state-park/", "0bf715840798576ecf6dec3cc4cbeb5a0d895dc619f57b6160f809d31606ec5e"],
  ["/great-lakes-beaches/holland-state-park/", "7b992f5c0a18855ff2d98adacaed67aef89d031f11101ac010f44ddd9cf57f92"],
  ["/great-lakes-beaches/frankfort-beach/", "6b00763e9e8f17b58cd18844da851f877cd58571be3781e5dc810a96e1dfa6b8"],
  ["/great-lakes-beaches/bay-city-state-park/", "4fe2fd9892a638f3600339c22464bd9e41678676caff422e1a64a6f8fe8d8c84"],
  ["/great-lakes-beaches/south-haven-north/", "890f82ce0978b02436d69b9ab883c4ff76b6f0706a95b30dbf17f3cf6388adb8"],
  ["/great-lakes-beaches/caseville-state-park/", "907d8d8d2ad224ae0d7f76b47a09af23f253d40caa1d09be4e9b0f5e3383b36f"],
  ["/assets/beach-report.js", "9987e1708ce37a0bd1d567ad013fa7f92323a0808c45c93a94a75638282c6d88"],
  ["/assets/beach-report.css", "51fb95fa481a84ca6edffb40d57f1d1be2c5fae5e58c8d04a12284265b976502"],
];

// A Map built from an array silently keeps the LAST value for a duplicate key, so a stale pin added
// lower down overrides a fresh one and the route fails while the hash you can see where you edited
// looks correct. That cost a debugging cycle on Aug 25 2026. The check has to run on the ARRAY:
// once new Map() has collapsed the duplicates, iterating the Map can never find them.
{
  const seen = new Set();
  const dupes = [];
  for (const [route] of committedDriftHashEntries) {
    if (seen.has(route)) dupes.push(route);
    seen.add(route);
  }
  if (dupes.length) {
    console.error(`verify-source: duplicate committedDriftHashes keys: ${[...new Set(dupes)].join(", ")}`);
    console.error("The later entry silently wins. Keep exactly one pin per route.");
    process.exit(1);
  }
}
const committedDriftHashes = new Map(committedDriftHashEntries);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function publicPathFor(record) {
  const contentType = record.headers?.["content-type"] || "";
  if (record.pathname === "/") return path.join(publicRoot, "index.html");
  if (record.pathname.endsWith("/")) return path.join(publicRoot, record.pathname, "index.html");
  if (contentType.includes("text/html") && !path.extname(record.pathname)) {
    return path.join(publicRoot, `${record.pathname}.html`);
  }
  return path.join(publicRoot, record.pathname);
}

// Paths that legitimately have no source file: /api/ handlers, scripts Vercel injects at the edge
// (Web Analytics and Speed Insights), and feeds served by a rewrite rather than a static file.
// These appeared the first time the audit was re-crawled after the freshness fix; they are not
// drift, they are routes that were always dynamic.
const NO_SOURCE_FILE = [
  /^\/api\//,
  /^\/_vercel\//,
  /^\/fall-color\/rss\.xml$/,
  /^\/national-tools(?:\/|$)/,
  /^\/white-christmas-(?:probability-map|michigan)\/$/,
  /^\/isle-royale-map(?:\/|$)/,
  /^\/assets\/(?:national-tools\.(?:css|js)|national-dashboard\.js|national-hubs\.js|national-planting-engine\.js|white-christmas\.css|isle-royale-(?:map|water-intelligence)\.js)$/,
  /^\/data\/(?:national-usgs-streamflow-sites|national-planting-crops)\.json$/,
];
const canonicalRecords = audit.records.filter(
  (record) => record.status === 200 && !record.search && record.snapshotPath
    && !NO_SOURCE_FILE.some((re) => re.test(record.pathname)),
);

for (const record of canonicalRecords) {
  const target = publicPathFor(record);
  if (intentionalRetirements.has(record.pathname)) {
    try {
      await access(target);
      failures.push(`${record.pathname}: retired route still has a source file`);
    } catch {
      // Expected during the one-crawl retirement transition.
    }
    continue;
  }
  try {
    const body = await readFile(target);
    if (intentionalChanges.has(record.pathname)) continue;
    if (committedDriftHashes.get(record.pathname) === sha256(body)) continue;
    const expectedHash = record.headers?.["content-type"]?.includes("text/html")
      ? record.fingerprint.cleanBodySha256
      : record.rawBodySha256;
    if (sha256(body) !== expectedHash) failures.push(`${record.pathname}: body differs from the clean live snapshot`);
  } catch {
    failures.push(`${record.pathname}: missing source file ${path.relative(root, target)}`);
  }
}

const htmlFiles = canonicalRecords.filter(
  (record) => record.headers?.["content-type"]?.includes("text/html")
    && !intentionalRetirements.has(record.pathname),
);
let validJsonLdBlocks = 0;
let beaconReferences = 0;
let brokenLegacyLinks = 0;
for (const record of htmlFiles) {
  const html = await readFile(publicPathFor(record), "utf8");
  beaconReferences += (html.match(/static\.cloudflareinsights\.com\/beacon\.min\.js/g) || []).length;
  brokenLegacyLinks += (html.match(/href=["'](?:https:\/\/chrisizworski\.com)?\/(?:news-coverage|prepared|save-our-shoreline)\/?["']/g) || []).length;
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(match[1]);
      validJsonLdBlocks += 1;
    } catch (error) {
      failures.push(`${record.pathname}: invalid JSON-LD (${error.message})`);
    }
  }
}

if (beaconReferences !== 0) failures.push(`Cloudflare beacon was copied ${beaconReferences} time(s)`);
if (brokenLegacyLinks !== 0) failures.push(`${brokenLegacyLinks} internal link(s) still point to known 404 URLs`);

const toolsHtml = await readFile(path.join(publicRoot, "tools", "index.html"), "utf8");
const toolLinkCount = (toolsHtml.match(/https:\/\/michiganoutdoorsnow\.chrisizworski\.com/g) || []).length;
if (toolLinkCount < 2) failures.push("Michigan Outdoors Now is missing from either visible Tools content or structured data");
if (!toolsHtml.includes("Built by Chris Izworski")) failures.push("The new Tools card is missing Chris Izworski attribution");
const toolsJsonLdMatch = toolsHtml.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
const toolsJsonLd = toolsJsonLdMatch ? JSON.parse(toolsJsonLdMatch[1]) : null;
const toolsItemList = toolsJsonLd?.["@graph"]?.find((entry) => entry["@type"] === "ItemList");
const visibleToolUrls = [...toolsHtml.matchAll(/<(?:div class="tool-card"|aside class="adventure-discovery tool-card")[^>]*>[\s\S]*?<div class="tool-title"><a href="([^"]+)"/g)].map(match => new URL(match[1], "https://chrisizworski.com").href);
if (visibleToolUrls.length < 43 || toolsItemList?.numberOfItems !== visibleToolUrls.length || JSON.stringify(toolsItemList?.itemListElement?.map(entry => entry.item.url)) !== JSON.stringify(visibleToolUrls)) {
  failures.push("Tools ItemList must preserve the catalog and match every visible card in order");
}
if (!toolsHtml.includes("Michigan &amp; Great Lakes Live Tools") || !toolsHtml.includes("Start with the live tools")) {
  failures.push("Tools discovery title or featured-tools section is missing");
}
const featuredIds = [...toolsHtml.matchAll(/data-featured-tool="([^"]+)"/g)].map(match => match[1]);
if (featuredIds.length < 10 || new Set(featuredIds).size !== featuredIds.length || (toolsHtml.match(/class="tool-cta"/g) || []).length !== featuredIds.length) {
  failures.push("Tools page must retain at least ten unique featured tools with a call to action for each");
}
if ((toolsHtml.match(/data-track-cluster=/g) || []).length < 5) {
  failures.push("Tools page is missing category jump links");
}

const sitemap = await readFile(path.join(publicRoot, "sitemap.xml"), "utf8");
// Shape, not a literal date: the value is derived and the agreement check above covers correctness.
if (!/<loc>https:\/\/chrisizworski\.com\/tools\/<\/loc>\s*<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sitemap)) {
  failures.push("Tools sitemap entry is missing a lastmod");
}
// Every sitemap lastmod must equal the dateModified of the page it points at. This replaced a
// hardcoded map of about thirty route-to-date pairs that went stale on every legitimate edit and
// had to be hand-corrected each time. It caught a real bug before it was replaced: a page whose
// content changed while its sitemap entry did not. Both values are now derived from git by
// scripts/stamp-freshness.mjs, and this asserts they agree.
{
  const entries = [...sitemap.matchAll(
    /<loc>https:\/\/chrisizworski\.com\/([^<]*)<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g,
  )];
  let mismatches = 0;
  for (const [, route, lastmod] of entries) {
    const pageFile = path.join(publicRoot, route, "index.html");
    let html;
    try { html = await readFile(pageFile, "utf8"); } catch { continue; }
    const stamp = html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
    if (!stamp) continue;
    if (stamp[1] !== lastmod) {
      mismatches += 1;
      if (mismatches <= 5) failures.push(`Sitemap lastmod ${lastmod} disagrees with dateModified ${stamp[1]} for /${route}`);
    }
  }
  if (mismatches > 5) failures.push(`...and ${mismatches - 5} more sitemap lastmod disagreements`);
}

const discoveryPages = [
  "index.html",
  "tools/index.html",
  "great-lakes/index.html",
  "soo-locks/index.html",
  "northern-lights-michigan/index.html",
  "great-lakes-buoys/index.html",
  "great-lakes-gazette/index.html",
  "great-lakes-freighter-tracking/index.html",
  "great-lakes-beaches/index.html",
  "michigan-ice/index.html",
  "mackinac-bridge-live/index.html",
  "mackinac-bridge-driver-assistance/index.html",
  "mackinac-bridge-rv-trailer-wind-rules/index.html",
  "mackinac-bridge-tolls/index.html",
  "michigan-border-wait-times/index.html",
  "gordie-howe-bridge-wait-time/index.html",
  "ambassador-bridge-wait-time/index.html",
  "detroit-windsor-tunnel-wait-time/index.html",
  "blue-water-bridge-wait-time/index.html",
  "sault-ste-marie-border-wait-time/index.html",
];
for (const relativePath of discoveryPages) {
  const html = await readFile(path.join(publicRoot, relativePath), "utf8");
  if (!html.includes('/_vercel/insights/script.js')) failures.push(`${relativePath}: Web Analytics script is missing`);
  if (!html.includes('/_vercel/speed-insights/script.js')) failures.push(`${relativePath}: Speed Insights script is missing`);
}

const greatLakesHub = await readFile(path.join(publicRoot, "great-lakes", "index.html"), "utf8");
// 9 since Aug 4 2026: the Michigan Ice Report card was added to the live grid.
if ((greatLakesHub.match(/data-featured-tool=/g) || []).length !== 9) {
  failures.push("Great Lakes hub does not contain exactly nine featured live tools");
}
const historySection = greatLakesHub.match(/<h2 class="sh">History and Heritage<\/h2>([\s\S]*?)<h2 class="sh">/)?.[1] || "";
if (/\/(?:soo-locks|northern-lights-michigan|great-lakes-buoys)\//.test(historySection)) {
  failures.push("A live Great Lakes tool remains misclassified under History and Heritage");
}

const borderRoutes = [
  "michigan-border-wait-times",
  "gordie-howe-bridge-wait-time",
  "ambassador-bridge-wait-time",
  "detroit-windsor-tunnel-wait-time",
  "blue-water-bridge-wait-time",
  "sault-ste-marie-border-wait-time",
];
for (const route of borderRoutes) {
  const html = await readFile(path.join(publicRoot, route, "index.html"), "utf8");
  if (!html.includes(`<link rel="canonical" href="https://chrisizworski.com/${route}/">`)) {
    failures.push(`${route}: canonical URL is missing or incorrect`);
  }
  if (!html.includes("/assets/michigan-border-crossings.js")) {
    failures.push(`${route}: shared live border client is missing`);
  }
  if (!sitemap.includes(`https://chrisizworski.com/${route}/`)) {
    failures.push(`${route}: sitemap entry is missing`);
  }
}
const borderMain = await readFile(path.join(publicRoot, "michigan-border-wait-times", "index.html"), "utf8");
if ((borderMain.match(/data-crossing-result=/g) || []).length !== 3) {
  failures.push("Michigan border tool does not contain all three Detroit comparison cards");
}
if (!borderMain.includes('data-corridor-card="blue-water"') || !borderMain.includes('data-corridor-card="sault-ste-marie"')) {
  failures.push("Michigan border tool is missing Blue Water or the Upper Peninsula crossing");
}
if ((borderMain.match(/data-camera="/g) || []).length !== 6) {
  failures.push("Michigan border tool does not expose all six fail-soft camera choices");
}
const borderClient = await readFile(path.join(publicRoot, "assets", "michigan-border-crossings.js"), "utf8");
if (/511on\.ca\/map\/Cctv|wtbwb\.ca\/approach/.test(borderClient)) {
  failures.push("Michigan border client bypasses the same-origin camera proxy");
}

// The NOAA water-level request lives in the client asset, not the page HTML. This check used to
// read index.html, which no longer carries the datum, so it failed on honest input and was being
// papered over by a wrapper that injected the attributes at verify time. Check the real file.
const circleTour = await readFile(path.join(publicRoot, "lake-superior-circle-tour", "index.html"), "utf8");
const circleTourClient = await readFile(path.join(publicRoot, "assets", "lake-superior-circle-tour.js"), "utf8");
if (!circleTourClient.includes("datum=LWD") || !circleTourClient.includes("ft above LWD at Duluth")) {
  failures.push("Lake Superior Circle Tour is missing the valid NOAA LWD water-level datum");
}
if (!circleTourClient.includes("station=9099064")) {
  failures.push("Lake Superior Circle Tour is not requesting NOAA station 9099064 (Duluth)");
}
if (circleTourClient.includes("datum=IGLD85") || circleTour.includes("datum=IGLD85")) {
  failures.push("Lake Superior Circle Tour still requests NOAA's invalid IGLD85 datum");
}

const aurora = await readFile(path.join(publicRoot, "northern-lights-michigan", "index.html"), "utf8");
const auroraApi = await readFile(path.join(root, "api", "aurora.js"), "utf8");
const auroraLib = await readFile(path.join(root, "lib", "aurora.js"), "utf8");
if (!aurora.includes("fetch('/api/aurora'") || !aurora.includes("NOAA feed unavailable")) {
  failures.push("Northern Lights is missing its same-origin NOAA request or visible fail-soft state");
}
if ((aurora.match(/<article[^>]+data-region-id=/g) || []).length !== 8 || !aurora.includes("Michigan aurora forecast by region tonight")) {
  failures.push("Northern Lights does not expose all eight crawlable Michigan regional answers");
}
if (!auroraApi.includes("Promise.allSettled") || !auroraApi.includes("stale-while-revalidate=900")) {
  failures.push("Aurora API is missing independent NOAA fallbacks or short CDN caching");
}
if (!auroraApi.includes("api.weather.gov/gridpoints") || !auroraApi.includes("aa.usno.navy.mil/api")) {
  failures.push("Aurora API is missing its authoritative NWS sky-cover or USNO moon source");
}
if (!aurora.includes('id="regionSelect"') || !aurora.includes('id="nextBestWindow"') || aurora.includes("New moon, 5 days")) {
  failures.push("Northern Lights is missing the region decision controls or still hard-codes a moon phase");
}
if (!aurora.includes("Aurora Field Report") || /Aurora Location Used[^\n]+(?:lat|lng|latitude|longitude)/i.test(aurora)) {
  failures.push("Aurora engagement measurement is missing or includes exact location data");
}
if (!auroraLib.includes("parseKpForecast") || !auroraLib.includes("parseOvation") || !auroraLib.includes("regionVerdict") || !auroraLib.includes("parseSkyCover") || !auroraLib.includes("parseMoon")) {
  failures.push("Aurora normalization does not preserve current NOAA formats or conditional regional verdicts");
}

const buoys = await readFile(path.join(publicRoot, "great-lakes-buoys", "index.html"), "utf8");
if (/115 NOAA|All 115 Stations|all 115 stations/i.test(buoys)) {
  failures.push("Great Lakes Buoy Dashboard still publishes the stale 115-station claim");
}
if (!buoys.includes("All Reporting Great Lakes Stations")) {
  failures.push("Great Lakes Buoy Dashboard is missing its count-safe reporting-stations heading");
}

const sooLocks = await readFile(path.join(publicRoot, "soo-locks", "index.html"), "utf8");
if (/<iframe[^>]+marinetraffic/i.test(sooLocks)) {
  failures.push("Soo Locks still contains the refused MarineTraffic iframe");
}
if (!sooLocks.includes("https://ais.boatnerd.com/passage/port/soo-locks")) {
  failures.push("Soo Locks is missing the verified BoatNerd passage-list fallback");
}
if (!sooLocks.includes("tel:+19062021333") || sooLocks.includes("Soo-Locks-Schedule/")) {
  failures.push("Soo Locks is missing the current official schedule hotline or still links the obsolete USACE schedule path");
}
const sooAisClient = await readFile(path.join(publicRoot, "assets", "soo-ais.js"), "utf8");
if (!sooLocks.includes('id="sooVesselMap"') || !sooLocks.includes('/assets/soo-ais.js') || !sooAisClient.includes("/api/soo-ais") || !sooAisClient.includes('[46.5036,-84.36]')) {
  failures.push("Soo Locks is missing its live vessel feed or lock-centered map");
}
if (/<iframe[^>]+embed\.myshiptracking/i.test(sooLocks)) {
  failures.push("Soo Locks still embeds the provider endpoint that returned a server error");
}
if (/AISSTREAM_API_KEY|\/api\/soo-vessels/.test(sooLocks)) {
  failures.push("Soo Locks still depends on the retired keyed AIS implementation");
}

const gazette = await readFile(path.join(publicRoot, "great-lakes-gazette", "index.html"), "utf8");
if (!gazette.includes("https://gazette.chrisizworski.com/api/latest")) {
  failures.push("Great Lakes Gazette does not use its public read-only latest-edition endpoint");
}
if (/authorization|\/api\/generate|great-lakes-gazette\.vercel\.app/i.test(gazette)) {
  failures.push("Great Lakes Gazette still exposes a protected endpoint, authorization header, or legacy deployment URL");
}

const projects = await readFile(path.join(publicRoot, "projects", "index.html"), "utf8");
if (!projects.includes("gazette.chrisizworski.com") || projects.includes("great-lakes-gazette.vercel.app")) {
  failures.push("Projects page still identifies the Gazette by its legacy deployment hostname");
}

for (const forbidden of ["news-coverage", "prepared", "save-our-shoreline"]) {
  try {
    await access(path.join(publicRoot, forbidden, "index.html"));
    failures.push(`Known 404 path /${forbidden}/ was accidentally converted into a static 200 page`);
  } catch {
    // Expected: these paths are handled only by explicit redirects.
  }
}

const summary = {
  status: failures.length === 0 ? "passed" : "failed",
  sourceFilesChecked: canonicalRecords.length,
  htmlRoutesChecked: htmlFiles.length,
  validJsonLdBlocks,
  intentionalContentChanges: [...intentionalChanges],
  intentionalRetirements: [...intentionalRetirements],
  failures,
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
