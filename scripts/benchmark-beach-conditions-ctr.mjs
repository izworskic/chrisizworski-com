#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'benchmarks', 'beach-conditions-ctr-experiment.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'public', 'great-lakes-beaches', 'index.html'), 'utf8');

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
const firstAnswer = capture(/<p class="hero-lede">([\s\S]*?)<\/p>/i, 'first answer').replace(/<[^>]+>/g, '');

const failures = [];
if (title !== config.treatment.title) failures.push(`title drift: ${title}`);
if (meta !== config.treatment.metaDescription) failures.push('meta description drift');
if (h1 !== config.treatment.h1) failures.push(`H1 drift: ${h1}`);
if (canonical !== config.surface) failures.push(`canonical drift: ${canonical}`);
for (const phrase of config.treatment.firstAnswerMustContain) {
  if (!firstAnswer.includes(phrase)) failures.push(`first answer missing: ${phrase}`);
}
if (!html.includes('The NWS risk is a forecast—not the posted beach flag')) failures.push('posted-flag truth boundary missing');
if (!html.includes('leaves posted flag status unknown')) failures.push('FAQ must keep physical posted flag status unknown');
if (!html.includes('"dateModified": "2026-08-22"')) failures.push('dateModified is not aligned to treatment release preparation');
if (!html.includes('"name": "Michigan Beach Conditions Today"')) failures.push('structured data name does not match conditions intent');
if (config.evidence.page.impressions !== 273 || config.evidence.page.clicks !== 2 || config.evidence.page.averagePosition !== 9.12) failures.push('observed page baseline drift');
if (config.evidence.querySignals.length < 6) failures.push('query evidence is too thin');
if (config.measurement.primaryWindowDays !== 28) failures.push('primary decision window must remain 28 days');
if (config.measurement.targetCtr < 0.015) failures.push('CTR target weakened');
if (!config.freeze.includes('canonical') || !config.freeze.includes('structuredData')) failures.push('experiment freeze is incomplete');

console.log('\nBEACH CONDITIONS CTR EXPERIMENT');
console.log('='.repeat(72));
console.log(`Baseline: ${config.evidence.page.impressions} impressions / ${config.evidence.page.clicks} clicks / ${(config.evidence.page.ctr * 100).toFixed(2)}% CTR / position ${config.evidence.page.averagePosition}`);
console.log(`Treatment: ${config.treatment.title}`);
console.log(`Target CTR: ${(config.measurement.targetCtr * 100).toFixed(1)}% · stretch ${(config.measurement.stretchCtr * 100).toFixed(1)}%`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log('benchmark:beach-ctr PASS\n');
