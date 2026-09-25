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

// Blue Ridge Parkway is one canonical live route-decision surface. Keep the
// discovery entry focused on the tool rather than creating gateway/date clones.
addCanonical({
  url: 'https://chrisizworski.com/blue-ridge-parkway/',
  lastmod: '2026-09-24',
  changefreq: 'daily',
  priority: '0.9',
  label: 'Blue Ridge Parkway'
});

fs.writeFileSync(file, xml);
