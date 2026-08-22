#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'benchmarks', 'au-sable-map-access-expansion.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'public', 'au-sable-river', 'index.html'), 'utf8');

const failures = [];
const frozen = [
  '<title>Au Sable River, Michigan: Floats, Access, Fishing, Camping</title>',
  '<meta name="description" content="Planning guide to Michigan&#x27;s Au Sable River from Grayling to Lake Huron: float times, access and liveries, the Holy Water, steelhead, and a 70-point map.">',
  '<link rel="canonical" href="https://chrisizworski.com/au-sable-river/">',
  '<h1 class="page-title">Au Sable River, Michigan</h1>'
];
for (const value of frozen) if (!html.includes(value)) failures.push(`protected snippet/owner drift: ${value}`);
if (!html.includes(config.treatment.requiredHeading)) failures.push('map/access heading missing');
for (const phrase of config.treatment.requiredLanguage) if (!html.includes(phrase)) failures.push(`missing crawlable answer language: ${phrase}`);
for (const href of config.treatment.requiredLinks) if (!html.includes(`href="${href}"`)) failures.push(`missing search-network link: ${href}`);
if (!html.includes('"dateModified":"2026-08-22"')) failures.push('dateModified is not aligned');
if (!html.includes('live USGS flow and weather on every card')) failures.push('existing field-map live-data promise drifted');
if (!html.includes('The river, segment by segment')) failures.push('existing river guide content missing');
if (config.evidence.page.impressions !== 475 || config.evidence.page.clicks !== 16 || config.evidence.page.averagePosition !== 9.16) failures.push('leading baseline drift');
if (!config.evidence.queryAttributionCaution) failures.push('sitewide query attribution caution missing');
if (!config.treatment.snippetFrozen) failures.push('snippet must remain frozen');
if (config.measurement.primaryWindowDays !== 28) failures.push('measurement window must remain 28 days');
if (config.measurement.ctrGuardrail < 0.025) failures.push('CTR guardrail weakened');

console.log('\nAU SABLE MAP + ACCESS SEARCH EXPANSION');
console.log('='.repeat(72));
console.log(`Leading signal: ${config.evidence.page.impressions} impressions / ${config.evidence.page.clicks} clicks / ${(config.evidence.page.ctr * 100).toFixed(2)}% CTR / position ${config.evidence.page.averagePosition}`);
console.log('Treatment: crawlable map, public-access, fishing-access and paddling-map answers; snippet frozen');
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log('benchmark:au-sable-search PASS\n');
