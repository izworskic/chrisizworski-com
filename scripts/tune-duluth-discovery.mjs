import fs from 'node:fs';

const PAGE = 'public/duluth-canal-park/index.html';
const CLIENT = 'public/assets/duluth-canal.js';
const TRACKER = 'public/great-lakes-freighter-tracking/index.html';
const SITEMAP = 'public/sitemap.xml';
const CANONICAL = 'https://chrisizworski.com/duluth-canal-park/';
const TITLE = 'Duluth Ship Schedule Today & Live Cams | Chris Izworski';
const DESCRIPTION = 'Duluth ship schedule today with live AIS, Aerial Lift Bridge passage windows, Canal Park cams, vessel map and the best places to watch.';

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Duluth discovery patch: missing ${label}`);
  return source.replace(before, after);
}

function textLength(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:x27|39);/gi, "'")
    .length;
}

let html = fs.readFileSync(PAGE, 'utf8');

html = replaceOnce(
  html,
  '<title>Duluth Ship Schedule & Live Canal Park Map | Chris Izworski</title>',
  `<title>${TITLE}</title>`,
  'title'
);
html = replaceOnce(
  html,
  '<meta name="description" content="See the next supported ship watch at Duluth Canal Park with live AIS, anticipated passage windows, a vessel map, webcam links and Aerial Lift Bridge guidance.">',
  `<meta name="description" content="${DESCRIPTION}">`,
  'meta description'
);
if (!/<meta\s+name=["']robots["']/i.test(html)) {
  html = html.replace(
    `<meta name="description" content="${DESCRIPTION}">`,
    `<meta name="description" content="${DESCRIPTION}">\n<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">`
  );
}
html = replaceOnce(
  html,
  '<meta property="og:title" content="Duluth Ship Schedule & Live Canal Park Map">',
  '<meta property="og:title" content="Duluth Ship Schedule Today, Live Cams & Map">',
  'Open Graph title'
);
html = replaceOnce(
  html,
  '<meta property="og:description" content="Track the next supported Duluth ship watch with live AIS, mapped cameras, passage windows and Canal Park viewing spots.">',
  '<meta property="og:description" content="See which Duluth ship is coming next with live AIS, Aerial Lift Bridge passage windows, live cams, map and Canal Park viewing spots.">',
  'Open Graph description'
);

const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!jsonLdMatch) throw new Error('Duluth discovery patch: JSON-LD graph not found');
const jsonLd = JSON.parse(jsonLdMatch[1]);
const graph = jsonLd['@graph'];
if (!Array.isArray(graph)) throw new Error('Duluth discovery patch: JSON-LD @graph missing');
const person = graph.find(node => node?.['@type'] === 'Person' && node?.['@id'] === 'https://chrisizworski.com/#person');
const app = graph.find(node => node?.['@type'] === 'WebApplication' && node?.['@id'] === `${CANONICAL}#app`);
const place = graph.find(node => node?.['@type'] === 'TouristAttraction');
const page = graph.find(node => node?.['@type'] === 'WebPage' && node?.['@id'] === CANONICAL);
if (!person || !app || !place || !page) throw new Error('Duluth discovery patch: required JSON-LD nodes missing');
app.name = 'Duluth Ship Schedule Today, Live Cams & Map';
app.description = 'Live Duluth ship schedule built from fresh AIS with anticipated Aerial Lift Bridge passage windows, vessel map, Canal Park live cameras and viewing spots.';
app.isAccessibleForFree = true;
app.featureList = [
  'Fresh AIS vessel positions',
  'Anticipated Duluth Ship Canal passage windows',
  'Canal Park live camera network',
  'Mapped ship-watching locations'
];
place['@id'] = `${CANONICAL}#place`;
page.name = 'Duluth Ship Schedule Today, Live Cams & Map';
page.description = 'Duluth ship schedule today with live AIS, anticipated Aerial Lift Bridge passage windows, Canal Park live cameras, vessel map and ship-watching locations.';
page.about = { '@id': `${CANONICAL}#place` };
page.dateModified = '2026-09-25';
const updatedJsonLd = `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`;
html = html.replace(jsonLdMatch[0], updatedJsonLd);

