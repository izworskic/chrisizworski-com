'use strict';

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
module.exports = { eligible, removeAdLoader };
