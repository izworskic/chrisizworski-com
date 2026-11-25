'use strict';
const { eligible, pageExcluded } = require('./adsense-eligibility');
const settings = require('../config/in-article-ads.json');
function ruleKey(rule) {
  return `${rule?.host || ''}|${rule?.match || ''}|${rule?.path || ''}`;
}

function sameList(a = [], b = [], map = x => x) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => map(item) === map(b[i]));
}

function classifyRuntime(text, status = 200, contentType = 'application/javascript', expected = settings) {
  let parsed = null;
  const match = typeof text === 'string' && text.match(/var settings = (\{[^\n]+\});/);
  try { parsed = match ? JSON.parse(match[1]) : null; } catch { parsed = null; }
  const base = { status, contentType, loaderMode: parsed?.loaderMode, manualPlacements: parsed?.enabled };
  if (status !== 200 || !/javascript/i.test(contentType || '') || parsed?.loaderMode !== 'standard' || parsed?.publisherId !== expected.publisherId) {
    return { ...base, policyParity: false, state: 'invalid-runtime' };
  }
  const parity = Boolean(parsed.enabled) === Boolean(expected.enabled) &&
    sameList(parsed.excludeRoutes || [], expected.excludeRoutes || []) &&
    sameList(parsed.pageExceptions || [], expected.pageExceptions || [], ruleKey);
  return { ...base, policyParity: parity, state: parity ? 'standard-runtime' : 'stale-runtime-policy' };
}

function classify(html, url, status = 200) {
  if (status !== 200) return { state: 'http-error', status };
  if (!/<(?:html|head)\b/i.test(html)) return { state: 'not-html' };
  const scripts = html.match(/<script\b[^>]*>/gi) || [];
  const google = scripts.filter(s => /(?:https?:)?\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/.test(s));
  const network = scripts.filter(s => /src\s*=\s*["']https:\/\/chrisizworski\.com\/assets\/network-ads-v1\.js/.test(s));
  // An exception is an expected absence, not permission to ignore a direct
  // Google loader, manual placer, or client-rendered/dynamic loader marker.
  if (pageExcluded(url)) {
    const manual = scripts.filter(s => /\bsrc\s*=\s*["'](?:https?:\/\/[^/"']+)?\/assets\/in-article-ads\.js(?:[?"']|$)/.test(s));
    if (google.length || manual.length) return { state: 'exception-loader-present', google: google.length, manual: manual.length };
    if (network.length > 1) return { state: 'duplicate-loader', google: google.length, network: network.length };
    const withoutStaticNetwork = network.length === 1
      ? html.replace(/<script\b[^>]*\bsrc\s*=\s*["']https:\/\/chrisizworski\.com\/assets\/network-ads-v1\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>/gi, '')
      : html;
    if (withoutStaticNetwork.includes('adsbygoogle.js') || withoutStaticNetwork.includes('in-article-ads.js') || withoutStaticNetwork.includes('network-ads-v1.js')) {
      return { state: 'client-rendered-needs-browser' };
    }
    return { state: 'page-exception' };
  }
  if (!eligible(html, new URL(url).pathname)) return { state: 'excluded-document' };
  if (google.length > 1 || network.length > 1) return { state: 'duplicate-loader', google: google.length, network: network.length };
  if (google.length) return { state: google[0].includes('client=' + settings.publisherId) ? 'standard-code' : 'legacy-or-wrong-publisher' };
  if (network.length) return { state: 'network-code' };
  if (html.includes('network-ads-v1.js') || html.includes('adsbygoogle.js')) return { state: 'client-rendered-needs-browser' };
  return { state: 'missing-code' };
}
module.exports = { classify, classifyRuntime };
