const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/assets/gazette-latest.js'), 'utf8');

function harness(responses) {
  const elements = new Map();
  const classes = new Set();
  const widget = {
    querySelectorAll(selector) {
      if (!elements.has(selector)) elements.set(selector, {});
      return [elements.get(selector)];
    },
    classList: {
      add: name => classes.add(name), remove: name => classes.delete(name),
      toggle: (name, yes) => yes ? classes.add(name) : classes.delete(name),
    },
  };
  const events = {};
  const document = { hidden: false, querySelectorAll: () => [widget], addEventListener: (name, fn) => { events[name] = fn; } };
  const calls = [];
  let interval, abort;
  const context = {
    document, Intl, Date, AbortController,
    setInterval(fn, ms) { assert.equal(ms, 300000); interval = fn; },
    setTimeout(fn) { abort = fn; return 1; }, clearTimeout() {},
    async fetch(url, options) {
      calls.push({ url, options });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return { ok: true, json: async () => response };
    },
  };
  vm.runInNewContext(source, context);
  return { elements, classes, calls, document, events, tick: () => interval(), abort: () => abort() };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Detroit' }).format(new Date());
const edition = date => ({ success: true, date, brief: { headline: `Ships on ${date}`, sections: [{ kicker: '', body: 'Sourced movements.' }] }, data: { aisPassages: [{ status: 'ok' }] } });

test('all shared Gazette cards recover from an old issue to the new issue without reload', async () => {
  const h = harness([edition('2026-01-01'), edition(today)]);
  await flush();
  assert.match(h.elements.get('[data-gazette-source-status]').textContent, /delayed/);
  assert.equal(h.classes.has('is-live'), false);
  await h.tick();
  assert.equal(h.elements.get('[data-gazette-headline]').textContent, `Ships on ${today}`);
  assert.equal(h.elements.get('[data-gazette-headline-link], [data-gazette-primary]').href, `https://gazette.chrisizworski.com/issue/${today}`);
  assert.equal(h.classes.has('is-live'), true);
  assert.equal(h.calls[0].options.cache, 'no-store');
});

test('failed feed is disclosed and recovers when a background tab becomes visible', async () => {
  const h = harness([new Error('offline'), edition(today)]);
  await flush();
  assert.equal(h.classes.has('is-fallback'), true);
  assert.match(h.elements.get('[data-gazette-source-status]').textContent, /unavailable/);
  assert.equal(h.elements.get('[data-gazette-label]').textContent, 'Latest Great Lakes Gazette');
  h.document.hidden = true;
  await h.tick();
  assert.equal(h.calls.length, 1);
  h.document.hidden = false;
  h.events.visibilitychange();
  await flush();
  assert.equal(h.classes.has('is-fallback'), false);
  assert.equal(h.classes.has('is-live'), true);
});

test('feed errors cannot leave a stale card marked live and never erase its readable edition', async () => {
  const h = harness([edition(today), { success: false }]);
  await flush();
  await h.tick();
  assert.equal(h.classes.has('is-live'), false);
  assert.equal(h.elements.get('[data-gazette-headline]').textContent, `Ships on ${today}`);
  assert.match(h.elements.get('[data-gazette-source-status]').textContent, /last loaded edition/);
});
