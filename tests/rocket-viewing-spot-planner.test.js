'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname,
  '../public/synced-national-tools/rocket-launch-live/app.js'), 'utf8');
const start = source.indexOf('  function renderSpotPlanner(data, cards) {');
const end = source.indexOf('  function renderAccess(data) {', start);
assert(start > 0 && end > start, 'Visitor planner function is missing');
assert(source.includes('renderSpotPlanner(data,viewingCards);'),
  'The plan must be driven by the existing access-card source');
assert(source.includes('.filter(site => siteMapHref(site))'),
  'Only source-approved map locations should become selectable');

class FakeNode {
  constructor(tag, className, value) {
    this.tagName = tag;
    this.className = className || '';
    this.textContent = value == null ? '' : String(value);
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.handlers = {};
    this.href = null;
  }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = [...children]; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k]; }
  addEventListener(type, fn) { this.handlers[type] = fn; }
  click() { this.handlers.click?.(); }
}
function findAll(node, predicate) {
  return [...(predicate(node) ? [node] : []),
    ...node.children.flatMap(child => findAll(child, predicate))];
}
const mk = (tag, cls, value) => new FakeNode(tag, cls, value);
const place = (id, name, kind = 'public') => ({
  id, name, kind, source: 'https://www.nasa.gov/',
  bestFor: 'Public shoreline', reason: 'Check parking and event access.',
  address: name + ', Virginia, USA', mapsLocationAllowed: true
});
function harness() {
  const root = mk('div', 'rl-spot-planner');
  const state = {};
  const context = {
    state, $: id => id === 'rl-spot-planner' ? root : null, el: mk,
    siteMapHref: site => site.mapsLocationAllowed && site.state !== 'closed' ?
      'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(site.address) : null,
    anchor: (url, label, cls) => {
      if (!url) return null;
      const link = mk('a', cls, label);
      link.href = url;
      return link;
    },
    floridaSpecialistLink: x => x
  };
  const renderSpotPlanner = vm.runInNewContext(source.slice(start, end) +
    '; renderSpotPlanner;', context);
  return {root, state, renderSpotPlanner};
}
const data = id => ({
  selectedRegion: 'virginia', selectedLaunchId: id,
  selectedLaunch: {id, name: 'Test launch'},
  region: {specialist: '/wallops-rocket-launch-viewing/'}
});
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

test('place A to B to A updates all public locations without ranking the first', () => {
  const h = harness();
  const places = [place('visitor', 'NASA Wallops Visitor Center', 'mission-confirm'),
    place('waterfront', 'Robert Reed Waterfront Park'), place('harbor', 'Curtis Merritt Harbor')];
  h.renderSpotPlanner(data(A), places);
  let options = findAll(h.root, n => n.className === 'rl-spot-planner-option');
  assert.equal(options.length, 3);
  assert(options.every(n => n.getAttribute('aria-pressed') === 'false'));
  assert(findAll(h.root, n => n.className === 'rl-spot-planner-placeholder').length === 1);
  options[0].click();
  assert.equal(h.state.spotPlanner.siteId, 'visitor');
  assert.equal(options[0].getAttribute('aria-pressed'), 'true');
  let map = findAll(h.root, n => n.className === 'rl-spot-planner-map');
  assert.equal(map.length, 1);
  assert(map[0].href.includes('NASA%20Wallops'));
  assert(findAll(h.root, n => n.className === 'rl-spot-planner-caution')
    [0].textContent.includes('may not open'));
  options[1].click();
  assert.equal(options[0].getAttribute('aria-pressed'), 'false');
  assert.equal(options[1].getAttribute('aria-pressed'), 'true');
  map = findAll(h.root, n => n.className === 'rl-spot-planner-map');
  assert(map[0].href.includes('Robert%20Reed'));
  options[0].click();
  assert.equal(h.state.spotPlanner.siteId, 'visitor');
  assert(findAll(h.root, n => n.className === 'rl-spot-planner-map')[0].href.includes('NASA%20Wallops'));
  h.renderSpotPlanner(data(A), places);
  options = findAll(h.root, n => n.className === 'rl-spot-planner-option');
  assert.equal(options[0].getAttribute('aria-pressed'), 'true', 'Same mission retains valid choice');
  h.renderSpotPlanner(data(B), places);
  options = findAll(h.root, n => n.className === 'rl-spot-planner-option');
  assert.equal(h.state.spotPlanner.siteId, null);
  assert(options.every(n => n.getAttribute('aria-pressed') === 'false'),
    'Another mission must never inherit a chosen viewing place');
});

test('restricted and missing locations cannot produce a route to a pad', () => {
  const h = harness();
  h.renderSpotPlanner(data(A), [place('open', 'Public town park'),
    {...place('pad', 'Restricted launch pad'), mapsLocationAllowed: false},
    {...place('closed', 'Closed park'), state: 'closed'}]);
  const options = findAll(h.root, n => n.className === 'rl-spot-planner-option');
  assert.equal(options.length, 1);
  options[0].click();
  assert(findAll(h.root, n => n.className === 'rl-spot-planner-map')[0].href.includes('Public%20town%20park'));
  h.renderSpotPlanner(data(B), [place('pad', 'Restricted launch pad')].map(p =>
    ({...p, mapsLocationAllowed: false})));
  assert.equal(findAll(h.root, n => n.className === 'rl-spot-planner-map').length, 0);
  assert.equal(findAll(h.root, n => n.className === 'rl-spot-planner-option').length, 0);
  assert.equal(h.state.spotPlanner.siteId, null);
});
