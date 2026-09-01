#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'benchmarks', 'border-waits-ctr-experiment.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'public', 'michigan-border-wait-times', 'index.html'), 'utf8');

function decode(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');
}
function capture(pattern, label) {
  const match = html.match(pattern);
  if (!match) throw new Error(`Missing ${label}`);
  return decode(match[1].trim());
}

const title = capture(/<title>([^<]+)<\/title>/i, 'title');
const meta = capture(/<meta\s+name="description"\s+content="([^"]+)"/i, 'meta description');
const h1 = capture(/<h1[^>]*>([^<]+)<\/h1>/i, 'H1');
const canonical = capture(/<link\s+rel="canonical"\s+href="([^"]+)"/i, 'canonical');
const firstAnswer = capture(/<p class="lede">([\s\S]*?)<\/p>/i, 'first answer').replace(/<[^>]+>/g, '');

// A literal dateModified here is duplicated state: it fails the day the page legitimately changes
// and gets stamped, which has already cost this repo several repairs. The snippet freeze that
// actually protects a measurement window is the title/description/canonical/H1 pin above; a moving
// dateModified does not contaminate a CTR window. So assert the property worth holding instead:
// the page stamp agrees with the lastmod its own route publishes, which is the pair that went
// silently out of sync on /connect/ and on the national tools.
function freshnessMismatch(html, route) {
  const sitemap = fs.readFileSync(path.join(root, 'public', 'sitemap.xml'), 'utf8');
  const stamped = (html.match(/"dateModified":\s*"(\d{4}-\d{2}-\d{2})"/) || [])[1] || '';
  const published = (new RegExp(
    `<loc>https://chrisizworski\\.com${route.replace(/\//g, '\\/')}</loc>[\\s\\S]{0,200}?<lastmod>(\\d{4}-\\d{2}-\\d{2})`
  ).exec(sitemap) || [])[1] || '';
  if (!stamped) return 'page carries no dateModified stamp';
  if (!published) return `no sitemap lastmod published for ${route}`;
  if (stamped !== published) return `dateModified ${stamped} does not match sitemap lastmod ${published}`;
  return null;
}

const failures = [];
if (title !== config.treatment.title) failures.push(`title drift: ${title}`);
if (meta !== config.treatment.metaDescription) failures.push('meta description drift');
if (h1 !== config.treatment.h1) failures.push(`H1 drift: ${h1}`);
if (canonical !== config.surface) failures.push(`canonical drift: ${canonical}`);
for (const phrase of config.treatment.firstAnswerMustContain) {
  if (!firstAnswer.includes(phrase)) failures.push(`first answer missing: ${phrase}`);
}
if (!html.includes('Both directions stay separate')) failures.push('direction truth boundary missing');
if (!html.includes('CBSA reports entering Canada; CBP reports entering the United States.')) failures.push('agency-direction explanation missing');
{ const drift = freshnessMismatch(html, '/michigan-border-wait-times/'); if (drift) failures.push(drift); }
if (!html.includes('"name": "Michigan Border Wait Times Today"')) failures.push('WebApplication name does not match treatment');
for (const route of ['/gordie-howe-bridge-wait-time/','/ambassador-bridge-wait-time/','/detroit-windsor-tunnel-wait-time/','/blue-water-bridge-wait-time/','/sault-ste-marie-border-wait-time/']) {
  if (!html.includes(`https://chrisizworski.com${route}`)) failures.push(`crossing-specific owner missing from schema: ${route}`);
}
if (config.evidence.page.impressions !== 284 || config.evidence.page.clicks !== 2 || config.evidence.page.averagePosition !== 11.98) failures.push('observed page baseline drift');
if (!config.evidence.queryAttributionCaution) failures.push('sitewide query attribution caution missing');
if (config.measurement.primaryWindowDays !== 28) failures.push('primary window must remain 28 days');
if (config.measurement.targetCtr < 0.015) failures.push('CTR target weakened');
if (!config.freeze.includes('canonical') || !config.freeze.includes('structuredData')) failures.push('experiment freeze incomplete');

console.log('\nSTATEWIDE BORDER WAITS CTR EXPERIMENT');
console.log('='.repeat(72));
console.log(`Baseline: ${config.evidence.page.impressions} impressions / ${config.evidence.page.clicks} clicks / ${(config.evidence.page.ctr * 100).toFixed(2)}% CTR / position ${config.evidence.page.averagePosition}`);
console.log(`Treatment: ${config.treatment.title}`);
console.log(`Target CTR: ${(config.measurement.targetCtr * 100).toFixed(1)}% · stretch ${(config.measurement.stretchCtr * 100).toFixed(1)}%`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log('benchmark:border-ctr PASS\n');
