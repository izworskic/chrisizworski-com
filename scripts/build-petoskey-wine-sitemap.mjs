#!/usr/bin/env node
// Regenerates public/sitemap-petoskey-wine.xml from whatever the vendored static
// export actually contains, so the sitemap cannot drift from the shipped pages.
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const section = path.join(root, 'public', 'petoskey-wine');
const base = 'https://chrisizworski.com/petoskey-wine';
const lastmod = process.env.PETOSKEY_LASTMOD || new Date().toISOString().slice(0, 10);

const pages = [];
const walk = (dir, rel) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '_next') continue;
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(next, rel ? `${rel}/${entry.name}` : entry.name);
    else if (entry.name === 'index.html' && rel !== '404') pages.push(rel);
  }
};
walk(section, '');
pages.sort();

const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
for (const page of pages) {
  const loc = `${base}/${page ? page + '/' : ''}`;
  const isHome = page === '';
  lines.push(
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${isHome ? 'weekly' : 'monthly'}</changefreq>`,
    `    <priority>${isHome ? '0.9' : page.startsWith('winery/') ? '0.6' : '0.7'}</priority>`,
    '  </url>',
  );
}
lines.push('</urlset>');
fs.writeFileSync(path.join(root, 'public', 'sitemap-petoskey-wine.xml'), lines.join('\n') + '\n');
console.log(`sitemap-petoskey-wine.xml: ${pages.length} urls`);
