import fs from 'node:fs';

// Build-time directory enhancement, reapplied after the legacy National Tools sync.
// One filterable directory entry represents the network; the 15 regional links
// and four featured destinations are navigational links, NOT 19 extra tools.
const file = 'public/synced-national-tools/index.html';
const regions = [
  ['new-england', 'New England', 'White Mountains, Vermont & Acadia'],
  ['great-smoky-mountains', 'Great Smoky Mountains', 'Tennessee & North Carolina'],
  ['colorado-aspens', 'Colorado Aspens', 'Maroon Bells & Kebler Pass'],
  ['adirondacks', 'Adirondacks', 'Whiteface & Lake Placid'],
  ['north-shore-superior', 'Lake Superior North Shore', 'Minnesota & western U.P.'],
  ['ozarks', 'Ozarks', 'Arkansas & Missouri'],
  ['eastern-sierra', 'Eastern Sierra', 'Bishop Creek & June Lake'],
  ['wasatch', 'Wasatch Mountains', 'Utah alpine color'],
  ['columbia-river-gorge', 'Columbia River Gorge', 'Oregon & Washington'],
  ['door-county', 'Door County', 'Wisconsin lakeshore'],
  ['poconos', 'Poconos', 'Pennsylvania & New Jersey'],
  ['texas-hill-country', 'Texas Hill Country', 'Lost Maples & the Frio River'],
  ['west-virginia-highlands', 'West Virginia Highlands', 'Dolly Sods & Blackwater Falls'],
  ['catskills', 'Catskills', 'New York mountain drives'],
  ['shenandoah', 'Shenandoah & Skyline Drive', 'Virginia Blue Ridge']
];
const destinations = [
  ['Kancamagus Highway', 'White Mountains · New Hampshire', 'new-england/kancamagus-highway'],
  ['Cades Cove', 'Great Smoky Mountains · Tennessee', 'great-smoky-mountains/cades-cove'],
  ['Maroon Bells', 'Aspen · Colorado', 'colorado-aspens/maroon-bells-aspen-color'],
  ['Lost Maples', 'Texas Hill Country', 'texas-hill-country/lost-maples']
];
const canonical = 'https://chrisizworski.com/fall-color/national/';
const start = '<!-- national-fall-network:start -->';
const end = '<!-- national-fall-network:end -->';
const regionLinks = regions.map(([slug, label, sub]) =>
  `<a class="fall-network-region" href="/fall-color/${slug}/"><strong>${label}</strong><span>${sub}</span></a>`
).join('\n');
const featured = destinations.map(([name, place, path]) =>
  `<a class="fall-network-destination" href="/fall-color/${path}/"><strong>${name}</strong><span>${place}</span><span class="fall-network-arrow" aria-hidden="true">→</span></a>`
).join('\n');
const block = `${start}
<section class="catalog-group fall-network" data-catalog-group id="national-fall-network" aria-labelledby="national-fall-network-title">
  <div class="catalog-head">
    <div><p class="eyebrow">Featured seasonal network</p><h2 id="national-fall-network-title">National Fall Color Network</h2></div>
    <p>Compare regions first, then choose a real drive or destination. Built for timing decisions rather than one nationwide peak-color date.</p>
  </div>
  <article class="directory-card fall-network-card" data-search-card data-tool-id="national-fall-color-network" data-personas="trip conditions event" data-tags="national fall color autumn foliage map leaf peeping peak colors road trip travel 15 regions 30 destinations new england smoky mountains colorado aspens adirondacks shenandoah texas utah ohio valley catskills" data-months="8,9,10,11">
    <div class="card-top"><span class="kind">Interactive fall-color map & regional decision guides</span><span class="season-label" hidden>In season now</span></div>
    <div class="fall-network-intro">
      <div>
        <h3>Where should I go for fall color?</h3>
        <p>Start with the national map, compare the color progression across <strong>15 regional guides</strong>, then open <strong>30 named destination guides</strong> for viewing windows, scenic routes and access checks. Current observations and weather are distinguished from historical foliage timing.</p>
      </div>
      <div class="fall-network-cta">
        <a class="primary-action" href="/fall-color/national/">Open the national fall-color map →</a>
        <a class="fall-network-more" href="/fall-color/national/">Explore all 30 destination guides →</a>
      </div>
    </div>
    <div class="fall-network-section">
      <h4>Choose a region</h4>
      <nav class="fall-network-regions" aria-label="Fifteen fall-color regions">
        ${regionLinks}
      </nav>
    </div>
    <div class="fall-network-section">
      <h4>Featured places for a fall-color trip</h4>
      <div class="fall-network-destinations">${featured}</div>
    </div>
    <p class="fall-network-method">Seasonal predictions are planning estimates, not verified live leaf percentages. Check park access, weather and road closures before traveling.</p>
  </article>
</section>
${end}`;
if (regions.length !== 15 || destinations.length !== 4 || new Set(regions.map(x => x[0])).size !== 15) {
  throw new Error('National fall network: invalid regional catalog');
}
let html = fs.readFileSync(file, 'utf8');
const anchor = '<section class="catalog-group national-utilities" data-catalog-group';
if (html.includes(start) || html.includes(end)) {
  if (!html.includes(start) || !html.includes(end)) throw new Error('National fall network: one marker missing');
  const i = html.indexOf(start);
  const j = html.indexOf(end);
  if (i < 0 || j < i) throw new Error('National fall network: markers out of order');
  html = html.slice(0, i) + block + html.slice(j + end.length);
} else {
  if (!html.includes(anchor)) throw new Error('National fall network: national utilities insertion anchor missing');
  html = html.replace(anchor, block + '\n' + anchor);
}
const cssTag = '<link rel="stylesheet" href="/national-tools/assets/fall-color-network.css?v=20261009-1">';
if (!html.includes(cssTag)) {
  const cssAnchor = '<link rel="stylesheet" href="/national-tools/assets/national-tools-directory.css';
  const line = html.split('\n').find(x => x.startsWith(cssAnchor));
  if (!line) throw new Error('National fall network: directory stylesheet missing');
  html = html.replace(line, line + '\n' + cssTag);
}
const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!match) throw new Error('National fall network: directory schema missing');
const schema = JSON.parse(match[1]);
const graph = schema['@graph'];
const page = graph.find(x => x['@id'] === 'https://chrisizworski.com/national-tools/#page');
const list = graph.find(x => x['@id'] === 'https://chrisizworski.com/national-tools/#toollist');
if (!page || !list?.itemListElement) throw new Error('National fall network: required schema nodes missing');
const hubEntry = { '@type': 'ListItem', position: 0, url: canonical, name: 'National Fall Color Map & Regional Guides' };
list.itemListElement = list.itemListElement.filter(x => x.url !== canonical);
const afterFall = list.itemListElement.findIndex(x => x.url === 'https://chrisizworski.com/national-tools/fall-color/');
list.itemListElement.splice(afterFall < 0 ? list.itemListElement.length : afterFall + 1, 0, hubEntry);
list.itemListElement.forEach((x, i) => { x.position = i + 1; });
list.numberOfItems = list.itemListElement.length;
page.dateModified = '2026-10-09';
const regionsId = 'https://chrisizworski.com/national-tools/#fall-network-regions';
const regionList = {
  '@type': 'ItemList',
  '@id': regionsId,
  name: 'National Fall Color: 15 Regional Guides',
  numberOfItems: regions.length,
  itemListElement: regions.map(([slug, label], i) => ({
    '@type': 'ListItem', position: i + 1,
    name: label, url: `https://chrisizworski.com/fall-color/${slug}/`
  }))
};
const oldRegions = graph.findIndex(x => x['@id'] === regionsId);
if (oldRegions >= 0) graph[oldRegions] = regionList; else graph.push(regionList);
html = html.replace(match[0], '<script type="application/ld+json">' + JSON.stringify(schema) + '</script>');
const count = (html.match(/data-search-card/g) || []).length;
if (count !== list.numberOfItems) {
  throw new Error(`National fall network: ${count} visible tools do not match ${list.numberOfItems} schema entries`);
}
html = html.replace(/(<p class="finder-count" id="finder-count" aria-live="polite">)\d+ tools shown(<\/p>)/, `$1${count} tools shown$2`);
const expected = [...regions.map(([slug]) => '/fall-color/' + slug + '/'), ...destinations.map(([, , path]) => '/fall-color/' + path + '/')];
if (!expected.every(url => html.includes(`href="${url}"`)) || !html.includes('href="/fall-color/national/"')) {
  throw new Error('National fall network: expected navigational link is missing');
}
fs.writeFileSync(file, html);
console.log(`National fall-color network published: ${regions.length} regions, ${destinations.length} featured destinations, ${count} searchable directory tools`);