html = replaceOnce(
  html,
  '<h1>Duluth ship schedule &amp; Canal Park live watch</h1>',
  '<h1>Duluth ship schedule today &amp; Canal Park live cams</h1>',
  'H1'
);
html = replaceOnce(
  html,
  '<p class="lede">The boat-watcher question is simple: <strong>what ship matters next, where is it now, and can I see it?</strong> Fresh AIS builds the watch window; the monitor connects the selected vessel, other supported candidates, live cameras and the best places to stand.</p>',
  '<p class="lede"><strong>Want to know what ship is coming through Duluth next?</strong> This live Duluth ship schedule uses fresh AIS to identify the best-supported next Aerial Lift Bridge passage, show its time window and location, and connect you to Canal Park live cams and the best places to watch.</p>',
  'hero direct answer'
);
html = replaceOnce(html, '>Boat watcher monitor</a>', '>Live ship map</a>', 'hero live map action');
html = replaceOnce(html, '>Live cameras</a>', '>Canal Park live cams</a>', 'hero camera action');
html = replaceOnce(html, '>Where to watch</a>', '>Where to watch ships</a>', 'hero viewing action');
html = replaceOnce(html, '<div class="watch-kicker">CHECKING LIVE AIS</div>', '<div class="watch-kicker">CHECKING DULUTH SHIP TRAFFIC</div>', 'static watch kicker');
html = replaceOnce(html, '<h2>Finding the best supported next Canal Park watch…</h2>', '<h2>Finding the next supported Aerial Lift Bridge passage…</h2>', 'static watch headline');
html = replaceOnce(
  html,
  '<p>The page only publishes a passage window when fresh vessel position, motion and route evidence support it.</p>',
  '<p>Fresh AIS is checking which ship is actually moving toward the Duluth Ship Canal now. A passage window appears only when the evidence is strong enough to be useful.</p>',
  'static watch explanation'
);
html = replaceOnce(html, '<h2 id="map-title">Duluth boat watcher monitor</h2>', '<h2 id="map-title">Duluth ships live map &amp; Canal Park cameras</h2>', 'map H2');
html = replaceOnce(
  html,
  '<p>One spatial picture for the next supported ship, other anticipated passages, recent local AIS reports, both live cameras and the three in-person watch positions.</p>',
  '<p>Track the next supported ship, anticipated arrivals and departures, recent local AIS reports, the mapped camera network and three Canal Park viewing spots in one place.</p>',
  'map intro'
);
html = replaceOnce(html, '<strong class="monitor-title">2 mapped live cameras</strong>', '<strong class="monitor-title">19 mapped camera feeds</strong>', 'static camera count');
html = replaceOnce(html, '>Cameras</button>', '>Camera network</button>', 'camera network button');
html = replaceOnce(html, '<h2 id="anticipated-title">Anticipated ships</h2>', '<h2 id="anticipated-title">Duluth ship arrivals &amp; departures to watch</h2>', 'anticipated H2');
html = replaceOnce(
  html,
  '<p class="section-intro">This is the monitor’s short watch queue, not a copied schedule. Every card is backed by fresh AIS position, current motion and route evidence. Tap a card to find the same vessel on the map—even when it is still outside the 28-NM close-in harbor view.</p>',
  '<p class="section-intro">This is a live watch queue built from fresh AIS, not a copied official timetable. Each card needs current position, motion and route evidence, and opens the same vessel on the map.</p>',
  'anticipated intro'
);
html = replaceOnce(html, '<h2 id="where-title">Where to watch at Canal Park</h2>', '<h2 id="where-title">Where to watch ships at Duluth Canal Park</h2>', 'where-to-watch H2');
html = replaceOnce(html, '<h2 id="how-title">How the anticipated-ship feature works</h2>', '<h2 id="how-title">How this live Duluth ship schedule works</h2>', 'how H2');
html = replaceOnce(html, '<h2 id="visitor-title">Visitor details that matter</h2>', '<h2 id="visitor-title">Plan a Canal Park ship-watching visit</h2>', 'visitor H2');
html = replaceOnce(html, '<h2 id="faq-title">Duluth ship-watching questions</h2>', '<h2 id="faq-title">Duluth ship schedule &amp; Canal Park questions</h2>', 'FAQ H2');
html = replaceOnce(
  html,
  '<div class="source-item"><strong>Duluth Harbor Cam</strong><span>Canal Cam at the Maritime Visitor Center, mapped directly into the monitor above.</span>',
  '<div class="source-item"><strong>Duluth Harbor Cam</strong><span>Mapped camera network spanning Canal Park, the Twin Ports and the North Shore, with the primary Canal Cam beside the live ship monitor.</span>',
  'Duluth Harbor Cam source copy'
);
fs.writeFileSync(PAGE, html);

