import fs from 'node:fs';

const TOOLS_FILE = 'public/tools/index.html';
const REGISTRY_FILE = 'benchmarks/tool-network-registry.json';
const TOOL_ID = 'duluth-canal-park';
const TOOL_URL = 'https://chrisizworski.com/duluth-canal-park/';
const TOOL_PATH = '/duluth-canal-park/';
const TOOL_NAME = 'Duluth Ship Schedule Today, Live Cams & Canal Park Watch';
const TOOL_DESC = 'See the next supported Duluth ship passage with fresh AIS, an Aerial Lift Bridge watch window, live vessel map, 19 mapped camera feeds, and the best Canal Park viewing spots.';

let html = fs.readFileSync(TOOLS_FILE, 'utf8');
let changed = false;

// Keep the Tools-page structured ItemList in sync with the visible catalog.
const schemaRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
let schemaMatch;
let schemaPatched = false;
while ((schemaMatch = schemaRe.exec(html))) {
  try {
    const data = JSON.parse(schemaMatch[1]);
    const graph = data?.['@graph'];
    if (!Array.isArray(graph)) continue;
    const collection = graph.find(node => node?.['@type'] === 'CollectionPage' && node?.['@id'] === 'https://chrisizworski.com/tools/');
    const itemList = graph.find(node => node?.['@id'] === 'https://chrisizworski.com/tools/#toollist');
    if (!itemList || !Array.isArray(itemList.itemListElement)) continue;

    if (!itemList.itemListElement.some(entry => entry?.item?.url === TOOL_URL)) {
      itemList.itemListElement.push({
        '@type': 'ListItem',
        position: itemList.itemListElement.length + 1,
        item: {
          '@id': `${TOOL_URL}#app`,
          '@type': 'WebApplication',
          name: TOOL_NAME,
          url: TOOL_URL,
          description: TOOL_DESC,
          applicationCategory: 'TravelApplication',
          operatingSystem: 'Any web browser',
          isAccessibleForFree: true,
          author: { '@id': 'https://chrisizworski.com/#person' },
          creator: { '@id': 'https://chrisizworski.com/#person' }
        }
      });
      changed = true;
    }
    itemList.itemListElement.forEach((entry, index) => { entry.position = index + 1; });
    itemList.numberOfItems = itemList.itemListElement.length;
    if (collection) collection.dateModified = '2026-09-25';

    const replacement = `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
    html = html.slice(0, schemaMatch.index) + replacement + html.slice(schemaMatch.index + schemaMatch[0].length);
    schemaPatched = true;
    break;
  } catch {
    // Continue until the canonical Tools collection graph is found.
  }
}
if (!schemaPatched) throw new Error('Duluth tools patch: canonical tools JSON-LD not found');

// Put Duluth in the Great Lakes / boat-watching catalog, not in the generic national section.
if (!html.includes(`data-tool-key="${TOOL_ID}"`)) {
  const groupMarker = '<section class="tool-group" id="great-lakes-tools-group" aria-labelledby="great-lakes-tools">';
  const groupIndex = html.indexOf(groupMarker);
  if (groupIndex < 0) throw new Error('Duluth tools patch: Great Lakes group not found');
  const gridMarker = '<div class="tool-grid">';
  const gridIndex = html.indexOf(gridMarker, groupIndex);
  if (gridIndex < 0) throw new Error('Duluth tools patch: Great Lakes tool grid not found');
  const insertAt = gridIndex + gridMarker.length;
  const card = `\n  <div class="tool-card" data-tool-key="${TOOL_ID}" data-tags="boating planning transportation" data-months="3,4,5,6,7,8,9,10,11,12">\n    <div class="tk">Live AIS + cameras<span class="tk-season" hidden> / useful now</span></div>\n    <div class="tool-title"><a href="${TOOL_PATH}">${TOOL_NAME}</a></div>\n    <div class="tool-desc">${TOOL_DESC}</div>\n  </div>`;
  html = html.slice(0, insertAt) + card + html.slice(insertAt);
  changed = true;
}

// Give the breakout tool a featured route beside the established Great Lakes shipping products.
if (!html.includes('data-featured-tool="duluth-canal-park"')) {
  const sooAnchor = '    <article class="feature-card" data-featured-tool="soo-locks">';
  const index = html.indexOf(sooAnchor);
  if (index < 0) throw new Error('Duluth tools patch: Soo Locks featured anchor not found');
  const card = `    <article class="feature-card" data-featured-tool="duluth-canal-park">\n      <div class="feature-kicker">Live Duluth ship watch</div>\n      <h3><a href="${TOOL_PATH}" data-track-tool="duluth-canal-park" data-placement="tools-featured">Duluth Ship Schedule &amp; Canal Park Live Cams</a></h3>\n      <p>See which Duluth ship matters next, its supported Aerial Lift Bridge passage window, live AIS position, camera network, and where to watch from Canal Park.</p>\n      <a class="tool-cta" href="${TOOL_PATH}" data-track-tool="duluth-canal-park" data-placement="tools-featured">Watch Duluth ships <span aria-hidden="true">&rarr;</span></a>\n    </article>\n`;
  html = html.slice(0, index) + card + html.slice(index);
  changed = true;
}

// Keep the visible catalog count honest.
const catalogCount = (html.match(/class="tool-card"/g) || []).length;
html = html.replace(/search all \d+ tools by name or topic/i, `search all ${catalogCount} tools by name or topic`);
fs.writeFileSync(TOOLS_FILE, html);

// Register the tool so the /tools/ card is not an orphan in the governed network.
const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
if (!registry.tools.some(tool => tool.id === TOOL_ID)) {
  registry.tools.push({
    id: TOOL_ID,
    name: 'Duluth Canal Park Live',
    canonical: TOOL_URL,
    aliases: [],
    kind: 'flagship-live',
    cluster: 'great-lakes-shipping',
    primaryIntent: 'Duluth ship schedule today and Canal Park ship watching',
    seasons: [3,4,5,6,7,8,9,10,11,12],
    geographies: ['duluth-superior', 'lake-superior'],
    personas: ['ship-watcher', 'traveler'],
    networkRole: 'destination',
    searchTreatment: { status: 'active' },
    searchEvidence: { status: 'new-canonical' }
  });
}
registry.relationships = Array.isArray(registry.relationships) ? registry.relationships : [];
const relationships = [
  {
    from: 'ship-tracker', to: TOOL_ID, type: 'geographic-handoff', strength: 'strong', surface: 'great-lakes-shipping',
    reason: 'Lake-wide vessel discovery can deepen into Duluth-specific passage timing, cameras, and Canal Park viewing.'
  },
  {
    from: 'circle-tour', to: TOOL_ID, type: 'destination-depth', strength: 'strong', surface: 'lake-superior-trip',
    reason: 'Duluth is a major Circle Tour stop and the dedicated tool resolves ship-watching timing at Canal Park.'
  },
  {
    from: TOOL_ID, to: 'ship-tracker', type: 'broader-tracking', strength: 'optional', surface: 'great-lakes-shipping',
    reason: 'Visitors who want vessel context beyond Duluth can continue to the lake-wide Great Lakes Ship Tracker.'
  }
];
for (const edge of relationships) {
  if (!registry.relationships.some(existing => existing.from === edge.from && existing.to === edge.to && existing.type === edge.type)) {
    registry.relationships.push(edge);
  }
}
registry.updated = '2026-09-25';
fs.writeFileSync(REGISTRY_FILE, `${JSON.stringify(registry, null, 2)}\n`);

// Build-time guard: the live Tools page must surface Duluth in the correct group and schema.
const finalHtml = fs.readFileSync(TOOLS_FILE, 'utf8');
const finalRegistry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
const groupStart = finalHtml.indexOf('id="great-lakes-tools-group"');
const nextGroup = finalHtml.indexOf('<section class="tool-group"', groupStart + 1);
const greatLakesSlice = finalHtml.slice(groupStart, nextGroup > groupStart ? nextGroup : finalHtml.length);
const checks = [
  ['Great Lakes visible card', greatLakesSlice.includes(`data-tool-key="${TOOL_ID}"`)],
  ['featured card', finalHtml.includes('data-featured-tool="duluth-canal-park"')],
  ['canonical tool link', finalHtml.includes(`href="${TOOL_PATH}"`)],
  ['structured ItemList entry', finalHtml.includes(`"url":"${TOOL_URL}"`)],
  ['registry node', finalRegistry.tools.some(tool => tool.id === TOOL_ID && tool.canonical === TOOL_URL)],
  ['ship-tracker relationship', finalRegistry.relationships.some(edge => edge.from === 'ship-tracker' && edge.to === TOOL_ID)],
  ['circle-tour relationship', finalRegistry.relationships.some(edge => edge.from === 'circle-tour' && edge.to === TOOL_ID)]
];
for (const [label, pass] of checks) {
  if (!pass) throw new Error(`Duluth tools verification failed: ${label}`);
}
console.log(`Duluth Canal Park added to Great Lakes tools catalog; ${catalogCount} visible tool cards; network registry linked.`);
