const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const pub = (...p) => path.join(__dirname, '..', 'public', ...p);
const css = fs.readFileSync(pub('assets', 'garden-tools', 'fvf-universe.css'), 'utf8');
const ADOPTED = ['michigan-frost-dates'];

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
  assert.ok(!css.includes('—'), 'no em dashes');
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
    assert.ok(kit > -1 && skin > kit, 'skin loads after the garden kit');
    assert.ok(html.includes('Bay City &middot; Zone 6a &middot; Saginaw Bay'));
    assert.ok(html.includes('freighter-view-farms-seal.webp" width="60" height="60"'));
    assert.match(html, /<p class="site-title">[^<]*<a href="\/">Chris Izworski<\/a><\/p>/);
    for (const href of ['/about/', '/press/', '/speaking/', '/michigan-gardening/', 'https://freighterviewfarms.com']) {
      assert.ok(html.includes(`<a href="${href}"`), `nav keeps ${href}`);
    }
  });
}
