
'use strict';

const inArticle = require('../config/in-article-ads.json');

// One configuration governs static builds and the shared public tool shell.
// standard: Google's current loader; legacy: prior plain loader; off: no ad scripts.
// Auto ad formats are controlled in AdSense, not by omitting the client parameter.
const LOADER_BASE = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
const PLACER_SRC = '/assets/in-article-ads.js';
const PLACER_VERSION = 7;
const PUBLISHER_ID = inArticle.publisherId;
const LOADER_PATTERN = /<script\b[^>]*\bsrc\s*=\s*["'](?:https?:)?\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>\r?\n?/gi;
const PLACER_PATTERN = /<script\b[^>]*\bsrc\s*=\s*["'](?:https?:\/\/[^/"']+)?\/assets\/in-article-ads\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>\r?\n?/gi;

function loaderSrc(settings = inArticle) {
  const mode = settings.loaderMode || 'standard';
  if (!['standard', 'legacy', 'off'].includes(mode)) throw new Error('Invalid AdSense loaderMode');
  if (mode === 'off') return '';
  if (!/^ca-pub-\d+$/.test(settings.publisherId || '')) throw new Error('Invalid AdSense publisherId');
  return LOADER_BASE + (mode === 'standard' ? `?client=${settings.publisherId}` : '');
}
function loaderTag(settings = inArticle) {
  const src = loaderSrc(settings);
  return src ? `<script async src="${src}" crossorigin="anonymous"></script>` : '';
}
const LOADER_SRC = loaderSrc();
const LOADER_TAG = loaderTag();

function normalizedPath(pathname) {
  return pathname.split(/[?#]/)[0].replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
}

// Verification metadata can remain on every page. Ad loading belongs only on
// published content pages, never our utility, private, or redirect screens.
function eligible(html, pathname = '') {
  const path = normalizedPath(pathname);
  if (['/privacy', '/terms', '/connect', '/for-publishers', '/404', '/500'].includes(path)) return false;
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  return !metas.some(tag =>
    (/\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(tag) && /\b(?:noindex|none)\b/i.test(tag)) ||
    /\bhttp-equiv\s*=\s*["']refresh["']/i.test(tag));
}
function removeAdLoader(html) {
  return html.replace(LOADER_PATTERN, '');
}
// Normalize existing loaders and discard duplicates, including old publisher IDs.
function normalizeAdLoader(html, settings = inArticle) {
  let found = false;
  const tag = loaderTag(settings);
  return html.replace(LOADER_PATTERN, () => {
    if (found) return '';
    found = true;
    return tag;
  });
}
function placerTag(pathname = '', settings = inArticle) {
  const route = normalizedPath(pathname);
  if (!loaderSrc(settings) || !settings.enabled || settings.excludeRoutes.some(path => normalizedPath(path) === route)) return '';
  if (!/^ca-pub-\d+$/.test(settings.publisherId) || !/^\d+$/.test(settings.slotId)) throw new Error('Invalid in-article ad config');
  return `<script defer src="${PLACER_SRC}?v=${PLACER_VERSION}" data-client="${settings.publisherId}" data-slot="${settings.slotId}" data-max="${Number(settings.maxPerPage) || 3}"></script>`;
}
const hasPlacer = html => Boolean(html.match(PLACER_PATTERN));

// Always reconcile from settings. Merely skipping injection leaves stale scripts
// behind when a page was already built, an owner ships a loader, or ads are disabled.
function pageExcluded(pathname = '', settings = inArticle) {
  const url = new URL(pathname || '/', 'https://chrisizworski.com');
  const route = normalizedPath(url.pathname);
  return (settings.pageExceptions || []).some(rule => rule.host === url.hostname &&
    (rule.match === 'section' ? rule.path === '/' || route === rule.path || route.startsWith(rule.path + '/') : route === rule.path));
}
function applyAdSettings(html, pathname = '', settings = inArticle) {
  let result = removeAdLoader(html).replace(PLACER_PATTERN, '');
  if (pageExcluded(pathname, settings) || !eligible(html, new URL(pathname || '/', 'https://chrisizworski.com').pathname) || !loaderSrc(settings)) return result;
  const tags = [loaderTag(settings)];
  const placementOff = (html.match(/<meta\b[^>]*>/gi) || []).some(tag =>
    /\bname\s*=\s*["']in-article-ads["']/i.test(tag) && /\bcontent\s*=\s*["']off["']/i.test(tag));
  const placer = placementOff ? '' : placerTag(pathname, settings);
  if (placer) tags.push(placer);
  if (!/<\/head>/i.test(result)) throw new Error('Cannot apply AdSense settings: missing </head>');
  return result.replace(/<\/head>/i, tags.join('\n') + '\n</head>');
}
module.exports = { pageExcluded, eligible, removeAdLoader, normalizeAdLoader, loaderSrc, loaderTag, applyAdSettings, placerTag, hasPlacer, PUBLISHER_ID, LOADER_SRC, LOADER_TAG, PLACER_VERSION };
