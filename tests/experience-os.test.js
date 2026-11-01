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
  assert.match(manifest.version, /^1\.2\./, 'Experience OS v1.2 must be discoverable');
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
  for (let i = 1; i <= 23; i++) assert.match(patterns, new RegExp('P' + String(i).padStart(2, '0')));
  for (let i = 1; i <= 30; i++) assert.match(failures, new RegExp('A' + String(i).padStart(2, '0')));
  const scoringRows = qa.split('\n').filter(line => /^\|[^|]+\|\s*(25|15|10|5)\s*\|/.test(line));
  const weights = scoringRows.map(line => Number(line.split('|')[2].trim()));
  assert.equal(weights.reduce((a,b) => a+b,0),100);
  assert.match(qa, /NOT MEASURED/);
  assert.match(qa, /never merge while red/i);
  assert.match(qa, /map.*tiles/i);
});

test('visitor outcomes and original architecture take precedence over effects', () => {
  const tech = read('design-systems/experience-os-v1/docs/TECHNOLOGY_DECISIONS.md');
  const workflow = read('design-systems/experience-os-v1/docs/EXPERIENCE_LIFECYCLE.md');
  const brief = read('design-systems/experience-os-v1/templates/EXPERIENCE_BRIEF.md');
  assert.ok(tech.includes('React') && tech.includes('island'));
  assert.match(tech, /HTML/);
  assert.match(tech, /No dependency requirement/);
  assert.match(workflow, /two external/i);
  assert.match(workflow, /three different user journeys/i);
  for(const h of ['Visitor question', 'Inputs, evidence', 'Two genuinely different', 'Interaction contract', 'Acceptance and release']) assert.ok(brief.includes(h), h);
});

test('v1.2 introduces a reusable connected-state contract grounded in two real pilots', () => {
  const manifest=JSON.parse(read('design-systems/experience-os-v1/manifest.json'));
  for(const doc of ['docs/CONNECTED_EXPERIENCE_CONTRACT.md','docs/PILOT_LESSONS_V1_2.md']){
    assert.ok(manifest.requiredDocs.includes(doc),'manifest must require '+doc);
  }
  assert.ok(manifest.templates.includes('templates/STATE_MATRIX.md'));
  const contract=read('design-systems/experience-os-v1/docs/CONNECTED_EXPERIENCE_CONTRACT.md');
  const ledger=read('design-systems/experience-os-v1/docs/PILOT_LESSONS_V1_2.md');
  const matrix=read('design-systems/experience-os-v1/templates/STATE_MATRIX.md');
  const agents=read('design-systems/experience-os-v1/AGENTS.md');
  const readme=read('design-systems/experience-os-v1/README.md');
  for(const phrase of ['stable source ID','A is selected then B','first useful answer','source units','public HTML','NOT VERIFIED']) {
    assert.ok(contract.includes(phrase), 'contract must include '+phrase);
  }
  for(const phrase of ['Tahquamenon','Sleeping Giant','#1331','PR #1300','not independently verified']) {
    assert.ok(ledger.includes(phrase), 'pilot ledger must include '+phrase);
  }
  for(const phrase of ['Initial load','Meaningful preference change','Reverse or reset','No known geometry','A→B race','Missing map tiles','NOT MEASURED']) {
    assert.ok(matrix.includes(phrase),'state matrix must cover '+phrase);
  }
  assert.match(agents,/STATE_MATRIX\.md/);
  assert.match(readme,/1\.2\.1/);
  assert.match(readme,/CONNECTED_EXPERIENCE_CONTRACT/);
  assert.match(readme,/PILOT_LESSONS_V1_2/);
});

test('v1.2 strengthens QA without changing score weights or silently changing the published site', () => {
  const manifest=JSON.parse(read('design-systems/experience-os-v1/manifest.json'));
  assert.equal(manifest.noPublicRoute,true);
  assert.equal(manifest.releaseThreshold,90);
  const qa=read('design-systems/experience-os-v1/docs/QA_SCORECARD.md');
  const pattern=read('design-systems/experience-os-v1/docs/INTERACTION_PATTERN_LIBRARY.md');
  const lifecycle=read('design-systems/experience-os-v1/docs/EXPERIENCE_LIFECYCLE.md');
  const review=read('design-systems/experience-os-v1/templates/RELEASE_REVIEW.md');
  for (const id of ['P16','P17','P18']) assert.match(pattern,new RegExp(id));
  for (const claim of ['Connected state','Media resilience','Units and narrative truth','Release evidence']) assert.match(qa,new RegExp(claim));
  assert.match(lifecycle,/STATE_MATRIX/);
  assert.match(lifecycle,/NOT VERIFIED/);
  assert.match(review,/Independently fetched canonical public HTML/);
  assert.match(review,/Source units, conversion/);
  const weights=qa.split('\n').filter(line=>/^\|[^|]+\|\s*(25|15|10|5)\s*\|/.test(line))
    .map(line=>Number(line.split('|')[2].trim()));
  assert.equal(weights.reduce((a,b)=>a+b,0),100);
});

test('v1.2.1 keeps one backward-compatible operational source of truth and working entrypoints',()=>{
 const manifest=JSON.parse(read('design-systems/experience-os-v1/manifest.json'));
 const agents=read('AGENTS.md');
 const readme=read('design-systems/experience-os-v1/README.md');
 assert.equal(manifest.version,'1.2.1');
 assert.equal(manifest.id,'EXPERIENCE_OS_V1');
 assert.equal(manifest.noPublicRoute,true);
 for(const required of ['docs/V1_2_OPERATING_KIT.md','docs/GOOSEBERRY_PILOT_20261031.md'])assert.ok(manifest.requiredDocs.includes(required));
 for(const file of ['scaffold','checker','validator','example'].map(key=>manifest.operationalKit[key])){
  assert.ok(fs.existsSync(path.join(root,file)),file);
 }
 assert.match(readme,/operational kit/i);
 assert.match(agents,/new-experience-os-v1\.2/);
 const caseStudy=read('design-systems/experience-os-v1/docs/GOOSEBERRY_PILOT_20261031.md');
 for(const id of ['P19','P20','P21','P22','P23'])assert.match(caseStudy,new RegExp(id));
 assert.match(caseStudy,/live Gooseberry flow sensor|continuous discharge/);
});


test('v1.2 name resolves to one canonical mainline package for compatible agents', () => {
  const manifest=JSON.parse(read('design-systems/experience-os-v1/manifest.json'));
  assert.match(manifest.version,/^1\.2\./);
  assert.equal(manifest.id,'EXPERIENCE_OS_V1');
  const version=read('design-systems/experience-os-v1/docs/VERSION_RESOLUTION.md');
  const agents=read('AGENTS.md');
  const packageAgents=read('design-systems/experience-os-v1/AGENTS.md');
  const readme=read('design-systems/experience-os-v1/README.md');
  const adopt=read('design-systems/experience-os-v1/docs/MULTI_REPO_ADOPTION.md');
  for(const text of [version,agents,packageAgents,readme,adopt]){
    assert.match(text,/1\.2\.1/);
    assert.match(text,/main/);
    assert.match(text,/1\.2/);
  }
  assert.match(version,/latest released 1\.2\.x/i);
  assert.match(version,/owning repository/i);
  assert.match(version,/in-flight/i);
  assert.match(version,/not automatically injected/i);
  for(const text of [agents,packageAgents,readme,adopt]) assert.match(text,/VERSION_RESOLUTION\.md/);
});
