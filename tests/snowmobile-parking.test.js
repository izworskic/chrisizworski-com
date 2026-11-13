import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {sourceUrl,normalizeParking,normalizeFeed,SOURCE_LAYER}=require('../lib/snowmobile/parking.cjs');
const finder=require('../public/assets/snowmobile-parking.js');
const api=require('../api/snowmobile-parking.js');
const mk=(id,lon,lat,fields={})=>({
 type:'Feature',id,geometry:{type:'Point',coordinates:[lon,lat]},
 properties:{OBJECTID:id,DESCRIP:'Snowmobile Trail LP 7',COMMENTS:'Snowmobile Parking off county road',
 ASSETTYPE:'Pavement Surface (Parking Lot)',ASSETDETAILTYPE:'Trail Access-Motorized',
 OWNEDBY:'State',ADMINBY:'DNR',FUNCTION_:'Recreation',last_edited_date:1787145816301,...fields}
});
const pos=[-84.7672618993,44.6625778531];
const line=(coordinates,properties={})=>({type:'Feature',geometry:{type:'LineString',coordinates},properties});
const geometry={type:'FeatureCollection',features:[line([[-84.77,44.66],[-84.76,44.665]],{trailNetwork:'LP 7'})]};

test('DNR request is fixed-origin public official GIS, requires geometry and full feature set',()=>{
 const u=new URL(sourceUrl());
 assert.equal(SOURCE_LAYER,'https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/DNRReferenceAssetsOPENDATA/FeatureServer/6');
 assert.ok(u.protocol==='https:');
 assert.match(u.searchParams.get('where'),/snowmobile/);
 assert.equal(u.searchParams.get('f'),'geojson');
 assert.equal(u.searchParams.get('outSR'),'4326');
 assert.ok(Number(u.searchParams.get('resultRecordCount'))>=127);
});

test('DNR field asset must explicitly designate snowmobiles, public ownership and motorized trail access',()=>{
 const valid=normalizeParking(mk(28,...pos));
 assert.equal(valid.id,28);
 assert.equal(valid.name,'Snowmobile Trail LP 7');
 assert.equal(valid.owner,'State');
 assert.equal(valid.lon,pos[0]);assert.equal(valid.lat,pos[1]);
 for(const owner of ['Private','Unknown','Unspecified',null]){
  assert.equal(normalizeParking(mk(29,...pos,{OWNEDBY:owner})),null);
 }
 assert.equal(normalizeParking(mk(30,...pos,{ASSETDETAILTYPE:'Trail Access-Nonmotorized'})),null);
 assert.equal(normalizeParking(mk(31,...pos,{DESCRIP:'Recreation Lot',COMMENTS:'Park here'})),null);
 assert.equal(normalizeParking(mk(32,...pos,{ASSETTYPE:'Campground'})),null);
 assert.equal(normalizeParking(mk(33,-94,44)),null);
 assert.equal(normalizeParking(mk(34,-84,95)),null);
 assert.equal(normalizeParking({...mk(35,...pos),geometry:{type:'LineString',coordinates:[pos,pos]}}),null);
 assert.ok(normalizeParking(mk(36,...pos,{OWNEDBY:'Municipal'})));
});

test('incomplete GIS feed cannot be presented as complete parking inventory',()=>{
 assert.throws(()=>normalizeFeed({features:[],properties:{exceededTransferLimit:true}}),/incomplete/i);
 assert.throws(()=>normalizeFeed({features:undefined}),/incomplete/i);
 const feed=normalizeFeed({type:'FeatureCollection',features:[mk(28,...pos),mk(28,...pos),mk(29,...pos,{OWNEDBY:'Private'}),mk(30,-94,44)]});
 assert.equal(feed.sourceRecords,4);
 assert.equal(feed.rejectedRecords,3);
 assert.equal(feed.sites.length,1);
 assert.equal(feed.sites[0].id,28);
});

