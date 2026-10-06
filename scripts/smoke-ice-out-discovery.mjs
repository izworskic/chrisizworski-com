#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditIceOutPage, auditIceOutPublication, iceOutPages } from './benchmark-ice-out-discovery.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://chrisizworski.com';
const config = JSON.parse(await fs.readFile(path.join(root, 'vercel.json'), 'utf8'));
const stamper = await fs.readFile(path.join(root, 'scripts/stamp-freshness.mjs'), 'utf8');
const expectedSitemap = await fs.readFile(path.join(root, 'public/sitemap-ice-out.xml'), 'utf8');
const entries = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map(match => [match[1], match[2]]).sort((a, b) => a[0].localeCompare(b[0]));

async function request(route) {
  const response = await fetch(origin + route, {
    headers: { 'User-Agent': 'ChrisIzworski-IceOut-Discovery-Smoke/1.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
  return response.text();
}

async function check() {
  const [sitemap, robots] = await Promise.all([request('/sitemap-ice-out.xml'), request('/robots.txt')]);
  if (JSON.stringify(entries(sitemap)) !== JSON.stringify(entries(expectedSitemap))) throw new Error('public ice-out sitemap URLs/dates do not match this release');
  const publicationFailures = auditIceOutPublication(robots, stamper, config);
  const pages = await Promise.all(iceOutPages.map(async page => {
    const route = '/national-tools/ice-out/' + (page.slug ? page.slug + '/' : '');
    return auditIceOutPage(await request(route), page, sitemap);
  }));
  const score = Number((pages.reduce((total, page) => total + page.score, 0) / pages.length).toFixed(2));
  return { scope: 'actual public HTML and advertised ice-out sitemap', origin, checkedAt: new Date().toISOString(), target: 100, score, loss: Number((100 - score).toFixed(2)), publicationFailures, passed: !publicationFailures.length && pages.every(page => !page.failures.length), pages };
}

// Main-push CI can start before Vercel promotes its atomic deployment. Wait for the
// actual public contract, retaining the final failing observation if it never arrives.
const waitMs = process.argv.includes('--wait') ? 15 * 60 * 1000 : 0;
const deadline = Date.now() + waitMs;
let lastError;
let lastReport;
for (;;) {
  try {
    lastReport = await check();
    lastError = undefined;
    if (lastReport.passed) { console.log(JSON.stringify(lastReport, null, 2)); break; }
  } catch (error) { lastError = error.message; }
  if (Date.now() >= deadline) {
    console.error(JSON.stringify({ ...lastReport, passed: false, error: lastError || 'public ice-out discovery contract failed' }, null, 2));
    process.exitCode = 1;
    break;
  }
  console.log('Waiting for the public ice-out release: ' + (lastError || lastReport.pages.flatMap(page => page.failures)[0] || lastReport.publicationFailures[0]));
  await new Promise(resolve => setTimeout(resolve, 20000));
}
