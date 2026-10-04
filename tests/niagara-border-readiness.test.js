const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const asset = fs.readFileSync('public/assets/niagara-eligibility-labels.20261003.js', 'utf8');

test('Niagara adds a compact border readiness layer after current conditions', () => {
  assert.match(asset, /id = "borderReady"/);
  assert.match(asset, /Ready to cross\?/);
  assert.match(asset, /reality\.insertAdjacentElement\("afterend", section\)/);
  assert.match(asset, /Four border readiness checks/);
  assert.match(asset, /Right ID for everyone\?/);
  assert.match(asset, /Bringing anything\?/);
  assert.match(asset, /Anything unusual\?/);
  assert.match(asset, /Have it within reach/);
});

test('Niagara readiness uses progressive disclosure for common trip situations', () => {
  for (const label of ['Kids', 'Pet', 'Food / plants', 'Purchases', 'Cash $10k+', 'Firearms / weapons', 'Cannabis']) {
    assert.ok(asset.includes(label), `missing ${label}`);
  }
  assert.match(asset, /data-border-situation/);
  assert.match(asset, /aria-pressed/);
  assert.match(asset, /selectedSituations/);
});

test('Niagara readiness stays direction-aware and links to official traveler guidance', () => {
  assert.match(asset, /currentDirection\(\)/);
  assert.match(asset, /Entering Canada/);
  assert.match(asset, /Entering the United States/);
  assert.match(asset, /cbsa-asfc\.gc\.ca\/travel-voyage\/checklist-aidememoire-eng\.html/);
  assert.match(asset, /https:\/\/www\.cbp\.gov\/travel/);
  assert.match(asset, /not an admissibility determination/);
});

test('Niagara readiness preserves the existing NEXUS explanation and crossing labels', () => {
  assert.match(asset, /NEXUS = a Canada–U\.S\. trusted-traveler program/);
  assert.match(asset, /NEXUS only/);
  assert.match(asset, /Not eligible/);
});
