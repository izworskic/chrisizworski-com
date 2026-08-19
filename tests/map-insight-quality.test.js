import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const boatHtml=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');
const boatJs=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');
const boatApi=fs.readFileSync('api/boat-launches.js','utf8');
const boatGeocode=fs.readFileSync('api/boat-launch-geocode.js','utf8');
const boatCode=boatJs+'\n'+boatApi+'\n'+boatGeocode;
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

test('boat inventory is created only from current Michigan DNR records without requiring nullable facilityid',()=>{
  assert.match(boatApi,/PRDBASPublicView\/FeatureServer\/0/);
  assert.match(boatApi,/bas_type='Boating Access Site'/);
  assert.match(boatApi,/launch_status='Open'/);
  assert.match(boatApi,/greatlakesaccess LIKE 'Yes%'/);
  assert.doesNotMatch(boatApi,/facilityid IS NOT NULL/);
  assert.match(boatApi,/globalid/);
  assert.match(boatApi,/OBJECTID/);
  assert.match(boatApi,/function sourceId/);
  assert.match(boatJs,/SOURCE_API='\/api\/boat-launches'/);
  assert.match(boatJs,/j\.launches\|\|\[\]/);
  assert.doesNotMatch(boatHtml,/id="locdata"|"numberOfItems": 42|Bay City State Park Launch/);
});

test('boat source quality rules distinguish DNR review states while preserving stable source identity',()=>{
  assert.match(boatApi,/referenceonly/);
  assert.match(boatApi,/function reviewStatus/);
  assert.match(boatApi,/flag === "InProgress"/);
  assert.match(boatApi,/return "dnr-review-in-progress"/);
  assert.match(boatApi,/return "withhold"/);
  assert.match(boatApi,/latitude IS NOT NULL/);
  assert.match(boatApi,/longitude IS NOT NULL/);
  assert.match(boatApi,/waterwaysprogramconfirmation/);
  assert.match(boatApi,/qaqc_1_date/);
  assert.match(boatApi,/facilityid[\s\S]{0,500}globalid[\s\S]{0,500}OBJECTID/);
});

test('boat destination search resolves a place then ranks launches geographically',()=>{
  assert.match(boatJs,/GEOCODE_API='\/api\/boat-launch-geocode'/);
  assert.match(boatGeocode,/nominatim\.openstreetmap\.org\/search/);
  assert.match(boatGeocode,/bounded/);
  assert.match(boatJs,/function distanceMiles/);
  assert.match(boatJs,/function chooseNearby/);
  assert.match(boatJs,/within25/);
  assert.match(boatJs,/radiusUsed/);
  assert.doesNotMatch(boatJs,/hay\.includes\(q\)/);
  assert.match(boatHtml,/Where do you want to launch\?/);
});

test('boat finder has no fuzzy-match or manual-coordinate launch fallback',()=>{
  assert.doesNotMatch(boatCode,/MANUAL_VERIFIED|ALIASES|bestMatch|nameSimilarity|tokenScore/);
  assert.match(boatApi,/fallback_used: false/);
  assert.match(boatJs,/No legacy or guessed launch pins are being shown/);
  assert.match(boatHtml,/(?:A )?(?:primary-)?source outage is shown separately/i);
});

test('boat map and cards use one normalized source identifier and one coordinate per record',()=>{
  assert.match(boatJs,/const markerById=new Map\(\)/);
  assert.match(boatJs,/markerById\.set\(a\.id,m\)/);
  assert.match(boatJs,/data-launch-id/);
  assert.match(boatJs,/m\.on\('click',\(\)=>select\(a\.id,'marker'\)\)/);
  assert.match(boatJs,/destinationMarker/);
  assert.match(boatJs,/google\.com\/maps\/dir/);
  assert.match(boatJs,/a\.latitude/);
  assert.match(boatJs,/a\.longitude/);
});

test('boat records expose useful source-backed decision details',()=>{
  assert.match(boatApi,/ntrailerableparking/);
  assert.match(boatApi,/nlanes/);
  assert.match(boatApi,/rampcode_new/);
  assert.match(boatApi,/operating_hours/);
  assert.match(boatApi,/carrydowntype/);
  assert.match(boatJs,/trailerParking/);
  assert.match(boatJs,/rampClass/);
  assert.match(boatJs,/operatingHours/);
  assert.match(boatJs,/distanceMiles\.toFixed/);
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
