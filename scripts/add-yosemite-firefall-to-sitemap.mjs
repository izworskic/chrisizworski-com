import fs from 'node:fs';

const file = 'public/sitemap.xml';
let xml = fs.readFileSync(file, 'utf8');

function addCanonical({ url, lastmod, changefreq = 'daily', priority = '0.9', label }) {
  if (xml.includes(`<loc>${url}</loc>`)) {
    console.log(`${label} canonical already present in sitemap`);
    return;
  }
  const entry = `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
  if (!xml.includes('</urlset>')) throw new Error('sitemap closing tag missing');
  xml = xml.replace('</urlset>', `${entry}</urlset>`);
  console.log(`Added ${label} canonical to sitemap`);
}

const oldYosemiteUrl = 'https://chrisizworski.com/national-tools/yosemite-firefall-live/';
const yosemiteUrl = 'https://chrisizworski.com/yosemite-firefall-live/';

// Collapse the earlier National Tools proxy URL into the main-site canonical.
xml = xml.replaceAll(oldYosemiteUrl, yosemiteUrl);
addCanonical({
  url: yosemiteUrl,
  lastmod: '2026-09-11',
  label: 'Yosemite Firefall Live'
});

// Gatlinburg Winter is one durable seasonal decision surface; add the canonical
// itself rather than creating keyword/date doorway pages.
addCanonical({
  url: 'https://chrisizworski.com/gatlinburg-winter/',
  lastmod: '2026-09-23',
  changefreq: 'daily',
  priority: '0.9',
  label: 'Gatlinburg Winter'
});

fs.writeFileSync(file, xml);
