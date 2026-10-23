'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const rules=require('../api/john-day-rules'),water=require('../api/john-day-water');
function res(){return {code:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v;return this;},status(v){this.code=v;return this;},json(v){this.body=v;return this;}};}
test('rules endpoint cannot grant navigational clearance',()=>{
 const r=res();rules({method:'GET',query:{date:'2026-10-22',craft:'motorized',direction:'upstream'}},r);
 assert.equal(r.code,200);assert.equal(r.body.kind,'daylight-request');assert.equal(r.body.navigationClearance,false);assert.equal(r.body.liveStatus,'unknown');
});
test('rules endpoint blocks invalid dates and unsafe methods',()=>{
 const invalid=res();rules({method:'GET',query:{date:'2027-02-30'}},invalid);assert.equal(invalid.code,400);
 const post=res();rules({method:'POST',query:{}},post);assert.equal(post.code,405);
});
test('water upstream provider error cannot masquerade as zero flow or no traffic',async()=>{
 const original=global.fetch;global.fetch=async()=>{throw new Error('upstream offline');};
 try{const r=res();await water({method:'GET'},r);assert.equal(r.code,502);assert.equal(r.body.state,'unavailable');assert.equal(r.headers['Cache-Control'],'no-store');assert.equal('observations' in r.body,false);}finally{global.fetch=original;}
});
test('water endpoint parses upstream mock and attaches date and source',async()=>{
 const original=global.fetch;
 global.fetch=async()=>({ok:true,text:async()=>'<h1>John Day Dam</h1><table><tr><td>1</td><td>131</td><td>79.2</td><td>50.9</td><td>263.62</td><td>160.72</td><td>102.90</td></tr></table>'});
 try{const r=res();await water({method:'GET'},r);assert.equal(r.code,200);assert.equal(r.body.state,'historical-observation');assert.equal(r.body.observations[0].outflowKcfs,131);assert.match(r.body.sourceUrl,/nwd-wc.usace.army.mil/);assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(r.body.reportDate));}finally{global.fetch=original;}
});
