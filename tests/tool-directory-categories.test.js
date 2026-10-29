const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = file => fs.readFileSync(file, 'utf8');
const michigan = read('public/tools/index.html');
const national = read('public/synced-national-tools/index.html');
const garden = read('public/michigan-gardening/index.html');

const nationalTools = {
  'sunshine-skyway': 'https://chrisizworski.com/sunshine-skyway-bridge/',
  'maryland-bay-bridge': 'https://chrisizworski.com/chesapeake-bay-bridge-maryland/',
  'nyc-crossing': 'https://chrisizworski.com/nyc-crossing/',
  'flight-tracker': 'https://chrisizworski.com/flight-tracker/',
  'house-fit': 'https://chrisizworski.com/can-i-afford-this-house/',
  'agentbase': 'https://github.com/AgentBase1',
  'waterfall-window': 'https://chrisizworski.com/national-tools/waterfalls/',
};
function list(html, id) {
  const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return JSON.parse(block[1])['@graph'].find(node => node['@id'] === id);
}

test('national tools are discoverable in the U.S. directory and absent as Michigan tool cards', () => {
  const nationalList = list(national, 'https://chrisizworski.com/national-tools/#toollist');
  const michiganList = list(michigan, 'https://chrisizworski.com/tools/#toollist');
  for (const [id, url] of Object.entries(nationalTools)) {
    assert.equal((national.match(new RegExp(`data-tool-id="${id}"`, 'g')) || []).length, 1, id);
    assert.equal(nationalList.itemListElement.filter(item => item.url === url).length, 1, url);
    assert.ok(!michigan.includes(`data-tool-id="${id}"`), id);
    assert.ok(!michiganList.itemListElement.some(item => item.item?.url === url), url);
  }
  assert.doesNotMatch(michigan, /<h3>National waterfall planning<\/h3>/);
  assert.match(michigan, /href="\/national-tools\/"/);
});

test('the gardening hub holds the planting, frost and heirloom seed links', () => {
  assert.doesNotMatch(michigan, /id="gardening-tools-group"/);
  assert.match(michigan, /href="\/michigan-gardening\/"/);
  for (const href of ['/zone-6a-planting-calendar/', '/michigan-frost-dates/', '/heirloom-variety-matchmaker/', '/seed-saving-lab/']) {
    assert.ok(garden.includes(`href="${href}"`), href);
  }
});

test('discovery generators do not reinsert out-of-region bridge cards into Michigan tools', () => {
  for (const script of ['scripts/add-maryland-bay-bridge-discovery.mjs', 'scripts/add-sunshine-skyway-discovery.mjs']) {
    assert.doesNotMatch(read(script), /public\/tools\/index\.html/);
  }
  const injectedSection = read('scripts/inject-ga4.mjs').split('const MIGRATED_TOOLS_SECTION = `')[1].split('`;')[0];
  assert.doesNotMatch(injectedSection, /National waterfall planning/);
});
