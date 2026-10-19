#!/usr/bin/env node
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const publicRoot = path.join(root, 'public');
const origin = 'https://chrisizworski.com';
const config = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
const robots = await readFile(path.join(publicRoot, 'robots.txt'), 'utf8');
const advertised = [...robots.matchAll(/^Sitemap:\s*(\S+)/gim)].map(m => m[1]);
const files = (await readdir(publicRoot)).filter(f => /sitemap.*\.xml$/.test(f));
const issues = [], deferred = [], rows = [], maps = [];
const locs = xml => [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(m => m[1].replaceAll('&amp;', '&'));
const exists = async file => { try { await access(file); return true; } catch { return false; } };
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(m => [m[1].toLowerCase(), m[2]]));
}
for (const file of files) {
  const xml = await readFile(path.join(publicRoot, file), 'utf8');
  const urls = locs(xml);
  const index = /<sitemapindex\b/.test(xml);
  if (!/<(?:urlset|sitemapindex)\b[^>]*xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/.test(xml)) issues.push(`${file}: missing sitemap namespace/root`);
  if (new Set(urls).size !== urls.length) issues.push(`${file}: duplicate loc values`);
  if (urls.length > 50000 || Buffer.byteLength(xml) > 50 * 1024 * 1024) issues.push(`${file}: exceeds sitemap size limit`);
  maps.push({ file, type: index ? 'index' : /xmlns:image=/.test(xml) ? 'image' : 'page', urls: urls.length });
  for (const url of urls) {
    let parsed; try { parsed = new URL(url); } catch { issues.push(`${file}: invalid URL ${url}`); continue; }
    if (parsed.protocol !== 'https:' || parsed.search || parsed.hash) issues.push(`${file}: noncanonical URL shape ${url}`);
    if (index) {
      if (parsed.origin !== origin) issues.push(`${file}: cross-host child sitemap ${url}`);
      const child = path.join(publicRoot, parsed.pathname);
      if (!await exists(child) && !config.rewrites.some(r => r.source === parsed.pathname)) issues.push(`${file}: child sitemap has no file or exact route ${url}`);
      continue;
    }
    // Image extension locs use image:loc and are deliberately not selected above.
    if (parsed.origin !== origin) { deferred.push({ sitemap: file, url, reason: 'external-canonical' }); continue; }
    const route = parsed.pathname;
    const redirect = config.redirects.find(r => r.source === route);
    if (redirect) { issues.push(`${file}: redirect source ${url} -> ${redirect.destination}`); continue; }
    const rewrite = config.rewrites.find(r => r.source === route);
    let document = path.join(publicRoot, route.endsWith('/') ? route + 'index.html' : route);
    if (rewrite?.destination.startsWith('/') && rewrite.destination.endsWith('.html')) document = path.join(publicRoot, rewrite.destination);
    if (rewrite && (!rewrite.destination.startsWith('/') || rewrite.destination.startsWith('/api/'))) {
      deferred.push({ sitemap: file, url, reason: 'delegated-route' }); continue;
    }
    if (!await exists(document)) {
      const family = config.rewrites.find(r => r.source.includes(':') && route.startsWith(r.source.split(':')[0]));
      if (family) deferred.push({ sitemap: file, url, reason: 'routed-family-requires-live-check' });
      else issues.push(`${file}: missing published document ${url}`);
      continue;
    }
    const html = (await readFile(document, 'utf8')).replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
    const tags = [...html.matchAll(/<(?:link|meta)\b[^>]*>/gi)].map(m => attributes(m[0]));
    const canonical = tags.filter(t => t.rel?.toLowerCase().split(/\s+/).includes('canonical')).map(t => t.href);
    if (canonical.length !== 1 || canonical[0] !== url) issues.push(`${file}: canonical mismatch ${url} -> ${canonical.join(', ') || 'MISSING'}`);
    if (tags.some(t => /^(robots|googlebot)$/i.test(t.name || '') && /\b(noindex|none)\b/i.test(t.content || ''))) issues.push(`${file}: noindex page ${url}`);
    rows.push({ sitemap: file, url });
  }
}
// Child pages may intentionally appear in multiple specialist maps; this is not an error.
for (const url of advertised.filter(u => new URL(u).origin === origin)) {
  const route = new URL(url).pathname;
  if (!await exists(path.join(publicRoot, route)) && !config.rewrites.some(r => r.source === route)) issues.push(`robots.txt: missing sitemap ${url}`);
}
console.log(JSON.stringify({ maps, checkedLocalEntries: rows.length, uniqueLocalPages: new Set(rows.map(r => r.url)).size, deferredEntries: deferred.length, deferredReasons: [...new Set(deferred.map(r => r.reason))], issues }, null, 2));
console.log('Delegated routes require a separate live audit; local PASS does not certify their response or indexing.');
if (process.argv.includes('--check') && issues.length) process.exitCode = 1;