let client = fs.readFileSync(CLIENT, 'utf8');
client = replaceOnce(client, "el('div', 'NEXT SHIP TO WATCH', 'watch-kicker')", "el('div', 'NEXT DULUTH SHIP TO WATCH', 'watch-kicker')", 'fallback watch kicker');
client = replaceOnce(client, "el('h2', 'No supported Canal Park passage to call yet.')", "el('h2', 'No supported Aerial Lift Bridge passage to call yet.')", 'fallback watch headline');
client = replaceOnce(client, "el('span', 'Plan around', 'arrival-label')", "el('span', 'Passage window', 'arrival-label')", 'passage window label');
client = replaceOnce(client, "button('Locate this ship', 'button compact'", "button('Track ship on live map', 'button compact'", 'primary map CTA');
client = replaceOnce(client, "button('Open live camera', 'button secondary compact'", "button('Open Canal Park live cam', 'button secondary compact'", 'primary camera CTA');
client = replaceOnce(client, "el('div', 'BEST SUPPORTED WATCH', 'watch-kicker')", "el('div', 'NEXT DULUTH SHIP TO WATCH', 'watch-kicker')", 'selected watch kicker');
client = replaceOnce(client, "empty.append(el('strong', 'Nothing supported yet.')", "empty.append(el('strong', 'No Duluth passage supported yet.')", 'empty state');
client = replaceOnce(client, "selected ? 'NEXT WATCH' : c.direction === 'departure' ? 'Departure candidate' : 'Arrival candidate'", "selected ? 'NEXT DULUTH SHIP' : c.direction === 'departure' ? 'Duluth departure' : 'Duluth arrival'", 'candidate labels');
client = replaceOnce(client, "next.replaceChildren(el('div', 'NEXT WATCH', 'monitor-kicker'))", "next.replaceChildren(el('div', 'NEXT DULUTH SHIP', 'monitor-kicker'))", 'monitor next label');
client = replaceOnce(client, "el('strong', '2 mapped live cameras', 'monitor-title')", "el('strong', '2 primary live video views', 'monitor-title')", 'primary video copy');
client = replaceOnce(client, "el('div', 'IN PERSON', 'monitor-kicker')", "el('div', 'CANAL PARK', 'monitor-kicker')", 'in-person label');
fs.writeFileSync(CLIENT, client);

let tracker = fs.readFileSync(TRACKER, 'utf8');
tracker = replaceOnce(
  tracker,
  '<p>The harbor and lift bridge approach make vessel arrivals visible and easy to pair with a dedicated passage list.</p><button class="corridor-jump" type="button" data-freighter-view="duluth">Show Duluth traffic</button>',
  '<p>The harbor and lift bridge approach make vessel arrivals visible and easy to pair with a dedicated passage list. For Canal Park, use the <a href="/duluth-canal-park/">Duluth ship schedule, live cams and next-watch monitor</a>.</p><button class="corridor-jump" type="button" data-freighter-view="duluth">Show Duluth traffic</button>',
  'Great Lakes tracker contextual link'
);
fs.writeFileSync(TRACKER, tracker);

