'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {tileAddress,decodeTile}=require('../lib/john-day-map-ais');
const handler=require('../api/john-day-map-ais');
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
test('endpoint rejects invalid tiles before fetching and decodes upstream bytes',async()=>{
 const make=()=>({headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(d){this.body=d;return this}});
 const old=global.fetch;let calls=0;global.fetch=async url=>{calls++;assert.match(url,/tiles\/3\/1\/2\?kind=vessel&max_age=28m$/);return {ok:true,arrayBuffer:async()=>Buffer.from(fixture.base64,'base64')}};
 try{const bad=make();await handler({method:'GET',query:{z:'bad'}},bad);assert.equal(bad.code,400);assert.equal(calls,0);
 const good=make();await handler({method:'GET',query:{z:'3',x:'1',y:'2'}},good);assert.equal(good.code,200);assert.ok(good.body.vessels.length);assert.match(good.headers['Cache-Control'],/s-maxage=30/);
 }finally{global.fetch=old}
});
