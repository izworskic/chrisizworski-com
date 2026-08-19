#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const launchHandler=require('../api/boat-launches.js');
const geocodeHandler=require('../api/boat-launch-geocode.js');
const driveHandler=require('../api/boat-launch-drive.js');
const weatherHandler=require('../api/boat-launch-weather.js');
const ranking=require('../public/assets/boat-launch-ranking.js');
function mockResponse(){return{statusCode:200,headers:{},body:null,setHeader(n,v){this.headers[String(n).toLowerCase()]=v;},status(c){this.statusCode=c;return this;},json(v){this.body=v;return this;}};}
async function invoke(handler,{query={}}={}){const req={method:'GET',query};const res=mockResponse();await handler(req,res);return res;}
async function geocode(q){for(let attempt=1;attempt<=2;attempt++){const res=await invoke(geocodeHandler,{query:{q}});if(res.statusCode===200)return res.body;if(attempt===2)throw new Error(`Geocoder failed for ${q}: ${res.statusCode} ${JSON.stringify(res.body)}`);await new Promise(r=>setTimeout(r,1250));}}
const rad=d=>d*Math.PI/180;function distanceMiles(a,b,c,d){const R=3958.7613;const x=Math.sin(rad(c-a)/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
function near(launches,point,radius=25){return launches.map(a=>({...a,_mi:distanceMiles(point.latitude,point.longitude,Number(a.latitude),Number(a.longitude))})).filter(a=>a._mi<=radius).sort((a,b)=>a._mi-b._mi);}
async function shortlistFor(point,records){const {pool,nextStraightMiles}=ranking.candidatePool(records,point,ranking.WIDE_POOL_SIZE);const driveRes=await invoke(driveHandler,{query:{from:`${point.latitude},${point.longitude}`,to:pool.map(a=>`${a.latitude},${a.longitude}`).join(';')}});return ranking.finalizeShortlist({pool,nextStraightMiles,drive:driveRes.statusCode===200?driveRes.body:null,limit:ranking.WIDE_POOL_SIZE});}

console.log('Boat Launch V4 statewide live runtime smoke');
const launchRes=await invoke(launchHandler);
assert.equal(launchRes.statusCode,200,`launch handler returned ${launchRes.statusCode}: ${JSON.stringify(launchRes.body)}`);
assert.equal(launchRes.body?.fallback_used,false);
assert.ok(Array.isArray(launchRes.body?.launches));
assert.ok(launchRes.body.launches.length>=500,`statewide launch inventory unexpectedly small: ${launchRes.body.launches.length}`);
assert.ok(launchRes.body.inland_or_other_count>100,`inland inventory unexpectedly small: ${launchRes.body.inland_or_other_count}`);
assert.ok(launchRes.body.great_lakes_count>50,`Great Lakes inventory unexpectedly small: ${launchRes.body.great_lakes_count}`);
assert.equal(launchRes.body.launches.some(a=>String(a.name||'').trim().toLowerCase()==='bay city state park launch'),false,'known false Bay City State Park Launch appeared');

const acceptance=['Bay City, MI','Lansing, MI','Jackson, MI','Houghton Lake, MI'];
const points={};
for(const q of acceptance){if(Object.keys(points).length)await new Promise(r=>setTimeout(r,1250));const point=await geocode(q);points[q]=point;const nearby=near(launchRes.body.launches,point);assert.ok(nearby.length>=1,`${q} returned zero statewide launches within 25 straight-line miles`);console.log(`${q}: ${nearby.length} launches within 25 mi; nearest ${nearby[0].name} ${nearby[0]._mi.toFixed(1)} mi`);}

const bayResult=await shortlistFor(points['Bay City, MI'],launchRes.body.launches);
assert.ok(bayResult.items.length>=3,'Bay City drive shortlist too small');
if(bayResult.routed){for(let i=1;i<bayResult.items.length;i++)assert.ok(Math.round(bayResult.items[i].driveMinutes)>=Math.round(bayResult.items[i-1].driveMinutes),'Bay City shortlist is not in drive-time order');}
const lansingResult=await shortlistFor(points['Lansing, MI'],launchRes.body.launches);
assert.ok(lansingResult.items.length>=1,'Lansing should now be in scope for statewide launches');
assert.ok(lansingResult.items.some(a=>a.waterScope==='inland-or-other'),'Lansing shortlist did not include an inland/other DNR launch');

const weatherTarget=bayResult.items[0];
const weatherRes=await invoke(weatherHandler,{query:{lat:String(weatherTarget.latitude),lon:String(weatherTarget.longitude)}});
assert.equal(weatherRes.statusCode,200,`weather handler returned ${weatherRes.statusCode}: ${JSON.stringify(weatherRes.body)}`);
assert.equal(weatherRes.body.source,'National Weather Service');
assert.ok(Array.isArray(weatherRes.body.periods)&&weatherRes.body.periods.length>0,'NWS forecast periods missing');
assert.match(weatherRes.body.disclaimer,/not .*boating-safety determination/i);

console.log(`Runtime smoke PASS — ${launchRes.body.launches.length} statewide source-backed launches; inland + Great Lakes coverage, drive ranking and launch-local NWS weather verified.`);
