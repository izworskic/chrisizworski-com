#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'benchmarks', 'boat-launch-search-expansion.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'public', 'michigan-boat-launches', 'index.html'), 'utf8');

const failures = [];
const requiredFrozen = {
  title: '<title>Michigan Boat Launch Map & Finder | Chris Izworski</title>',
  meta: '<meta name="description" content="Explore Michigan public boat launches on one statewide map. Search a city, lake, river or ramp, compare access details, get directions and local NWS weather.">',
  canonical: '<link rel="canonical" href="https://chrisizworski.com/michigan-boat-launches/">',
  h1: '<h1>Michigan boat launches, on one map</h1>'
};
for (const [label, value] of Object.entries(requiredFrozen)) {
  if (!html.includes(value)) failures.push(`${label} changed during authority-only expansion`);
}
for (const href of config.treatment.requiredDiscoveryLinks) {
  if (!html.includes(`href="${href}"`)) failures.push(`missing discovery link: ${href}`);
}
for (const phrase of config.treatment.requiredLanguage) {
  if (!html.includes(phrase)) failures.push(`missing crawlable language: ${phrase}`);
}
if (!html.includes('id="launch-coverage-heading"')) failures.push('crawlable launch coverage section missing');
if (!html.includes('Great Lakes and inland public launches are in the same tool.')) failures.push('statewide finder promise drifted');
if (!html.includes('Michigan DNR is the primary source.')) failures.push('source-truth boundary missing');
if (!html.includes('"dateModified":"2026-08-22"')) failures.push('freshness stamp not aligned');
if (config.evidence.page.impressions !== 77 || config.evidence.page.clicks !== 0 || config.evidence.page.averagePosition !== 13.17) failures.push('leading baseline drift');
if (!config.evidence.queryAttributionCaution) failures.push('sitewide query attribution caution missing');
if (!config.treatment.snippetFrozen) failures.push('snippet must remain frozen for this expansion');
if (config.measurement.primaryWindowDays !== 28) failures.push('measurement window must remain 28 days');

console.log('\nBOAT LAUNCH SEARCH AUTHORITY EXPANSION');
console.log('='.repeat(72));
console.log(`Leading signal: ${config.evidence.page.impressions} impressions / ${config.evidence.page.clicks} clicks / position ${config.evidence.page.averagePosition}`);
console.log('Treatment: crawlable statewide + Saginaw Bay + Lake Michigan + Au Sable discovery; snippet frozen');
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log('benchmark:boat-launch-search PASS\n');
