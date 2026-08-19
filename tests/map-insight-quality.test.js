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

test('boat map uses stable launch slugs rather than Leaflet DOM order',()=>{
  assert.match(boatJs,/const markerBySlug=new Map\(\)/);
  assert.match(boatJs,/markerBySlug\.set\(loc\.slug,marker\)/);
  assert.match(boatJs,/oldMap\.replaceWith\(mapLayout\)/);
  assert.doesNotMatch(boatJs,/slice\(0,locations\.length\)/);
  assert.doesNotMatch(boatJs,/leaflet-interactive['"]\)\[idx\]/);
});

test('boat map and detailed records control each other in both directions',()=>{
  assert.match(boatJs,/function syncMapToVisible/);
  assert.match(boatJs,/function jumpToRecord/);
  assert.match(boatJs,/function focusMap/);
  assert.match(boatJs,/Boat Launch Map To Record/);
  assert.match(boatJs,/Boat Launch Record To Map/);
  assert.match(boatJs,/classList\.add\('lf-selected'\)/);
  assert.match(boatJs,/marker\.openPopup\(\)/);
  assert.match(boatJs,/Show on map/);
});

test('shipwreck map selection changes the actual table record set',()=>{
  assert.match(wreckJs,/anchorSelection\?baseList\.filter/);
  assert.match(wreckJs,/visibleIds=new Set\(tableList\.map/);
  assert.match(wreckJs,/row\.style\.display/);
  assert.match(wreckJs,/Map selection:/);
  assert.match(wreckJs,/Shipwreck Map To Records/);
  assert.match(wreckJs,/data-wreck-clear-map/);
});

test('mappable shipwreck records can drive the map back to their regional anchor',()=>{
  assert.match(wreckJs,/data-wreck-map/);
  assert.match(wreckJs,/const markerByAnchor=new Map\(\)/);
  assert.match(wreckJs,/function focusAnchor/);
  assert.match(wreckJs,/Shipwreck Record To Map/);
  assert.match(wreckJs,/show on map →/);
});

test('map correlation pass preserves trust and parent search ownership',()=>{
  assert.match(boatJs,/not ramp, marina, harbor or boating-safety truth/);
  assert.match(wreckJs,/not wreck coordinates/);
  assert.match(wreckJs,/cited source or agency remains authoritative/);
  assert.match(boatHtml,/canonical" href="https:\/\/chrisizworski\.com\/michigan-boat-launches\//);
  assert.match(wreckHtml,/canonical" href="https:\/\/chrisizworski\.com\/great-lakes-shipwrecks\//);
  assert.match(boatHtml,/"numberOfItems": 42/);
});
