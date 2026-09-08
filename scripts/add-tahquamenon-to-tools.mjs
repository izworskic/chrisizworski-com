import fs from 'node:fs';

const file = 'public/tools/index.html';
const TOOL_URL = 'https://chrisizworski.com/tahquamenon-falls/';
const TOOL_KEY = 'tahquamenon-falls-live';
const TOOL_NAME = 'Tahquamenon Falls Live, River Conditions and Park Planner';
const TOOL_DESC = 'Live USGS river flow, same-date historical context, NWS weather and hazards, Upper versus Lower Falls guidance, an interactive park map, trails, campgrounds, brewery stops, paddling access, photo conditions, and time-based visit planning for Tahquamenon Falls State Park.';

let html = fs.readFileSync(file, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (html.includes(replacement)) return;
  if (!html.includes(search)) throw new Error(`Tahquamenon tools patch: missing ${label} anchor`);
  html = html.replace(search, replacement);
  changed = true;
}

// 1) Structured data: append one WebApplication to the canonical ItemList.
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

    if (!itemList.itemListElement.some(entry => entry?.item?.url === TOOL_URL || entry?.item?.name?.startsWith('Tahquamenon Falls Live'))) {
      itemList.itemListElement.push({
        '@type': 'ListItem',
        position: itemList.itemListElement.length + 1,
        item: {
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
    if (collection) collection.dateModified = '2026-09-08';

    const replacement = `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
    html = html.slice(0, schemaMatch.index) + replacement + html.slice(schemaMatch.index + schemaMatch[0].length);
    schemaPatched = true;
    changed = true;
    break;
  } catch {
    // Not the collection graph; keep scanning.
  }
}
if (!schemaPatched) throw new Error('Tahquamenon tools patch: canonical collection JSON-LD not found');

// 2) Decision router: put the park directly in the Michigan-outdoors decision lane.
if (!html.includes('data-decision-network="tahquamenon-falls-live"')) {
  const laneRe = /(<div class="decision-network__lane"><h3>Go outside in Michigan<\/h3><ul>)([\s\S]*?)(<\/ul>)/;
  const match = html.match(laneRe);
  if (!match) throw new Error('Tahquamenon tools patch: outdoors decision lane not found');
  const item = `<li><a href="${TOOL_URL}" data-decision-network="tahquamenon-falls-live" data-lane="outdoors" data-surface="tools">Tahquamenon Falls<span>Live river, trails, map &amp; visit planner</span></a></li>`;
  html = html.replace(laneRe, `${match[1]}${match[2]}${item}${match[3]}`);
  changed = true;
}

// 3) Featured tools: treat Tahquamenon like the flagship destination tool it is.
if (!html.includes('data-featured-tool="tahquamenon-falls-live"')) {
  const sooAnchor = '    <article class="feature-card" data-featured-tool="soo-locks">';
  const card = `    <article class="feature-card" data-featured-tool="tahquamenon-falls-live">\n      <div class="feature-kicker">Live waterfall + park intelligence</div>\n      <h3><a href="${TOOL_URL}" data-track-tool="tahquamenon-falls-live" data-placement="tools-featured">Tahquamenon Falls Live</a></h3>\n      <p>See whether Tahquamenon is worth the drive right now, compare Upper and Lower Falls, check live river flow and trail weather, then build the visit on an interactive park map.</p>\n      <a class="tool-cta" href="${TOOL_URL}" data-track-tool="tahquamenon-falls-live" data-placement="tools-featured">Plan Tahquamenon <span aria-hidden="true">&rarr;</span></a>\n    </article>\n`;
  replaceOnce(sooAnchor, `${card}${sooAnchor}`, 'Soo Locks featured card');
}

// 4) Searchable catalog: place it with the Michigan trip-planning tools.
if (!html.includes('data-tool-key="tahquamenon-falls-live"')) {
  const marker = '    <div class="tool-title"><a href="/lake-superior-circle-tour/">Lake Superior Circle Tour, Stop-by-Stop Guide and Trip Planner</a></div>';
  const titleIndex = html.indexOf(marker);
  if (titleIndex < 0) throw new Error('Tahquamenon tools patch: Lake Superior Circle Tour catalog anchor not found');
  const cardIndex = html.lastIndexOf('  <div class="tool-card"', titleIndex);
  if (cardIndex < 0) throw new Error('Tahquamenon tools patch: planning catalog card boundary not found');
  const catalog = `  <div class="tool-card" data-tool-key="tahquamenon-falls-live" data-tags="planning nature" data-months="1,2,3,4,5,6,7,8,9,10,11,12">\n    <div class="tk">Live data<span class="tk-season" hidden> / useful now</span></div>\n    <div class="tool-title"><a href="${TOOL_URL}">Tahquamenon Falls Live, River Conditions and Park Planner</a></div>\n    <div class="tool-desc">${TOOL_DESC}</div>\n  </div>\n`;
  html = html.slice(0, cardIndex) + catalog + html.slice(cardIndex);
  changed = true;
}

// Keep the intro's tool count honest even as the catalog grows.
const catalogCount = (html.match(/class="tool-card"/g) || []).length;
html = html.replace(/search all \d+ tools by name or topic/i, `search all ${catalogCount} tools by name or topic`);

fs.writeFileSync(file, html);
console.log(`Tahquamenon tools patch ${changed ? 'applied' : 'already present'}; searchable catalog count: ${catalogCount}.`);
