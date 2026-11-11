import test from 'node:test';
import assert from 'node:assert/strict';
import {forecastGridPeriods,forecastFor} from '../api/ice-now.js';

const hour = 3600000, start='2026-11-11T15:00:00.000Z';
const initial=new Date(start);
const grid={
 properties:{
  updateTime:'2026-11-11T15:00:00Z',
  temperature:{uom:'wmoUnit:degC',values:[{validTime:'2026-11-11T15:00:00Z/PT84H',value:-2},{validTime:'2026-11-15T03:00:00Z/PT84H',value:5}]},
  windSpeed:{uom:'wmoUnit:km_h-1',values:[{validTime:'2026-11-11T15:00:00Z/PT168H',value:16}]},
  windDirection:{uom:'wmoUnit:degree_(angle)',values:[{validTime:'2026-11-11T15:00:00Z/PT168H',value:270}]}
 }
};

test('actual NWS validTime intervals become contiguous hourly readings, with correct units',()=>{
 const p=forecastGridPeriods(grid,initial);
 assert.equal(p.length,168);
 assert.equal(p[0].temperature,28.4);
 assert.equal(p[0].windSpeed,'10 mph');
 assert.equal(p[0].windDirection,'W');
 assert.equal(p[84].temperature,41);
 assert.equal(p[84].startTime,'2026-11-15T03:00:00.000Z');
});

test('stale or missing NWS temperature data never produce fabricated forcing',()=>{
 assert.equal(forecastGridPeriods({...grid,properties:{...grid.properties,updateTime:'2026-11-09T00:00:00Z'}},initial).length,0);
 assert.equal(forecastGridPeriods({...grid,properties:{...grid.properties,temperature:{uom:'wmoUnit:degC',values:[]}}},initial).length,0);
 const shorter={...grid,properties:{...grid.properties,temperature:{uom:'wmoUnit:degC',values:[{validTime:'2026-11-11T15:00:00Z/PT12H',value:-2}]}}};
 assert.equal(forecastGridPeriods(shorter,initial).length,12);
});

test('404 from NWS hourly product recovers from official same-location gridpoint, not third-party weather',async()=>{
 const real=globalThis.fetch;
 const reqs=[];
 globalThis.fetch=async (input)=>{
  const url=String(input);reqs.push(url);
  if(url.endsWith('/points/43.76,-83.86'))return new Response(JSON.stringify({properties:{
   forecastHourly:'https://api.weather.gov/gridpoints/DTX/33,97/forecast/hourly',
   forecastGridData:'https://api.weather.gov/gridpoints/DTX/33,97'
  }}),{status:200});
  if(url.endsWith('/gridpoints/DTX/33,97/forecast/hourly'))return new Response('Not Found',{status:404});
  if(url.endsWith('/gridpoints/DTX/33,97'))return new Response(JSON.stringify(grid),{status:200});
  throw Error('Unexpected request '+url);
 };
 try{
  const value=await forecastFor({forecast:[43.76,-83.86]},initial);
  assert.equal(value.dataProduct,'official-nws-grid-fallback');
  assert.equal(value.next24h.freezeHours,24);
  assert.equal(value.next72h.freezeHours,72);
  assert.equal(value.next72h.maxWindMph,10);
  assert.ok(value.issuedAt);
  assert.equal(reqs.length,3);
 }finally{globalThis.fetch=real;}
});

test('unavailable grid data refuses a 72-hour forecast instead of silently returning zeros',async()=>{
 const real=globalThis.fetch;
 globalThis.fetch=async (input)=>{
  const url=String(input);
  if(url.endsWith('/points/43.76,-83.86'))return new Response(JSON.stringify({properties:{
   forecastHourly:'https://api.weather.gov/gridpoints/DTX/33,97/forecast/hourly',
   forecastGridData:'https://api.weather.gov/gridpoints/DTX/33,97'
  }}),{status:200});
  if(url.endsWith('/forecast/hourly'))return new Response('',{status:404});
  return new Response(JSON.stringify({properties:{
   ...grid.properties,temperature:{uom:'wmoUnit:degC',values:[{validTime:'2026-11-11T15:00:00Z/PT12H',value:-2}]}
  }}),{status:200});
 };
 try{assert.equal(await forecastFor({forecast:[43.76,-83.86]},initial),null);}
 finally{globalThis.fetch=real;}
});
