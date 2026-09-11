'use strict';

const publicToolPage = require('../lib/public-tool-page.js');
const YOSEMITE_URL = 'https://chrisizworski.com/yosemite-firefall-live/';

function ensureYosemite(html) {
  if (!html.includes('data-tool-id="yosemite-firefall"')) {
    const card = `<article class="directory-card" data-search-card data-tool-id="yosemite-firefall" data-personas="trip event conditions" data-tags="yosemite california firefall horsetail fall el capitan waterfall sunset photography snowmelt clouds" data-months="2"><div class="card-top"><span class="kind">Live seasonal viewing intelligence</span><span class="season-label" hidden>In season now</span></div><h3>Yosemite Firefall Live</h3><p class="place">Yosemite National Park · California</p><p class="description">Decide whether Horsetail Fall is worth attempting, when the strongest glow window occurs, how the source-water signal looks, whether the western sun corridor is open and which upcoming night gives a trip the best odds.</p><p class="signals"><strong>Signals:</strong> NWS forecast + GOES-18 cloud mask + CDEC snow water + USGS basin context + solar geometry + NPS access</p><div class="card-actions"><a class="primary-action" href="${YOSEMITE_URL}">Yosemite Firefall forecast and best viewing night &rarr;</a></div></article>\n`;
    const anchor = '<article class="directory-card" data-search-card data-tool-id="blue-spring"';
    const at = html.indexOf(anchor);
    if (at >= 0) html = html.slice(0, at) + card + html.slice(at);
  }

  const visibleCards = [...html.matchAll(/data-tool-id="([^"]+)"/g)].length;
  html = html.replace(/(<p class="finder-count" id="finder-count" aria-live="polite">)\d+ tools shown(<\/p>)/, `$1${visibleCards} tools shown$2`);

  const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (schemaMatch) {
    try {
      const schema = JSON.parse(schemaMatch[1]);
      const list = schema?.['@graph']?.find(item => item?.['@id'] === 'https://chrisizworski.com/national-tools/#toollist');
      if (list && !list.itemListElement.some(item => item.url === YOSEMITE_URL)) {
        list.itemListElement.push({ '@type': 'ListItem', position: list.itemListElement.length + 1, url: YOSEMITE_URL, name: 'Yosemite Firefall Live' });
        list.itemListElement.forEach((item, index) => { item.position = index + 1; });
        list.numberOfItems = list.itemListElement.length;
        html = html.replace(schemaMatch[0], `<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
      }
    } catch (error) {
      console.warn('Could not extend National Tools JSON-LD for Yosemite', error);
    }
  }
  return html;
}

module.exports = publicToolPage(
  'https://national-outdoor-tools-hub.vercel.app/national-tools/',
  ensureYosemite
);
