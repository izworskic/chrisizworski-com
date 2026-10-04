import fs from 'node:fs';

const CBBT_PAGE = 'public/chesapeake-bay-bridge-tunnel/index.html';
const NATIONAL_HUB = 'public/synced-national-tools/index.html';
const CANONICAL = 'https://chrisizworski.com/chesapeake-bay-bridge-tunnel/';
const SOCIAL_IMAGE = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Chesapeake_Bay_Bridge-Tunnel_Water_View.jpg?width=1200';
const SOCIAL_IMAGE_ID = `${CANONICAL}#primaryimage`;
const SOCIAL_TITLE = 'CBBT Conditions, Restrictions & Tolls';
const SOCIAL_DESCRIPTION = 'Check official Chesapeake Bay Bridge-Tunnel status, vehicle restrictions, wind, radar, incidents, planned work and toll estimates before crossing.';
const SOCIAL_ALT = 'Chesapeake Bay Bridge-Tunnel stretching across the lower Chesapeake Bay';

const BACKLINK_PAGES = [
  'public/mackinac-bridge-live/index.html',
  'public/gordie-howe-bridge-wait-time/index.html',
  'public/niagara-border-crossing/index.html',
];

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function setProperty(html, property, content) {
  const tag = `<meta property="${property}" content="${escapeAttr(content)}">`;
  const re = new RegExp(`<meta\\s+property=["']${escapeRe(property)}["'][^>]*>`, 'i');
  if (re.test(html)) return html.replace(re, tag);
  return html.replace('</head>', `${tag}\n</head>`);
}

function setName(html, name, content) {
  const tag = `<meta name="${name}" content="${escapeAttr(content)}">`;
  const re = new RegExp(`<meta\\s+name=["']${escapeRe(name)}["'][^>]*>`, 'i');
  if (re.test(html)) return html.replace(re, tag);
  return html.replace('</head>', `${tag}\n</head>`);
}

function addStaticCbbtBacklink(file) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('href="/chesapeake-bay-bridge-tunnel/"')) return;
  if (!html.includes('</main>')) throw new Error(`CBBT discovery tuning: </main> missing in ${file}`);

  const nav = `\n<nav data-cbbt-authority-link aria-label="Related national bridge decision tools" style="max-width:1180px;margin:28px auto 10px;padding:16px 20px;border-top:1px solid rgba(80,100,110,.22);font-size:.95rem;line-height:1.5">\n  <strong style="margin-right:.45rem">More bridge decision tools:</strong>\n  <a href="/chesapeake-bay-bridge-tunnel/">Chesapeake Bay Bridge-Tunnel conditions, restrictions &amp; tolls</a>\n</nav>\n`;
  html = html.replace('</main>', `${nav}</main>`);
  fs.writeFileSync(file, html);
}

function ensureNationalHubLink() {
  let html = fs.readFileSync(NATIONAL_HUB, 'utf8');
  if (html.includes('href="/chesapeake-bay-bridge-tunnel/"')) return;
  if (!html.includes('</main>')) throw new Error('CBBT discovery tuning: national tools hub has no </main> insertion point');

  const section = `\n<section data-cbbt-national-authority style="max-width:1180px;margin:28px auto;padding:18px 20px;border-top:1px solid rgba(80,100,110,.22)">\n  <h2 style="margin:0 0 .45rem">Bridge crossing decision tools</h2>\n  <p style="margin:0">Planning a Mid-Atlantic crossing? <a href="/chesapeake-bay-bridge-tunnel/"><strong>Check Chesapeake Bay Bridge-Tunnel conditions, vehicle restrictions, radar and tolls</strong></a>.</p>\n</section>\n`;
  html = html.replace('</main>', `${section}</main>`);
  fs.writeFileSync(NATIONAL_HUB, html);
}

let html = fs.readFileSync(CBBT_PAGE, 'utf8');

