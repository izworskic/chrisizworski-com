const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const links=require('../public/assets/visitor-map-links.js');
const parking=require('../public/assets/snowmobile-parking.js');
const read=path=>fs.readFileSync(path,'utf8');

test('shared Google Maps contract distinguishes locations from verified arrival',()=>{
 assert.equal(links.placeSearch({role:'public-place',query:'St Catharines Museum'}),
  'https://www.google.com/maps/search/?api=1&query=St%20Catharines%20Museum');
 assert.equal(links.placeSearch({role:'regional-reference',query:'Grand Portage State Park, Minnesota, USA'})?.startsWith('https://www.google.com/maps/search/'),true);
 assert.equal(links.placeSearch({role:'restricted-pad',query:'Launch pad'}),null);
 assert.equal(links.placeSearch({role:'moving-vessel',query:'123456789'}),null);
 assert.equal(links.placeSearch({role:'public-place',query:'\n'}),null);
 assert.equal(links.featureSearch({role:'natural-feature',lat:46.40992,lng:-89.132584}),
  'https://www.google.com/maps/search/?api=1&query=46.40992%2C-89.132584');
 assert.equal(links.featureSearch({role:'moving-vessel',lat:43.2,lng:-79.2}),null);
 assert.equal(links.featureSearch({role:'public-place',lat:0,lng:0}),null);
 assert.equal(links.featureSearch({role:'public-place',lat:120,lng:-87}),null);
 assert.equal(links.verifiedDirections({role:'regional-reference',lat:46,lng:-86,sourceUrl:'https://www.nps.gov/a/'}),null);
 assert.equal(links.verifiedDirections({role:'verified-visitor-entrance',lat:46,lng:-86}),null);
 assert.equal(links.verifiedDirections({role:'verified-visitor-entrance',lat:46,lng:-86,sourceUrl:'http://invalid/a'}),null);
 assert.match(links.verifiedDirections({role:'verified-visitor-entrance',lat:46,lng:-86,sourceUrl:'https://www.nps.gov/a/'}),/google\.com\/maps\/dir/);
});

test('Circle Tour publishes 31 distinct stop-area Google Maps searches even without JavaScript',()=>{
 const html=read('public/lake-superior-circle-tour/index.html');
 const cards=[...html.matchAll(/<article class="stop-card" id="stop-(\d+)"[^>]*data-google-map-query="([^"]+)"[^>]*>/g)];
 const allIds=[...html.matchAll(/<article class="stop-card" id="stop-(\d+)"/g)];
 assert.equal(cards.length,31);
 assert.equal(allIds.length,31);
 const seen=new Set();
 for(let i=0;i<cards.length;i++){
  const [,id,raw]=cards[i];
  assert.ok(!seen.has(id),'duplicate stop '+id);seen.add(id);
  const segment=html.slice(cards[i].index,cards[i+1]?.index||html.length);
  const m=segment.match(/<a data-stop-google-maps href="([^"]+)"[^>]*>View stop area in Google Maps<\/a>/);
  assert.ok(m,'no Google Maps link in '+id);
  const query=raw.replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&quot;/g,'"');
  const expected=links.placeSearch({role:'regional-reference',query});
  assert.ok(expected,'invalid stop map query '+id);
  const url=new URL(m[1]);
  assert.equal(url.origin,'https://www.google.com');
  assert.equal(url.pathname,'/maps/search/');
  assert.equal(url.searchParams.get('api'),'1');
  assert.equal(url.searchParams.get('query'),query,'different mapped stop area '+id);
  assert.ok(!url.pathname.includes('/dir/'),'no approximate stop routes '+id);
 }
 assert.ok(seen.has('21')&&html.includes('Grand Portage State Park, Minnesota, USA'));
 assert.match(html,/id="mapStopGoogleLink"/);
 assert.ok(html.includes("<noscript><style>.stop-card:not(.open) .stop-body{display:block}</style></noscript>"),"no-script stop cards must display the place links");
 assert.match(html,/visitor-map-links\.js/);
 assert.match(html,/lake-superior-circle-tour\.js\?v=20261121-stop-popup/);
 const map=read('public/assets/lake-superior-circle-tour-map.js');
 const core=read('public/assets/lake-superior-circle-tour-core.js');
 const live=read('public/assets/lake-superior-circle-tour-live-day.js');
 assert.match(core,/mapLocationUrl\(id\)/);
 assert.match(core,/VisitorMapLinks\?\.placeSearch\(\{role:'regional-reference',query\}\)/);
 assert.match(map,/mapStopGoogleLink/);
 assert.match(live,/page\.mapLocationUrl\?\.\(id\)/);
 assert.match(live,/ct-map-google/);
 assert.match(live,/data-focus-stop/);
});

test('Welland visitor map links identify three public shore-watch areas, never lock machinery or ship positions',()=>{
 const html=read('public/welland-canal/index.html'),script=read('public/assets/welland-canal.js');
 const linksOnPage=[...html.matchAll(/<a data-shore-spot-google="(\d+)" href="([^"]+)"[^>]*>/g)];
 assert.deepEqual(linksOnPage.map(m=>m[1]),['3','7','8']);
 for(const [,id,encoded] of linksOnPage){
  const url=new URL(encoded.replace(/&amp;/g,'&'));
  assert.equal(url.pathname,'/maps/search/');
  assert.equal(url.searchParams.get('api'),'1');
  assert.ok(url.searchParams.get('query'));
  assert.ok(!url.href.includes('/dir/'));
 }
 assert.match(html,/visitor-map-links\.js/);
 assert.match(script,/function publicViewingUrl\(id\)/);
 assert.match(script,/role:'public-place'/);
 assert.match(script,/View public viewing place in Google Maps/);
 assert.match(script,/lock-public-google/);
 assert.match(script,/if\(url\)\{const a=el\('a','View public viewing place in Google Maps'/);
});

test('snowmobile unpaired and conflicting DNR parking locations do not offer unqualified driving directions',()=>{
 const script=read('public/assets/snowmobile-region.js');
 const site={lat:44.662578,lon:-84.767262};
 const view=parking.locationUrl(site);
 assert.equal(view,'https://www.google.com/maps/search/?api=1&query=44.662578%2C-84.767262');
 assert.equal(view,links.featureSearch({role:'parking-reference',lat:44.662578,lng:-84.767262}));
 assert.match(parking.directionsUrl(site),/google\.com\/maps\/dir/);
 assert.equal(parking.locationUrl({lat:90,lon:-85}),null);
 assert.match(script,/\['DNR_MAP_PAIRED','OPERATOR_PAIRED'\]\.includes\(e\.grade\)/);
 assert.match(script,/View DNR parking location in Google Maps/);
 assert.match(script,/Directions toward mapped parking/);
 assert.match(script,/data-parking-location/);
 assert.doesNotMatch(script,/Drive to parking pin/);
});
