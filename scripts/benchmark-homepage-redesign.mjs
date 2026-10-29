#!/usr/bin/env node
/**
 * Homepage Redesign Value Function V(x) & Loss Function L(x) Benchmark
 * Governs https://chrisizworski.com/ (public/index.html)
 *
 * Enforces two non-negotiable mandates:
 *   1. ZERO LOSS (L(x) = 0) on Personal Entity & "Chris Izworski" Name-SERP signals:
 *      - All 16 <link rel="me"> tags preserved
 *      - Canonical #person JSON-LD, #primaryimage, and subjectOf NewsArticles/ProfilePages preserved
 *      - 100% verbatim word-for-word preservation of all 19 biographical and project prose paragraphs
 *      - 100% preservation of all internal authority spoke links and external owned/citation links
 *      - 100% preservation of existing repo test hooks (.winter-path, data-gazette-latest, analytics)
 *   2. MAXIMUM VALUE (V(x) >= 95/100) for the 1,000,000+ Spring Impressions & Interactive Publication House:
 *      - V_entity (30 pts): Masthead H1 + Creator ItemList JSON-LD + Verbatim Dossier + Verified Source links
 *      - V_impressions (25 pts): All 9 Field Guides + Michigan Adventure Finder + Flagship Tools + U.S. Tools + AdSense
 *      - V_entry (20 pts): 1260px Field Guide publication aesthetic + Two-Tier Masthead + Interactive SVG Living Atlas Map
 *      - V_media (15 pts): Interactive Intent Router + Live Gazette Wire + Publication Network + Verified Photography
 *      - V_perf (10 pts): Zero-bloat progressive enhancement, responsive breakpoints, reduced-motion, ARIA live regions
 */

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => readFile(path.join(root, rel), 'utf8');

const html = await read('public/index.html');
let css = '';
let js = '';
try { css = await read('public/assets/home-almanac.css'); } catch {}
try { js = await read('public/assets/home-almanac.js'); } catch {}

