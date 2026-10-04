const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const eligibility = read('public/assets/niagara-eligibility-labels.20261003.js');
const detail = read('public/assets/niagara-bridge-detail.20261003.js');

test('main Niagara traveler control defines NEXUS in plain language', () => {
  assert.match(eligibility, /NEXUS member/);
  assert.match(eligibility, /Canada–U\.S\. trusted-traveler program/);
  assert.match(eligibility, /pre-approved, low-risk travelers/);
  assert.match(eligibility, /Everyone in the vehicle must be a NEXUS member/);
  assert.match(eligibility, /travelerSelect/);
});

test('bridge detail pages define NEXUS beside the traveler selector', () => {
  assert.match(detail, /NEXUS member/);
  assert.match(detail, /Canada–U\.S\. trusted-traveler program/);
  assert.match(detail, /Everyone in the vehicle must be a NEXUS member/);
  assert.match(detail, /detailNexusDefinition/);
  assert.match(detail, /detailTraveler/);
});

test('NEXUS explanation does not alter Niagara decision logic', () => {
  assert.doesNotMatch(eligibility, /fetch\s*\(/);
  assert.doesNotMatch(eligibility, /recommended_id|diversion_buffer|wait_minutes/);
  assert.doesNotMatch(detail, /minimum_net_benefit_minutes|diversion_buffer/);
});
