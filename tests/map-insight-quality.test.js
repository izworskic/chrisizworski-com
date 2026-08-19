import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const boatHtml=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');
const boatJs=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');
const boatApi=fs.readFileSync('api/boat-launches.js','utf8');
const boatWeather=fs.readFileSync('api/boat-launch-weather.js','utf8');
const boatGeocode=fs.readFileSync('api/boat-launch-geocode.js','utf8');
const boatCode=boatJs+'\n'+boatApi+'\n'+boatGeocode+'\n'+boatWeather;
const wreckHtml=fs.readFileSync('public/great-lakes-shipwrecks/index.html','utf8');
const wreckJs=fs.readFileSync('public/assets/shipwreck-explorer.js','utf8');

test('boat inventory is current DNR, statewide, and stable-ID safe',()=>{
  assert.match(boatApi,/PRDBASPublicView\/FeatureServer\/0/);
  assert.match(boatApi,/bas_type='Boating Access Site'/);
  assert.match(boatApi,/launch_status='Open'/);
  assert.doesNotMatch(boatApi,/greatlakesaccess LIKE 'Yes%'/);
  assert.match(boatApi,/statewide: true/);
  assert.doesNotMatch(boatApi,/facilityid IS NOT NULL/);
  assert.match(boatApi,/globalid/);assert.match(boatApi,/OBJECTID/);assert.match(boatApi,/function sourceId/);
  assert.match(boatJs,/SOURCE_API='\/api\/boat-launches'/);
  assert.doesNotMatch(boatHtml,/id="locdata"|"numberOfItems": 42|Bay City State Park Launch/);
});

test('boat source quality rules preserve review states and source coordinates',()=>{
  assert.match(boatApi,/referenceonly/);assert.match(boatApi,/function reviewStatus/);assert.match(boatApi,/flag === "InProgress"/);
  assert.match(boatApi,/return "dnr-review-in-progress"/);assert.match(boatApi,/return "withhold"/);
  assert.match(boatApi,/latitude IS NOT NULL/);assert.match(boatApi,/longitude IS NOT NULL/);
});

test('boat UI has one discovery box and a full clustered statewide map',()=>{
  assert.equal((boatHtml.match(/<input[^>]+type="search"/g)||[]).length,1);
  assert.match(boatHtml,/Search city, lake, river, harbor, or launch/);
  assert.match(boatHtml,/All Michigan launches/);
  assert.match(boatJs,/markerClusterGroup/);
  assert.match(boatJs,/for\(const a of mapSet\(\)\)/);
  assert.match(boatJs,/GEOCODE_API='\/api\/boat-launch-geocode'/);
  assert.match(boatGeocode,/nominatim\.openstreetmap\.org\/search/);
  assert.match(boatJs,/rankNearDestination/);
});

test('boat map and result selection share normalized record identity',()=>{
  assert.match(boatJs,/const markerById=new Map\(\)/);
  assert.match(boatJs,/markerById\.set\(a\.id,marker\)/);
  assert.match(boatJs,/data-launch-id/);
  assert.match(boatJs,/selectLaunch\(a\.id,'marker'\)/);
  assert.match(boatJs,/google\.com\/maps\/dir/);
  assert.match(boatJs,/a\.latitude/);assert.match(boatJs,/a\.longitude/);
});

test('boat records expose decision details and selected-launch weather',()=>{
  assert.match(boatApi,/ntrailerableparking/);assert.match(boatApi,/nlanes/);assert.match(boatApi,/rampcode_new/);assert.match(boatApi,/operating_hours/);assert.match(boatApi,/carrydowntype/);
  assert.match(boatJs,/trailerParking/);assert.match(boatJs,/rampClass/);assert.match(boatJs,/operatingHours/);assert.match(boatJs,/WEATHER_API='\/api\/boat-launch-weather'/);
  assert.match(boatWeather,/api\.weather\.gov/);assert.match(boatWeather,/alerts\/active\?point=/);
  assert.match(boatWeather,/not a ramp, wave, water-temperature or boating-safety determination/);
});

test('boat finder has no fuzzy/manual launch fallback or personal location storage',()=>{
  assert.doesNotMatch(boatCode,/MANUAL_VERIFIED|ALIASES|bestMatch|nameSimilarity|tokenScore/);
  assert.match(boatApi,/fallback_used: false/);
  assert.match(boatJs,/No legacy or guessed launch pins are shown/);
  assert.doesNotMatch(boatCode,/navigator\.geolocation|getCurrentPosition|localStorage|sessionStorage|document\.cookie/);
});

test('shipwreck map selection changes the actual table record set',()=>{
  assert.match(wreckJs,/anchorSelection\?baseList\.filter/);assert.match(wreckJs,/visibleIds=new Set\(tableList\.map/);assert.match(wreckJs,/row\.style\.display/);assert.match(wreckJs,/Map selection:/);assert.match(wreckJs,/Shipwreck Map To Records/);assert.match(wreckJs,/data-wreck-clear-map/);
});

test('mappable shipwreck records can drive the map back to their regional anchor',()=>{
  assert.match(wreckJs,/data-wreck-map/);assert.match(wreckJs,/const markerByAnchor=new Map\(\)/);assert.match(wreckJs,/function focusAnchor/);assert.match(wreckJs,/Shipwreck Record To Map/);assert.match(wreckJs,/show on map →/);
});

test('map work preserves canonical ownership',()=>{
  assert.match(boatHtml,/canonical" href="https:\/\/chrisizworski\.com\/michigan-boat-launches\//);assert.match(wreckHtml,/canonical" href="https:\/\/chrisizworski\.com\/great-lakes-shipwrecks\//);assert.match(wreckJs,/not wreck coordinates/);
});
