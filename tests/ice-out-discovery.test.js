import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { auditIceOutDirectory, auditIceOutPage, auditIceOutRoutes, iceOutPages } from '../scripts/benchmark-ice-out-discovery.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let workspace;
let directory;
const generate = () => execFileSync(process.execPath, [path.join(root, 'scripts/generate-ice-out-location-pages.mjs')], { cwd: workspace, stdio: 'pipe' });

before(async () => {
  workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'ice-out-regression-'));
  directory = path.join(workspace, 'public/national-tools/ice-out');
  await fs.mkdir(directory, { recursive: true });
  await fs.copyFile(path.join(root, 'public/national-tools/ice-out/index.html'), path.join(directory, 'index.html'));
  await fs.copyFile(path.join(root, 'vercel.json'), path.join(workspace, 'vercel.json'));
  generate();
});
after(async () => { if (workspace) await fs.rm(workspace, { recursive: true, force: true }); });

test('the production generator emits nine distinct, crawlable pages with one creator identity', async () => {
  const report = await auditIceOutDirectory(workspace);
  assert.equal(report.pages.length, 9);
  assert.equal(report.passed, true, JSON.stringify(report.pages.filter(page => page.failures.length)));
  assert.equal(report.loss, 0);
  for (const page of iceOutPages) {
    const html = await fs.readFile(path.join(directory, page.slug, 'index.html'), 'utf8');
    assert.equal((html.match(/Built by <a href="https:\/\/chrisizworski\.com\/chris-izworski\/">/g) || []).length, 1);
    assert.match(html, /src="https:\/\/lspp-ice-out\.vercel\.app\/north-america\/app\.js\?v=lake-search-v4"/);
  }
});

test('the audit rejects inherited lake identity and non-visible FAQ answers', async () => {
  const page = iceOutPages.find(item => item.slug === 'houghton-lake-michigan');
  const html = await fs.readFile(path.join(directory, page.slug, 'index.html'), 'utf8');
  const sitemap = await fs.readFile(path.join(directory, 'sitemap-locations.xml'), 'utf8');
  const wrongHeading = html.replace('<h1 id="lakeName">Houghton Lake, Michigan</h1>', '<h1 id="lakeName">Lake Vermilion</h1>');
  assert.ok(auditIceOutPage(wrongHeading, page, sitemap).failures.includes('pageIdentity: selected lake heading matches this page'));
  const wrongIdentity = html.replace('"url":"https://chrisizworski.com/national-tools/ice-out/houghton-lake-michigan/"', '"url":"https://chrisizworski.com/national-tools/ice-out/"');
  assert.ok(auditIceOutPage(wrongIdentity, page, sitemap).failures.includes('pageIdentity: application identity matches this page'));
  const invisibleFaq = html.replace(/<section data-ice-location-faq[\s\S]*?<\/section>/, '');
  assert.ok(auditIceOutPage(invisibleFaq, page, sitemap).failures.includes('readableContent: FAQ markup describes visible answers'));
  const invisibleCredit = html.replace(/<footer[\s\S]*?<\/footer>/, match => '<!--' + match + '-->');
  assert.ok(auditIceOutPage(invisibleCredit, page, sitemap).failures.includes('creator: quiet footer links to the identity profile'));
  const invisibleLink = html.replace(/<a href="\/national-tools\/ice-out\/leech-lake-minnesota\/">[\s\S]*?<\/a>/g, match => '<!--' + match + '-->');
  assert.ok(auditIceOutPage(invisibleLink, page, sitemap).failures.includes('discovery: existing lake family has crawlable links'));
});

test('rebuilding the family is idempotent and does not duplicate content or creator credits', async () => {
  const beforePages = await Promise.all(iceOutPages.map(page => fs.readFile(path.join(directory, page.slug, 'index.html'), 'utf8')));
  generate();
  const afterPages = await Promise.all(iceOutPages.map(page => fs.readFile(path.join(directory, page.slug, 'index.html'), 'utf8')));
  assert.deepEqual(afterPages, beforePages);
});

test('the audit rejects missing lake routes and routes shadowed by the national proxy', async () => {
  const config = JSON.parse(await fs.readFile(path.join(workspace, 'vercel.json'), 'utf8'));
  const canonical = '/national-tools/ice-out/houghton-lake-michigan/';
  const missing = { ...config, rewrites: config.rewrites.filter(route => route.source !== canonical) };
  assert.ok(auditIceOutRoutes(missing).some(failure => failure.startsWith(canonical + ':')));
  const shadowed = { ...config, rewrites: [{ source: '/national-tools/:path*', destination: 'https://example.com/:path*' }, ...config.rewrites] };
  assert.equal(auditIceOutRoutes(shadowed).length, 18);
});
