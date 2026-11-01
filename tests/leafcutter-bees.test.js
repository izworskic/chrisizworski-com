'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'public/leafcutter-bees/index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

function planner() {
  const nodes = {};
  function element(id) {
    return nodes[id] ||= {
      id, value: '', textContent: '', children: [], attrs: {}, handlers: {},
      addEventListener(type, handler) { this.handlers[type] = handler; },
      appendChild(child) { this.children.push(child); },
      setAttribute(k, v) { this.attrs[k] = v; },
      getAttribute(k) { return this.attrs[k]; },
    };
  }
  for (const k of ['zone','month','flowers','temp','nest','region','result-title','result-text',
    'result-actions','result-caveat','season-label','season-head','season-intro','season-actions','season-foot']) element(k);
  Object.assign(nodes.zone, { value: '6a' });
  Object.assign(nodes.flowers, { value: 'unknown' });
  Object.assign(nodes.temp, { value: 'unknown' });
  Object.assign(nodes.nest, { value: 'none' });
  Object.assign(nodes.region, { value: 'michigan' });
  const paths = ['wild','managed'].map(v => ({
    ...element('path-' + v),
    getAttribute(k) { return k === 'data-path' ? v : this.attrs[k]; }
  }));
  const seasons = ['spring','summer','fall','winter'].map(v => ({
    ...element('season-' + v),
    getAttribute(k) { return k === 'data-season' ? v : this.attrs[k]; }
  }));
  const document = {
    getElementById: element,
    querySelectorAll(q) { return q === '[data-path]' ? paths : q === '[data-season]' ? seasons : []; },
    createElement(tag) { return { textContent: '', tag }; }
  };
  vm.runInNewContext(script, { document, Date });
  function set(k, v) { nodes[k].value = v; nodes[k].handlers.change(); }
  return { nodes, paths, seasons, set,
    title: () => nodes['result-title'].textContent,
    caveat: () => nodes['result-caveat'].textContent };
}

test('leafcutter guide is indexable with valid JSON-LD, primary sources and accessible planner', () => {
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /rel="canonical" href="https:\/\/chrisizworski.com\/leafcutter-bees\/"/);
  assert.ok(script);
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(json['@graph'].some(item => item['@type'] === 'WebApplication'));
  for (const s of ['Michigan State','Xerces','USGS','SARE','Crown Bees','leafcutter-bees/#bee-planner']) {
    if (s === 'leafcutter-bees/#bee-planner') assert.ok(html.includes(s)); else assert.ok(html.includes(s), s);
  }
  assert.match(html, /Five steps to put occupied nesting tubes away safely/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /@media\(max-width:760px\)\{\.house-grid\{grid-template-columns:1fr\}/);
  assert.ok((html.match(/<img\b/g) || []).length >= 2);
});

test('leafcutter planner separates winter care and safe summer merchant conditions', () => {
  const p = planner();
  p.set('month', '10'); p.set('nest', 'full');
  assert.match(p.title(), /Occupied nests/);
  p.set('month', '6'); p.set('nest', 'empty'); p.set('flowers', 'yes'); p.set('temp', 'warm');
  p.paths[1].handlers.click();
  assert.match(p.title(), /Conditions match/);
  p.set('temp', 'cool'); assert.match(p.title(), /Do not schedule/);
  p.set('temp', 'warm'); p.set('flowers', 'no'); assert.match(p.title(), /Do not schedule/);
  p.paths[0].handlers.click(); assert.match(p.title(), /flowers are not/);
  p.set('month', '0'); p.set('nest', 'none'); assert.match(p.title(), /Plan your bee habitat/);
  p.set('zone', '3a'); assert.match(p.caveat(), /colder northern zone/);
  p.set('zone', '9b'); assert.match(p.caveat(), /warmer zone/);
  p.seasons[1].handlers.click(); assert.match(p.nodes['season-head'].textContent, /mothers/);
});
