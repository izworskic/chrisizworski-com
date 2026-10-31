'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'design-systems', 'experience-os-v1');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('EXPERIENCE_OS_V1 manifest and all required source-only docs resolve', () => {
  const manifest = JSON.parse(read('design-systems/experience-os-v1/manifest.json'));
  assert.equal(manifest.id, 'EXPERIENCE_OS_V1');
  assert.match(manifest.version, /^1\./);
  assert.equal(manifest.noPublicRoute, true);
  for (const relative of ['README.md', ...manifest.requiredDocs, ...manifest.templates]) {
    const file = path.join(dir, relative);
    assert.ok(fs.statSync(file).isFile(), relative);
    assert.ok(fs.readFileSync(file, 'utf8').length > 250, relative);
  }
  for (const id of ['FIELD_GUIDE_V1', 'JOURNEY_ATLAS_V1']) assert.ok(manifest.extends.includes(id));
});

test('entrypoints trigger automatically and scope instruction properly', () => {
  const rootAgents = read('AGENTS.md');
  const osAgents = read('design-systems/experience-os-v1/AGENTS.md');
  const claude = read('CLAUDE.md');
  const copilot = read('.github/copilot-instructions.md');
  for (const content of [rootAgents, claude, copilot]) {
    assert.match(content, /EXPERIENCE_OS_V1/);
    assert.match(content, /design-systems\/experience-os-v1/);
  }
  assert.match(osAgents, /without requiring the owner to name it/);
  assert.match(osAgents, /tiny defect fix/);
  assert.match(osAgents, /owning repository/);
});

test('documented research stays linked and includes external product, WCAG and performance references', () => {
  const src = read('design-systems/experience-os-v1/docs/RESEARCH_SOURCES.md');
  const urls = new Set([...src.matchAll(/https:\/\/[^)\s]+/g)].map(x => x[0]));
  assert.ok(urls.size >= 24, 'must retain broad source-backed research inventory');
  assert.match(src, /2026-10-31/);
  for (const domain of ['nps.gov', 'usgs.gov', 'noaa.gov', 'w3.org', 'gov.uk', 'playwright.dev', 'maplibre.org']) assert.ok([...urls].some(x => x.includes(domain)), domain);
});

test('pattern, failure and release catalogs remain substantive', () => {
  const patterns = read('design-systems/experience-os-v1/docs/INTERACTION_PATTERN_LIBRARY.md');
  const failures = read('design-systems/experience-os-v1/docs/ANTI_PATTERNS.md');
  const qa = read('design-systems/experience-os-v1/docs/QA_SCORECARD.md');
  for (let i = 1; i <= 15; i++) assert.match(patterns, new RegExp('P' + String(i).padStart(2, '0')));
  for (let i = 1; i <= 20; i++) assert.match(failures, new RegExp('A' + String(i).padStart(2, '0')));
  const scoringRows = qa.split('\n').filter(line => /^\|[^|]+\|\s*(25|15|10|5)\s*\|/.test(line));
  const weights = scoringRows.map(line => Number(line.split('|')[2].trim()));
  assert.equal(weights.reduce((a,b) => a+b,0),100);
  assert.match(qa, /NOT MEASURED/);
  assert.match(qa, /never merge while red/i);
  assert.match(qa, /map tiles/i);
});

test('visitor outcomes and original architecture take precedence over effects', () => {
  const tech = read('design-systems/experience-os-v1/docs/TECHNOLOGY_DECISIONS.md');
  const workflow = read('design-systems/experience-os-v1/docs/EXPERIENCE_LIFECYCLE.md');
  const brief = read('design-systems/experience-os-v1/templates/EXPERIENCE_BRIEF.md');
  assert.match(tech, /React island/);
  assert.match(tech, /HTML/);
  assert.match(tech, /No dependency requirement/);
  assert.match(workflow, /two external/i);
  assert.match(workflow, /three different user journeys/i);
  for(const h of ['Visitor question', 'Inputs, evidence', 'Two genuinely different', 'Interaction contract', 'Acceptance and release']) assert.ok(brief.includes(h), h);
});
