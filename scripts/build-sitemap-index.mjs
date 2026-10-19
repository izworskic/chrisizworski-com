#!/usr/bin/env node
// Preserve submitted sitemap URLs; provide one same-host entry point for new submissions.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export function buildSitemapIndex(robots, origin = 'https://chrisizworski.com') {
  const urls = [...new Set([...robots.matchAll(/^Sitemap:\s*(\S+)/gim)].map(m => m[1]))]
    .filter(value => {
      const url = new URL(value);
      return url.origin === origin && url.pathname !== '/sitemap-index.xml';
    }).sort();
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  // No lastmod: a build timestamp is not a verified sitemap-content modification date.
  return '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(url => `  <sitemap><loc>${escape(url)}</loc></sitemap>`).join('\n') + '\n</sitemapindex>\n';
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(import.meta.dirname, '..');
  const output = path.join(root, 'public/sitemap-index.xml');
  const expected = buildSitemapIndex(await readFile(path.join(root, 'public/robots.txt'), 'utf8'));
  if (process.argv.includes('--check')) {
    const actual = await readFile(output, 'utf8').catch(() => '');
    if (actual !== expected) { console.error('Sitemap index is missing or stale. Run npm run generate:sitemap-index'); process.exitCode = 1; }
    else console.log('Sitemap index PASS');
  } else { await writeFile(output, expected); console.log('Generated sitemap-index.xml'); }
}
