const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const file = 'public/assets/network-ads-v1.js';
function run({ host = 'whitetail.chrisizworski.com', path = '/', mode, existing = false, localPlacer = false, noindex = false, placementOff = false, manual = true, rules = [] } = {}) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace('"pageExceptions":[]', '"pageExceptions":' + JSON.stringify(rules));
  if (manual) code = code.replace('"enabled":false', '"enabled":true');
  if (mode) code = code.replace(/"loaderMode":"[^"]+"/, `"loaderMode":"${mode}"`);
  const added = [], listeners = [];
  const context = {
    window: {}, location: { hostname: host, pathname: path },
    document: {
      currentScript: { dataset: {} }, readyState: 'loading',
      head: { appendChild: el => added.push(el) },
      createElement: tag => ({ tag }),
      querySelectorAll: () => noindex ? [{ content: 'noindex,nofollow' }] : [],
      querySelector: selector => selector.includes('in-article-ads.js') ? (localPlacer ? {} : null) :
        selector.includes('pagead2') ? (existing ? {} : null) :
        selector.includes('meta[name="in-article-ads"]') ? (placementOff ? {} : null) : null,
    },
    addEventListener: (...args) => listeners.push(args),
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  vm.runInContext(code, context);
  return { added, listeners, context };
}

test('generated network runtime is reproducible from the shared settings and placer', () => {
  const before = fs.readFileSync(file, 'utf8');
  execFileSync(process.execPath, ['scripts/build-network-ads.mjs']);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});
test('a tool subdomain root initializes one loader and one shared placement lifecycle', () => {
  const { added, listeners, context } = run();
  assert.equal(added.length, 1);
  assert.equal(listeners.length, 1);
  assert.equal(context.document.currentScript.dataset.client, 'ca-pub-8222782620788075');
  assert.equal(context.document.currentScript.dataset.slot, '8700232579');
});
test('preview hosts, noindex pages, utility pages, off mode and existing local integrations stay untouched', () => {
  for (const options of [{host:'preview.vercel.app'}, {noindex:true}, {path:'/privacy/'}, {mode:'off'}]) {
    const { added, listeners } = run(options);
    assert.equal(added.length, 0);
    assert.equal(listeners.length, 0);
  }
});
test('existing Google loader is reused and page placement opt-out is honored', () => {
  assert.equal(run({existing:true}).added.length, 0);
  const disabled = run({placementOff:true});
  assert.equal(disabled.added.length, 1);
  assert.equal(disabled.listeners.length, 0);
});
test('hub homepage exclusion does not leak into independent tool homepages', () => {
  assert.equal(run({host:'chrisizworski.com'}).listeners.length, 0);
  assert.equal(run({host:'picturedrocks.chrisizworski.com'}).listeners.length, 1);
});

test('Auto ads is the production default with no custom placement lifecycle', () => {
  const config = require('../config/in-article-ads.json');
  assert.equal(config.loaderMode, 'standard');
  assert.equal(config.enabled, false);
  const result = run({ manual: false });
  assert.equal(result.added.length, 1);
  assert.equal(result.added[0].src, 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075');
  assert.equal(result.listeners.length, 0);
  assert.equal(run({localPlacer: true}).listeners.length, 0);
});

test('network page exceptions are explicit, host-scoped, and boundary-aware', () => {
  const rules=[{host:'picturedrocks.chrisizworski.com',path:'/problem',match:'section',reason:'Controls overlap'}];
  assert.equal(run({host:'picturedrocks.chrisizworski.com',path:'/problem/child',rules}).added.length,0);
  assert.equal(run({host:'picturedrocks.chrisizworski.com',path:'/problem-other',rules}).added.length,1);
  assert.equal(run({host:'whitetail.chrisizworski.com',path:'/problem',rules}).added.length,1);
});
