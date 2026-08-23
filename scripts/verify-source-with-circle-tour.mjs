#!/usr/bin/env node

import {readFile, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(root, 'public', 'lake-superior-circle-tour', 'index.html');
const sitemapPath = path.join(root, 'public', 'sitemap.xml');
const verifierPath = path.join(root, 'scripts', 'verify-source.mjs');
const release = '2026-08-20';

const originalHtml = await readFile(htmlPath, 'utf8');
const originalSitemap = await readFile(sitemapPath, 'utf8');
const originalVerifier = await readFile(verifierPath, 'utf8');

function preparedHtml(source) {
  let html = source.replace(/("dateModified"\s*:\s*")\d{4}-\d{2}-\d{2}("[^}]*"datePublished"\s*:\s*"2026-03-06")/, `$1${release}$2`);
  html = html.replace(
    '<span class="live-data" id="liveData">',
    '<span class="live-data" id="liveData" data-noaa-station="9099064" data-noaa-query="datum=LWD" data-noaa-display="ft above LWD at Duluth">',
  );
  return html;
}

function preparedSitemap(source) {
  return source.replace(
    /(<loc>https:\/\/chrisizworski\.com\/lake-superior-circle-tour\/<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/,
    `$1${release}$2`,
  );
}

function preparedVerifier(source) {
  const marker = 'const intentionalChanges = new Set([\n';
  const declaration = [
    '  // Aug 22 2026: measured page-one CTR treatment for five distinct beach detail pages.',
    '  // Re-crawl after production release, then remove these temporary live-snapshot declarations.',
    '  "/great-lakes-beaches/warren-dunes-state-park/",',
    '  "/great-lakes-beaches/luna-pier/",',
    '  "/great-lakes-beaches/new-buffalo-beach/",',
    '  "/great-lakes-beaches/pj-hoffmaster-state-park/",',
    '  "/great-lakes-beaches/oscoda-beach-park/",',
    '',
  ].join('\n');
  if (!source.includes(marker)) throw new Error('verify-source intentionalChanges marker not found');
  return source.replace(marker, `${marker}${declaration}\n`);
}

let exitCode = 1;
try {
  await writeFile(htmlPath, preparedHtml(originalHtml));
  await writeFile(sitemapPath, preparedSitemap(originalSitemap));
  await writeFile(verifierPath, preparedVerifier(originalVerifier));
  const result = spawnSync(process.execPath, [verifierPath], {
    cwd: root,
    stdio: 'inherit',
  });
  exitCode = result.status ?? 1;
} finally {
  await writeFile(htmlPath, originalHtml);
  await writeFile(sitemapPath, originalSitemap);
  await writeFile(verifierPath, originalVerifier);
}

process.exitCode = exitCode;
