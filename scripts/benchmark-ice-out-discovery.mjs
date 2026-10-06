#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = '/national-tools/ice-out/';
const origin = 'https://chrisizworski.com';
const personId = origin + '/#person';
const sitemapFile = 'sitemap-ice-out.xml';
export const iceOutPages = [
  { slug: '', heading: 'Lake Vermilion' },
  { slug: 'lake-vermilion-minnesota', heading: 'Lake Vermilion, Minnesota' },
  { slug: 'mille-lacs-minnesota', heading: 'Mille Lacs Lake, Minnesota' },
  { slug: 'leech-lake-minnesota', heading: 'Leech Lake, Minnesota' },
  { slug: 'houghton-lake-michigan', heading: 'Houghton Lake, Michigan' },
  { slug: 'lake-winnipesaukee-new-hampshire', heading: 'Lake Winnipesaukee, New Hampshire' },
  { slug: 'moosehead-lake-maine', heading: 'Moosehead Lake, Maine' },
  { slug: 'lake-simcoe-ontario', heading: 'Lake Simcoe, Ontario' },
  { slug: 'lake-of-the-woods', heading: 'Lake of the Woods, Ontario & Minnesota' },
];
const routeOf = page => base + (page.slug ? page.slug + '/' : '');
const decode = value => String(value).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(?:39|x27);/gi, "'").replace(/&nbsp;/g, ' ');
const plain = value => decode(value.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const hrefs = html => [...html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[\s\S]*?<\/script>/gi, '').matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)].map(match => {
  try { return new URL(decode(match[1]), origin).href; } catch { return ''; }
});

