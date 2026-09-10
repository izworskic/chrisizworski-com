import fs from 'node:fs';

const file='public/sitemap.xml';
const url='https://chrisizworski.com/national-tools/gauley-release-live/';
let xml=fs.readFileSync(file,'utf8');
const entry=`  <url>\n    <loc>${url}</loc>\n    <lastmod>2026-09-10</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
const blockRe=new RegExp(`\\s*<url>\\s*<loc>${url.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}<\\/loc>[\\s\\S]*?<\\/url>\\s*`,'g');
xml=xml.replace(blockRe,'\n');
if(!xml.includes('</urlset>')) throw new Error('sitemap.xml is missing </urlset>');
xml=xml.replace('</urlset>',`${entry}</urlset>`);
fs.writeFileSync(file,xml);
console.log('Gauley Release Live sitemap entry synced.');
