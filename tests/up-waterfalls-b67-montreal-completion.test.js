'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const data = JSON.parse(read('data/up-waterfall-montreal-access-evidence.json'));

test('B67 distinguishes construction completion from validated waterfall access', () => {
  assert.ok(/^B\d+$/.test(data.batchUpdated) && Number(data.batchUpdated.slice(1)) >= 67);
  const evidence = data.sourceAxes.completionReconciliation;
  assert.equal(evidence.status, 'operator-reports-corridor-complete-falls-route-not-cleared');
  assert.match(evidence.builderHomepage.claim, /complete/i);
  assert.ok(evidence.builderHomepage.url.endsWith('copperharbortrails.org/'));
  assert.match(evidence.builderProjectPage.claim, /future/i);
  assert.match(evidence.dnrProjectPage.claim, /construction/i);
  assert.equal(evidence.trailStatus.url, 'https://www.copperharbortrails.org/trail-status');
  assert.equal(evidence.parkingToLowerFallsVerified, false);
  assert.equal(evidence.parkingToUpperFallsVerified, false);
  assert.equal(evidence.visitorOpenNowVerified, false);
  assert.equal(evidence.independentlyConfirmedRoadGates, false);
  assert.ok(data.routes.find(route => route.id === 'dnr-east-montreal-corridor').constructionCompletionReportedByBuilder);
  assert.equal(data.routes.find(route => route.id === 'dnr-east-montreal-corridor').verifiedLowerFallsConnection, false);
  assert.equal(data.routes.find(route => route.id === 'dnr-east-montreal-corridor').verifiedUpperFallsConnection, false);
  assert.equal(data.routes.find(route => route.id === 'korc-west-connector').published, false);
  assert.equal(data.routes.length, 5);
  for (const route of data.routes) {
    assert.equal(route.currentOpen, false);
    assert.equal(route.preciseParkingGps, null);
    assert.equal(route.renderDirections, false);
  }
});
test('B67 pages show the conflict, cite operators and do not promote unsafe navigation', () => {
  for (const slug of ['lower-montreal-falls-keweenaw', 'upper-montreal-falls-keweenaw']) {
    const html = read('public/upper-peninsula-waterfalls/research/' + slug + '/index.html');
    assert.match(html, /<meta name="robots" content="noindex,follow">/);
    assert.match(html, /trailbuilder reports corridor completion/i);
    assert.match(html, /corridor construction/i);
    assert.match(html, /www\.copperharbortrails\.org\/trail-status/);
    assert.match(html, /www\.michigan\.gov\/dnr\/managing-resources\/prd\/key-project-updates/);
    assert.match(html, /separate.*KORC/i);
    assert.match(html, /Fish Cove/);
    assert.match(html, /NOT CLEARED FOR AUTOMATED VISITOR NAVIGATION/);
    assert.doesNotMatch(html, /TouristAttraction/);
    assert.doesNotMatch(html, /google\.com\/maps\/dir\//i);
    assert.doesNotMatch(html, /https:\/\/www\.google\.com\/maps\?daddr/i);
    assert.match(html, /"dateModified":"2026-11-05"/);
  }
});
