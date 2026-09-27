'use strict';

// Generators must never roll a committed page's dateModified backward.
// On 2026-09-27 the Mackinac generators (baseline 2026-09-21) rewrote 17 pages
// that freshness reconciliation had already stamped 2026-09-23.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const load = () => import('../scripts/write-generated-page.mjs');

test('a later committed date survives regeneration from an older baseline', async () => {
  const { keepNewerDate } = await load();
  const generated = '{"dateModified":"2026-09-21","x":1}';
  const onDisk = '{"dateModified":"2026-09-23","x":0}';
  assert.equal(keepNewerDate(generated, onDisk), '{"dateModified":"2026-09-23","x":1}');
});

test('a newer generator date still moves the page forward', async () => {
  const { keepNewerDate } = await load();
  assert.equal(keepNewerDate('{"dateModified":"2026-10-02"}', '{"dateModified":"2026-09-23"}'), '{"dateModified":"2026-10-02"}');
});

test('a brand new page keeps the generator date', async () => {
  const { keepNewerDate } = await load();
  assert.equal(keepNewerDate('{"dateModified":"2026-09-21"}', null), '{"dateModified":"2026-09-21"}');
});

test('unchanged output is not rewritten', async () => {
  const { writeGeneratedPage } = await load();
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gen-')), 'index.html');
  assert.equal(writeGeneratedPage(file, '<p>"dateModified":"2026-09-23"</p>'), true);
  assert.equal(writeGeneratedPage(file, '<p>"dateModified":"2026-09-21"</p>'), false);
  assert.equal(fs.readFileSync(file, 'utf8'), '<p>"dateModified":"2026-09-23"</p>');
});

test('the Mackinac generators write through the date-preserving helper', () => {
  for (const f of ['generate-mackinac-hub-pages.mjs', 'generate-mackinac-intent-pages.mjs']) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'scripts', f), 'utf8');
    assert.match(src, /writeGeneratedPage\(/, f);
    assert.doesNotMatch(src, /fs\.writeFileSync\(path\.join\(dir,\s*"index\.html"\)/, f);
  }
});
