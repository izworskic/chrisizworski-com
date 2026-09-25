
'use strict';

const inArticle = require('../config/in-article-ads.json');

// Every page loads the plain AdSense loader (no ?client=), Google's documented
// form for placed ad units (support.google.com/adsense/answer/10762946). Auto ads
// are also OFF in the AdSense account. Ads come only from the in-article placer:
// config/in-article-ads.json + public/assets/in-article-ads.js.
const LOADER_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
const LOADER_TAG = `<script async src="${LOADER_SRC}" crossorigin="anonymous"></script>`;
const PLACER_SRC = '/assets/in-article-ads.js';
const PLACER_VERSION = 3;

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
// Rewrites every existing loader (hand-written, generated or proxied) to the plain form.
function normalizeAdLoader(html) {
  return html.replace(/(<script\b[^>]*\bsrc\s*=\s*)(["'])(?:https?:)?\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js(?:\?[^"']*)?\2/gi,
    (_, open, quote) => `${open}${quote}${LOADER_SRC}${quote}`);
}
function placerTag(pathname = '', settings = inArticle) {
  const route = pathname.split(/[?#]/)[0].replace(/index\.html$/, '');
  if (!settings.enabled || settings.excludeRoutes.includes(route)) return '';
  if (!/^ca-pub-\d+$/.test(settings.publisherId) || !/^\d+$/.test(settings.slotId)) throw new Error('Invalid in-article ad config');
  return `<script defer src="${PLACER_SRC}?v=${PLACER_VERSION}" data-client="${settings.publisherId}" data-slot="${settings.slotId}" data-max="${Number(settings.maxPerPage) || 3}"></script>`;
}
const hasPlacer = html => html.includes(`src="${PLACER_SRC}`);
module.exports = { eligible, removeAdLoader, normalizeAdLoader, placerTag, hasPlacer, LOADER_SRC, LOADER_TAG, PLACER_VERSION };