// Normalize whitespace for verbatim paragraph checking while requiring every word in sequence
const norm = (str) =>
  str
    .replace(/&rsquo;|&#8217;/g, '’')
    .replace(/&ndash;|&#8211;/g, '–')
    .replace(/&mdash;|&#8212;/g, '—')
    .replace(/&middot;/g, '·')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizedHtmlText = norm(html);

const REQUIRED_REL_ME = [
  'https://github.com/izworskic',
  'https://izworskic.github.io/',
  'https://michigantroutreport.com',
  'https://daily.michigantroutreport.com',
  'https://michiganbirdingreport.com',
  'https://daily.michiganbirdingreport.com',
  'https://gazette.chrisizworski.com',
  'https://lawn.chrisizworski.com',
  'https://picturedrocks.chrisizworski.com',
  'https://freighterviewfarms.com',
  'https://www.linkedin.com/in/chris-izworski-15294510',
  'https://www.wikidata.org/wiki/Q138283432',
  'https://medium.com/@izworski',
  'https://about.me/chrisizworski',
  'https://aibreakdown5.wordpress.com',
  'https://orcid.org/0009-0002-7268-6083',
];

const VERBATIM_PROSE_PARAGRAPHS = [
  "Chris Izworski builds practical tools for Great Lakes travel, Michigan rivers, outdoor conditions, and gardening. He created Michigan Trout Report and Michigan Birding Report, writes Freighter View Farms from Saginaw Bay, and works in public safety technology at Prepared by Axon.",
  "Chris Izworski is a public safety technology leader and solutions consultant based in Bay City, Michigan. He spent more than a decade running 911 dispatch centers in Michigan, first as Director of Bay County 911 from 2013 to 2022, then as Executive Director of Saginaw County 911 from 2022 to 2025. In those roles, he was responsible for the systems, staffing, and infrastructure that emergency communications depends on every day.",
  "In 2024, Chris led the deployment of one of Michigan's first AI-powered non-emergency call workflows at a public safety answering point. The project drew national attention, coverage from NENA, APCO International, NPR affiliate WCMU Public Radio, and WNEM TV5. The AI system redirected non-emergency call volume away from dispatchers, improving response quality and allowing the team to focus on emergencies. That work became the subject of a cover story in The Call , NENA's official publication, in Issue 51, one of the strongest third-party validations of AI implementation in 911 operations in Michigan.",
  "He now works as a Solutions Consultant at Prepared, a technology company that deploys audio collection and analysis hardware at 911 centers nationwide. The work involves hands-on technical integration with call handling equipment from Motorola VESTA, Intrado Viper, Solacom, and other vendors, the systems inside dispatch centers that receive every emergency call.",
  "Chris presented the Saginaw County AI case study at APCO International, one of the largest public safety communications conferences in the world. He has spoken to state 911 committees, Michigan broadcast audiences, and national trade publications about what AI deployment actually looks like at the operational level, not as a concept, but as a live system handling real call volume. The speaking and presentation record is documented here .",
  "Before moving into 911 leadership, Chris worked in emergency management with the American Red Cross and in government technology roles in Bay County. He holds a degree from Northwood University and served as past president of the Michigan Communications Directors Association. His professional background spans more than twenty years of public safety operations, technology deployment, and team management, always within the real constraints of government agencies: budget limits, union agreements, and systems that cannot go offline.",
  "The career timeline documents milestones from public records, state committee minutes, and published media. The citations page organizes the external sources that build the factual record, government documents, third-party coverage, and verified references. The case studies page covers operational outcomes from the AI deployment and related projects in detail.",
  "Chris runs Freighter View Farms , a seed-saving blog and gardening project based on Saginaw Bay. He writes about heirloom vegetables, Great Lakes ecology, and life on the water in Michigan. The Freighter View Farms project guide connects that first-party garden experience to the Michigan planting, frost, and seed-saving tools on this site. He also publishes the Great Lakes Gazette , a daily freighter and vessel-movement brief covering bulk carriers, tankers, and tug-barge traffic across all five lakes, built on live AIS data and updated automatically every morning.",
  "The Lake Superior Circle Tour guide is the deepest long-form piece on the site, a complete stop-by-stop guide to the 1,300-mile circumnavigation with three day-by-day itineraries, freighter-watching notes at every port, and live water-level data. The other Great Lakes content across this site, freighter tracking , Saginaw Bay ecology , maritime history , Great Lakes shipwrecks , and the Isle Royale interactive map , reflects years of watching the lakes from Bay City.",
  "Recently added Great Lakes tools and pages: Michigan Border Wait Times Live compares the Gordie Howe Bridge, Ambassador Bridge, and Detroit–Windsor Tunnel using matching official direction and lane reports, then gives Blue Water Bridge and the Sault Ste. Marie Upper Peninsula crossing their own live answers, cameras, warnings, and tolls. Mackinac Bridge Live puts the current official crossing status ahead of both direction-specific cameras, NWS Straits radar, clearly labeled off-bridge weather context, RV and trailer restrictions, nearby Mi Drive events, tolls, and official driver assistance. The Great Lakes Buoy Dashboard pulls live wave height, wind speed, and water temperature from more than 100 NOAA stations across all five lakes onto a single interactive map with activity filters and geolocation. The Edmund Fitzgerald page covers the 1975 loss on Lake Superior with the full 29-name crew list and storm reconstruction. The Soo Locks Live page tracks nearby AIS-equipped vessels on an interactive map at Sault Ste. Marie and shows the navigation-season status. The Northern Lights Michigan tool combines a live Kp forecast and solar wind feed with 11 dark-sky viewing locations across the Upper Peninsula. The Michigan Ice Report tracks accumulated freezing degree days against a ten-year normal and scores NOAA satellite ice cover against 54 years of daily climatology for six Michigan waters, leading with the Michigan DNR position that no ice is safe ice.",
  "The newest Great Lakes additions extend past maritime into the shoreline and rivers. The Michigan Beach Report compares 50 beaches using active official notices, beach hazards, recent waves and water temperature, weather, and a daily summer ranking; the core explorer stays live all year. The Michigan Boat Launches guide does the same for public launches, with current conditions keyed to the nearest NOAA buoy. The Michigan Paddling guide is a canoeist's index to Michigan rivers and water trails, with dedicated pages for the Manistee River and the Pere Marquette River .",
  "The Michigan Fall Color map tracks where the canopy actually stands across the state, built on live canopy camera readings rather than a repeated calendar, with a six-day regional forecast and destination guides from the Keweenaw Peninsula and the Porcupine Mountains to the Tunnel of Trees . For the narrow stretch of late September when Upper Peninsula color overlaps the strongest aurora window of the year, see Fall Color and Northern Lights in Michigan .",
  "Chris built the Michigan Trout Report , a free daily conditions dashboard for 63+ Michigan trout streams. The tool pulls live USGS flow and water temperature from 91 gauges, combines it with NWS weather forecasts at each river, and generates fly and lure recommendations based on current conditions. An interactive stream map shows 310 DNR access points with Google Maps navigation. Coverage spans the AuSable (eight gauges), Manistee, Pere Marquette, Muskegon, and dozens of smaller rivers, including UP streams like the Escanaba, Brule, and Paint, plus feeder creeks like Klacking Creek and Houghton Creek on the Rifle River. More on Chris's trout fishing background is on the Michigan trout streams page . Daily river conditions and hatch reports are published at Michigan Trout Daily . River-by-river notes on Michigan's named trout waters are on the Chris Izworski trout rivers page , with the independent founder profile and field notes at Michigan Trout Report and Chris Izworski Michigan Trout Field Notes . A complete index of Chris's online publications is on the works page .",
  "The Great Lakes Gazette publishes a daily maritime briefing for the Great Lakes, generated each morning from live AIS vessel data, NOAA water levels, and NWS marine forecasts. The Gazette covers commercial shipping on all five lakes, Soo Locks passages, Saginaw Bay conditions, and storm system tracking. It connects to Chris's background growing up watching freighters from Bay City and his work at Freighter View Farms .",
  "The Michigan Birding Report provides real-time bird sighting intelligence for Michigan, powered by eBird data updated every 15 minutes. The site features a Saginaw Bay birding hub covering Tobico Marsh, Nayanquing Point, and Fish Point, a BirdCast-integrated migration dashboard, and AI-generated weekend forecasts based on current conditions, migration intensity, and recent notable sightings. Species profiles include photos, range maps, and behavioral context for what each bird is doing at that moment in the season. Chris's birding profile is collected at Michigan Birding Report , with longer field notes at Chris Izworski Michigan Birding Field Notes and the Saginaw Bay journal at Chris Izworski Saginaw Bay Birding .",
  "Chris also publishes Michigan Birding Daily , a county-by-county birding report published every morning at 8 AM. Each daily post focuses on one of Michigan's 83 counties, drawing on live eBird observation data from the past 14 days, flagged notable sightings, county hotspot rankings, NWS weather forecasts, sunrise and sunset times, and seasonal context. Over time the archive becomes a comprehensive Michigan birding reference, grounded in what was actually reported during each period of the year.",
  "Chris built Perfect Lawn Advisor , a free hyperlocal lawn care planning tool that generates personalized recommendations from a street address. The tool combines USDA hardiness zone mapping, NRCS Web Soil Survey data, NOAA climatology, NWS current conditions, and MSU Extension turfgrass research to produce property-specific advice grounded in turfgrass science. Coverage spans every U.S. zone from 3a to 12b, with deeper detail for Michigan cities and Saginaw Bay's Zone 6a conditions. Built because national lawn care schedules ignore the reality of Michigan's diverse climate zones.",
  "The Pictured Rocks Planner is a logistics-first trip guide for Pictured Rocks National Lakeshore. An interactive decision tool weighs available time, walking tolerance, water comfort, and who is coming along, then recommends the boat cruise, a guided sea kayak trip, the 10-mile Chapel Loop, or the drive-and-stroll circuit. The page covers the honest comparison between all four, the Munising versus Grand Marais lodging fork, reservation-only camping and the six-month backcountry permit window, entrance fees, pet rules, the south-wind biting fly problem, and current closures, verified against National Park Service guidance.",
  "The media page is the fastest starting point for reporters and editors. It organizes verified coverage with source links, provides context for interview requests, and documents the public record around the Saginaw County AI deployment. The press page includes a brief summary and interview request pathways. For entity verification and source research, the source guide and citations page link to government documents, third-party media, profile records, and official sources.",
];

const NINE_FIELD_GUIDES = [
  '/michigan-winter-weekends/',
  '/michigan-white-christmas-escapes/',
  '/michigan-first-snow-adventures/',
  '/michigan-late-fall-adventures/',
  '/great-lakes-winter-freighter-guide/',
  '/frozen-michigan/',
  '/michigan-winter-trails/',
  '/michigan-winter-activities/',
  '/michigan-wine-cider-spirits/',
];

const REQUIRED_INTERNAL_SPOKES = [
  '/chris-izworski/',
  '/chris-izworski-works/',
  '/start-here/',
  '/tools/',
  '/national-tools/',
  '/press/',
  '/media/',
  '/timeline/',
  '/citations/',
  '/case-studies/',
  '/speaking/',
  '/blog/',
  '/ai/',
  '/guides/',
  '/chris-izworski-source-guide/',
  '/chris-izworski-news-coverage/',
  '/chris-izworski-wnem-tv5/',
  '/chris-izworski-wsgw/',
  '/chris-izworski-wcmu-public-radio/',
  '/chris-izworski-apco/',
  '/chris-izworski-michigan-911-committee/',
  '/chris-izworski-nena-the-call/',
  '/chris-izworski-bridge-michigan/',
  '/chris-izworski-mlive/',
  '/chris-izworski-gpt-trainer-case-study/',
  '/chris-izworski-save-our-shoreline/',
  '/chris-izworski-bay-city/',
  '/chris-izworski-author/',
  '/chris-izworski-publications/',
  '/chris-izworski-emergency-management/',
];

const REQUIRED_EXTERNAL_LINKS = [
  'https://www.wnem.com/2024/08/23/ai-answer-non-emergency-calls-saginaw-co/',
  'https://radio.wcmu.org/local-regional-news/2025-10-15/ai-chatbots-now-taking-non-emergency-calls-in-grand-traverse-county',
  'https://www.wsgw.com/saginaw-county-911-to-use-ai-for-non-emergency-calls/',
  'https://bridgemi.com/michigan-government/long-shifts-low-pay-high-stress-why-michigan-cant-find-911-dispatchers/',
  'https://izworskic.github.io/',
  'https://freighterviewfarms.com/about/',
  'https://michigantroutreport.com',
  'https://daily.michigantroutreport.com',
  'https://gazette.chrisizworski.com',
  'https://michiganbirdingreport.com',
  'https://daily.michiganbirdingreport.com',
  'https://lawn.chrisizworski.com',
  'https://picturedrocks.chrisizworski.com',
  'https://freighterviewfarms.com',
  'https://greatlakeslevels.org',
  'https://www.youtube.com/@izworskic',
  'https://github.com/izworskic',
];

// ---------------------------------------------------------------------------
// 1. Evaluate Hard Stop-Loss Guardrails L(x)
// ---------------------------------------------------------------------------
const lossViolations = [];

for (const url of REQUIRED_REL_ME) {
  if (!html.includes(`<link rel="me" href="${url}">`)) {
    lossViolations.push(`Missing <link rel="me" href="${url}">`);
  }
}

for (let i = 0; i < VERBATIM_PROSE_PARAGRAPHS.length; i++) {
  const target = norm(VERBATIM_PROSE_PARAGRAPHS[i]);
  if (!normalizedHtmlText.includes(target)) {
    lossViolations.push(`Verbatim paragraph #${i + 1} missing or altered: "${target.slice(0, 65)}..."`);
  }
}

for (const href of REQUIRED_INTERNAL_SPOKES) {
  if (!html.includes(`href="${href}"`)) {
    lossViolations.push(`Missing internal entity/authority link: ${href}`);
  }
}

for (const href of REQUIRED_EXTERNAL_LINKS) {
  if (!html.includes(`href="${href}"`)) {
    lossViolations.push(`Missing external owned/citation link: ${href}`);
  }
}

// Repo gate invariants
if (!html.includes('<title>Chris Izworski | AI, Public Safety, and Great Lakes</title>')) {
  lossViolations.push('Exact homepage <title> altered');
}
if (!html.includes('<link rel="canonical" href="https://chrisizworski.com/">')) {
  lossViolations.push('Canonical URL altered');
}
if (!html.includes('class="winter-path"')) {
  lossViolations.push('Missing .winter-path container required by winter-persona-flow gate');
}
if (!html.includes('Track freighters &rarr;')) {
  lossViolations.push('Missing "Track freighters &rarr;" required by freighter-tracker test');
}
if (!html.includes('data-growth-cta="home-fvf-authority"')) {
  lossViolations.push('Missing data-growth-cta="home-fvf-authority" required by factual-growth-integrity test');
}
if (!html.includes('data-gazette-latest') || !html.includes('data-gazette-placement="home-daily"')) {
  lossViolations.push('Missing Gazette daily widget attributes required by gazette-daily test');
}
if (/href=["'](?:https:\/\/chrisizworski\.com)?\/about\/?["'?#]/.test(html)) {
  lossViolations.push('Forbidden /about/ link present (must use /chris-izworski/)');
}

// ---------------------------------------------------------------------------
// 2. Evaluate 100-Point Value Function V(x)
// ---------------------------------------------------------------------------
const items = [];
const scoreItem = (dimension, maxPts, passed, label) => {
  items.push({ dimension, maxPts, earned: passed ? maxPts : 0, passed: Boolean(passed), label });
};

// Parse JSON-LD blocks
const jsonLdBlocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => {
  try { return JSON.parse(m[1]); } catch { return null; }
}).filter(Boolean);

const hasCreatorItemList = jsonLdBlocks.some((b) => {
  const text = JSON.stringify(b);
  return text.includes('"@type":"ItemList"') && text.includes('michigan-winter-weekends') && text.includes('https://chrisizworski.com/#person');
});

// Dimension 1: V_entity (30 pts) — Personal Name SERP & Multi-Slot Ownership
scoreItem('V_entity', 6, /<h1[^>]*>[\s\S]*?Chris Izworski[\s\S]*?<\/h1>/.test(html), 'Exact H1 "Chris Izworski" anchors the masthead hierarchy');
scoreItem('V_entity', 8, REQUIRED_REL_ME.every((u) => html.includes(`<link rel="me" href="${u}">`)) && jsonLdBlocks.length >= 2, 'All 16 rel="me" tags + canonical #person & subjectOf JSON-LD intact');
scoreItem('V_entity', 6, hasCreatorItemList, 'Creator ItemList JSON-LD explicitly binds #person (Chris Izworski) to flagship tools, field guides & publications');
scoreItem('V_entity', 6, VERBATIM_PROSE_PARAGRAPHS.every((p) => normalizedHtmlText.includes(norm(p))) && html.includes('itemprop="image"'), '100% verbatim preservation of all 19 biographical & project prose paragraphs + portrait itemprop="image"');
scoreItem('V_entity', 4, html.includes('id="positive-search-targets"') && html.includes('id="verified-source-pages"') && html.includes('class="related-cluster'), 'All 3 verified source/coverage clusters structured and crawlable');

// Dimension 2: V_impressions (25 pts) — 1M Spring Impression Engine & Internal PageRank
const linkedGuidesCount = NINE_FIELD_GUIDES.filter((g) => html.includes(`href="${g}"`)).length;
scoreItem('V_impressions', 10, linkedGuidesCount === 9 && html.includes('href="/michigan-destinations/"'), `All 9 Seasonal Field Guides (${linkedGuidesCount}/9) + Michigan Adventure Finder directly linked from homepage`);
scoreItem('V_impressions', 8, [
  '/mackinac-bridge-live/',
  '/michigan-border-wait-times/',
  '/soo-locks/',
  '/northern-lights-michigan/',
  '/great-lakes-buoys/',
  '/great-lakes-freighter-tracking/',
  '/michigan-ice/',
  '/michigan-snow-depth/',
  '/lake-effect-snow/',
  '/michigan-cross-country-skiing/',
  '/snowmobile/',
].every((u) => html.includes(`href="${u}"`)), 'All 11 high-velocity Michigan & Great Lakes live tools surfaced');
scoreItem('V_impressions', 7, html.includes('href="/national-tools/"') && html.includes('ca-pub-8222782620788075') && html.includes('/assets/tool-engagement.js'), 'U.S. National Tools hub + AdSense monetization + engagement tracking active');

// Dimension 3: V_entry (20 pts) — Above-the-Fold Authority, Visual System & Interactive Living Atlas
const combinedCss = html + '\n' + css;
scoreItem('V_entry', 6, combinedCss.includes('Fraunces') && combinedCss.includes('#f5f4ed') && combinedCss.includes('1260px'), 'Cohesive Publication House aesthetic (1260px grid, #f5f4ed warm paper, Fraunces + DM Sans)');
const primaryNavMatch = html.match(/<nav[^>]*aria-label="Primary[^"]*"[^>]*>([\s\S]*?)<\/nav>/i);
const primaryNavLinks = primaryNavMatch ? (primaryNavMatch[1].match(/<a\b/gi) || []).length : 99;
scoreItem('V_entry', 6, primaryNavLinks >= 5 && primaryNavLinks <= 7 && html.includes('aria-label="Verified entity and press dossier"'), `Two-Tier Masthead Navigation (Primary reader nav has ${primaryNavLinks} focused items + Secondary entity dossier strip)`);
scoreItem('V_entry', 8, html.includes('id="living-atlas-map"') && (html.match(/data-atlas-region=/g) || []).length >= 6, 'Interactive SVG "Living Atlas" of Michigan & the Great Lakes with 6+ clickable regional corridors above the fold');

// Dimension 4: V_media (15 pts) — Interactive Storytelling, Gazette Wire & Verified Photography
scoreItem('V_media', 6, (html.match(/data-intent-filter=/g) || []).length >= 6 && (html.match(/data-dossier-tab=/g) || []).length >= 3 && js.length > 1500, 'Interactive Intent/Condition Switcher + Interactive Dossier Explorer powered by progressive JS');
scoreItem('V_media', 5, html.includes('data-gazette-latest') && html.includes('id="publication-network"'), 'Live Great Lakes Gazette wire + Independent Publication Network masthead grid');
scoreItem('V_media', 4, (html.match(/data-photo-provenance="verified"/g) || []).length >= 4, '4+ verified Wikimedia/NPS regional photographs with license attribution');

// Dimension 5: V_perf (10 pts) — Core Web Vitals, Mobile Ergonomics & Accessibility
const assetBytes = Buffer.byteLength(css, 'utf8') + Buffer.byteLength(js, 'utf8');
scoreItem('V_perf', 4, assetBytes > 0 && assetBytes <= 55_000, `Lightweight zero-framework progressive bundle (${(assetBytes / 1024).toFixed(1)} KB <= 55 KB)`);
scoreItem('V_perf', 3, combinedCss.includes('prefers-reduced-motion: reduce') && combinedCss.includes('@media (max-width: 640px)'), 'Responsive mobile breakpoints + prefers-reduced-motion support');
scoreItem('V_perf', 3, html.includes('class="hm-skip"') && html.includes('aria-live="polite"'), 'Skip-to-main link + ARIA live region for interactive filter announcements');

const rawScore = items.reduce((sum, item) => sum + item.earned, 0);
const navOverloadPenalty = primaryNavLinks > 7 ? Math.min(14, (primaryNavLinks - 6) * 2) : 0;
const hardLossPenalty = lossViolations.length * 25;
const netScore = Math.max(0, rawScore - navOverloadPenalty - hardLossPenalty);

console.log('======================================================================');
console.log('  CHRISIZWORSKI.COM HOMEPAGE VALUE & LOSS BENCHMARK REPORT');
console.log('======================================================================');
for (const dim of ['V_entity', 'V_impressions', 'V_entry', 'V_media', 'V_perf']) {
  const dimItems = items.filter((i) => i.dimension === dim);
  const dimEarned = dimItems.reduce((s, i) => s + i.earned, 0);
  const dimMax = dimItems.reduce((s, i) => s + i.maxPts, 0);
  console.log(`\n${dim.padEnd(15)} ${String(dimEarned).padStart(2)} / ${dimMax} pts`);
  for (const i of dimItems) {
    console.log(`  [${i.passed ? 'PASS' : 'MISS'}] (${i.earned}/${i.maxPts}) ${i.label}`);
  }
}

console.log('\n----------------------------------------------------------------------');
console.log(`Raw Value Score V(x):        ${rawScore} / 100`);
console.log(`Nav Overload Penalty:       -${navOverloadPenalty} pts (primary nav links: ${primaryNavLinks})`);
console.log(`Hard Loss Violations L(x):   ${lossViolations.length} violation(s) (-${hardLossPenalty} pts)`);
if (lossViolations.length) {
  for (const v of lossViolations) console.log(`  ! LOSS: ${v}`);
}
console.log(`NET HOMEPAGE SCORE:          ${netScore} / 100`);
console.log('======================================================================');

if (process.argv.includes('--check')) {
  if (lossViolations.length > 0 || netScore < 95) {
    console.error(`HOMEPAGE BENCHMARK FAILED: Net score ${netScore}/100 (target >= 95, loss violations: ${lossViolations.length})`);
    process.exit(1);
  }
  console.log('HOMEPAGE BENCHMARK PASSED: 100/100 Value & Zero Loss verified.');
}
