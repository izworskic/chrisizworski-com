
'use strict';

// Auto ads switch. When false, every page gets the plain AdSense loader with no
// ?client= parameter. Google documents that form for manually placed ad units
// (support.google.com/adsense/answer/10762946), and without the publisher ID on
// the loader Google has no account to fetch Auto ads settings for, so it does
// not inject its own in-page ads or keyword "ad intent" links. Our own placed
// units (config/display-ad-experiment.json) carry data-ad-client and still serve.
// Set true to hand placement back to Auto ads. September 23, 2026: Chris reported
// Auto ads underlining words as ads and splitting tool cards in half.
const AUTO_ADS_ENABLED = false;
const PUBLISHER_ID = 'ca-pub-8222782620788075';
const LOADER_BASE = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
const LOADER_SRC = AUTO_ADS_ENABLED ? `${LOADER_BASE}?client=${PUBLISHER_ID}` : LOADER_BASE;
const LOADER_TAG = `<script async src="${LOADER_SRC}" crossorigin="anonymous"></script>`;

// Verification metadata can remain on every page. Ad loading belongs only on
// published content pages, never our utility, private, or redirect screens.
function eligible(html, pathname = '') {
  const path = pathname.split(/[?#]/)[0].replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
  if (['/privacy', '/terms', '/connect', '/for-publishers', '/404', '/500'].includes(path)) return false;
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  return !metas.some(tag =>
    (/\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(tag) && /\b(?:noindex|none)\b/i.test(tag)) ||
    /\bhttp-equiv\s*=\s*["']refresh["']/i.test(tag));
}
function removeAdLoader(html) {
  return html.replace(/<script\b[^>]*\bsrc\s*=\s*["'][^"']*pagead\/js\/adsbygoogle\.js[^"']*["'][^>]*>\s*<\/script>/gi, '');
}
// Rewrites every existing loader src (hand-written, generated or proxied) to the
// switch's form. Idempotent. Leaves every other attribute on the tag alone.
function normalizeAdLoader(html) {
  return html.replace(/(<script\b[^>]*\bsrc\s*=\s*)(["'])(?:https?:)?\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js(?:\?[^"']*)?\2/gi,
    (_, open, quote) => `${open}${quote}${LOADER_SRC}${quote}`);
}
module.exports = { eligible, removeAdLoader, normalizeAdLoader, AUTO_ADS_ENABLED, LOADER_SRC, LOADER_TAG };
