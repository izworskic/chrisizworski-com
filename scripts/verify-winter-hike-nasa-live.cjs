#!/usr/bin/env node
'use strict';
/* Checks real NASA GIBS tiles, not just syntactically correct URLs. */
const S=require('../public/winter-hike-snowshoe-lab/satellite.js');
const day='2025-02-15',lat=44.75,lon=-85.5;
function tile(mode,z){
 const x=Math.floor((lon+180)/360*2**z);
 const phi=lat*Math.PI/180;
 const y=Math.floor((1-Math.log(Math.tan(phi)+1/Math.cos(phi))/Math.PI)/2*2**z);
 return S.tileTemplate(mode,day).replace('{z}',z).replace('{x}',x).replace('{y}',y);
}
async function check(mode,z){
 const url=tile(mode,z),now=Date.now();
 const r=await fetch(url,{headers:{Accept:'image/png,image/jpeg,image/*'},signal:AbortSignal.timeout(18000)});
 const ct=r.headers.get('content-type')||'',body=Buffer.from(await r.arrayBuffer());
 const magic=body.slice(0,8).toString('hex');
 const valid=r.ok&&body.length>1000&&
  (mode==='trueColor'?ct.includes('image/jpeg')&&magic.startsWith('ffd8'):
  ct.includes('image/png')&&magic.startsWith('89504e470d0a1a0a'));
 console.log('NASA GIBS REAL TILE '+JSON.stringify({mode,date:day,zoom:z,url,status:r.status,
  contentType:ct,bytes:body.length,magic,ms:Date.now()-now,valid}));
 if(!valid)throw Error('NASA '+mode+' historical tile was not a usable image');
 return {mode,url,bytes:body.length};
}
async function main(){
 for(const [mode,z] of [['trueColor',6],['snowCover',6]])await check(mode,z);
 console.log('NASA GIBS historical imagery LIVE GATE PASSED');
}
main().catch(e=>{console.error('NASA GIBS historical imagery LIVE GATE FAILED: '+e.message);process.exitCode=1});
