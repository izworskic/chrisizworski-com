import fs from 'node:fs';

// Run after discovery generators so the final visible catalog owns its ItemList.
const file = 'public/tools/index.html';
let html = fs.readFileSync(file, 'utf8');
const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!match) throw new Error('Tools directory schema missing');
const schema = JSON.parse(match[1]);
const list = schema['@graph'].find(node => node['@id'] === 'https://chrisizworski.com/tools/#toollist');
const absolute = url => new URL(url, 'https://chrisizworski.com').href;
const normalize = url => absolute(url).replace(/\/$/, '');
const registry = JSON.parse(fs.readFileSync('benchmarks/tool-network-registry.json', 'utf8'));
const owners = new Map(registry.tools.flatMap(tool => [tool.canonical, ...(tool.aliases || [])].map(url => [normalize(url), tool.id])));
const existing = new Map(list.itemListElement.map(entry => [normalize(entry.item.url), entry.item]));
const plain = text => text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&rarr;/g, '→').replace(/&nbsp;/g, ' ').trim();
const cards = [...html.matchAll(/<div class="tool-card"[^>]*>[\s\S]*?<div class="tool-title"><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/div>\s*<div class="tool-desc">([\s\S]*?)<\/div>\s*<\/div>/g)];
if (!cards.length || cards.length !== (html.match(/class="tool-card"/g) || []).length) throw new Error('Unparsed tool card; refusing a partial ItemList');
for (const card of cards) {
  const toolId = owners.get(normalize(card[1]));
  if (!toolId) throw new Error(`Unregistered tool card: ${card[1]}`);
  html = html.replace(card[0], card[0].replace(/ data-track-tool="[^"]*"/g, '').replace(/ data-tool-id="[^"]*"/g, '').replace('<div class="tool-card"', `<div class="tool-card" data-tool-id="${toolId}"`));
}
list.itemListElement = cards.map((card, index) => ({
  '@type': 'ListItem', position: index + 1,
  item: existing.get(normalize(card[1])) ? { ...existing.get(normalize(card[1])), url: absolute(card[1]) } : {
    '@type': 'WebPage', name: plain(card[2]), url: absolute(card[1]), description: plain(card[3]),
    author: { '@id': 'https://chrisizworski.com/#person' },
  },
}));
if (new Set(list.itemListElement.map(entry => normalize(entry.item.url))).size !== cards.length) throw new Error('Duplicate directory URL');
list.numberOfItems = cards.length;
html = html.replace(match[0], `<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
fs.writeFileSync(file, html);
console.log(`Tools directory reconciled: ${cards.length} visible and structured entries`);

function reconcileMarylandBayBridgeNationalTools() {
  const nationalFile = 'public/synced-national-tools/index.html';
  let national = fs.readFileSync(nationalFile, 'utf8');
  const canonical = 'https://chrisizworski.com/chesapeake-bay-bridge-maryland/';
  const relative = '/chesapeake-bay-bridge-maryland/';
  const toolId = 'maryland-bay-bridge';

  if (!national.includes(`data-tool-id="${toolId}"`)) {
    const cbbtMarker = '<article class="directory-card" data-search-card data-tool-id="cbbt"';
    const insertAt = national.indexOf(cbbtMarker);
    if (insertAt < 0) throw new Error('National tools: CBBT card anchor missing for Maryland Bay Bridge insertion');
    const card = `<article class="directory-card" data-search-card data-tool-id="${toolId}" data-personas="trip conditions" data-tags="maryland chesapeake bay bridge us 50 301 annapolis eastern shore toll wind restrictions traffic cameras mdta chart mid atlantic appalachia" data-months="1,2,3,4,5,6,7,8,9,10,11,12"><div class="card-top"><span class="kind">Live bridge crossing decision</span><span class="season-label" hidden>Useful now</span></div><h3>Maryland Chesapeake Bay Bridge Live</h3><p class="place">Maryland · Chesapeake Bay</p><p class="description">Check MDTA wind restrictions, live approach traffic, official CHART cameras, vehicle rules, planned work and eastbound tolls before crossing US 50/301.</p><p class="signals"><strong>Signals:</strong> MDTA operational rules + Maryland CHART + NWS weather context</p><div class="card-actions"><a class="primary-action" href="${relative}">Open Maryland Bay Bridge Live →</a></div></article>\n`;
    national = national.slice(0, insertAt) + card + national.slice(insertAt);
  }

  const schemaMatch = national.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!schemaMatch) throw new Error('National tools: JSON-LD graph missing');
  const nationalSchema = JSON.parse(schemaMatch[1]);
  const graph = nationalSchema['@graph'];
  if (!Array.isArray(graph)) throw new Error('National tools: JSON-LD @graph missing');
  const itemList = graph.find(node => node?.['@id'] === 'https://chrisizworski.com/national-tools/#toollist');
  if (!itemList || !Array.isArray(itemList.itemListElement)) throw new Error('National tools: ItemList missing');

  if (!itemList.itemListElement.some(entry => entry?.url === canonical)) {
    const cbbtIndex = itemList.itemListElement.findIndex(entry => entry?.url === 'https://chrisizworski.com/chesapeake-bay-bridge-tunnel/');
    const entry = { '@type': 'ListItem', position: 0, url: canonical, name: 'Maryland Chesapeake Bay Bridge Live' };
    if (cbbtIndex >= 0) itemList.itemListElement.splice(cbbtIndex + 1, 0, entry);
    else itemList.itemListElement.push(entry);
  }
  itemList.itemListElement.forEach((entry, index) => { entry.position = index + 1; });
  itemList.numberOfItems = itemList.itemListElement.length;
  // The extracted National Tools hub owns its publication metadata.
  // This compatibility shim may add a legacy Maryland card, but it must never
  // roll the hub's dateModified backward after a verified mirror sync.
  national = national.replace(schemaMatch[0], `<script type="application/ld+json">${JSON.stringify(nationalSchema)}</script>`);

  const visibleCount = (national.match(/data-search-card/g) || []).length;
  national = national.replace(/(<p class="finder-count" id="finder-count" aria-live="polite">)\d+ tools shown(<\/p>)/, `$1${visibleCount} tools shown$2`);

  if (!national.includes(`data-tool-id="${toolId}"`) || !national.includes(`href="${relative}"`) || !national.includes(canonical)) {
    throw new Error('National tools: Maryland Bay Bridge card/schema verification failed');
  }
  fs.writeFileSync(nationalFile, national);
  console.log(`National tools reconciled: Maryland Bay Bridge embedded; ${visibleCount} searchable tools.`);
}

reconcileMarylandBayBridgeNationalTools();
