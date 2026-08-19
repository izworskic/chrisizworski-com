#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const launchHandler=require('../api/boat-launches.js');
const geocodeHandler=require('../api/boat-launch-geocode.js');

function mockResponse(){
  return {
    statusCode:200,
    headers:{},
    body:null,
    setHeader(name,value){this.headers[String(name).toLowerCase()]=value;},
    status(code){this.statusCode=code;return this;},
    json(value){this.body=value;return this;},
  };
}

async function invoke(handler,{query={}}={}){
  const req={method:'GET',query};
  const res=mockResponse();
  await handler(req,res);
  return res;
}

const rad=d=>d*Math.PI/180;
function distanceMiles(lat1,lon1,lat2,lon2){
  const R=3958.7613;
  const dLat=rad(lat2-lat1),dLon=rad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function rank(launches,point){
  return launches.map(a=>({...a,_mi:distanceMiles(point.latitude,point.longitude,Number(a.latitude),Number(a.longitude))})).sort((a,b)=>a._mi-b._mi);
}
async function geocode(q){
  for(let attempt=1;attempt<=2;attempt++){
    const res=await invoke(geocodeHandler,{query:{q}});
    if(res.statusCode===200)return res.body;
    if(attempt===2)throw new Error(`Geocoder failed for ${q}: ${res.statusCode} ${JSON.stringify(res.body)}`);
    await new Promise(r=>setTimeout(r,1250));
  }
}

console.log('Boat Launch V3 live runtime smoke');

const launchRes=await invoke(launchHandler);
assert.equal(launchRes.statusCode,200,`launch handler returned ${launchRes.statusCode}: ${JSON.stringify(launchRes.body)}`);
assert.equal(launchRes.body?.fallback_used,false);
assert.ok(Array.isArray(launchRes.body?.launches),'launch handler did not return launches[]');
assert.ok(launchRes.body.launches.length>=100,`launch inventory unexpectedly small: ${launchRes.body.launches.length}`);
assert.ok(launchRes.body.source_qualified_count>=50,'source-qualified DNR inventory unexpectedly small');
assert.ok(launchRes.body.review_in_progress_count>=50,'review-in-progress DNR inventory unexpectedly small');
assert.ok(launchRes.body.municipal_supplemental_count>=1,'municipal supplement missing');
assert.equal(launchRes.body.launches.some(a=>String(a.name||'').trim().toLowerCase()==='bay city state park launch'),false,'known false Bay City State Park Launch appeared');

const bayPoint=await geocode('Bay City, MI');
const bayNearby=rank(launchRes.body.launches,bayPoint).filter(a=>a._mi<=25);
assert.ok(bayNearby.length>=3,`Bay City returned only ${bayNearby.length} source-backed launches within 25 miles`);
assert.ok(bayNearby.some(a=>a.name==='Saginaw River Mouth'),`Bay City shortlist did not include Saginaw River Mouth: ${bayNearby.slice(0,8).map(a=>a.name).join(', ')}`);
console.log(`Bay City: ${bayNearby.length} within 25 mi; nearest ${bayNearby[0].name} ${bayNearby[0]._mi.toFixed(2)} mi`);

// Respect public Nominatim usage guidance by never issuing destination requests concurrently.
await new Promise(r=>setTimeout(r,1250));
const southHavenPoint=await geocode('South Haven, MI');
const southHavenNearby=rank(launchRes.body.launches,southHavenPoint).filter(a=>a._mi<=25);
const blackRiver=southHavenNearby.find(a=>a.id==='municipal:south-haven:black-river-park-launch');
assert.ok(blackRiver,`South Haven shortlist missing Black River Park Launch Ramp: ${southHavenNearby.slice(0,8).map(a=>a.name).join(', ')}`);
assert.ok(blackRiver._mi<2,`Black River Park launch resolved too far from South Haven: ${blackRiver._mi.toFixed(2)} mi`);
assert.equal(blackRiver.sourceType,'municipal-supplemental');
assert.equal(blackRiver.verificationStatus,'municipal-source-qualified');
console.log(`South Haven: ${southHavenNearby.length} within 25 mi; Black River Park ${blackRiver._mi.toFixed(2)} mi`);

console.log(`Runtime smoke PASS — ${launchRes.body.launches.length} source-backed launches; live DNR handler + live Michigan destination geocoder + distance ranking verified.`);
