import test from 'node:test';
import assert from 'node:assert/strict';
import {LIGHTS,overlandPR,intensity,degreesFrom,onshore,scoreHour,bestWindow,persistence,isFresh} from '../lib/frozen-lighthouse.mjs';
import handler,{parseGLSEA,normalizeStation,forecastHours,iceContext,evaluatePier,pickWater} from '../api/lighthouse-ice.js';

const clock=Date.now();
const iso=(hours=0)=>new Date(clock+hours*3600000).toISOString();
const first=LIGHTS[0];
const midYear=new Date(clock).getUTCFullYear();
const observedDay=new Date(clock-(new Date(clock).getUTCHours()<13?24:0)*3600000);
const dayOfYear=Math.floor((Date.UTC(observedDay.getUTCFullYear(),observedDay.getUTCMonth(),observedDay.getUTCDate())-Date.UTC(observedDay.getUTCFullYear(),0,1))/86400000)+1;
const civil=iso().slice(0,16).replace('T',' ');
const wind='WNW';

test('published Overland PR hand calculations use 0 C freshwater freezing point',()=>{
 const mph10=10/0.44704;
 assert.ok(Math.abs(overlandPR(mph10,14,32)-100)<1e-7);
 assert.ok(Math.abs(overlandPR(mph10,14,35.6)-62.5)<1e-7);
 assert.ok(Math.abs(overlandPR(5/0.44704,23,35.6)-15.625)<1e-7);
 assert.equal(intensity(-1),'none');
 assert.equal(intensity(0),'none');
 assert.equal(intensity(22.399),'light');
 assert.equal(intensity(22.4),'moderate');
 assert.equal(intensity(53.3),'heavy');
 assert.equal(intensity(83),'extreme');
 assert.equal(overlandPR(null,14,32),null);
});

test('all lights have USCG identifiers, coordinates and a lake-facing onshore direction',()=>{
 assert.equal(LIGHTS.length,9);
 assert.equal(new Set(LIGHTS.map(x=>x.listNumber)).size,9);
 for(const pier of LIGHTS){
  assert.ok(pier.lat>42&&pier.lat<45);
  assert.ok(pier.lon< -86&&pier.lon> -87);
  assert.ok(Number.isFinite(pier.onshoreBearing));
  assert.ok(pier.onshoreBearing>=200&&pier.onshoreBearing<=335,pier.id+' must face Lake Michigan');
  assert.equal(onshore('E',pier.onshoreBearing),false,pier.id+' offshore east wind');
  assert.equal(onshore('W',pier.onshoreBearing),true,pier.id+' onshore west wind');
 }
 assert.equal(degreesFrom('WSW'),247.5);
 assert.equal(degreesFrom('east'),null);
 assert.equal(onshore(null,270),false);
});

test('gate and ice suppression precede any icing category',()=>{
 const good={windMph:25,airF:12,waterF:34,windFrom:wind};
 const active=scoreHour(good,first);assert.ok(active.score>0);
 assert.equal(scoreHour({...good,windFrom:'E'},first).score,0);
 assert.equal(scoreHour({...good,windMph:14.9},first).score,0);
 assert.equal(scoreHour({...good,airF:32},first).score,0);
 assert.equal(scoreHour({...good,waterF:40},first).score,0);
 assert.equal(scoreHour({...good,icePct:83},first).category,'suppressed');
 assert.ok(scoreHour({...good,icePct:50},first).score<active.score);
 assert.equal(scoreHour({...good,windMph:null},first).score,null);
 assert.equal(scoreHour({...good,waterF:null},first).score,null);
 assert.equal(scoreHour({...good,windFrom:null},first).score,null);
 assert.equal(scoreHour({...good,icePct:-1},first).score,null);
});

test('missing NWS hours and stale issue date do not create a live forecast',()=>{
 const p={properties:{updateTime:iso(-1),periods:[{startTime:iso(1),endTime:iso(2),temperature:14,temperatureUnit:'F',windSpeed:'26 mph',windGust:'37 mph',windDirection:wind}]}};
 assert.equal(forecastHours(p,clock).hours.length,1);
 assert.equal(forecastHours(p,clock).hours[0].gustMph,37);
 assert.equal(forecastHours({...p,properties:{...p.properties,updateTime:iso(-9)}},clock),null);
 assert.equal(forecastHours({...p,properties:{...p.properties,periods:null}},clock),null);
 assert.equal(forecastHours({...p,properties:{...p.properties,periods:[{startTime:iso(1),temperature:null,temperatureUnit:'F',windSpeed:'26 mph',windDirection:wind}]}},clock).hours[0].airF,null);
});

