import fs from 'node:fs';

const file = 'public/sitemap.xml';
let xml = fs.readFileSync(file, 'utf8');

function addCanonical({ url, lastmod, changefreq = 'daily', priority = '0.9', label }) {
  if (xml.includes(`<loc>${url}</loc>`)) {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    xml = xml.replace(
      new RegExp(`(<loc>${escaped}<\\/loc>\\s*<lastmod>)[^<]+(<\\/lastmod>)`),
      `$1${lastmod}$2`
    );
    console.log(`${label} canonical already present; refreshed lastmod`);
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

// Blue Ridge Parkway uses one owner per genuinely different search intent.
// The main live desk owns broad/current Parkway intent; the gateway pages own
// the concrete "from Asheville/Boone/Roanoke/Cherokee" trip decisions.
addCanonical({
  url: 'https://chrisizworski.com/blue-ridge-parkway/',
  lastmod: '2026-09-25',
  changefreq: 'daily',
  priority: '0.9',
  label: 'Blue Ridge Parkway Today'
});

for (const gateway of ['asheville', 'boone', 'roanoke', 'cherokee']) {
  addCanonical({
    url: `https://chrisizworski.com/blue-ridge-parkway/${gateway}/`,
    lastmod: '2026-09-25',
    changefreq: 'daily',
    priority: '0.8',
    label: `Blue Ridge Parkway from ${gateway}`
  });
}

fs.writeFileSync(file, xml);
