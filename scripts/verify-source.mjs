#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const audit = JSON.parse(await readFile(path.join(root, "audit", "live", "manifest.json"), "utf8"));
const failures = [];
const intentionalRetirements = new Set([
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
  // Aug 25 2026: Person entity consolidated. The canonical @id carried FIVE different
  // description values, two url values and an alumniOf that dropped a school on two of three
  // pages. Verified semantically (parsed JSON-LD compared property by property) that nothing but
  // url / description / alumniOf moved on these routes. Re-crawl after deploy and these pins can
  // go back to the live snapshot.
  ["/chris-izworski-biography/", "2191b790b006cd1c9ff20308aff607b319f9b79cfbec3cd0e0515ffd78c3d526"],
  ["/chris-izworski-works/", "af21c1ee61fbc79af0830839fe26640caab69ad8b37fcd8cc6e9af0b074b75b5"],
  ["/fall-color/ann-arbor-irish-hills-fall-color/", "634fefef781139739d04e38bdedfbd284218117ec6d605efa8f324c2ecd87a12"],
  ["/fall-color/au-sable-river-fall-color/", "b3dcd933063da636e26b0f2560784ab6fcdf0a7a039a2df1e09a1da6bcd89711"],
  ["/fall-color/mackinac-island-fall-color/", "55015e97be6c220c37ba1f2ee5e8f838327544f01c8337b8116c7b6247b415c3"],
  ["/fall-color/porcupine-mountains-fall-color/", "1e567e04859ad4e439b065ade09752951ad8749edbd95eb125f7d5c9869144d6"],
  ["/fall-color/saginaw-bay-fall-color/", "1ea75e836c9f79708789c8268191cdc3f8c2936309f7ff325b5561ac1956b373"],
  ["/fall-color/saugatuck-southwest-michigan-fall-color/", "87f53ccb48579f6997348408ff1469da25ab0c4f18b7dc3f714776df74fd44cf"],
  ["/fall-color/sleeping-bear-dunes-fall-color/", "daed7021f8a3420896e5aaaf57697dcb5e4981925f2495d9a9867ee6f4d3ce08"],
  ["/fall-color/tahquamenon-falls-fall-color/", "053ceed528fa1af060a7b726bfc3ef625aea88e5139b17ca15b3cc17d9804765"],
  ["/fall-color/upper-peninsula-fall-color/", "1b596e7ef4b40a7a69c817b49964fed92b5976c86d588fa397caed351cb57185"],
  ["/fall-color/when-do-leaves-peak-in-michigan/", "b54711940707b4d78ddcb9cbd6e7be03a7b5780e90edd67ae882654fd0a577eb"],
  ["/great-lakes-maritime-history/", "9bb601c956924248b5906620e61a5af905235c2c89b8324ae30dc6fcc2fd52f2"],
  ["/au-sable-river/", "fa36c47fb8f61618e4f52f8db6ba56e6f3d630e178cc137499f00a6fc4dfef42"],
  ["/edmund-fitzgerald/", "a722575cbf373e9e66c874d48a61dafb089e19a79f2df5e261053940ec3f3f04"],
  ["/heirloom-seed-saving-guide/", "2e5d3c53110102a7f6784f3c7f6ac86b1f9be6840f297a515ead80111c1b6e87"],
  ["/michigan-paddling/pere-marquette/", "9f5d099de514fc829c4315ac3487500f8572761596ba797d66ca463d8df00ec2"],
  // Aug 19 2026: stamp-freshness corrected dateModified and the matching sitemap
  // lastmod on these routes to their real last content commit. Verified line by
  // line that nothing but those date stamps moved. Re-crawl after deploy and
  // these pins can go back to the live snapshot.
  ["/great-lakes-beaches/bete-grise/", "ec82d60fb023a022fbf31ddda5f4fc5f1458c0ef74804fb1fed0f7f3b711b897"],
  ["/great-lakes-beaches/bird-creek-county-park/", "8cb3d0ff2bd3c1a3c77721026231ce362950c6489727c6f29384ec2ed27c3652"],
  ["/great-lakes-beaches/black-river-harbor/", "38ee0d79afb4391e96f3f33bb262e3d9401502d1cdfd024828377725611ca38a"],
  ["/great-lakes-beaches/caseville-county-park/", "272063b387eeb6fd41e0618f8bb8e738f51275a82e0fb1416d56fee736d07935"],
  ["/great-lakes-beaches/cheboygan-state-park/", "73df365afb3f419465fafb745a1882fa507fd678ded477294bff2e0d66d83e00"],
  ["/great-lakes-beaches/crisp-point/", "43e95b008b19d718acaf1f8cdfe74b7710c9cf6ccc3880e202119e0474b0d0f2"],
  ["/great-lakes-beaches/glen-arbor-area/", "58f6c11d1b598971feca5351785c7dcc242827e2ecff65b5cd47576cda6d187e"],
  ["/great-lakes-beaches/grand-haven-state-park/", "149cb16c018115861320d20f3ad0ec76d10cf30226e1260ee459e5c78a624ec0"],
  ["/great-lakes-beaches/grand-marais-beach/", "5221a901b4caf7ef06e707af1aaafdeddcac5c919c9a1fd4e7d0f603eb0879e5"],
  ["/great-lakes-beaches/harrisville-state-park/", "88126c53cecce6e1e238de5e4feeb48008d71c57b0df0163a9b46912fd6dde8d"],
  ["/great-lakes-beaches/hoeft-state-park/", "de97cc78d7a39546c7ff1f5526baa0decbd0d54d1abcbe8e13444ec71fa6df56"],
  ["/great-lakes-beaches/lakeport-state-park/", "0461e4494014a8e014bf90abc655e3ace947b798b1032e8b19e513ed68e3f1a0"],
  ["/great-lakes-beaches/luna-pier/", "6412706674ad28cd13220a58c68037b4173f73adfcb5209665f36368780cd9aa"],
  ["/great-lakes-beaches/marquette-south-beach/", "153c8975b575baee3cf4c3631705a409ff6abecbebc2d1294a0e34d49a67ba76"],
  ["/great-lakes-beaches/mclain-state-park/", "4480f2fd44d4d0ec33a9e879c09d800f1b98002c1fdc6f073c0f78eda14c6c1e"],
  ["/great-lakes-beaches/miners-beach/", "df340a592f13f9633fb77f5fc3488a265a7de1133c868b4c551436b5afb4b83c"],
  ["/great-lakes-beaches/muskegon-state-park/", "e73613d551fde16432bf28117864f7f3b749114df4840ba30668e3a61d7a906a"],
  ["/great-lakes-beaches/new-buffalo-beach/", "1f4f522ef570e3701813aa21a6f8a5b4b766995af162e9bfbfedaea354a8bdcf"],
  ["/great-lakes-beaches/north-bar-lake/", "b2c8fbb4f82efde1b6a9d2b307c9bfc605398148b7d2de618aba0d4abdf61463"],
  ["/great-lakes-beaches/oscoda-beach-park/", "3c1e11b4fdfc5fde7000bfbb7fbe8d1b11dd6e4839fac09c4805172052cba9b5"],
  ["/great-lakes-beaches/oval-beach/", "b82723ace2c064e3662817e76ae27f42bdc5e0fb228b241d1c00b959872a0458"],
  ["/great-lakes-beaches/pentwater-beach/", "5bd9cceb0070efce19c4877aefdb40cfd8ed64b2eb8c034b58e2adc65b856b87"],
  ["/great-lakes-beaches/pere-marquette-park/", "a35d61181a1ea89000327d3c8deabbddf801764aee3fca1bb0f59fd63f30deef"],
  ["/great-lakes-beaches/petoskey-state-park/", "42555cb9a1e766221b0cfecef4816894e2c47150b721782ab8a5eb641541e06f"],
  ["/great-lakes-beaches/pj-hoffmaster-state-park/", "9f08ead52ef0617e6248968832d3c41c381c9b6c33e04d5104a7ba3f34e3658b"],
  ["/great-lakes-beaches/port-crescent-state-park/", "9fa886280ff2c850b8e20fe0ad3fa6e2c81c78085f117d39358d1c153716b848"],
  ["/great-lakes-beaches/presque-isle-marquette/", "11cff5b76b4724da7bbe7c5454b867d92de6a6564a1439f49ef9626cb3fb84cb"],
  ["/great-lakes-beaches/rogers-city-lakeside-park/", "dbe9e20a437298217430bb1ca0e374f8d61221d534eb774b2b7427550f420d34"],
  ["/great-lakes-beaches/sand-point-pictured-rocks/", "8f5f11390512b565551cc7318dd5b603114eb5f3a17b5256b762645cfb07e425"],
  ["/great-lakes-beaches/sand-point-saginaw-bay/", "4890b9bd1a7fc38f2bdd5486c779ac4788e91e11a7acd85b35a3f48936f5a1b7"],
  ["/great-lakes-beaches/saugatuck-dunes-state-park/", "44184262f7f929cf1033fc30435ea901b1a32745a4cb2a28b522714ea113be9e"],
  ["/great-lakes-beaches/silver-lake-state-park/", "bf4a8a25edb5c1c83120ac04a1e6f2974ace3a8d0bff6beb23e0c6f46185f88c"],
  ["/great-lakes-beaches/sleeping-bear-dunes-empire/", "392061268f60110d7eab4ac168b6327aa22ee33ab871ca3522827c5325b55a55"],
  ["/great-lakes-beaches/sleeping-bear-platte-river/", "e92e0f077910ad329a2caa3478736fb7e33bdc27767d665be18cf33bd93d2bc1"],
  ["/great-lakes-beaches/stearns-park-beach/", "3a713536258b04c08084eea3bbc24d954b80579bd80a543d3684bf1d1384d491"],
  ["/great-lakes-beaches/sterling-state-park/", "d58faaa73b2b948843841ffb1a3f7e19315ee84e710b401e3d9be2b2ff080d3a"],
  ["/great-lakes-beaches/tawas-point-state-park/", "9f4cd0110a67c735e4f4b13fd3213483732bab84384d43080e3f87f13f9156b4"],
  ["/great-lakes-beaches/tunnel-park-holland/", "7e90cb9bef5f3697404d4de08976094359a9cca92abacc955679e438b3548da9"],
  ["/great-lakes-beaches/twelvemile-beach/", "67da0b062d26a3e87de739bbe40bf5054ea1c9c999badcc6e38d9f131b87d2df"],
  ["/great-lakes-beaches/van-buren-state-park/", "f9a457f829c37b5c8c7c45dfee7f6462155e64ddeca89d9192a5ee8d8e5c2355"],
  ["/great-lakes-beaches/warren-dunes-state-park/", "7809329dd5ee2b85954b29bc3d52e1fc72014f5a61acea582b29de4832539b6b"],
  ["/great-lakes-beaches/wenonah-park/", "92ef0e15291a5bfebf4e89bb3c75226e8352867d0b7fcb35c631178059c176ff"],
  ["/great-lakes-beaches/whitefish-point/", "1dfa103faf8c639a4235ba668a55393b17623793710471579ffb0eb7ccb11a20"],
  ["/great-lakes-beaches/wilderness-state-park/", "6341bdb514bd1ab07c01233bdc8442e2e84e320bcebe2ec7c182b23b19ab5bb1"],
  // Authorized Aug. 29 branded-profile freshness update; keep this as a pinned hash, not an exemption.
  ["/sitemap-reputation.xml", "18f2531cdfa12a0305492c5d719d1c90c1967849c21fabb5927ac78153372dcd"],
  ["/zone-6a-planting-calendar/", "3b34180a82558e2df887dc238ad31dc8d1995e465b3e5d81972ddec260414565"],
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
const NO_SOURCE_FILE = [/^\/api\//, /^\/_vercel\//, /^\/fall-color\/rss\.xml$/];
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
if (toolsItemList?.numberOfItems !== 36 || toolsItemList?.itemListElement?.length !== 36) {
  failures.push("Tools ItemList does not contain exactly 36 entries");
}
if (!toolsHtml.includes("Michigan &amp; Great Lakes Live Tools") || !toolsHtml.includes("Start with the live tools")) {
  failures.push("Tools discovery title or featured-tools section is missing");
}
if ((toolsHtml.match(/data-featured-tool=/g) || []).length !== 10 || (toolsHtml.match(/class="tool-cta"/g) || []).length !== 10) {
  failures.push("Tools page does not contain exactly ten featured tool cards and calls to action");
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
if (!sooLocks.includes("https://embed.myshiptracking.com/embed?myst") || !sooLocks.includes("lat=46.5036") || !sooLocks.includes("lng=-84.36")) {
  failures.push("Soo Locks is missing the official no-key live map centered on the lock complex");
}
if (/AISSTREAM_API_KEY|\/api\/soo-vessels|leaflet@1\.9\.4/.test(sooLocks)) {
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
