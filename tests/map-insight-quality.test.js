import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const boatHtml=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');
const boatJs=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');
const boatApi=fs.readFileSync('api/boat-launches.js','utf8');
const boatCode=boatJs+'\n'+boatApi;
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
  assert.match(boatApi,/PRDBASPublicView\/FeatureServer\/0/);
  assert.match(boatApi,/bas_type='Boating Access Site'/);
  assert.match(boatApi,/launch_status='Open'/);
  assert.match(boatApi,/greatlakesaccess LIKE 'Yes%'/);
  assert.match(boatApi,/facilityid IS NOT NULL/);
  assert.match(boatJs,/SOURCE_API='\/api\/boat-launches'/);
  assert.match(boatJs,/const raw=\(j\.features\|\|\[\]\)\.map\(cleanFeature\)\.filter\(Boolean\)/);
  assert.doesNotMatch(boatHtml,/id="locdata"/);
  assert.doesNotMatch(boatHtml,/"numberOfItems": 42/);
  assert.doesNotMatch(boatHtml,/Bay City State Park Launch/);
});

test('boat source quality rules reject flagged and reference-only records',()=>{
  assert.match(boatApi,/referenceonly/);
  assert.match(boatApi,/String\(a\.flag \|\| ""\)\.trim\(\)/);
  assert.match(boatApi,/latitude IS NOT NULL/);
  assert.match(boatApi,/longitude IS NOT NULL/);
  assert.match(boatApi,/waterwaysprogramconfirmation/);
  assert.match(boatApi,/qaqc_1_date/);
  assert.match(boatJs,/if\(!a\.facilityid\|\|!a\.name/);
});

test('boat finder has no fuzzy-match or manual-coordinate fallback',()=>{
  assert.doesNotMatch(boatCode,/MANUAL_VERIFIED|ALIASES|bestMatch|nameSimilarity|tokenScore/);
  assert.match(boatApi,/fallback_used: false/);
  assert.match(boatJs,/No legacy or guessed launch pins are being shown/);
  assert.match(boatHtml,/If the source cannot be reached, the map stays empty/);
});

test('boat map and cards use one DNR facility identifier and one coordinate',()=>{
  assert.match(boatJs,/const markerById=new Map\(\)/);
  assert.match(boatJs,/markerById\.set\(a\.id,m\)/);
  assert.match(boatJs,/data-launch-id/);
  assert.match(boatJs,/m\.on\('click',\(\)=>select\(a\.id,'marker'\)\)/);
  assert.match(boatJs,/Facility ID/);
  assert.match(boatJs,/google\.com\/maps\/dir/);
  assert.match(boatJs,/a\.latitude/);
  assert.match(boatJs,/a\.longitude/);
});

test('boat records expose useful source-backed facility details',()=>{
  assert.match(boatCode,/ntrailerableparking/);
  assert.match(boatCode,/nlanes/);
  assert.match(boatCode,/rampcode_new/);
  assert.match(boatCode,/operating_hours/);
  assert.match(boatCode,/carrydowntype/);
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
  assert.doesNotMatch(boatCode,/navigator\.geolocation|getCurrentPosition|localStorage|sessionStorage|document\.cookie/);
  assert.match(wreckJs,/not wreck coordinates/);
});