test('parking site stays independent from DNR route graph; proximity is straight-line only',()=>{
 const a=normalizeParking(mk(28,...pos));
 const n=finder.nearParking([a],geometry);
 assert.equal(n.total,1);
 assert.equal(n.matches[0].id,28);
 assert.equal(n.matches[0].nearTrail,'LP 7');
 assert.ok(n.matches[0].nearMiles<0.9);
 assert.equal(n.matches[0].junctionId,undefined);
 assert.equal(n.matches[0].routable,undefined);
 assert.match(finder.directionsUrl(a),/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=44\.662578,-84\.767262$/);
 assert.equal(finder.directionsUrl({lat:100,lon:-85}),null);
});

test('closed-only and distant trail geometry never grants parking proximity',()=>{
 const a=normalizeParking(mk(28,...pos));
 assert.equal(finder.nearParking([a],{features:[line([[-84.77,44.66],[-84.76,44.665]],{band:'CLOSED'})]}).total,0);
 assert.equal(finder.nearParking([a],{features:[line([[-85.6,45.4],[-85.5,45.5]])]}).total,0);
 assert.equal(finder.nearParking([a],null).total,0);
 assert.equal(finder.nearParking([],geometry).total,0);
});

function mockRes(){
 return {status(v){this.code=v;return this;},setHeader(k,v){(this.headers||={})[k]=v;},json(v){this.payload=v;return this;}};
}
test('parking endpoint is read-only and fails closed when DNR cannot be verified',async()=>{
 const oldFetch=globalThis.fetch;
 api._test.clearCache();
 try{
  let res=mockRes();await api({method:'POST'},res);assert.equal(res.code,405);
  globalThis.fetch=async()=>{throw Error('DNR offline');};
  res=mockRes();await api({method:'GET'},res);
  assert.equal(res.code,503);
  assert.equal(res.payload.sites,undefined);
  assert.match(res.payload.note,/No parking locations will be guessed/);
 }finally{globalThis.fetch=oldFetch;api._test.clearCache();}
});

test('parking endpoint returns only source-backed validated records and freshness disclosure',async()=>{
 const oldFetch=globalThis.fetch;
 api._test.clearCache();
 try{
  globalThis.fetch=async()=>({ok:true,json:async()=>({type:'FeatureCollection',features:[mk(28,...pos),mk(29,...pos,{OWNEDBY:'Private'})]})});
  const res=mockRes();await api({method:'GET'},res);
  assert.equal(res.code,200);
  assert.equal(res.payload.sites.length,1);
  assert.equal(res.payload.sites[0].id,28);
  assert.equal(res.payload.accessStatus,'NOT_VERIFIED');
  assert.match(res.payload.note,/not current parking availability/);
  assert.ok(Number.isFinite(Date.parse(res.payload.sourceCheckedAt)));
  assert.equal(res.headers['X-Robots-Tag'],'noindex, nofollow');
 }finally{globalThis.fetch=oldFetch;api._test.clearCache();}
});

test('all seven generated regions have DNR parking, directions and scope caveats without SEO changes',()=>{
 const generator=readFileSync(new URL('../scripts/generate-snowmobile-region-pages.mjs',import.meta.url),'utf8');
 const client=readFileSync(new URL('../public/assets/snowmobile-region.js',import.meta.url),'utf8');
 for(const key of ['eastern-up','keweenaw-copper-country','central-western-up','grayling-gaylord','northeast-sunrise','northwest-michigan','west-michigan']){
  const page=readFileSync(new URL('../public/snowmobile/regions/'+key+'.html',import.meta.url),'utf8');
  for(const marker of ['id="parkingPlanner"','id="loadParking"','id="parkingResults"','id="parkingStatus"','/assets/snowmobile-parking.js','id="junctionSearch"','id="closeRouteLoop"','id="mapMoveToggle"']){
   assert.ok(page.includes(marker),key+': '+marker);
   assert.ok(generator.includes(marker),'generator: '+marker);
  }
  assert.ok(page.includes('google-adsense-account'),key+': ad ID');
  assert.match(page,/rel="canonical"/);
  assert.ok(page.includes('Parking pins never become route stops automatically'));
 }
 assert.ok(client.includes('snowmobile_parking_source_checked'));
 assert.ok(client.includes('DNR-listed snowmobile parking'));
 assert.ok(!client.includes('ROUTE_POINTS.push(site)'),'parking must not become an invented route junction');
});
