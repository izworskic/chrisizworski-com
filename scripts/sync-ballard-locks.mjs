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

if (!fs.existsSync(sourcePage)) throw new Error(`Ballard sync: missing ${sourcePage}`);
if (!fs.existsSync(sourceApi)) throw new Error(`Ballard sync: missing ${sourceApi}`);
if (!fs.existsSync(sourceAisApi)) throw new Error(`Ballard sync: missing ${sourceAisApi}`);

fs.rmSync(destPage, { recursive: true, force: true });
fs.mkdirSync(path.dirname(destPage), { recursive: true });
fs.cpSync(sourcePage, destPage, { recursive: true });
fs.copyFileSync(sourceApi, destApi);
fs.copyFileSync(sourceAisApi, destAisApi);

const page = fs.readFileSync(path.join(destPage, 'index.html'), 'utf8');
if (!page.includes(canonical)) throw new Error('Ballard sync: canonical production URL missing');
if (!page.includes('/api/ballard-locks')) throw new Error('Ballard sync: live API hook missing');
const tourFile = path.join(destPage, 'tour', 'index.html');
if (!fs.existsSync(tourFile)) throw new Error('Ballard sync: interactive tour missing');
const tourPage = fs.readFileSync(tourFile, 'utf8');
if (!tourPage.includes(tourCanonical)) throw new Error('Ballard sync: tour canonical missing');
if (!tourPage.includes('/api/ballard-locks')) throw new Error('Ballard sync: tour live API hook missing');
if (!tourPage.includes('/api/ballard-ais')) throw new Error('Ballard sync: tour AIS API hook missing');

let sitemap = fs.readFileSync(sitemapPath, 'utf8');
if (!sitemap.includes(`<loc>${canonical}</loc>`)) {
  const entry = `  <url>\n    <loc>${canonical}</loc>\n    <lastmod>2026-09-08</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  if (!sitemap.includes('</urlset>')) throw new Error('Ballard sync: sitemap closing tag missing');
  sitemap = sitemap.replace('</urlset>', `${entry}</urlset>`);
  fs.writeFileSync(sitemapPath, sitemap);
}

if (!sitemap.includes(`<loc>${tourCanonical}</loc>`)) {
  const tourEntry = `  <url>\n    <loc>${tourCanonical}</loc>\n    <lastmod>2026-09-09</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.75</priority>\n  </url>\n`;
  if (!sitemap.includes('</urlset>')) throw new Error('Ballard sync: sitemap closing tag missing for tour');
  sitemap = sitemap.replace('</urlset>', `${tourEntry}</urlset>`);
  fs.writeFileSync(sitemapPath, sitemap);
}

console.log('Synced Ballard Locks from national-ballard-locks authoritative repo and ensured main + tour sitemap discovery.');
