'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vercel = require('../vercel.json');
const sourcePages = require('../lib/public-tool-sources');

const owner = 'https://national-rivers.vercel.app';

test('extracted spring river assets route to their owning repository', () => {
  const assets = ['river-specialist-handoff.js', 'paddle-window.js', 'river-experience.css', 'river-viz.js'];
  for (const name of assets) {
    const path = '/assets/' + name;
    const matches = vercel.rewrites.filter(rule => rule.source === path);
    assert.equal(matches.length, 1, path + ' should have exactly one public route');
    assert.equal(matches[0].destination, owner + path,
      'public tool shell must not serve missing or stale mirrored river scripts');
    assert.ok(vercel.rewrites.indexOf(matches[0]) < vercel.rewrites.findIndex(r => r.source === '/api/national-rivers'),
      'owner asset routes should precede the national river API rewrites');
  }
});

test('public river page keeps the extracted canonical HTML owner', () => {
  assert.equal(sourcePages.rivers, owner + '/national-tools/rivers/');
  for (const path of ['/national-tools/rivers', '/national-tools/rivers/']) {
    assert.ok(vercel.rewrites.some(r => r.source === path && r.destination === '/api/public-tool-shell?tool=rivers'),
      'canonical page must retain the main-site AdSense and creator policy shell');
  }
});
