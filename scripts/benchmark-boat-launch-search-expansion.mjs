#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'benchmarks', 'boat-launch-search-expansion.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'public', 'michigan-boat-launches', 'index.html'), 'utf8');

const failures = [];
const requiredFrozen = {
  title: `<title>${config.treatment.expectedSearchTreatment.title}</title>`,
  meta: `<meta name="description" content="${config.treatment.expectedSearchTreatment.description}">`,
  ogTitle: `<meta property="og:title" content="${config.treatment.expectedSearchTreatment.ogTitle}">`,
  canonical: '<link rel="canonical" href="https://chrisizworski.com/michigan-boat-launches/">',
  h1: `<h1>${config.treatment.expectedSearchTreatment.h1}</h1>`
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
if (!html.includes(`"dateModified":"${config.releaseDateModified}"`)) {
  failures.push(`freshness stamp not aligned (expected ${config.releaseDateModified})`);
}
if (config.evidence.page.impressions !== 77 || config.evidence.page.clicks !== 0 || config.evidence.page.averagePosition !== 13.17) failures.push('leading baseline drift');
if (!config.evidence.queryAttributionCaution) failures.push('sitewide query attribution caution missing');
if (config.treatment.snippetFrozen) failures.push('retired authority experiment incorrectly freezes the new CTR snippet');
if (config.treatment.expectedSearchTreatment.title.length > 60) failures.push('CTR title exceeds 60 characters');
if (config.treatment.expectedSearchTreatment.description.length > 158) failures.push('CTR description exceeds 158 characters');
if (config.measurement.primaryWindowDays !== 28) failures.push('measurement window must remain 28 days');

console.log('\nBOAT LAUNCH SEARCH AUTHORITY EXPANSION');
console.log('='.repeat(72));
console.log(`Leading signal: ${config.evidence.page.impressions} impressions / ${config.evidence.page.clicks} clicks / position ${config.evidence.page.averagePosition}`);
console.log('Treatment: query-led near-me/DNR-map snippet + unchanged canonical, finder and location privacy');
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log('benchmark:boat-launch-search PASS\n');
