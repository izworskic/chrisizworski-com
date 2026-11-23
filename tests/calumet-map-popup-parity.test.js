'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const page=fs.readFileSync('public/calumet-freighter-watch/index.html','utf8');
const app=fs.readFileSync('public/assets/calumet-watch-app.js','utf8');
const css=fs.readFileSync('public/assets/calumet-watch.css','utf8');
const cuy=fs.readFileSync('public/assets/cuyahoga-watch-app.js','utf8');
const core=require('../public/assets/calumet-watch-core.js');
const Icons=require('../public/assets/seaway-vessel-icons.js');
const guide=require('../public/calumet-freighter-watch/guide.json');

test('Calumet and Cuyahoga map vessels use one exact source-owned Soo factory',()=>{
 assert.match(cuy,/const g=Icons\.icon\(v,/);
 assert.match(app,/const glyph=Icons\.icon\(v,/);
 assert.match(page,/\/assets\/soo-vessel-icons\.css/);
 assert.match(app,/soo-ais-symbol calumet-vessel-icon/);
 assert.match(app,/is-selected/);
 assert.match(app,/function syncShipHighlight\(\)/);
 assert.match(app,/data-ship/);
 assert.equal(Icons.KINDS.length,9);
 for(const t of [70,80,31,60,37,36,30,33,null]){
  const v={shipType:t,speedKnots:1.4,lengthMeters:140};
  assert.match(Icons.icon(v).html,/ship-hull/);
 }
 assert.doesNotMatch(app,/river-ship-course|turningTime|estimatedArrival/);
});

test('two distinct shore pins and charted bridge types retain source truth',()=>{
 assert.equal((page.match(/<symbol id="cal-place-/g)||[]).length,2);
 assert.equal((page.match(/<symbol id="cal-bridge-/g)||[]).length,2);
 assert.match(app,/function placePin\(p,offset=false\)/);
 assert.match(app,/function bridgePin\(b\)/);
 assert.match(app,/calumet-place-pin--/);
 assert.match(app,/calumet-bridge-pin--/);
 assert.match(css,/\.calumet-place-pin--bridge95/);
 assert.match(css,/\.calumet-place-pin--calumetpark/);
 assert.match(css,/\.calumet-bridge-pin--rail/);
 assert.match(css,/\.calumet-place-pin\.is-offset/);
 assert.match(app,/function separatePlaceAndShipPins\(\)/);
 assert.match(app,/state\.map\.latLngToLayerPoint/);
 assert.match(app,/placeMarkers\.set\(p\.id,m\)/);
 assert.equal(guide.viewpoints.length,2);
 assert.equal(guide.bridges.filter(b=>b.group==='rail').length,5);
 assert.ok(guide.viewpoints.every(p=>p.coordinateNote.includes('NOT')));
 assert.ok(guide.bridges.every(b=>b.mapRole==='ROUNDED_REFERENCE_NOT_SPAN'));
});

test('Calumet shore, bridge and vessel bubbles match Cuyahoga without competing tooltip',()=>{
 assert.match(cuy,/function parkPopupContent\(/);
 assert.match(cuy,/function openShipPopup\(/);
 assert.match(app,/function placePopupContent\(p\)/);
 assert.match(app,/function bridgePopupContent\(b\)/);
 assert.match(app,/function shipPopupContent\(v\)/);
 assert.match(app,/function openShipPopup\(marker,v\)/);
 assert.match(app,/L\.popup\(\{autoClose:true,closeOnClick:true,maxWidth:305\}\)/);
 assert.match(app,/vesselPopup\.setLatLng\(marker\.getLatLng\(\)\)\.setContent\(shipPopupContent\(v\)\)\.openOn\(state\.map\)/);
 assert.match(app,/m\.bindPopup\(placePopupContent\(p\)/);
 assert.match(app,/m\.bindPopup\(bridgePopupContent\(b\)/);
 assert.match(app,/m\.on\('click',\(\)=>\{chooseShip\(v\.mmsi,false\);openShipPopup\(m,v\);\}\)/);
 assert.doesNotMatch(app,/m\.bindTooltip\(/);
 assert.match(app,/state\.map\?\.closePopup\(\)/);
 assert.match(app,/m\.openPopup\(\)/);
 assert.match(css,/#calumet-map \.park-popup-title/);
 assert.match(css,/#calumet-map \.park-popup-actions/);
 assert.match(css,/#calumet-map \.park-popup-note/);
});

test('popup fields and links are grounded and non-predictive',()=>{
 for(const field of ['Reported AIS type:', 'Reported length:', 'knots reported',
  'MMSI ', 'Reported travel course:', 'Reported true heading:',
  'Last position:', 'Full ship tracker']){
  assert.ok(app.includes(field),'Missing ship detail '+field);
 }
 for(const field of ['Google Maps', 'Official / documented place details',
 'Approximate bridge reference', 'sightlines', 'NOAA bridge reference',
 'Coast Guard notices', 'Rounded NOAA chart location only',
 'not a live bridge opening', 'not a ship sighting or future arrival']){
  assert.ok(app.includes(field),'Missing source/safety context '+field);
 }
 assert.match(app,/node\('p',p\.visit/);
 assert.match(app,/node\('p',b\.summary/);
 assert.match(app,/node\('p','MMSI '\+v\.mmsi\+' · '\+v\.source/);
 assert.doesNotMatch(app,/innerHTML\s*=\s*(?:p\.|v\.|b\.)/);
 assert.match(page,/name="robots" content="noindex,follow"/);
 assert.match(page,/rel="canonical" href="https:\/\/chrisizworski.com\/calumet-freighter-watch\/"/);
 assert.match(page,/chrisizworski.com\/#person/);
 assert.doesNotMatch(app,/fetch\('\/api\/freighter-ais\?region=cuyahoga'/);
 assert.match(app,/fetch\('\/api\/freighter-ais'/);
});

test('reported heading remains optional without inventing course or length',()=>{
 const now=Date.parse('2026-11-22T19:00:00Z');
 const make=(heading)=>core.classifyLive({ok:true,checkedAt:'2026-11-22T18:59:30Z',
  vessels:[{mmsi:'366123456',name:'test',lat:41.722,lon:-87.544,
   seen:'2026-11-22T18:59:00Z',source:'QA fixture',course:null,
   lengthMeters:null,speedKnots:0,shipType:31,heading}]},now).vessels[0];
 assert.equal(make(265).heading,265);
 assert.equal(make(511).heading,null);
 assert.equal(make(null).heading,null);
 assert.equal(make(265).lengthMeters,null);
 assert.equal(make(265).course,null);
});
