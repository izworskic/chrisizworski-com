import fs from 'node:fs';

const file = 'public/sitemap.xml';
const url = 'https://chrisizworski.com/national-tools/yosemite-firefall-live/';
let xml = fs.readFileSync(file, 'utf8');

if (!xml.includes(`<loc>${url}</loc>`)) {
  const entry = `  <url>\n    <loc>${url}</loc>\n    <lastmod>2026-09-11</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  if (!xml.includes('</urlset>')) throw new Error('sitemap closing tag missing');
  xml = xml.replace('</urlset>', `${entry}</urlset>`);
  fs.writeFileSync(file, xml);
  console.log('Added Yosemite Firefall Live to sitemap');
} else {
  console.log('Yosemite Firefall Live already present in sitemap');
}
