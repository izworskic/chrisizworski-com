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
