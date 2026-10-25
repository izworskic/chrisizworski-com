import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import handler from '../api/ice-now.js';

const explorer = fs.readFileSync('public/michigan-ice/freeze-up.js','utf8');
const api = fs.readFileSync('api/ice-now.js','utf8');
const lakes = ['superior','michigan','huron','erie','ontario'];

test('five Great Lakes and Tawas Bay are selectable and URL-deep-linkable without duplicate canonical pages',()=>{
  execFileSync(process.execPath,['--check','api/ice-now.js']);
  execFileSync(process.execPath,['--check','public/michigan-ice/freeze-up.js']);
  for(const lake of lakes) {
    assert.match(explorer,new RegExp("'lake-"+lake+"'"));
    assert.match(explorer,new RegExp('option value="lake-'+lake+'"'));
    assert.match(api,new RegExp("'lake-"+lake+"'"));
  }
  assert.match(explorer,/option value="tawas-bay"/);
  assert.match(explorer,/get\('ice-region'\)/);
  assert.match(explorer,/\?ice-region=/);
  assert.match(explorer,/REGIONS\[slug\]\.link \|\| share/);
  assert.match(explorer,/scope === 'lake-overview'/);
  assert.match(explorer,/The reference sector checks chart freshness only/);
  assert.match(api,/scope: 'lake-overview'/);
  assert.match(api,/scope: 'local-bay'/);
  assert.match(explorer,/The date slider synchronizes the GLERL whole-lake percentage and a genuine archived GLERL daily ice map/);
  assert.match(explorer,/Not a safe-ice assessment/);
  assert.doesNotMatch(explorer,/safe to walk on the ice|safe for ice fishing/i);
});

test('Tawas Bay returns independent NOAA polygon sample classifications, not a Lake Huron number',async()=>{
  const prior=globalThis.fetch, time=Date.now();
  const tawasRing=[[-83.68,44.12],[-83.34,44.12],[-83.34,44.35],[-83.68,44.35],[-83.68,44.12]];
  const erieRing=[[-82.80,41.20],[-81.90,41.20],[-81.90,42.12],[-82.80,42.12],[-82.80,41.20]];
  const seen=[];
  globalThis.fetch=async input=>{
    const u=String(input);seen.push(u);
    if(u.includes('usnic_greatlakes_ice_chart')) {
      const isTawas=new URL(u).searchParams.get('geometry')?.startsWith('-83.65,');
      return new Response(JSON.stringify({features:[{
        attributes:{ct:isTawas?'50':'78',idp_filedate:time},
        geometry:{rings:[isTawas?tawasRing:erieRing]}
      }]}),{status:200,headers:{'content-type':'application/json'}});
    }
    if(u.includes('ice.dat')) return new Response('Unavailable',{status:404});
    throw Error('NWS deliberately absent for independent ice test');
  };
  try {
    let response=await handler({url:'https://chrisizworski.com/api/ice-now?region=tawas-bay'});
    assert.equal(response.status,200);
    let d=await response.json();
    assert.equal(Object.keys(d.observed.regions).length,1);
    assert.equal(d.observed.regions['tawas-bay'].scope,'local-bay');
    assert.equal(d.observed.regions['tawas-bay'].name,'Tawas Bay and Tawas Point');
    assert.equal(d.observed.regions['tawas-bay'].samplesMatched,4);
    assert.equal(d.observed.regions['tawas-bay'].available,true);
    assert.equal(d.observed.regions['tawas-bay'].dominantClass,'4/10–6/10 ice');
    assert.equal(d.observed.lakeWide,null);
    assert.match(d.observed.regions['tawas-bay'].limitation,/not measured ice thickness/);
    assert.ok(seen.some(url=>url.includes('ice_chart')));
    response=await handler({url:'https://chrisizworski.com/api/ice-now?region=lake-erie'});
    d=await response.json();
    assert.equal(d.observed.regions['lake-erie'].scope,'lake-overview');
    assert.equal(d.observed.regions['lake-erie'].samplesMatched,3);
    assert.equal(d.observed.regions['lake-erie'].available,true);
    assert.match(d.observed.regions['lake-erie'].method,/NOT a lake-wide geographic sample/);
    assert.match(d.observed.regions['lake-erie'].limitation,/cannot estimate ice coverage lake-wide/);
  }finally{globalThis.fetch=prior;}
});

test('Tawas Bay reports unavailable if its NOAA water samples do not intersect mapped polygons',async()=>{
  const prior=globalThis.fetch;
  globalThis.fetch=async input=>{
    const u=String(input);
    if(u.includes('usnic_greatlakes_ice_chart'))
      return new Response(JSON.stringify({features:[]}),{status:200});
    if(u.includes('ice.dat'))return new Response('Unavailable',{status:404});
    throw Error('NWS omitted');
  };
  try{
    const response=await handler({url:'https://chrisizworski.com/api/ice-now?region=tawas-bay'});
    const d=await response.json();
    assert.equal(d.observed.regions['tawas-bay'].available,false);
    assert.equal(d.observed.regions['tawas-bay'].scope,'local-bay');
    assert.equal(d.observed.regions['tawas-bay'].samplesMatched,0);
    assert.equal(d.observed.regions['tawas-bay'].rangeLabel,undefined);
    assert.match(d.observed.regions['tawas-bay'].limitation,/not evidence of ice-free water/i);
  }finally{globalThis.fetch=prior;}
});