html = setProperty(html, 'og:site_name', 'Chris Izworski');
html = setProperty(html, 'og:title', SOCIAL_TITLE);
html = setProperty(html, 'og:description', SOCIAL_DESCRIPTION);
html = setProperty(html, 'og:type', 'website');
html = setProperty(html, 'og:url', CANONICAL);
html = setProperty(html, 'og:image', SOCIAL_IMAGE);
html = setProperty(html, 'og:image:secure_url', SOCIAL_IMAGE);
html = setProperty(html, 'og:image:type', 'image/jpeg');
html = setProperty(html, 'og:image:alt', SOCIAL_ALT);
html = setName(html, 'twitter:card', 'summary_large_image');
html = setName(html, 'twitter:title', SOCIAL_TITLE);
html = setName(html, 'twitter:description', SOCIAL_DESCRIPTION);
html = setName(html, 'twitter:image', SOCIAL_IMAGE);
html = setName(html, 'twitter:image:alt', SOCIAL_ALT);

const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!jsonLdMatch) throw new Error('CBBT discovery tuning: JSON-LD graph not found');
const jsonLd = JSON.parse(jsonLdMatch[1]);
const graph = jsonLd['@graph'];
if (!Array.isArray(graph)) throw new Error('CBBT discovery tuning: JSON-LD @graph missing');

const page = graph.find((node) => node?.['@type'] === 'WebPage' && node?.['@id'] === `${CANONICAL}#page`);
const app = graph.find((node) => node?.['@type'] === 'WebApplication' && node?.['@id'] === `${CANONICAL}#app`);
if (!page || !app) throw new Error('CBBT discovery tuning: required WebPage/WebApplication nodes missing');

let image = graph.find((node) => node?.['@type'] === 'ImageObject' && node?.['@id'] === SOCIAL_IMAGE_ID);
if (!image) {
  image = { '@type': 'ImageObject', '@id': SOCIAL_IMAGE_ID };
  graph.push(image);
}
Object.assign(image, {
  url: SOCIAL_IMAGE,
  contentUrl: SOCIAL_IMAGE,
  encodingFormat: 'image/jpeg',
  name: 'Chesapeake Bay Bridge-Tunnel social preview',
  caption: SOCIAL_ALT,
  representativeOfPage: true,
});
page.primaryImageOfPage = { '@id': SOCIAL_IMAGE_ID };
page.image = { '@id': SOCIAL_IMAGE_ID };
page.dateModified = '2026-10-04';
app.image = { '@id': SOCIAL_IMAGE_ID };

html = html.replace(
  jsonLdMatch[0],
  `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`,
);

if (!html.includes('href="/niagara-border-crossing/"')) {
  const relatedNeedle = '<a href="/michigan-border-wait-times/">Michigan border waits</a></nav>';
  if (!html.includes(relatedNeedle)) throw new Error('CBBT discovery tuning: related-tools nav anchor changed');
  html = html.replace(
    relatedNeedle,
    '<a href="/michigan-border-wait-times/">Michigan border waits</a><a href="/niagara-border-crossing/">Niagara border crossings</a></nav>',
  );
}

fs.writeFileSync(CBBT_PAGE, html);
BACKLINK_PAGES.forEach(addStaticCbbtBacklink);
ensureNationalHubLink();

const national = fs.readFileSync(NATIONAL_HUB, 'utf8');
if (!national.includes('href="/chesapeake-bay-bridge-tunnel/"')) {
  throw new Error('CBBT discovery tuning: failed to restore national tools hub link');
}

const tuned = fs.readFileSync(CBBT_PAGE, 'utf8');
const required = [
  '<meta name="twitter:card" content="summary_large_image">',
  `<meta property="og:image" content="${escapeAttr(SOCIAL_IMAGE)}">`,
  `<meta name="twitter:image" content="${escapeAttr(SOCIAL_IMAGE)}">`,
  'href="/niagara-border-crossing/"',
  SOCIAL_IMAGE_ID,
];
for (const marker of required) {
  if (!tuned.includes(marker)) throw new Error(`CBBT discovery tuning verification failed: ${marker}`);
}
for (const file of BACKLINK_PAGES) {
  const sibling = fs.readFileSync(file, 'utf8');
  if (!sibling.includes('data-cbbt-authority-link') || !sibling.includes('href="/chesapeake-bay-bridge-tunnel/"')) {
    throw new Error(`CBBT discovery tuning verification failed: reciprocal link missing in ${file}`);
  }
}

console.log('CBBT social discovery metadata and bridge-network authority links synced.');
