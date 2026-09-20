'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { render, strip, config } = require('../lib/display-ad-experiment');
const root = path.join(__dirname, '..');

test('the three actual tools preserve all original HTML and get exactly one reversible placement', () => {
  assert.equal(config.placements.length, 3);
  for (const p of config.placements) {
    const source = fs.readFileSync(path.join(root, 'public', p.route, 'index.html'), 'utf8');
    const clean = strip(source);
    const html = render(clean, p.route);
    assert.equal(strip(html), clean, p.route + ': original content must survive exactly');
    assert.equal(render(html, p.route), html, p.route + ': idempotent injection');
    assert.equal((html.match(/data-ad-slot="1011148508"/g) || []).length, 1);
    assert.equal(render(html, p.route, { ...config, enabled: false }), clean);
    assert.equal(render(html, p.route, { ...config, placements: [] }), clean);
    assert.ok(html.indexOf('data-ad-placement=') > html.indexOf('<body'));
    assert.ok(html.indexOf('data-ad-placement=') < html.indexOf(p.before));
    assert.ok(!html.includes('data-ad-format="auto"'));
    assert.ok(!html.includes('data-full-width-responsive="true"'));
    assert.ok(html.includes('height:50px') && html.includes('height:90px'));
  }
});

test('placements stay after the complete primary tool, never inside maps or controls', () => {
  const boundaries = ['<!-- Aurora oval image -->', '<div class="field-camera"', '<div class="trust-row"'];
  config.placements.forEach((p, i) => {
    const html = render(fs.readFileSync(path.join(root, 'public', p.route, 'index.html'), 'utf8'), p.route);
    if (i === 0) assert.ok(html.indexOf('data-ad-placement=') > html.indexOf('id="auroraMap"'));
    else assert.ok(html.indexOf('data-ad-placement=') > html.indexOf(boundaries[i]));
  });
});

test('a changed/ambiguous anchor stops the build; excluded and unselected pages are unchanged', () => {
  const p = config.placements[0];
  assert.throws(() => render('<head></head><body>Changed</body>', p.route), /anchor/);
  assert.throws(() => render('<head></head>' + p.before + p.before, p.route), /anchor/);
  const noindex = '<head><meta name="robots" content="noindex"></head>' + p.before;
  assert.equal(render(noindex, p.route), noindex);
  const html = '<head></head><body>Unselected tool</body>';
  assert.equal(render(html, '/fall-color/'), html);
  const settings = { ...config, placements: config.placements.map(x => ({ ...x, enabled: false })) };
  assert.equal(render(html, p.route, settings), html);
});

function browserStub(host = 'chrisizworski.com') {
  let intersect;
  const listeners = {};
  const ad = { getBoundingClientRect: () => ({ width: 320, height: 50 }), hasAttribute: () => false };
  const container = { dataset: {}, querySelector: () => ad,
    getBoundingClientRect: () => ({ width: 350, top: 900, bottom: 1000 }) };
  const document = { visibilityState: 'visible', querySelectorAll: () => [container],
    addEventListener: (n, f) => { listeners[n] = f; }, removeEventListener: n => { delete listeners[n]; } };
  function Observer(fn) { intersect = fn; this.observe = () => {}; this.disconnect = () => {}; }
  const window = { location: { hostname: host }, innerHeight: 800, IntersectionObserver: Observer,
    addEventListener: (n, f) => { listeners[n] = f; } };
  const context = { window, document, IntersectionObserver: Observer };
  const script = fs.readFileSync(path.join(root, 'public/assets/display-ad-pilot.js'), 'utf8');
  const run = () => vm.runInNewContext(script, context);
  run();
  return { window, document, container, ad, listeners, run, intersect: () => intersect?.([{ isIntersecting: true }]) };
}

test('requests only near the viewport, once even if the initializer repeats', () => {
  const b = browserStub();
  assert.equal(b.window.adsbygoogle, undefined);
  b.intersect(); b.intersect(); b.run(); b.listeners.resize();
  assert.equal(b.window.adsbygoogle.length, 1);
});

test('preview, hidden tab, narrow container, and already processed ads do not generate requests', () => {
  const preview = browserStub('example.vercel.app');
  preview.intersect(); assert.equal(preview.window.adsbygoogle, undefined);
  const hidden = browserStub(); hidden.document.visibilityState = 'hidden'; hidden.intersect();
  assert.equal(hidden.window.adsbygoogle, undefined);
  hidden.document.visibilityState = 'visible'; hidden.listeners.visibilitychange();
  assert.equal(hidden.window.adsbygoogle.length, 1);
  const narrow = browserStub(); narrow.container.getBoundingClientRect = () => ({ width: 200 }); narrow.intersect();
  assert.equal(narrow.window.adsbygoogle, undefined);
  const processed = browserStub(); processed.ad.hasAttribute = () => true; processed.intersect();
  assert.equal(processed.window.adsbygoogle, undefined);
});

test('the release build applies the registry last', () => {
  const pkg = require('../package.json');
  assert.ok(pkg.scripts['vercel-build'].endsWith('node scripts/display-ad-pilot.mjs'));
});

test('CLI applies twice without duplicates and removes retired routes and all ads on off', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ad-pilot-'));
  try {
    const files = ['config/display-ad-experiment.json', 'lib/display-ad-experiment.js',
      'lib/adsense-eligibility.js', 'scripts/display-ad-pilot.mjs'];
    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(temp, file)), { recursive: true });
      fs.copyFileSync(path.join(root, file), path.join(temp, file));
    }
    for (const p of config.placements) {
      const file = path.join(temp, 'public', p.route, 'index.html');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, '<head></head><body>' + p.before + '</body>');
    }
    const run = mode => JSON.parse(execFileSync(process.execPath,
      [path.join(temp, 'scripts/display-ad-pilot.mjs'), mode], { encoding: 'utf8' }));
    assert.equal(run('apply').pagesChanged, 3);
    assert.equal(run('apply').pagesChanged, 0);
    const modified = { ...config, placements: config.placements.slice(1) };
    fs.writeFileSync(path.join(temp, 'config/display-ad-experiment.json'), JSON.stringify(modified));
    assert.equal(run('apply').pagesChanged, 1);
    assert.equal(run('off').pagesChanged, 2);
    assert.equal(run('status').enabled, false);
    assert.equal(run('apply').pagesChanged, 0);
    assert.equal(run('on').pagesChanged, 2);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
