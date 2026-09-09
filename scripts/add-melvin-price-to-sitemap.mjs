import fs from 'node:fs';

const file = 'public/sitemap.xml';
const url = 'https://chrisizworski.com/melvin-price/';
let xml = fs.readFileSync(file, 'utf8');

if (!xml.includes(`<loc>${url}</loc>`)) {
  const entry = `  <url>\n    <loc>${url}</loc>\n    <lastmod>2026-09-09</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
  if (!xml.includes('</urlset>')) throw new Error('sitemap.xml is missing </urlset>');
  xml = xml.replace('</urlset>', `${entry}</urlset>`);
  fs.writeFileSync(file, xml);
  console.log('Melvin Price sitemap entry added.');
} else {
  console.log('Melvin Price sitemap entry already present.');
}
