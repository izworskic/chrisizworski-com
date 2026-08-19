import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const boatHtml=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');
const boatJs=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');
const wreckHtml=fs.readFileSync('public/great-lakes-shipwrecks/index.html','utf8');
const wreckJs=fs.readFileSync('public/assets/shipwreck-explorer.js','utf8');
const source=JSON.parse(fs.readFileSync('public/assets/michigan-boat-launches/hero-source.json','utf8'));

test('visible Boat Launch Finder hero uses a traceable real Michigan launch photograph',()=>{
  assert.equal(source.type,'real-photograph');
  assert.equal(source.license,'CC BY 3.0');
  assert.match(boatJs,/Lake_erie_metropark_boat_launch\.JPG/);
  assert.match(boatJs,/Dwight Burdette/);
  assert.match(boatJs,/CC BY 3\.0/);
});

test('boat map markers open launch-specific decision insights and verification paths',()=>{
  assert.match(boatJs,/launch-map-insight/);
  assert.match(boatJs,/Regional screening signal/);
  assert.match(boatJs,/View launch details/);
  assert.match(boatJs,/Verify access/);
  assert.match(boatJs,/not ramp, marina, harbor or boating-safety truth/);
  assert.match(boatJs,/Boat Launch Map Insight/);
});

test('shipwreck regional markers expose underlying vessels, context, and database links',()=>{
  assert.match(wreckJs,/Why this marker matters:/);
  assert.match(wreckJs,/data-wreck-row/);
  assert.match(wreckJs,/recorded death/);
  assert.match(wreckJs,/Open filtered database/);
  assert.match(wreckJs,/regional anchor, not wreck coordinates/);
  assert.match(wreckJs,/Shipwreck Map Insight/);
});

test('map insight quality pass preserves parent search ownership',()=>{
  assert.match(boatHtml,/canonical" href="https:\/\/chrisizworski\.com\/michigan-boat-launches\//);
  assert.match(wreckHtml,/canonical" href="https:\/\/chrisizworski\.com\/great-lakes-shipwrecks\//);
  assert.match(boatHtml,/"numberOfItems": 42/);
});
