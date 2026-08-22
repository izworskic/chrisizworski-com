#!/usr/bin/env node

import {readFile, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(root, 'public', 'lake-superior-circle-tour', 'index.html');
const sitemapPath = path.join(root, 'public', 'sitemap.xml');
const release = '2026-08-22';

const originalHtml = await readFile(htmlPath, 'utf8');
const originalSitemap = await readFile(sitemapPath, 'utf8');

function preparedHtml(source) {
  return source.replace(
    /("dateModified"\s*:\s*")\d{4}-\d{2}-\d{2}("[^}]*"datePublished"\s*:\s*"2026-03-06")/,
    `$1${release}$2`,
  );
}

function preparedSitemap(source) {
  return source.replace(
    /(<loc>https:\/\/chrisizworski\.com\/lake-superior-circle-tour\/<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/,
    `$1${release}$2`,
  );
}

let exitCode = 1;
try {
  await writeFile(htmlPath, preparedHtml(originalHtml));
  await writeFile(sitemapPath, preparedSitemap(originalSitemap));
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'stamp-freshness.mjs'), ...process.argv.slice(2)], {
    cwd: root,
    stdio: 'inherit',
  });
  exitCode = result.status ?? 1;
} finally {
  await writeFile(htmlPath, originalHtml);
  await writeFile(sitemapPath, originalSitemap);
}

process.exitCode = exitCode;
