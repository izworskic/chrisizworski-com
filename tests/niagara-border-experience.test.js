const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const PAGE = fs.readFileSync(path.join(ROOT, 'public/niagara-border-crossing/index.html'), 'utf8');
const JS = fs.readFileSync(path.join(ROOT, 'public/assets/niagara-border-crossing.js'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'public/assets/niagara-border-experience.css'), 'utf8');

test('Niagara page leads with traveler action rather than product mechanics', () => {
  assert.match(PAGE, /Cross Niagara without guessing\./);
  assert.match(PAGE, /What is happening there/i);
  assert.match(PAGE, /If you take this bridge right now/i);
  assert.doesNotMatch(PAGE, /Proof\s*→\s*Experience\s*→\s*Understanding/i);
  const decisionIndex = PAGE.indexOf('id="decision"');
  const sourceIndex = PAGE.indexOf('Official sources and live-feed health');
  assert.ok(decisionIndex >= 0 && sourceIndex > decisionIndex, 'source mechanics must come after the traveler decision');
});

test('first decision surface includes direction, traveler and natural route controls', () => {
  assert.match(PAGE, /data-direction="to_canada"/);
  assert.match(PAGE, /data-direction="to_us"/);
  assert.match(PAGE, /id="travelerSelect"/);
  assert.match(PAGE, /id="preferredSelect"/);
  assert.match(PAGE, /id="oversizeToggle"/);
});

test('live reality and journey are driven from the actual decision payload', () => {
  assert.match(JS, /function renderReality\(payload\)/);
  assert.match(JS, /function renderJourney\(payload\)/);
  assert.match(JS, /operator_validation/);
  assert.match(JS, /result\.source\.name/);
  assert.match(JS, /crossing\.toll\?\.\[state\.direction\]/);
  assert.match(JS, /experience/);
});

test('main traveler language avoids internal decision-engine jargon', () => {
  assert.doesNotMatch(PAGE, /route-switch guardrail/i);
  assert.doesNotMatch(PAGE, /authority hierarchy/i);
  assert.doesNotMatch(PAGE, /deterministic output/i);
  assert.doesNotMatch(PAGE, /proof layer/i);
});

test('source health and methodology are progressive disclosure', () => {
  const details = PAGE.match(/<details>/g) || [];
  assert.ok(details.length >= 2, 'expected methodology and source health disclosures');
  assert.match(PAGE, /<summary(?:\s+[^>]*)?>How this recommendation is made<\/summary>/);
  assert.match(PAGE, /<summary(?:\s+[^>]*)?>Official sources and live-feed health<\/summary>/);
});

test('390px mobile layout keeps the decision and journey compact', () => {
  assert.match(CSS, /@media\(max-width:620px\)/);
  assert.match(CSS, /\.bridge-choice-grid\{grid-template-columns:1fr 1fr/);
  assert.match(CSS, /\.journey-steps\{grid-template-columns:1fr\}/);
});

test('camera and official traffic actions are generated for the focused bridge', () => {
  assert.match(JS, /Open live camera \/ traffic view/);
  assert.match(JS, /crossing\.traffic_url/);
  assert.match(JS, /Open official border wait/);
});

test('unknown approach state does not become a clear-roads claim', () => {
  assert.match(JS, /That is not a guarantee of clear roads/);
  assert.doesNotMatch(JS, /roads are clear/i);
});
