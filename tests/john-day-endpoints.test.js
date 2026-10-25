'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const rules=require('../api/john-day-rules'),water=require('../api/john-day-water');
const fixture=fs.readFileSync(path.join(__dirname,'fixtures/john-day-2026-07-10.html'),'utf8');
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
test('water endpoint detects date mismatch rather than mislabel yesterday',async()=>{
 const original=global.fetch;global.fetch=async()=>({ok:true,text:async()=>fixture});
 try{const r=res();await water({method:'GET'},r);assert.equal(r.code,502);assert.equal(r.body.state,'unavailable');}finally{global.fetch=original;}
});
test('water endpoint responds with validated full day on correct dynamic date',async()=>{
 const original=global.fetch;
 const today=new Date();const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(today);
 const obj=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 const yesterday=new Date(Date.parse(obj.year+'-'+obj.month+'-'+obj.day+'T12:00:00Z')-86400000).toISOString().slice(0,10);
 const mock=fixture.replaceAll('2026-07-10',yesterday);
 global.fetch=async()=>({ok:true,text:async()=>mock});
 try{
  const r=res();await water({method:'GET'},r);
  assert.equal(r.code,200);assert.equal(r.body.state,'historical-observation');
  assert.equal(r.body.observedHours,24);assert.equal(r.body.summary.maximumOutflowKcfs,203.2);
  assert.equal(r.body.reportDate,yesterday);assert.match(r.body.sourceUrl,/nwd-wc.usace.army.mil/);
 }finally{global.fetch=original;}
});
