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
