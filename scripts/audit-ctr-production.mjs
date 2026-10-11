import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const paths = ['northern-lights-michigan', 'mackinac-bridge-tolls', 'great-lakes-freighter-tracking', 'mackinac-bridge-live'];
const origin = 'https://chrisizworski.com';
const personId = `${origin}/#person`;
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'");
const title = html => decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');

export function inspectPage(html, route, expectedTitle, headers = {}) {
  const failures = [];
  const canonical = [...html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/gi)].map(m => m[1]);
  if (title(html) !== expectedTitle) failures.push('Normal production URL does not serve the expected title');
  if (canonical.length !== 1 || canonical[0] !== `${origin}/${route}/`) failures.push('Missing, duplicate or incorrect canonical');
  if (/noindex/i.test(headers['x-robots-tag'] || '') || /<meta\b[^>]*name=["'](?:robots|googlebot)["'][^>]*content=["'][^"']*noindex/i.test(html)) failures.push('Page is noindex');
  const nodes = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const data = JSON.parse(match[1]); nodes.push(...(data['@graph'] || [data])); }
    catch { failures.push('Invalid JSON-LD'); }
  }
  const isType = (n, type) => [n['@type']].flat().includes(type);
  const people = nodes.filter(n => isType(n, 'Person'));
  if (people.length !== 1 || people[0]['@id'] !== personId || people[0].name !== 'Chris Izworski') failures.push('Missing or competing creator Person');
  if (!nodes.some(n => isType(n, 'WebSite'))) failures.push('Missing WebSite');
  // FAQPage and CollectionPage are valid WebPage subtypes.
  if (!nodes.some(n => ['WebPage', 'FAQPage', 'CollectionPage'].some(t => isType(n, t)))) failures.push('Missing WebPage or subtype');
  for (const n of nodes) {
    if (isType(n, 'WebSite') && n.publisher?.['@id'] !== personId) failures.push('WebSite publisher does not use shared Person');
    if (['WebPage', 'WebApplication', 'SoftwareApplication', 'Article'].some(t => isType(n, t)) && n.author?.['@id'] !== personId) failures.push('Content author does not use shared Person');
  }
  if (!/Built by[\s\S]{0,160}href=["'](?:https:\/\/chrisizworski\.com)?\/chris-izworski\/["'][^>]*>Chris Izworski<\/a>/i.test(html)) failures.push('Missing linked Built by Chris Izworski credit');
  const adLoaders = (html.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g) || []).length;
  if (adLoaders !== 1) failures.push('Expected exactly one shared ad loader (delivery is not established)');
  return { title: title(html), canonical, personCount: people.length, adLoaders, failures };
}

async function get(path) {
  const response = await fetch(`${origin}/${path}`, { signal: AbortSignal.timeout(30000) });
  return { status: response.status, url: response.url, headers: Object.fromEntries(response.headers), text: await response.text() };
}

export async function run(output = 'artifacts/ctr-production-audit.json') {
  const pages = await Promise.all(paths.map(async route => {
    try {
      const [live, source] = await Promise.all([get(`${route}/`), readFile(new URL(`../public/${route}/index.html`, import.meta.url), 'utf8')]);
      const result = inspectPage(live.text, route, title(source), live.headers);
      if (live.status !== 200 || live.url !== `${origin}/${route}/`) result.failures.push('Unexpected status or redirect');
      return { route, status: live.status, ...result };
    } catch (error) { return { route, failures: [error.message] }; }
  }));
  const sources = await Promise.all(['api/aurora', 'api/mackinac', 'api/freighter-ais'].map(async path => {
    try {
      const live = await get(path), data = JSON.parse(live.text);
      return { path, status: live.status, checkedAt: data.fetched_at || data.checkedAt || null,
        degraded: data.degraded ?? !data.ok,
        sourceFreshness: data.source_freshness || null,
        official: data.official ? { available: data.official.available, level: data.official.level } : undefined,
        recentVessels: Array.isArray(data.vessels) ? data.vessels.filter(v => Number.isFinite(Date.parse(v.seen)) && Date.now() - Date.parse(v.seen) >= 0 && Date.now() - Date.parse(v.seen) <= 1800000).length : undefined,
        error: data.error || null };
    } catch (error) { return { path, status: 'UNAVAILABLE', error: error.message }; }
  }));
  const report = { checkedAt: new Date().toISOString(), origin, pages, sources,
    passed: pages.every(p => !p.failures.length),
    limits: 'HTTP/initial-HTML check only. Browser interactions, mobile, Google-selected canonical/snippets, push delivery and AdSense earnings require separate evidence. Upstream degradation is recorded, not misclassified as an HTML regression.' };
  await mkdir(resolve(output, '..'), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await run(process.argv[2]);
