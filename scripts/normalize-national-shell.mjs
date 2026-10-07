import fs from 'node:fs';

// Main-site metadata limits are part of deployment composition. Keep tool
// behavior in its owning repository and reapply shell metadata after each sync.
const pages = {
  appalachia: { description: 'Outdoor tools for Appalachia and the Ohio Valley: Gauley River releases, Cumberland Falls moonbows and Blue Ridge Parkway fall-color timing.' },
  'bird-migration': { title: 'Bird Migration Near Me | Morning Birding | Chris Izworski', description: 'Check BirdCast migration, local eBird reports and NWS morning weather for a U.S. city or ZIP to plan where to start birding this morning.' },
  'columbia-salmon-run': { description: 'Columbia River salmon counts at Bonneville, The Dalles, John Day and McNary, plus seven-day Chinook, Coho and steelhead trends and seasonal context.' },
  'pacific-northwest': { title: 'Pacific Northwest Outdoor Tools | Chris Izworski', description: 'Pacific Northwest outdoor tools for Ballard Locks ships and salmon, Columbia River salmon counts and Grand Coulee Dam conditions, tours and lake levels.' },
};
for (const [slug, meta] of Object.entries(pages)) {
  const file = `public/synced-national-tools/${slug}/index.html`;
  let html = fs.readFileSync(file, 'utf8');
  if (meta.title) html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${meta.description}">`);
  fs.writeFileSync(file, html);
}
const apiFile = 'api/columbia-salmon.js';
let api = fs.readFileSync(apiFile, 'utf8');
if (!api.includes("res.setHeader('X-Robots-Tag'")) {
  api = api.replace('export default async function handler(req, res) {', "export default async function handler(req, res) {\n  res.setHeader('X-Robots-Tag', 'noindex, nofollow');");
  fs.writeFileSync(apiFile, api);
}


