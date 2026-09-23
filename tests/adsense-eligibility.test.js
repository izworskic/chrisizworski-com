const test = require('node:test');
const assert = require('node:assert/strict');
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
test('Auto ads stay off: every loader form is rewritten to the plain manual-units loader', () => {
  const { normalizeAdLoader, AUTO_ADS_ENABLED, LOADER_SRC } = require('../lib/adsense-eligibility');
  assert.equal(AUTO_ADS_ENABLED, false);
  assert.equal(LOADER_SRC, 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
  const forms = [
    loader,
    '<script async crossorigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075"></script>',
    "<script async src='//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075'></script>"
  ];
  for (const form of forms) {
    const out = normalizeAdLoader(form);
    assert.ok(!out.includes('?client='), out);
    assert.ok(out.includes(LOADER_SRC), out);
    assert.ok(/\basync\b/.test(out), out);
    assert.equal(normalizeAdLoader(out), out);
  }
  // Placed units still name the publisher on the unit itself, so they keep serving.
  const unit = '<ins class="adsbygoogle" data-ad-client="ca-pub-8222782620788075" data-ad-slot="1011148508"></ins>';
  assert.equal(normalizeAdLoader(unit), unit);
});
