'use strict';
const { eligible, pageExcluded } = require('./adsense-eligibility');
const settings = require('../config/in-article-ads.json');
function classify(html, url, status = 200) {
  if (status !== 200) return { state: 'http-error', status };
  if (!/<(?:html|head)\b/i.test(html)) return { state: 'not-html' };
  if (pageExcluded(url)) return { state: 'page-exception' };
  if (!eligible(html, new URL(url).pathname)) return { state: 'excluded-document' };
  const scripts = html.match(/<script\b[^>]*>/gi) || [];
  const google = scripts.filter(s => /(?:https?:)?\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/.test(s));
  const network = scripts.filter(s => /src\s*=\s*["']https:\/\/chrisizworski\.com\/assets\/network-ads-v1\.js/.test(s));
  if (google.length > 1 || network.length > 1) return { state: 'duplicate-loader', google: google.length, network: network.length };
  if (google.length) return { state: google[0].includes('client=' + settings.publisherId) ? 'standard-code' : 'legacy-or-wrong-publisher' };
  if (network.length) return { state: 'network-code' };
  if (html.includes('network-ads-v1.js') || html.includes('adsbygoogle.js')) return { state: 'client-rendered-needs-browser' };
  return { state: 'missing-code' };
}
module.exports = { classify };
