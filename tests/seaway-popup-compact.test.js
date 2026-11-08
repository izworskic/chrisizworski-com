'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Photos=require('../public/assets/seaway-popup-photos.js');
const catalog=JSON.parse(fs.readFileSync('public/assets/seaway-popup-photos.json','utf8'));
const js=fs.readFileSync('public/assets/seaway.js','utf8');
const css=fs.readFileSync('public/assets/seaway.css','utf8');
const generator=fs.readFileSync('scripts/generate-seaway.mjs','utf8');
const enhancer=fs.readFileSync('scripts/enhance-seaway-journey.mjs','utf8');
const popup=js.slice(js.indexOf('function shipDetail(v)'),js.indexOf('function updateReportLine()'));

test('each ship map bubble is compact with no links or explanatory filler',()=>{
  assert.match(popup,/Reported '\+time\(v\.seen\)/);
  assert.match(popup,/C\.motion\(v\)/);
  assert.match(popup,/C\.direction\(v\)/);
  assert.match(popup,/Reported length/);
  assert.match(popup,/dataset\.shipMmsi/);
  assert.match(popup,/dataset\.shipSeen/);
  assert.doesNotMatch(popup,/\ba\('/,'No external anchor builders in shipDetail');
  assert.doesNotMatch(popup,/A radio postcard from the ship|It does not reserve a turn at a lock|AIS destination text is not a verified itinerary/);
});

test('vetted historical photos require exact current MMSI plus normalized name',()=>{
  assert.equal(catalog.photos.length,2);
  const now=Date.parse('2026-11-08T12:00:00Z');
  for(const expected of [
    {mmsi:'316009090',name:'Algoma Equinox',imo:'9613927'},
    {mmsi:'316036228',name:'ALGOMA BUFFALO',imo:'7620653'}
  ]){
    const matched=Photos.match(catalog,expected,now);
    assert.ok(matched,expected.name+' should have individually vetted image');
    assert.equal(matched.imo,expected.imo);
    assert.match(matched.image,/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//);
    assert.equal(matched.licenseUrl,'https://creativecommons.org/licenses/by-sa/4.0/');
    assert.ok(matched.credit&&matched.photoSource&&matched.identitySources.length>=1);
    assert.equal(Photos.match(catalog,{...expected,name:'OTHER FREIGHTER'},now),null);
    assert.equal(Photos.match(catalog,{...expected,mmsi:'999999999'},now),null);
  }
  assert.equal(Photos.match(catalog,{name:'UNKNOWN',mmsi:'123456789'},now),null);
  assert.equal(Photos.match(catalog,{name:'ALGOMA EQUINOX',mmsi:'316009090'},Date.parse('2027-09-01T00:00:00Z')),null,'no expired photo identity mapping');
  assert.equal(Photos.match(catalog,{name:'ALGOMA EQUINOX',mmsi:'316009090'},Date.parse('2026-10-01T00:00:00Z')),null,'no use before source review');
  assert.equal(Photos.match({...catalog,photos:[...catalog.photos,catalog.photos[0]]},{name:'ALGOMA EQUINOX',mmsi:'316009090'},now),null,'duplicate identities fail closed');
  assert.equal(Photos.match({...catalog,photos:[{...catalog.photos[0],image:'https://example.com/ship.jpg'}]},{name:'ALGOMA EQUINOX',mmsi:'316009090'},now),null,'untrusted image sources fail closed');
});

test('photo credit and CC license stay outside popup; missing media removes itself',()=>{
  const implementation=fs.readFileSync('public/assets/seaway-popup-photos.js','utf8');
  assert.match(implementation,/creditOutsidePopup/);
  assert.match(implementation,/getElementById\('mapSelection'\)/);
  assert.match(implementation,/dataset\.shipMmsi/);
  assert.match(implementation,/dataset\.shipSeen/);
  assert.match(implementation,/img\.addEventListener\('error'/);
  assert.match(implementation,/figure\.remove\(\)/);
  assert.match(implementation,/img\.alt=photo\.imageAlt/);
  assert.match(implementation,/caption\.textContent='Historical photo/);
  assert.match(js,/m\.on\('popupopen',/);
  assert.match(js,/SeawayPopupPhotos\?\.enhance/);
  assert.match(css,/\.seaway-popup-figure img/);
  assert.match(css,/height:112px/);
  assert.match(css,/object-fit:cover/);
  assert.match(css,/\.seaway-photo-credit-outside/);
});

test('both generated Seaway pages load photo adapter before updated map script',()=>{
  for(const slug of ['st-lawrence-seaway','eisenhower-lock']){
    const html=fs.readFileSync('public/'+slug+'/index.html','utf8');
    const photo=html.indexOf('/assets/seaway-popup-photos.js?v=20261108f');
    const map=html.indexOf('/assets/seaway.js?v=20261108g');
    assert.ok(photo>=0&&map>photo,slug+' should preload vetted photo helper before map');
    assert.match(html,/\/assets\/seaway\.css\?v=20261108f/);
    assert.match(html,/rel="canonical"/);
  }
  assert.match(generator,/\/assets\/seaway-popup-photos\.js\?v=20261108f/);
  assert.match(generator,/\/assets\/seaway\.js\?v=20261108f/);
  assert.match(enhancer,/\/assets\/seaway\.js\?v=20261108f/);
  assert.doesNotMatch(popup,/\bOpen Waters photo|Generic ship photograph/);
});
