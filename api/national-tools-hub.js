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

  // Seasonal Michigan bloom follows the same event intent lane as fall color.
  // The owner directory is proxied, so insert exactly once at response time.
  if (!html.includes('data-tool-id="michigan-bloom-tracker"')) {
    const anchor = '<article class="directory-card" data-search-card data-tool-id="fall-color"';
    const at = html.indexOf(anchor);
    if (at >= 0) html = html.slice(0, at) + "<article class=\"directory-card\" data-search-card data-tool-id=\"michigan-bloom-tracker\" data-personas=\"event trip garden\" data-tags=\"michigan flowers bloom blossom tulip holland cherry traverse city grand rapids peony ann arbor mackinac lilacs lavender sunflowers peak season map\" data-months=\"4,5,6,7,8,9\"><div class=\"card-top\"><span class=\"kind\">2027 seasonal bloom planning</span><span class=\"season-label\" hidden>Peak windows April–September</span></div><h3>Michigan Bloom Tracker 2027</h3><p class=\"place\">Michigan · Nine flower destinations</p><p class=\"description\">Compare typical peak weeks, tickets, access and parking at nine Michigan bloom stops. Read fresh source-linked observations when available; no live claim in the off-season.</p><p class=\"signals\"><strong>Signals:</strong> Destination guidance + dated flower observations when available, not calendar-as-live-data</p><div class=\"card-actions\"><a class=\"primary-action\" href=\"https://phenology.chrisizworski.com/bloom-tracker\">Which Michigan flowers should I visit? &rarr;</a></div></article>\n" + html.slice(at);
  }

  const visibleCards = [...html.matchAll(/data-tool-id="([^"]+)"/g)].length;
  html = html.replace(/(<p class="finder-count" id="finder-count" aria-live="polite">)\d+ tools shown(<\/p>)/, `$1${visibleCards} tools shown$2`);

  const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (schemaMatch) {
    try {
      const schema = JSON.parse(schemaMatch[1]);
      const list = schema?.['@graph']?.find(item => item?.['@id'] === 'https://chrisizworski.com/national-tools/#toollist');
      if (list) {
        // The owner hub already injects its own Yosemite entry (pointed at the
        // nested /national-tools/ path). Match it by name so this layer
        // corrects that one entry to the canonical root URL instead of
        // pushing a second, duplicate ListItem when the URLs disagree.
        const existing = list.itemListElement.find(item => item.name === 'Yosemite Firefall Live' || (item.url || '').includes('yosemite-firefall-live'));
        let changed = false;
        if (existing) {
          if (existing.url !== YOSEMITE_URL) {
            existing.url = YOSEMITE_URL;
            changed = true;
          }
        } else {
          list.itemListElement.push({ '@type': 'ListItem', position: list.itemListElement.length + 1, url: YOSEMITE_URL, name: 'Yosemite Firefall Live' });
          changed = true;
        }
        const bloomUrl = 'https://phenology.chrisizworski.com/bloom-tracker';
        if (!list.itemListElement.some(item => item.url === bloomUrl || item.name === 'Michigan Bloom Tracker 2027')) {
          list.itemListElement.push({ '@type': 'ListItem', position: list.itemListElement.length + 1, url: bloomUrl, name: 'Michigan Bloom Tracker 2027' });
          changed = true;
        }
        if (changed) {
          list.itemListElement.forEach((item, index) => { item.position = index + 1; });
          list.numberOfItems = list.itemListElement.length;
          html = html.replace(schemaMatch[0], `<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
        }
      }
    } catch (error) {
      console.warn('Could not extend National Tools JSON-LD for Yosemite', error);
    }
  }
  return html;
}

module.exports = publicToolPage(
  'https://national-outdoor-tools-hub.vercel.app/national-tools/?rev=20261005-maryland',
  ensureYosemite
);
// Exposed for tests only: verifies the correction stays a single-entry fix
// (no duplicate ListItem) rather than the mutation layer AGENTS.md warns
// against for a full card re-injection.
module.exports.ensureYosemite = ensureYosemite;
