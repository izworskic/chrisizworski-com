// Crawl the published inventory, not a handpicked sample. Does not click ads.
import fs from 'node:fs';
import path from 'node:path';
import audit from '../lib/adsense-audit.js';
const args = process.argv.slice(2);
const output = args.find(x => x.startsWith('--output='))?.slice(9) || 'audit/adsense-network.json';
const tools = JSON.parse(fs.readFileSync('benchmarks/tool-network-registry.json')).tools;
const explicit = JSON.parse(fs.readFileSync('config/network-ads-hosts.json'));
const hosts = new Set([...explicit, ...tools.map(t => new URL(t.canonical).hostname).filter(h => h.endsWith('.chrisizworski.com'))]);
const urls = new Set(), sitemapErrors = [], seenMaps = new Set();
const decoded = s => s.replaceAll('&amp;', '&');
function add(raw, base = 'https://chrisizworski.com') {
  try {
    const u = new URL(decoded(raw), base);
    if (!hosts.has(u.hostname) || !/^https?:$/.test(u.protocol) || /\.(?:xml|js|css|png|jpe?g|webp|pdf|json|txt|svg|ico|webmanifest)$/i.test(u.pathname) || u.pathname.startsWith('/api/')) return;
    u.hash = ''; u.search = ''; urls.add(u.href);
  } catch {}
}
for (const t of tools) add(t.canonical);
for (const p of fs.readdirSync('public').filter(n => /sitemap.*\.xml$/.test(n))) {
  for (const m of fs.readFileSync('public/' + p, 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)) add(m[1]);
}
for (const p of ['public/tools/index.html', 'public/national-tools/index.html']) {
  const html = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : (await read('https://chrisizworski.com/' + p.replace(/^public\//, '').replace(/index\.html$/, ''))).text;
  for (const m of html.matchAll(/href=["']([^"']+)["']/g)) add(m[1]);
}
async function read(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'ChrisIzworskiAdCoverageAudit/1.0', Accept: 'text/html,application/xml,text/plain' } });
  return { status: response.status, url: response.url, contentType: response.headers.get('content-type'), text: await response.text() };
}
async function sitemap(url, depth = 0) {
  if (seenMaps.has(url)) return;
  if (depth > 4 || !hosts.has(new URL(url).hostname)) { sitemapErrors.push({url,error:'Sitemap outside host/depth contract'}); return; }
  seenMaps.add(url);
  try {
    const r = await read(url);
    if (r.status !== 200 || !/<(?:urlset|sitemapindex)\b/.test(r.text)) { sitemapErrors.push({ url, status: r.status }); return; }
    const locs = [...r.text.matchAll(/<loc>\s*(.*?)\s*<\/loc>/g)].map(m => decoded(m[1]));
    for (const loc of locs) {
      if (!hosts.has(new URL(loc).hostname)) continue;
      if (/<sitemapindex\b/.test(r.text)) await sitemap(loc, depth + 1); else add(loc);
    }
  } catch (e) { sitemapErrors.push({url,error:e.message}); }
}
// Discover each independent site's complete sitemap rather than only its home page.
await Promise.all([...hosts].filter(h => !h.startsWith('www.') && h !== 'chrisizworski.com').map(async host => {
  try {
    const r = await read('https://' + host + '/robots.txt');
    const maps = [...r.text.matchAll(/^Sitemap:\s*(\S+)/gim)].map(m => m[1]);
    for (const u of maps.length ? maps : ['https://' + host + '/sitemap.xml']) await sitemap(u);
  } catch (e) { sitemapErrors.push({url:'https://' + host + '/robots.txt',error:e.message}); }
}));
let runtime = {state:'unverified'};
try {
  const r = await read('https://chrisizworski.com/assets/network-ads-v1.js');
  const match = r.text.match(/var settings = (\{[^\n]+\});/);
  const settings = match ? JSON.parse(match[1]) : null;
  runtime = {status:r.status,contentType:r.contentType,loaderMode:settings?.loaderMode,manualPlacements:settings?.enabled,
    state:r.status===200 && /javascript/.test(r.contentType || '') && settings?.loaderMode==='standard' && settings?.publisherId==='ca-pub-8222782620788075' ? 'standard-runtime' : 'invalid-runtime'};
} catch(e) { runtime = {state:'fetch-error',error:e.message}; }
const queue = [...urls].sort(), pages = []; let index = 0;
console.log(`Auditing ${queue.length} discovered documents across ${hosts.size} production hosts`);
await Promise.all(Array.from({length: 8}, async () => {
  while (index < queue.length) {
    const url = queue[index++];
    try { const r = await read(url); pages.push({url, finalUrl:r.url,...audit.classify(r.text, r.url, r.status)}); }
    catch(e) { pages.push({url,state:'fetch-error',error:e.message}); }
    if (pages.length % 50 === 0) console.log(`${pages.length}/${queue.length} checked`);
  }
}));
const counts = {};
for (const p of pages) counts[p.state] = (counts[p.state] || 0) + 1;
const report = { runtime, checkedAt:new Date().toISOString(), registeredTools:tools.length, productionHosts:hosts.size, discoveredPages:queue.length, checkedPages:pages.length, counts, sitemapErrors, accountAutoAds:'unverified-needs-authenticated-account-check', delivery:'HTML code presence is not proof of an ad request or fill', pages:pages.sort((a,b)=>a.url.localeCompare(b.url)) };
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,...counts,sitemapErrors:sitemapErrors.length}));
if (args.includes('--check') && (runtime.state !== 'standard-runtime' || sitemapErrors.length || pages.some(p=>!['standard-code','network-code','excluded-document','page-exception'].includes(p.state)))) process.exitCode=1;
