const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const pub = (...p) => path.join(__dirname, '..', 'public', ...p);
const css = fs.readFileSync(pub('assets', 'garden-tools', 'fvf-universe.css'), 'utf8');
const ADOPTED = [
  'michigan-frost-dates',
  'michigan-soil-temperature',
  'zone-6a-planting-calendar',
  'when-to-plant-tomatoes-michigan',
  'seed-starting-guide',
  'heirloom-seed-saving-guide',
  'heirloom-vs-hybrid-seeds',
  'michigan-native-plants',
  'michigan-seed-libraries',
  'michigan-last-spring-freeze',
  'companion-planting-zone-6a',
  'heirloom-tomatoes-michigan',
];

test('shared garden skin is static, self-hosted and scoped to opted-in pages', () => {
  assert.ok(!/@import|https?:\/\//.test(css), 'no third-party requests from the skin');
  for (const m of css.matchAll(/url\("([^"]+)"\)/g)) {
    assert.ok(fs.existsSync(pub(...m[1].split('/').filter(Boolean))), `missing ${m[1]}`);
  }
  assert.ok(fs.existsSync(pub('assets', 'garden-tools', 'fonts', 'OFL.txt')), 'font license ships with the fonts');
  const unscoped = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@font-face\{[^}]*\}/g, '')
    .replace(/@media[^{]*\{/g, '')
    .split('}')
    .map((r) => r.split('{')[0].trim())
    .filter(Boolean)
    .flatMap((sel) => sel.split(','))
    .filter((sel) => !/^(body\.fvfu|\.fvfu-)/.test(sel.trim()));
  assert.deepStrictEqual(unscoped, [], 'every rule is scoped to body.fvfu or a fvfu- class');
  assert.ok(!css.includes(String.fromCharCode(8212)), 'no long dashes');
});

test('answer colors keep their meaning: the skin never repaints garden kit states', () => {
  assert.ok(!/\.gk-answer(\.wait|\.no|\.info)?\s*\{/.test(css));
  assert.ok(!/--gk-(pine|sage|clay|gold|violet)[a-z-]*\s*:/.test(css));
});

for (const slug of ADOPTED) {
  test(`${slug} carries the shared masthead and keeps creator identity`, () => {
    const html = fs.readFileSync(pub(slug, 'index.html'), 'utf8');
    assert.match(html, /<body class="fvfu"/);
    const kit = html.indexOf('/assets/garden-tools/garden-kit.css');
    const skin = html.indexOf('/assets/garden-tools/fvf-universe.css');
    assert.ok(skin > kit, 'skin loads after the garden kit when the page uses the kit');
    assert.ok(skin > html.lastIndexOf('</style>'), 'skin loads after the page styles');
    assert.ok(html.includes('Bay City &middot; Zone 6a &middot; Saginaw Bay'));
    assert.ok(html.includes('freighter-view-farms-seal.webp" width="60" height="60"'));
    assert.match(html, /<p class="site-title">[^<]*<a href="\/">Chris Izworski<\/a><\/p>/);
    for (const href of ['/about/', '/press/', '/speaking/', '/michigan-gardening/', 'https://freighterviewfarms.com']) {
      assert.ok(html.includes(`<a href="${href}"`), `nav keeps ${href}`);
    }
  });
}

test('Pest Watch shares the type, seal and place line but keeps its own layout', () => {
  const html = fs.readFileSync(pub('michigan-garden-pest-watch', 'index.html'), 'utf8');
  assert.ok(html.includes('<p class="fvf-place">Bay City &middot; Zone 6a &middot; Saginaw Bay</p>'));
  assert.ok(html.includes('freighter-view-farms-seal.webp" width="56" height="56"'));
  assert.ok(html.includes('<a class="fvf-wordmark" href="/michigan-gardening/">Freighter View Farms</a>'));
  assert.ok(html.includes('Garden field notes by <a href="/">Chris Izworski</a>'));
  assert.ok(html.includes('<header class="masthead">') && html.includes('<main id="watchdesk">'));
  assert.ok(!html.includes('class="fvfu"'), 'Pest Watch does not take the generic page skin');
  for (const file of ['garden-pest-watch.css', 'garden-earworm-trap-desk.css', 'garden-pest-python-fieldbook.css']) {
    const sheet = fs.readFileSync(pub('assets', file), 'utf8');
    assert.ok(!/Fraunces|DM Sans/.test(sheet), `${file} uses the shared families`);
  }
  const main = fs.readFileSync(pub('assets', 'garden-pest-watch.css'), 'utf8');
  for (const m of main.matchAll(/url\("([^"]+\.woff2)"\)/g)) {
    assert.ok(fs.existsSync(pub(...m[1].split('/').filter(Boolean))), `missing ${m[1]}`);
  }
});

test('Variety Matchmaker keeps its own masthead and joins the shared look', () => {
  const html = fs.readFileSync(pub('heirloom-variety-matchmaker', 'index.html'), 'utf8');
  assert.match(html, /<body class="fvfu"/);
  assert.ok(html.indexOf('fvf-universe.css') > html.indexOf('garden-kit.css'));
  assert.ok(html.includes('Bay City &middot; Zone 6a &middot; Saginaw Bay'));
  assert.ok(html.includes('freighter-view-farms-seal.webp" width="60" height="60"'));
  assert.ok(html.includes('<h1>Heirloom Variety Matchmaker</h1>'));
  assert.ok(html.includes('<a href="https://chrisizworski.com/">Chris Izworski</a>'));
});

test('every adopting page loads the same skin version', () => {
  const versions = new Set();
  for (const slug of [...ADOPTED, 'heirloom-variety-matchmaker']) {
    const m = fs.readFileSync(pub(slug, 'index.html'), 'utf8').match(/fvf-universe\.css\?v=([0-9a-z]+)/);
    assert.ok(m, `${slug} loads the skin`);
    versions.add(m[1]);
  }
  assert.strictEqual(versions.size, 1);
});
