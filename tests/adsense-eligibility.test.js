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
test('every loader form uses the centrally configured publisher and current Google code', () => {
  const { normalizeAdLoader, LOADER_SRC, loaderSrc } = require('../lib/adsense-eligibility');
  const configured = require('../config/in-article-ads.json');
  const standard = { ...configured, loaderMode: 'standard' };
  assert.equal(LOADER_SRC, loaderSrc(configured));
  for (const form of [loader,
    '<script async crossorigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075"></script>',
    "<script src='//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-123'></script>",
    '<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>']) {
    const out = normalizeAdLoader(form, standard);
    assert.equal(out, loader);
    assert.equal(normalizeAdLoader(out, standard), out);
  }
});
test('central loader rollback and off modes reconcile duplicate and stale scripts', () => {
  const { applyAdSettings, loaderSrc } = require('../lib/adsense-eligibility');
  const config = require('../config/in-article-ads.json');
  const stale = '<script defer src="/assets/in-article-ads.js?v=1" data-slot="123"></script>';
  const original = `<html><head>${loader}${stale}<script src="/tool.js"></script></head><body><h1>Tool</h1>${loader}<div data-in-article-ad-break aria-hidden="true"></div></body></html>`;
  let html = original;
  for (const mode of ['standard', 'legacy', 'off', 'standard']) {
    const settings = { ...config, loaderMode: mode };
    html = applyAdSettings(html, '/fall-color/', settings);
    assert.equal((html.match(/pagead\/js\/adsbygoogle\.js/g) || []).length, mode === 'off' ? 0 : 1);
    assert.equal((html.match(/src="\/assets\/in-article-ads\.js/g) || []).length, mode === 'off' ? 0 : 1);
    assert.equal(html.includes('?client='), mode === 'standard');
    if (mode !== 'off') {
      assert.ok(html.match(/<head>([\s\S]*?)<\/head>/)[1].includes(loaderSrc(settings)));
      assert.ok(html.includes('data-slot="8700232579"'));
    }
    assert.ok(html.includes('<h1>Tool</h1>'));
    assert.ok(html.includes('data-in-article-ad-break'));
    assert.ok(html.includes('<script src="/tool.js"></script>'));
    assert.ok(!html.includes('data-slot="123"'));
    assert.equal(applyAdSettings(html, '/fall-color/', settings), html);
  }
  assert.throws(() => loaderSrc({ ...config, loaderMode: 'typo' }), /loaderMode/);
});
test('disabled placements, route exclusions and unpublished pages remove pre-existing scripts', () => {
  const { applyAdSettings, placerTag } = require('../lib/adsense-eligibility');
  const config = { ...require('../config/in-article-ads.json'), loaderMode: 'standard', enabled: true };
  const html = `<html><head>${loader}${placerTag('/fall-color/', config)}</head><body>Tool</body></html>`;
  for (const route of ['/about', '/about/', '/about/index.html?from=tool']) {
    const result = applyAdSettings(html, route, config);
    assert.ok(!result.includes('/assets/in-article-ads.js'));
    assert.ok(result.includes('adsbygoogle.js'));
  }
  for (const result of [
    applyAdSettings(html, '/fall-color/', { ...config, enabled: false }),
    applyAdSettings(html.replace('</head>', '<meta content="off" name="in-article-ads"></head>'), '/fall-color/', config)
  ]) {
    assert.ok(!result.includes('/assets/in-article-ads.js'));
    assert.ok(result.includes('adsbygoogle.js'));
  }
  for (const result of [applyAdSettings(html, '/privacy/'), applyAdSettings(html.replace('</head>', '<meta name="robots" content="noindex"></head>'), '/private/')]) {
    assert.ok(!result.includes('adsbygoogle.js'));
    assert.ok(!result.includes('/assets/in-article-ads.js'));
  }
});
test('in-article placer tag carries the configured slot, respects the switch and exclusions', () => {
  const { placerTag, hasPlacer, PLACER_VERSION } = require('../lib/adsense-eligibility');
  const cfg = { enabled: true, publisherId: 'ca-pub-8222782620788075', slotId: '8700232579', maxPerPage: 3, excludeRoutes: ['/skip/'] };
  const tag = placerTag('/soo-locks/index.html', cfg);
  assert.equal(PLACER_VERSION, 7);
  assert.match(tag, /src="\/assets\/in-article-ads\.js\?v=7"/);
  assert.match(tag, /data-slot="8700232579"/); assert.match(tag, /data-max="3"/); assert.match(tag, /\bdefer\b/);
  assert.ok(hasPlacer(tag));
  assert.equal(placerTag('/skip/index.html', cfg), '');
  assert.equal(placerTag('/soo-locks/', { ...cfg, enabled: false }), '');
  assert.throws(() => placerTag('/x/', { ...cfg, slotId: 'abc' }));
  const live = require('../config/in-article-ads.json');
  assert.equal(live.slotId, '8700232579'); assert.equal(live.publisherId, 'ca-pub-8222782620788075');
});
test('the placer targets reviewed seams, whole sections, or headings in plain content flow', () => {
  const js = fs.readFileSync(path.join(__dirname, '../public/assets/in-article-ads.js'), 'utf8');
  for (const s of ['firstMin', 'table,li', '.leaflet-container', 'looksLikeCard', 'grid|flex', 'scrollY + vh', 'data-ad-layout="in-article"', 'data-ad-format="fluid"', "'chrisizworski.com'", 'data-in-article-ad-break', "querySelectorAll('section')", "ancestor.tagName === 'SECTION'", "querySelectorAll('h2')", 'plainFlow', "!heading.closest('section')", '[class~="card"]', 'top(block) >= firstMin', 'if (!blocks.length)', 'explicitMode ? 1.25 : 2', 'toolBottom() + (explicitMode ? 80 : 200)', 'if (e.isIntersecting && insert(e.target))']) assert.ok(js.includes(s), s);
  assert.ok(!/enable_page_level_ads|setInterval/.test(js));
});
test('Soo Locks has one intentional break after the live camera and before lock reference cards', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/soo-locks/index.html'), 'utf8');
  const marker = 'data-in-article-ad-break';
  assert.equal((html.match(new RegExp(marker, 'g')) || []).length, 1);
  const camera = html.indexOf('<div class="field-camera"');
  const cameraEnd = html.indexOf('</div>', camera);
  const seam = html.indexOf(marker);
  const locks = html.indexOf('<h2 class="sh">The Locks</h2>');
  assert.ok(camera >= 0 && camera < cameraEnd && cameraEnd < seam && seam < locks);
  assert.ok(!/<ins\b[^>]*adsbygoogle/i.test(html));
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
