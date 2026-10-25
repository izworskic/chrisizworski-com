'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {tileAddress,decodeTile,visibleReports}=require('../lib/john-day-map-ais');
const fixture=require('./fixtures/john-day-map-tile.json');
test('map tiles support country-wide zoom without an unbounded bbox proxy',()=>{
 assert.deepEqual(tileAddress({z:'0',x:'0',y:'0'}),{z:0,x:0,y:0});
 for(const q of [{},{z:3,x:8,y:0},{z:15,x:0,y:0},{z:-1,x:0,y:0},{z:3,x:'1/../../',y:0},{z:['3','4'],x:0,y:0}])assert.equal(tileAddress(q),null);
});
test('actual provider vector tile becomes recent named ship markers',async()=>{
 const now=Date.parse('2026-10-23T05:00:00Z');
 const d=await decodeTile(Buffer.from(fixture.base64,'base64'),{z:3,x:1,y:2},now);
 assert.ok(d.vessels.length>0);assert.ok(d.vessels.some(v=>v.name==='HAMMARLAND'));
 for(const v of d.vessels){assert.ok(v.lat>=0&&v.lat<=67);assert.ok(v.lon>=-136&&v.lon<=-89);assert.ok(now-Date.parse(v.seen)<=28*60000)}
 assert.ok(d.overview);
});
test('wrapped reports and older local cards share the same visible union',()=>{
 const now=Date.now(),b={west:150,east:210,south:40,north:70};
 const v={mmsi:'123456789',lat:55,lon:-179,seen:new Date(now-29*60000).toISOString()};
 const result=visibleReports([v],[{...v}],b,now);
 assert.equal(result.length,1);assert.equal(result[0].lon,181);
 assert.equal(visibleReports([{...v,seen:new Date(now-31*60000).toISOString()}],[],b,now).length,0);
});
test('browser requests the public provider directly without a shared API proxy',()=>{
 const fs=require('node:fs'),js=fs.readFileSync('public/assets/john-day-map.js','utf8');
 assert.match(js,/https:\/\/ais.openwaters.io\/v1\/vessels\/tiles\//);
 assert.doesNotMatch(js,/fetch\('\/api\/john-day-map-ais/);
 assert.match(js,/visibleReports\(reports,viewportReports,viewBounds\(\)\)/);
});

test('retained tiles cannot replace a newer local observation',()=>{
 const now=Date.now(),b={west:-122,east:-119,south:45,north:47};
 const local={mmsi:'123456789',lat:45.72,lon:-120.8,speedKnots:3,course:90,seen:new Date(now-60000).toISOString()};
 const tile={...local,lon:-121.2,seen:new Date(now-10*60000).toISOString()};
 const [v]=visibleReports([local],[tile],b,now);assert.equal(v.lon,local.lon);
 const {describe}=require('../public/assets/john-day-vessels');assert.equal(describe(v,now).kind,'toward');
 const newer={...local,course:270,seen:new Date(now-30000).toISOString()};
 const [updated]=visibleReports([local],[newer],b,now);assert.equal(describe(updated,now).kind,'nearby');
});

test('country groups conserve loaded report counts and selected ships remain visible',()=>{
 const {groupReports}=require('../lib/john-day-map-ais');
 const ships=[{mmsi:'a',lat:47.6,lon:-122.3},{mmsi:'b',lat:47.6001,lon:-122.3001},{mmsi:'c',lat:43,lon:-83}];
 const groups=groupReports(ships,4);
 assert.equal(groups.reduce((sum,g)=>sum+g.count,0),3);assert.ok(groups.some(g=>g.count===2));
 assert.deepEqual(groupReports([...ships].reverse(),4).map(g=>[g.key,g.lat,g.lon]).sort(),groups.map(g=>[g.key,g.lat,g.lon]).sort());
 const selected=groupReports(ships,4,'a');assert.ok(selected.some(g=>g.type==='ship'&&g.key==='a'));
 assert.equal(selected.filter(g=>g.type==='group').reduce((sum,g)=>sum+g.count,0),2);
 assert.equal(groupReports(ships,6).filter(g=>g.type==='ship').length,3);
});