let sitemap = fs.readFileSync(SITEMAP, 'utf8');
const escapedCanonical = CANONICAL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const existing = new RegExp(`\\s*<url>\\s*<loc>${escapedCanonical}<\\/loc>[\\s\\S]*?<\\/url>\\s*`, 'g');
sitemap = sitemap.replace(existing, '\n');
const sitemapEntry = `  <url>\n    <loc>${CANONICAL}</loc>\n    <lastmod>2026-09-25</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
if (!sitemap.includes('</urlset>')) throw new Error('Duluth discovery patch: sitemap missing </urlset>');
sitemap = sitemap.replace('</urlset>', `${sitemapEntry}</urlset>`);
fs.writeFileSync(SITEMAP, sitemap);

// Build-time verification: fail deployment if the treatment, entity graph or discovery links drift.
const finalHtml = fs.readFileSync(PAGE, 'utf8');
const finalClient = fs.readFileSync(CLIENT, 'utf8');
const finalTracker = fs.readFileSync(TRACKER, 'utf8');
const finalSitemap = fs.readFileSync(SITEMAP, 'utf8');
const checks = [
  ['query-first title', finalHtml.includes(`<title>${TITLE}</title>`)],
  ['title length', textLength(TITLE) <= 60],
  ['meta description', finalHtml.includes(`<meta name="description" content="${DESCRIPTION}">`)],
  ['meta length', textLength(DESCRIPTION) <= 158],
  ['canonical', finalHtml.includes(`<link rel="canonical" href="${CANONICAL}">`)],
  ['indexable robots', /<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">/.test(finalHtml)],
  ['query-aligned H1', finalHtml.includes('<h1>Duluth ship schedule today &amp; Canal Park live cams</h1>')],
  ['crawlable direct answer', finalHtml.includes('Want to know what ship is coming through Duluth next?')],
  ['Aerial Lift Bridge intent', finalHtml.includes('Aerial Lift Bridge passage')],
  ['camera intent', finalHtml.includes('Canal Park live cams')],
  ['dynamic next-ship language', finalClient.includes('NEXT DULUTH SHIP TO WATCH')],
  ['contextual inbound link', finalTracker.includes('href="/duluth-canal-park/"')],
  ['sitemap exactly once', (finalSitemap.match(new RegExp(escapedCanonical, 'g')) || []).length === 1],
  ['no tracking junk', !/utm_source=chatgpt\.com/i.test(finalHtml + finalClient + finalTracker)]
];
for (const [label, pass] of checks) {
  if (!pass) throw new Error(`Duluth discovery verification failed: ${label}`);
}
const verifyLdMatch = finalHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
const verifyLd = JSON.parse(verifyLdMatch[1]);
const verifyGraph = verifyLd['@graph'];
const verifyPerson = verifyGraph.find(node => node?.['@type'] === 'Person');
const verifyPage = verifyGraph.find(node => node?.['@type'] === 'WebPage' && node?.['@id'] === CANONICAL);
const verifyApp = verifyGraph.find(node => node?.['@type'] === 'WebApplication' && node?.['@id'] === `${CANONICAL}#app`);
if (verifyPerson?.['@id'] !== 'https://chrisizworski.com/#person') throw new Error('Duluth discovery verification failed: canonical Person entity');
if (verifyPage?.author?.['@id'] !== 'https://chrisizworski.com/#person') throw new Error('Duluth discovery verification failed: WebPage author entity');
if (verifyApp?.name !== 'Duluth Ship Schedule Today, Live Cams & Map') throw new Error('Duluth discovery verification failed: WebApplication name');

console.log(`Duluth discovery treatment verified: ${TITLE} (${textLength(TITLE)} chars); meta ${textLength(DESCRIPTION)} chars; sitemap + inbound link present.`);