export function auditIceOutPage(html, page, sitemap = '') {
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  const route = routeOf(page);
  const canonical = origin + route;
  const failures = [];
  const groups = [];
  const group = (name, weight, checks) => {
    const missing = checks.filter(([, passed]) => !passed).map(([label]) => label);
    failures.push(...missing.map(label => `${name}: ${label}`));
    groups.push({ name, weight, score: missing.length ? 0 : weight });
  };
  const nodes = [];
  let validJson = true;
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const data = JSON.parse(match[1]); nodes.push(...(data['@graph'] || [data])); }
    catch { validJson = false; }
  }
  const app = nodes.find(node => node['@type'] === 'WebApplication');
  const title = plain((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const description = decode((html.match(/<meta name="description" content="([^"]*)"/i) || [])[1] || '');
  const heading = plain((html.match(/<h1[^>]*id="lakeName"[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '');
  group('pageIdentity', 25, [
    ['valid structured data', validJson],
    ['canonical matches this page', html.includes(`<link rel="canonical" href="${canonical}"`)],
    ['Open Graph URL matches this page', html.includes(`<meta property="og:url" content="${canonical}"`)],
    ['application identity matches this page', app?.url === canonical && app?.['@id'] === canonical + '#app'],
    ['selected lake heading matches this page', heading === page.heading],
    ['unique concise title and description', title.includes('Chris Izworski') && title.length <= 60 && description.length > 0 && description.length <= 158 && app?.description === description],
  ]);
  group('indexability', 10, [
    ['indexable robots metadata', /<meta name="robots" content="index,follow[^"\n]*"/i.test(html) && !/noindex/i.test(html)],
  ]);
  const guide = (html.match(/<section\b[^>]*data-ice-planning-guide[\s\S]*?<\/section>/i) || [''])[0];
  const visible = plain(html);
  const faq = nodes.find(node => node['@type'] === 'FAQPage');
  group('readableContent', 20, [
    ['useful explanation in initial HTML', plain(guide).split(/\s+/).length >= 75],
    ['JavaScript fallback is explained', /<noscript>[\s\S]*?Interactive forecasts require JavaScript[\s\S]*?<\/noscript>/i.test(html)],
    ['FAQ markup describes visible answers', !page.slug || (faq?.mainEntity?.length === 3 && faq.mainEntity.every(item => visible.includes(plain(item.name)) && visible.includes(plain(item.acceptedAnswer.text))))],
    ['forecast is distinguished from ice safety', visible.includes('Not an ice-safety tool.')],
  ]);
  const links = hrefs(html);
  const expectedLinks = iceOutPages.filter(other => other.slug !== page.slug).map(other => origin + routeOf(other));
  group('discovery', 20, [
    ['existing lake family has crawlable links', expectedLinks.every(link => links.includes(link))],
    ['contextual snow and river links', links.includes(origin + '/national-tools/snow/') && links.includes(origin + '/national-tools/rivers/')],
  ]);
  const header = (html.match(/<header\b[\s\S]*?<\/header>/i) || [''])[0];
  const footer = (html.match(/<footer\b[\s\S]*?<\/footer>/i) || [''])[0];
  group('creator', 20, [
    ['header links to the creator homepage', plain(header).includes('Chris Izworski') && hrefs(header).includes(origin + '/')],
    ['quiet footer links to the identity profile', plain(footer).includes('Built by Chris Izworski') && plain(footer).includes('© 2026 Chris Izworski') && hrefs(footer).includes(origin + '/chris-izworski/')],
    ['one canonical creator identity', app?.author?.['@id'] === personId && app.author.name === 'Chris Izworski' && app.author.url === origin + '/' && app?.publisher?.['@id'] === personId],
  ]);
  const date = app?.dateModified;
  group('freshness', 5, [
    ['content date and location sitemap agree', /^\d{4}-\d{2}-\d{2}$/.test(date || '') && sitemap.includes(`<loc>${canonical}</loc><lastmod>${date}</lastmod>`)],
  ]);
  return { route, score: groups.reduce((total, item) => total + item.score, 0), loss: groups.reduce((total, item) => total + item.weight - item.score, 0), groups, failures };
}

export async function auditIceOutDirectory(workspace) {
  const directory = path.join(workspace, 'public/national-tools/ice-out');
  const sitemap = await fs.readFile(path.join(workspace, 'public', sitemapFile), 'utf8');
  const pages = await Promise.all(iceOutPages.map(async page => auditIceOutPage(await fs.readFile(path.join(directory, page.slug, 'index.html'), 'utf8'), page, sitemap)));
  const score = Number((pages.reduce((total, page) => total + page.score, 0) / pages.length).toFixed(2));
  const config = JSON.parse(await fs.readFile(path.join(workspace, 'vercel.json'), 'utf8'));
  const routingFailures = auditIceOutRoutes(config);
  const publicationFailures = auditIceOutPublication(await fs.readFile(path.join(workspace, 'public/robots.txt'), 'utf8'), await fs.readFile(path.join(workspace, 'scripts/stamp-freshness.mjs'), 'utf8'), config);
  return { scope: 'emitted HTML of the existing nine-page ice-out family', metric: 'technical discovery contract, not a prediction of ranking', target: 100, score, loss: Number((100 - score).toFixed(2)), passed: !routingFailures.length && !publicationFailures.length && pages.every(page => !page.failures.length), routingFailures, publicationFailures, pages };
}

export function auditIceOutPublication(robots, stamper, config) {
  const failures = [];
  if (!robots.split(/\r?\n/).some(line => line.trim() === `Sitemap: ${origin}/${sitemapFile}`)) failures.push('ice-out sitemap must be advertised in robots.txt');
  const registered = (stamper.match(/const SITEMAPS = \[([\s\S]*?)\];/) || [])[1] || '';
  if (!registered.includes(`"${sitemapFile}"`)) failures.push('ice-out sitemap must be registered with the freshness checker');
  if ((config.rewrites || []).some(route => (route.source === `/${sitemapFile}` || route.source === '/:path*') && route.destination !== `/${sitemapFile}`)) failures.push('the root ice-out sitemap must not be shadowed by a proxy rewrite');
  return failures;
}

const sitemapEntries = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map(match => [match[1], match[2]]).sort((a, b) => a[0].localeCompare(b[0]));

export function auditIceOutRoutes(config) {
  const routes = config.rewrites || [];
  const fallback = routes.findIndex(route => route.source === '/national-tools/:path*');
  const failures = [];
  for (const page of iceOutPages) {
    const canonicalRoute = routeOf(page);
    for (const source of [canonicalRoute, canonicalRoute.slice(0, -1)]) {
      const index = routes.findIndex(route => route.source === source);
      if (index < 0 || routes[index].destination !== canonicalRoute + 'index.html' || (fallback >= 0 && index > fallback)) {
        failures.push(`${source}: must resolve to its generated file before the national-tools proxy`);
      }
    }
  }
  return failures;
}

async function main() {
  const built = process.argv.includes('--built');
  const workspace = built ? root : await fs.mkdtemp(path.join(os.tmpdir(), 'ice-out-discovery-'));
  try {
    if (!built) {
      const directory = path.join(workspace, 'public/national-tools/ice-out');
      await fs.mkdir(directory, { recursive: true });
      await fs.copyFile(path.join(root, 'public/national-tools/ice-out/index.html'), path.join(directory, 'index.html'));
      await fs.copyFile(path.join(root, 'vercel.json'), path.join(workspace, 'vercel.json'));
      await fs.copyFile(path.join(root, 'public/robots.txt'), path.join(workspace, 'public/robots.txt'));
      await fs.mkdir(path.join(workspace, 'scripts'), { recursive: true });
      await fs.copyFile(path.join(root, 'scripts/stamp-freshness.mjs'), path.join(workspace, 'scripts/stamp-freshness.mjs'));
      execFileSync(process.execPath, [path.join(root, 'scripts/generate-ice-out-location-pages.mjs')], { cwd: workspace, stdio: 'pipe' });
    }
    const report = await auditIceOutDirectory(workspace);
    if (!built) {
      const committed = sitemapEntries(await fs.readFile(path.join(root, 'public', sitemapFile), 'utf8'));
      const emitted = sitemapEntries(await fs.readFile(path.join(workspace, 'public', sitemapFile), 'utf8'));
      if (JSON.stringify(committed) !== JSON.stringify(emitted)) {
        report.publicationFailures.push('the committed public sitemap must match the generated URLs and content dates');
        report.passed = false;
      }
    }
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
  } finally {
    if (!built) await fs.rm(workspace, { recursive: true, force: true });
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
