'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const handler=require('../api/michigan-garden-plan-v1');
function response(){return {headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v},status(n){this.code=n;return this},json(v){this.body=v;return v}}}
test('versioned Michigan garden API validates location and returns engine guidance with sources',()=>{
 let res=response();handler({method:'GET',query:{place:'48706'}},res);
 assert.equal(res.code,200);assert.equal(res.body.version,'1.0');assert.equal(res.body.station,'Bay City');assert.ok(res.body.crops.some(c=>c.id==='zinnias'&&c.sourceRules.includes('regionalWarmFlowers')));assert.equal(res.headers['x-robots-tag'],'noindex, nofollow');
 res=response();handler({method:'GET',query:{place:'Adrian'}},res);assert.equal(res.body.frost.fallTypical,null);
 res=response();handler({method:'GET',query:{place:'Atlantis'}},res);assert.equal(res.code,404);
 res=response();handler({method:'POST',query:{}},res);assert.equal(res.code,405);
});
