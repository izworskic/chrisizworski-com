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
const salmonSourceCommit = '86fdfd789e16135c801ebf083da068a4a175149c';
const salmonRawUrl = `https://raw.githubusercontent.com/izworskic/national-ballard-locks/${salmonSourceCommit}/public/ballard-locks/salmon-counts/index.html`;

if (!fs.existsSync(sourcePage)) throw new Error(`Ballard sync: missing ${sourcePage}`);
if (!fs.existsSync(sourceApi)) throw new Error(`Ballard sync: missing ${sourceApi}`);
if (!fs.existsSync(sourceAisApi)) throw new Error(`Ballard sync: missing ${sourceAisApi}`);

fs.rmSync(destPage, { recursive: true, force: true });
fs.mkdirSync(path.dirname(destPage), { recursive: true });
fs.cpSync(sourcePage, destPage, { recursive: true });
fs.copyFileSync(sourceApi, destApi);
fs.copyFileSync(sourceAisApi, destAisApi);

// The production package remains commit-pinned for deterministic deploys. Until that pin is
// advanced, pull this additive child page from its exact authoritative commit rather than from
// a moving branch. This prevents the normal directory sync from deleting the new search route.
const salmonFile = path.join(destPage, 'salmon-counts', 'index.html');
if (!fs.existsSync(salmonFile)) {
  const response = await fetch(salmonRawUrl, { headers: { 'user-agent': 'chrisizworski-com-build/1.0' } });
  if (!response.ok) throw new Error(`Ballard sync: salmon source returned ${response.status}`);
  const source = await response.text();
  fs.mkdirSync(path.dirname(salmonFile), { recursive: true });
  fs.writeFileSync(salmonFile, source);
}

const page = fs.readFileSync(path.join(destPage, 'index.html'), 'utf8');
if (!page.includes(canonical)) throw new Error('Ballard sync: canonical production URL missing');
if (!page.includes('/api/ballard-locks')) throw new Error('Ballard sync: live API hook missing');

const tourFile = path.join(destPage, 'tour', 'index.html');
if (!fs.existsSync(tourFile)) throw new Error('Ballard sync: interactive tour missing');
const tourPage = fs.readFileSync(tourFile, 'utf8');
if (!tourPage.includes(tourCanonical)) throw new Error('Ballard sync: tour canonical missing');
if (!tourPage.includes('/api/ballard-locks')) throw new Error('Ballard sync: tour live API hook missing');
if (!tourPage.includes('/api/ballard-ais')) throw new Error('Ballard sync: tour AIS API hook missing');

const salmonPage = fs.readFileSync(salmonFile, 'utf8');
if (!salmonPage.includes(salmonCanonical)) throw new Error('Ballard sync: salmon counts canonical missing');
if (!salmonPage.includes('/api/ballard-locks')) throw new Error('Ballard sync: salmon counts live API hook missing');
if (!salmonPage.includes('latest published')) throw new Error('Ballard sync: salmon freshness language missing');

let sitemap = fs.readFileSync(sitemapPath, 'utf8');
if (!sitemap.includes(`<loc>${canonical}</loc>`)) {
  const entry = `  <url>\n    <loc>${canonical}</loc>\n    <lastmod>2026-09-08</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  if (!sitemap.includes('</urlset>')) throw new Error('Ballard sync: sitemap closing tag missing');
  sitemap = sitemap.replace('</urlset>', `${entry}</urlset>`);
  fs.writeFileSync(sitemapPath, sitemap);
}
if (!sitemap.includes(`<loc>${tourCanonical}</loc>`)) {
  const entry = `  <url>\n    <loc>${tourCanonical}</loc>\n    <lastmod>2026-09-09</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.75</priority>\n  </url>\n`;
  sitemap = sitemap.replace('</urlset>', `${entry}</urlset>`);
  fs.writeFileSync(sitemapPath, sitemap);
}
if (!sitemap.includes(`<loc>${salmonCanonical}</loc>`)) {
  const entry = `  <url>\n    <loc>${salmonCanonical}</loc>\n    <lastmod>2026-09-10</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.82</priority>\n  </url>\n`;
  sitemap = sitemap.replace('</urlset>', `${entry}</urlset>`);
  fs.writeFileSync(sitemapPath, sitemap);
}

console.log('Synced Ballard Locks and ensured main + tour + salmon search routes.');
