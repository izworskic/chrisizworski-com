import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = path.resolve('node_modules/national-ballard-locks');
const sourcePage = path.join(sourceRoot, 'public', 'ballard-locks');
const sourceApi = path.join(sourceRoot, 'api', 'ballard-locks.js');
const sourceAisApi = path.join(sourceRoot, 'api', 'ballard-ais.js');
const destPage = path.resolve('public/ballard-locks');
const destApi = path.resolve('api/ballard-locks.js');
const destAisApi = path.resolve('api/ballard-ais.js');
const sitemapPath = path.resolve('public/sitemap.xml');
const canonical = 'https://chrisizworski.com/ballard-locks/';
const tourCanonical = 'https://chrisizworski.com/ballard-locks/tour/';
const salmonCanonical = 'https://chrisizworski.com/ballard-locks/salmon-counts/';

// Production Ballard is synced from one exact authoritative commit so the main page,
// tour, salmon interpretation and API cannot drift from one another.
const ballardSourceCommit = '761a041de378f1265211122b1395c3968106a94e';
const rawBase = `https://raw.githubusercontent.com/izworskic/national-ballard-locks/${ballardSourceCommit}`;
const rawSources = {
  main: `${rawBase}/public/ballard-locks-v2/index.html`,
  tour: `${rawBase}/public/ballard-locks-v2/tour/index.html`,
  salmon: `${rawBase}/public/ballard-locks-v2/salmon-counts/index.html`,
  api: `${rawBase}/api/ballard-live-v2.js`,
};

if (!fs.existsSync(sourcePage)) throw new Error(`Ballard sync: missing ${sourcePage}`);
if (!fs.existsSync(sourceApi)) throw new Error(`Ballard sync: missing ${sourceApi}`);
if (!fs.existsSync(sourceAisApi)) throw new Error(`Ballard sync: missing ${sourceAisApi}`);

// Keep the package-backed mirror as a safe baseline and retain the proven AIS proxy.
fs.rmSync(destPage, { recursive: true, force: true });
fs.mkdirSync(path.dirname(destPage), { recursive: true });
fs.cpSync(sourcePage, destPage, { recursive: true });
fs.copyFileSync(sourceApi, destApi);
fs.copyFileSync(sourceAisApi, destAisApi);

async function fetchExact(url, label) {
  const response = await fetch(url, { headers: { 'user-agent': 'chrisizworski-com-build/2.0' } });
  if (!response.ok) throw new Error(`Ballard sync: ${label} source returned ${response.status}`);
  return response.text();
}

const [mainSource, tourSource, salmonSource, apiSource] = await Promise.all([
  fetchExact(rawSources.main, 'main page'),
  fetchExact(rawSources.tour, 'tour page'),
  fetchExact(rawSources.salmon, 'salmon page'),
  fetchExact(rawSources.api, 'live API'),
]);

fs.mkdirSync(path.join(destPage, 'tour'), { recursive: true });
fs.mkdirSync(path.join(destPage, 'salmon-counts'), { recursive: true });
fs.writeFileSync(path.join(destPage, 'index.html'), mainSource);
fs.writeFileSync(path.join(destPage, 'tour', 'index.html'), tourSource);
fs.writeFileSync(path.join(destPage, 'salmon-counts', 'index.html'), salmonSource);
fs.writeFileSync(destApi, apiSource);

const page = fs.readFileSync(path.join(destPage, 'index.html'), 'utf8');
if (!page.includes(canonical)) throw new Error('Ballard sync: canonical production URL missing');
if (!page.includes('/api/ballard-locks')) throw new Error('Ballard sync: live API hook missing');
if (!page.includes('Best first stop now')) throw new Error('Ballard sync: decision-first recommendation missing');
if (!page.includes('What might you actually see?')) throw new Error('Ballard sync: vessel intelligence surface missing');
if (!page.includes('context only')) throw new Error('Ballard sync: tide context boundary missing');
if (!page.includes('one working system doing three jobs at once')) throw new Error('Ballard sync: ambassador system story missing');
if (!page.includes('Look up from your phone')) throw new Error('Ballard sync: observation prompts missing');
if (!page.includes('activity-story')) throw new Error('Ballard sync: live vessel interpretation missing');

const tourFile = path.join(destPage, 'tour', 'index.html');
const tourPage = fs.readFileSync(tourFile, 'utf8');
if (!tourPage.includes(tourCanonical)) throw new Error('Ballard sync: tour canonical missing');
if (!tourPage.includes('/api/ballard-locks')) throw new Error('Ballard sync: tour live API hook missing');
if (!tourPage.includes('/api/ballard-ais')) throw new Error('Ballard sync: tour AIS API hook missing');
for (const phrase of ['See this', 'What’s happening', 'Watch for', 'Why it matters', 'RIGHT NOW']) {
  if (!tourPage.includes(phrase)) throw new Error(`Ballard sync: ambassador tour anatomy missing ${phrase}`);
}
if (tourPage.includes('href="https://ballardlocks.org') || tourPage.includes("href='https://ballardlocks.org")) throw new Error('Ballard sync: compromised legacy domain linked as authority');

const salmonFile = path.join(destPage, 'salmon-counts', 'index.html');
const salmonPage = fs.readFileSync(salmonFile, 'utf8');
if (!salmonPage.includes(salmonCanonical)) throw new Error('Ballard sync: salmon counts canonical missing');
if (!salmonPage.includes('/api/ballard-locks')) throw new Error('Ballard sync: salmon counts live API hook missing');
if (!salmonPage.toLowerCase().includes('latest published')) throw new Error('Ballard sync: salmon freshness language missing');
if (!salmonPage.includes('OFFSEASON')) throw new Error('Ballard sync: salmon season semantics missing');

const api = fs.readFileSync(destApi, 'utf8');
if (!api.includes("decisionRole:'context-only'")) throw new Error('Ballard sync: tide still lacks context-only boundary');
if (!api.includes('bestFirstStop')) throw new Error('Ballard sync: best-first-stop decision missing');
if (!api.includes('Open Waters AIS')) throw new Error('Ballard sync: AIS summary missing');
if (!api.includes('verifyPostedSigns:true')) throw new Error('Ballard sync: parking freshness guard missing');

let sitemap = fs.readFileSync(sitemapPath, 'utf8');
if (!sitemap.includes(`<loc>${canonical}</loc>`)) {
  const entry = `  <url>\n    <loc>${canonical}</loc>\n    <lastmod>2026-09-28</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  if (!sitemap.includes('</urlset>')) throw new Error('Ballard sync: sitemap closing tag missing');
  sitemap = sitemap.replace('</urlset>', `${entry}</urlset>`);
}
if (!sitemap.includes(`<loc>${tourCanonical}</loc>`)) {
  const entry = `  <url>\n    <loc>${tourCanonical}</loc>\n    <lastmod>2026-09-28</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.75</priority>\n  </url>\n`;
  sitemap = sitemap.replace('</urlset>', `${entry}</urlset>`);
}
if (!sitemap.includes(`<loc>${salmonCanonical}</loc>`)) {
  const entry = `  <url>\n    <loc>${salmonCanonical}</loc>\n    <lastmod>2026-09-28</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.82</priority>\n  </url>\n`;
  sitemap = sitemap.replace('</urlset>', `${entry}</urlset>`);
}
fs.writeFileSync(sitemapPath, sitemap);

console.log(`Synced Ballard Locks decision v2 from ${ballardSourceCommit}.`);
