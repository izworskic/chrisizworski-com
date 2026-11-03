import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const asset = fs.readFileSync('public/assets/seasonal-discovery-data.js', 'utf8');
const ui = fs.readFileSync('public/assets/seasonal-discovery.js', 'utf8');
const dataContext = { window: {} };
vm.runInNewContext(asset, dataContext);
const data = dataContext.window.SeasonalDiscoveryData;

test('Python calendar regressions and checked artifact are reproducible', () => {
  for (const args of [['scripts/test-seasonal-discovery.py'], ['scripts/build-seasonal-discovery.py', '--check']]) {
    const result = spawnSync('python3', args, { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
});

// Exercise the shipped UI script with actual catalog output. This is a unit
// harness, not a substitute for browser/rendered responsive verification.
class Element {
  constructor() { this.children = []; this.attributes = {}; this.events = {}; this.hidden = false; this.value = ''; this.textContent = ''; }
  append(...nodes) { this.children.push(...nodes); }
  appendChild(node) { this.children.push(node); }
  replaceChildren(node) { this.children = node.children; }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  addEventListener(k, fn) { this.events[k] = fn; }
  focus() { this.focused = true; }
}
function boot(payload = data) {
  const root = new Element();
  const parts = new Map(['month', 'reset', 'heading', 'intro', 'picks', 'status', 'controls'].map(k => [k, new Element()]));
  parts.get('picks').children = ['static-fallback'];
  parts.get('controls').hidden = true;
  root.querySelector = selector => parts.get(selector.replace('[data-season-', '').replace(']', ''));
  const document = { querySelector: () => root, createElement: () => new Element(), createDocumentFragment: () => new Element() };
  vm.runInNewContext(ui, { document, window: { SeasonalDiscoveryData: payload }, URL, Intl, Date });
  return { root, parts, change(month) { const select = parts.get('month'); select.value = String(month); select.events.change(); } };
}
test('month selection changes answer and links; reversal and reset agree', () => {
  const app = boot();
  app.change(1);
  const january = JSON.stringify(app.parts.get('picks').children);
  app.change(7);
  assert.notEqual(JSON.stringify(app.parts.get('picks').children), january);
  assert.equal(app.root.getAttribute('data-selected-month'), '7');
  assert.match(app.parts.get('status').textContent, /July.*not a live conditions report/);
  app.change(1);
  assert.equal(JSON.stringify(app.parts.get('picks').children), january);
  app.parts.get('reset').events.click();
  assert.equal(app.parts.get('reset').hidden, true);
  assert.equal(app.parts.get('month').focused, true);
});
test('missing, unknown schema, corrupt or unsafe data preserve useful fallback', () => {
  for (const payload of [null, { schemaVersion: 99 }, { ...data, months: {} }]) {
    const app = boot(payload);
    assert.deepEqual(app.parts.get('picks').children, ['static-fallback']);
    assert.equal(app.parts.get('controls').hidden, true);
  }
  const app = boot();
  app.change(1);
  const before = JSON.stringify(app.parts.get('picks').children);
  const corrupted = structuredClone(data);
  corrupted.months['7'].picks[0].url = 'javascript:alert(1)';
  const bad = boot(corrupted);
  bad.change(1);
  bad.change(7);
  assert.equal(bad.parts.get('month').value, '1');
  assert.equal(JSON.stringify(bad.parts.get('picks').children), before);
});
test('both pages retain HTML links and all existing catalog sections', () => {
  for (const page of ['tools', 'guides']) {
    const html = fs.readFileSync(`public/${page}/index.html`, 'utf8');
    assert.equal((html.match(/data-seasonal-discovery/g) || []).length, 1);
    assert.match(html, /Find your next outing or garden project/);
    assert.match(html, /href="\/living-garden\/"/);
    assert.match(html, /data-season-controls hidden/);
    assert.match(html, /seasonal-discovery-data\.js\?v=1/);
    assert.match(html, new RegExp(`https://chrisizworski.com/${page}/`));
    assert.match(html, /https:\/\/chrisizworski.com\/#person/);
  }
  assert.ok(Buffer.byteLength(asset) < 30000, 'No oversized seasonal payload');
});
