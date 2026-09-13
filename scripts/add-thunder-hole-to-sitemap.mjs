import fs from 'node:fs';
const file='public/sitemap.xml';
const url='https://chrisizworski.com/national-tools/coastal/thunder-hole-live/';
const oldUrl='https://chrisizworski.com/national-tools/thunder-hole-live/';
let xml=fs.readFileSync(file,'utf8');
xml=xml.replace(new RegExp(`\\s*<url>\\s*<loc>${oldUrl.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}<\\/loc>[\\s\\S]*?<\\/url>\\s*`,'g'),'\n');
if(!xml.includes(`<loc>${url}</loc>`)){
  const entry=`  <url>\n    <loc>${url}</loc>\n    <lastmod>2026-09-13</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  if(!xml.includes('</urlset>'))throw new Error('sitemap closing tag missing');
  xml=xml.replace('</urlset>',`${entry}</urlset>`);
}
fs.writeFileSync(file,xml);
console.log('Thunder Hole Live direct coastal sitemap entry verified');
