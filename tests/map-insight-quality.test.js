import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const boatHtml=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');
const boatJs=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');
const wreckHtml=fs.readFileSync('public/great-lakes-shipwrecks/index.html','utf8');
const wreckJs=fs.readFileSync('public/assets/shipwreck-explorer.js','utf8');
const source=JSON.parse(fs.readFileSync('public/assets/michigan-boat-launches/hero-source.json','utf8'));

test('Boat Launch Finder uses a traceable real Michigan launch photograph',()=>{
  assert.equal(source.type,'real-photograph');
  assert.equal(source.license,'CC BY 3.0');
  assert.match(boatHtml,/Lake_erie_metropark_boat_launch\.JPG/);
  assert.match(boatHtml,/Dwight Burdette/);
  assert.match(boatHtml,/CC BY 3\.0/);
});

test('boat inventory is created only from the current Michigan DNR facility layer',()=>{
  assert.match(boatJs,/PRDBASPublicView\/FeatureServer\/0/);
  assert.match(boatJs,/bas_type='Boating Access Site'/);
  assert.match(boatJs,/launch_status='Open'/);
  assert.match(boatJs,/greatlakesaccess LIKE 'Yes%'/);
  assert.match(boatJs,/const raw=\(j\.features\|\|\[\]\)\.map\(cleanFeature\)\.filter\(Boolean\)/);
  assert.doesNotMatch(boatHtml,/id="locdata"/);
  assert.doesNotMatch(boatHtml,/"numberOfItems": 42/);
  assert.doesNotMatch(boatHtml,/Bay City State Park Launch/);
});

test('boat source quality rules reject flagged and reference-only records',()=>{
  assert.match(boatJs,/referenceonly/);
  assert.match(boatJs,/if\(String\(a\.flag\|\|''\)\.trim\(\)\)return null/);
  assert.match(boatJs,/latitude IS NOT NULL/);
  assert.match(boatJs,/longitude IS NOT NULL/);
  assert.match(boatJs,/waterwaysprogramconfirmation/);
  assert.match(boatJs,/qaqc_1_date/);
});

test('boat finder has no fuzzy-match or manual-coordinate fallback',()=>{
  assert.doesNotMatch(boatJs,/MANUAL_VERIFIED|ALIASES|bestMatch|nameSimilarity|tokenScore/);
  assert.match(boatJs,/No legacy or guessed launch pins are being shown/);
  assert.match(boatHtml,/If the source cannot be reached, the map stays empty/);
});

test('boat map and cards use one DNR facility identifier and one coordinate',()=>{
  assert.match(boatJs,/const markerById=new Map\(\)/);
  assert.match(boatJs,/markerById\.set\(a\.id,m\)/);
  assert.match(boatJs,/data-launch-id/);
  assert.match(boatJs,/m\.on\('click',\(\)=>select\(a\.id,'marker'\)\)/);
  assert.match(boatJs,/google\.com\/maps\/dir/);
  assert.match(boatJs,/a\.latitude/);
  assert.match(boatJs,/a\.longitude/);
});

test('boat records expose useful source-backed facility details',()=>{
  assert.match(boatJs,/ntrailerableparking/);
  assert.match(boatJs,/nlanes/);
  assert.match(boatJs,/rampcode_new/);
  assert.match(boatJs,/operating_hours/);
  assert.match(boatJs,/carrydowntype/);
  assert.match(boatJs,/Great Lakes access:/);
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

test('map work preserves trust and canonical ownership',()=>{
  assert.match(boatHtml,/canonical" href="https:\/\/chrisizworski\.com\/michigan-boat-launches\//);
  assert.match(wreckHtml,/canonical" href="https:\/\/chrisizworski\.com\/great-lakes-shipwrecks\//);
  assert.doesNotMatch(boatJs,/navigator\.geolocation|getCurrentPosition|localStorage|sessionStorage|document\.cookie/);
  assert.match(wreckJs,/not wreck coordinates/);
});
