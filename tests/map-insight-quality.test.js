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
  assert.match(boatJs,/data\.photoSource|dataset\.photoSource/);
  assert.match(boatJs,/og:image/);
});

test('boat map uses stable launch slugs rather than Leaflet DOM order',()=>{
  assert.match(boatJs,/const markerBySlug=new Map\(\)/);
  assert.match(boatJs,/markerBySlug\.set\(loc\.slug,marker\)/);
  assert.match(boatJs,/oldMap\.replaceWith\(mapLayout\)/);
  assert.doesNotMatch(boatJs,/slice\(0,locations\.length\)/);
  assert.doesNotMatch(boatJs,/leaflet-interactive['"]\)\[idx\]/);
});

test('boat launch points are audited against maintained Michigan access-site data',()=>{
  assert.match(boatJs,/DNR_State_Sponsored_Developed_Boating_Access_Sites_Public_View/);
  assert.match(boatJs,/Michigan DNR maintained boating-access data/);
  assert.match(boatJs,/function bestMatch/);
  assert.match(boatJs,/function resolveFromMatch/);
  assert.match(boatJs,/confidence:'approximate'/);
  assert.match(boatJs,/Verified Michigan DNR access point/);
  assert.match(boatJs,/Approximate location — verify before towing/);
  assert.match(boatJs,/marker\.setLatLng\(\[res\.lat,res\.lng\]\)/);
  assert.match(boatJs,/Boat Launch Coordinate Audit/);
});

test('approximate launch points never become confident turn-by-turn destinations',()=>{
  assert.match(boatJs,/function googleDirections/);
  assert.match(boatJs,/if\(isVerified\(res\)\)return `https:\/\/www\.google\.com\/maps\/dir/);
  assert.match(boatJs,/google\.com\/maps\/search\/\?api=1&query=/);
  assert.match(boatJs,/do not use it as a turn-by-turn destination/);
  assert.match(boatJs,/dashArray:isVerified\(res\)\?null:'4 3'/);
});

test('boat cards provide conversational decision value instead of raw metadata',()=>{
  assert.match(boatJs,/Quick launch read/);
  assert.match(boatJs,/Today at this launch/);
  assert.match(boatJs,/Who this launch fits/);
  assert.match(boatJs,/Trailer angler:/);
  assert.match(boatJs,/Kayak \/ paddlecraft:/);
  assert.match(boatJs,/Family \/ casual:/);
  assert.match(boatJs,/function todayRead/);
  assert.match(boatJs,/function personaFits/);
  assert.match(boatJs,/function facilityFacts/);
  assert.match(boatJs,/nTrailerableParking/);
  assert.match(boatJs,/nLanes/);
  assert.match(boatJs,/RAMPCODE_NEW/);
});

test('boat map, launch cards, Google Maps and nearby alternatives control one decision state',()=>{
  assert.match(boatJs,/function syncMapToVisible/);
  assert.match(boatJs,/function jumpToRecord/);
  assert.match(boatJs,/function focusMap/);
  assert.match(boatJs,/Boat Launch Map To Record/);
  assert.match(boatJs,/Boat Launch Record To Map/);
  assert.match(boatJs,/classList\.add\('lf-selected'\)/);
  assert.match(boatJs,/marker\.openPopup\(\)/);
  assert.match(boatJs,/Show on map/);
  assert.match(boatJs,/Open in Google Maps/);
  assert.match(boatJs,/View satellite map/);
  assert.match(boatJs,/Nearby alternatives/);
  assert.match(boatJs,/data-launch-compare/);
  assert.match(boatJs,/Boat Launch Alternative/);
});

test('condition interpretation remains explicitly regional rather than a ramp safety claim',()=>{
  assert.match(boatJs,/nearest mapped NDBC station/);
  assert.match(boatJs,/can differ materially inside a river, marina, bay or harbor/);
  assert.match(boatJs,/not a launch or boating safety rating/);
  assert.match(boatJs,/not ramp, marina, harbor or boating-safety truth/);
  assert.match(boatJs,/Regional buoy data is screening context, not conditions at the ramp/);
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