function normalizeNortheastAuthority() {
  const file = 'public/synced-national-tools/northeast-great-lakes/index.html';
  let html = fs.readFileSync(file, 'utf8');

  if (!html.includes('href="/niagara-border-crossing/"')) {
    html = html.replace(
      '<div class="signal-grid">',
      '<div class="signal-grid"><div class="signal"><span class="signal-kicker">Border decision</span><strong>Niagara bridge choice and live waits</strong><p>Compare official U.S.-bound and Canada-bound waits without mixing traffic classes, then use bridge rules, cameras and route fit to decide whether switching crossings is actually worthwhile.</p><a href="/niagara-border-crossing/">Compare Niagara border crossings →</a></div>'
    );
    html = html.replace(
      '<div class="tool-grid">',
      '<div class="tool-grid"><article class="tool-card"><span class="kind">Live border decision</span><h3>Niagara Border Crossing Decision Tool</h3><p class="place">Buffalo · Niagara Falls · Lewiston · Ontario</p><p>Compare Peace, Rainbow, Whirlpool Rapids and Lewiston–Queenston with direction-specific official border waits, traveler eligibility, cameras, toll context and a conservative guardrail against pointless bridge switching.</p><p class="why"><strong>Best for:</strong> travelers deciding which Niagara bridge to use now rather than simply choosing the smallest posted wait.</p><p class="sources">CBP + CBSA + bridge authorities + NITTEC / 511 approach context</p><a class="action" href="/niagara-border-crossing/">Open Niagara Border Crossing Tool</a></article>'
    );
  }

  html = html
    .replace(
      /<meta name="description" content="[^"]*">/,
      '<meta name="description" content="Live tools for Great Lakes levels, Niagara border crossings and rainbows, plus Thunder Hole timing across the Northeast.">'
    )
    .replace(
      /<meta property="og:description" content="[^"]*">/,
      '<meta property="og:description" content="Live border, water, viewing and coastal timing tools from the Great Lakes to Niagara Falls and Acadia National Park.">'
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*">/,
      '<meta name="twitter:description" content="Live border, water, viewing and coastal timing tools from the Great Lakes to Niagara Falls and Acadia National Park.">'
    )
    .replace(
      /<p class="hero-lede">[sS]*?</p>/,
      '<p class="hero-lede">Four major travel-and-water decisions belong together here: which Niagara border crossing fits the trip, what the Great Lakes are doing to the shoreline, when Niagara\'s sun and mist can make a rainbow, and when tide plus offshore wave energy can make Thunder Hole worth the timing.</p>'
    )
    .replace(
      /<aside class="hero-aside">[sS]*?</aside>/,
      '<aside class="hero-aside"><strong>Big water, different decisions.</strong><p>This page does not blend border delays, lake levels, sunlight and ocean surf into one score. Pick the decision you care about, then use the specialist tool and its controlling public sources.</p></aside>'
    );

  if (!html.includes('<meta name="author" content="Chris Izworski">')) {
    html = html.replace(
      '<meta name="robots" content="index,follow,max-image-preview:large">',
      '<meta name="robots" content="index,follow,max-image-preview:large">\n<meta name="author" content="Chris Izworski">\n<link rel="author" href="https://chrisizworski.com/chris-izworski/">'
    );
  }
  if (!html.includes('href="/chris-izworski-source-guide/"')) {
    html = html.replace(
      /<div class="footer">[sS]*?</div>/,
      '<div class="footer">&copy; 2026 <a href="/chris-izworski/">Chris Izworski</a> &middot; Outdoor decision tools built around public scientific and government data. <a href="/chris-izworski-source-guide/">Source guide</a>.</div>'
    );
  }

  const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!schemaMatch) throw new Error('National shell: Northeast schema missing');
  const schema = JSON.parse(schemaMatch[1]);
  const graph = schema['@graph'];
  const page = graph.find(node => node?.['@type'] === 'CollectionPage');
  const list = graph.find(node => node?.['@id'] === 'https://chrisizworski.com/national-tools/northeast-great-lakes/#tools');
  if (!list?.itemListElement) throw new Error('National shell: Northeast ItemList missing');
  const borderUrl = 'https://chrisizworski.com/niagara-border-crossing/';
  if (!list.itemListElement.some(item => item.url === borderUrl)) {
    list.itemListElement.splice(1, 0, {'@type':'ListItem',position:2,url:borderUrl,name:'Niagara Border Crossing Decision Tool'});
  }
  list.itemListElement.forEach((item, index) => { item.position = index + 1; });
  list.numberOfItems = list.itemListElement.length;
  if (page) page.description = 'Regional outdoor decision tools for Great Lakes shoreline conditions, Niagara border crossings, Niagara Falls viewing geometry and Thunder Hole tide-and-wave timing.';
  html = html.replace(schemaMatch[0], `<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
  fs.writeFileSync(file, html);
}

function alignNationalHubFreshness() {
  const hubFile = 'public/synced-national-tools/index.html';
  const sitemapFile = 'public/sitemap.xml';
  const html = fs.readFileSync(hubFile, 'utf8');
  const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!schemaMatch) throw new Error('National shell: hub schema missing');
  const schema = JSON.parse(schemaMatch[1]);
  const page = schema['@graph']?.find(node => node?.['@id'] === 'https://chrisizworski.com/national-tools/#page');
  const modified = page?.dateModified;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(modified || ''))) throw new Error('National shell: hub dateModified missing');
  let sitemap = fs.readFileSync(sitemapFile, 'utf8');
  const re = /(<loc>https:\/\/chrisizworski\.com\/national-tools\/<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/;
  if (!re.test(sitemap)) throw new Error('National shell: sitemap entry missing');
  sitemap = sitemap.replace(re, `$1${modified}$2`);
  fs.writeFileSync(sitemapFile, sitemap);
}

normalizeNortheastAuthority();
alignNationalHubFreshness();
