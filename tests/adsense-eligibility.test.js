const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { eligible, removeAdLoader } = require('../lib/adsense-eligibility');
const sitePolicyLinks = require('../lib/site-policy-links');
const loader = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075" crossorigin="anonymous"></script>';
test('ad loading excludes utility and unpublished pages without excluding normal tools', () => {
  for (const path of ['/privacy/', '/privacy.html', '/terms/index.html', '/connect/?from=tool', '/for-publishers/', '/404.html', '/500.html?source=error']) assert.equal(eligible('<html></html>', path), false);
  for (const meta of ['<meta name="robots" content="noindex,follow">', "<meta content='none' name='googlebot'>", '<meta http-equiv="refresh" content="0;url=/tools/">']) assert.equal(eligible(meta, '/tool/'), false);
  assert.equal(eligible('<meta name="robots" content="index,follow">', '/soo-locks/'), true);
});
test('excluding ads preserves ownership verification and other scripts', () => {
  const retained = '<meta name="google-adsense-account" content="ca-pub-8222782620788075"><script src="/tool.js"></script>';
  assert.equal(removeAdLoader(retained + loader), retained);
});
test('publisher links remain reachable and repeated composition adds no duplicates', () => {
  const result = sitePolicyLinks('<body><a href="/about/">About</a><a href="https://chrisizworski.com/privacy/">Privacy</a></body>');
  assert.ok(result.includes('href="/connect/"')); assert.ok(result.includes('href="/terms/"'));
  assert.equal((result.match(/href="\/about\/"/g) || []).length, 1);
  assert.equal((result.match(/Privacy/g) || []).length, 1);
  assert.equal(sitePolicyLinks(result), result);
});
test('every loader form is rewritten to the plain loader so Auto ads cannot start from code', () => {
  const { normalizeAdLoader, LOADER_SRC } = require('../lib/adsense-eligibility');
  assert.equal(LOADER_SRC, 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
  for (const form of [loader,
    '<script async crossorigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075"></script>',
    "<script async src='//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075'></script>"]) {
    const out = normalizeAdLoader(form);
    assert.ok(!out.includes('?client=') && out.includes(LOADER_SRC) && /\basync\b/.test(out), out);
    assert.equal(normalizeAdLoader(out), out);
  }
});
test('in-article placer tag carries the configured slot, respects the switch and exclusions', () => {
  const { placerTag, hasPlacer, PLACER_VERSION } = require('../lib/adsense-eligibility');
  const cfg = { enabled: true, publisherId: 'ca-pub-8222782620788075', slotId: '8700232579', maxPerPage: 3, excludeRoutes: ['/skip/'] };
  const tag = placerTag('/soo-locks/index.html', cfg);
  assert.equal(PLACER_VERSION, 6);
  assert.match(tag, /src="\/assets\/in-article-ads\.js\?v=6"/);
  assert.match(tag, /data-slot="8700232579"/); assert.match(tag, /data-max="3"/); assert.match(tag, /\bdefer\b/);
  assert.ok(hasPlacer(tag));
  assert.equal(placerTag('/skip/index.html', cfg), '');
  assert.equal(placerTag('/soo-locks/', { ...cfg, enabled: false }), '');
  assert.throws(() => placerTag('/x/', { ...cfg, slotId: 'abc' }));
  const live = require('../config/in-article-ads.json');
  assert.equal(live.slotId, '8700232579'); assert.equal(live.publisherId, 'ca-pub-8222782620788075');
});
test('the placer targets reviewed seams or complete uncarded section boundaries', () => {
  const js = fs.readFileSync(path.join(__dirname, '../public/assets/in-article-ads.js'), 'utf8');
  for (const s of ['firstMin', 'table,li', '.leaflet-container', 'looksLikeCard', 'grid|flex', 'scrollY + vh', 'data-ad-layout="in-article"', 'data-ad-format="fluid"', "'chrisizworski.com'", 'data-in-article-ad-break', "querySelectorAll('section')", "ancestor.tagName === 'SECTION'", 'nestedSection', 'if (!blocks.length)', 'explicitMode ? 1.25 : 2', 'toolBottom() + (explicitMode ? 80 : 200)', 'if (e.isIntersecting && insert(e.target))']) assert.ok(js.includes(s), s);
  assert.ok(!js.includes("document.querySelectorAll('h2')"), 'must not place at headings inside cards');
  assert.ok(!/enable_page_level_ads|setInterval/.test(js));
});
test('Detroit declares two intentional ad seams without hand-written AdSense units', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/detroit-outdoors/index.html'), 'utf8');
  const marker = 'data-in-article-ad-break';
  const seams = html.match(new RegExp(marker, 'g')) || [];
  assert.equal(seams.length, 2);
  const grid = html.indexOf('id="opportunity-grid"');
  const first = html.indexOf(marker);
  const routes = html.indexOf('class="question-routes"');
  const second = html.indexOf(marker, first + marker.length);
  const context = html.indexOf('class="context"');
  assert.ok(grid >= 0 && grid < first && first < routes);
  assert.ok(routes < second && second < context);
  assert.ok(!/<ins\b[^>]*adsbygoogle/i.test(html));
});