test('shore and GLSEA water temperature are explicitly source-scoped and age-checked',()=>{
 const coops={data:[{t:civil,v:'36.2'}]};
 assert.equal(normalizeStation(coops,clock).tempF,36.2);
 assert.equal(normalizeStation({data:[{t:iso(-47).slice(0,16).replace('T',' '),v:'37'}]},clock),null);
 assert.equal(normalizeStation({data:[{t:civil,v:'bad'}]},clock),null);
 const csv='Day,Average (1995-2025),'+midYear+'\n'+dayOfYear+',42,37.1\n';
 assert.equal(parseGLSEA(csv,midYear,clock).kind,'lakewide-proxy');
 assert.equal(parseGLSEA(csv,midYear-1,clock),null);
 assert.equal(parseGLSEA('',midYear,clock),null);
 assert.equal(pickWater(first,{coops:normalizeStation(coops,clock),glsea:parseGLSEA(csv,midYear,clock)}).kind,'lakewide-proxy');
});

test('missing and stale ice observation stays unknown rather than zero',()=>{
 const observed=new Date(clock-7*3600000).toISOString().slice(0,10);
 assert.equal(iceContext({cover:null},clock).pct,null);
 assert.equal(iceContext({cover:{michigan:0,observedAt:observed}},clock).pct,0);
 assert.equal(iceContext({cover:{michigan:85,observedAt:iso(-140).slice(0,10)}},clock).pct,null);
 const v=evaluatePier(first,null,null,iceContext(null,clock),{status:'unavailable',events:[]},clock);
 assert.equal(v.available,false);
 assert.equal(v.best,null);
 assert.equal(v.hours.length,0);
});

test('rolling hour fixture finds best window and avoids invented persistence promises',()=>{
 const hours=[{score:20,startTime:iso(1),airF:18,shortForecast:'Clear'},
  {score:60,startTime:iso(2),airF:19,shortForecast:'Cloudy'},
  {score:0,startTime:iso(3),airF:34,shortForecast:'Rain'}];
 assert.equal(bestWindow(hours).score,60);
 assert.match(persistence(hours,bestWindow(hours)).estimate,/May diminish/);
 assert.equal(bestWindow([{score:null,startTime:iso(2)}]),null);
 assert.equal(isFresh(iso(-100),clock,6),false);
});

test('the single API fails each external signal independently and never invents waves',async()=>{
 const original=globalThis.fetch;
 const csv='Day,Average (1995-2025),'+midYear+'\n'+dayOfYear+',42,36\n';
 let nIce=0,nAlerts=0,nHourly=0;
 globalThis.fetch=async input=>{
  const url=String(input);
  const reply=(data)=>new Response(typeof data==='string'?data:JSON.stringify(data),{status:200});
  if(url.includes('/api/ice')){nIce++;return reply({cover:null})}
  if(url.includes('avgtemps-m_'))return reply(csv);
  if(url.includes('tidesandcurrents.noaa.gov'))return reply({data:[{t:civil,v:'36.2'}]});
  if(url.includes('/alerts/active')){nAlerts++;throw Error('NWS alerts temporarily down')}
  if(url.includes('/points/'))return reply({properties:{forecastHourly:'https://api.weather.gov/gridpoints/GRR/1,2/forecast/hourly'}});
  if(url.includes('/forecast/hourly')){nHourly++;return reply({properties:{updateTime:iso(-1),periods:[{startTime:iso(1),temperature:12,temperatureUnit:'F',windDirection:wind,windSpeed:'26 mph',shortForecast:'Cold'}]}});}
  throw Error('Unexpected '+url);
 };
 try{
  const out=await handler({url:'https://chrisizworski.com/api/lighthouse-ice'});
  assert.equal(out.status,200);
  assert.match(out.headers.get('cache-control'),/s-maxage=3600/);
  assert.equal(out.headers.get('x-robots-tag'),'noindex, nofollow');
  const json=await out.json();assert.equal(json.piers.length,9);
  assert.equal(nIce,1);
  assert.equal(nAlerts,9);
  assert.equal(nHourly,8);
  assert.equal(json.piers.every(p=>p.alerts.status==='unavailable'),true);
  assert.equal(json.piers.every(p=>p.ice.pct===null),true);
  assert.equal(json.limitations.waves.includes('not modeled'),true);
  assert.ok(json.piers.every(p=>p.water?.kind==='lakewide-proxy'||p.water?.kind==='Holland-shore'));
 }finally{globalThis.fetch=original;}
});
