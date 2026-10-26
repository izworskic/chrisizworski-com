import test from 'node:test';
import assert from 'node:assert/strict';
import {buildUPHydroCrosswalk} from '../scripts/build-up-waterfall-hydro-crosswalk.mjs';
const f=(name,lat,lng,id,extra={})=>({type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties:{name,'feature id':id,'nhdplusv2 address':{comid:'1388999',reachcode:'0401234567'},'nhdhr address':{reachcode:'987654321'},...extra}});
const g=(...items)=>({features:items.map(([name,lat,lng,gisObjectId])=>({name,lat,lng,gisObjectId}))});
test('links only a single nearby name-matched geographic feature',()=>{
 const r=buildUPHydroCrosswalk({type:'FeatureCollection',features:[f('Bond Falls',46.40994,-89.1325,'bond'),f('Near Wisconsin',45.5,-90.1,'wi'),f('County-only',46.7,-89.5,'county',{county:'Ontonagon'}),f('Foo Rapids',46.41,-89.13,'rapids')]},g(['Bond Falls',46.40992,-89.132584,27]));
 assert.equal(r.matches.length,1);assert.equal(r.matches[0].stateGisObjectId,27);assert.equal(r.matches[0].hydro.nhdComid,'1388999');assert.equal(r.countyOnly.length,1);assert.equal(r.publication,'research-only');assert.match(r.warning,/neither land ownership/);
});
test('two nearby same-name state sites yield an unresolved result, not a link',()=>{
 const r=buildUPHydroCrosswalk({type:'FeatureCollection',features:[f('Upper Falls',46.751,-88.452,'a')]},g(['Upper Falls',46.75,-88.451,91],['Upper Falls',46.752,-88.453,93]));
 assert.equal(r.matches.length,0);assert.ok(r.unresolved.some(x=>x.reason==='multiple-nearby-state-falls'));
});
test('duplicate USGS feature candidates for one state waterfall are held back',()=>{
 const r=buildUPHydroCrosswalk({type:'FeatureCollection',features:[f('Bond Falls',46.40994,-89.1325,'a'),f('Bond Falls',46.41001,-89.1325,'b')]},g(['Bond Falls',46.40992,-89.132584,27]));
 assert.equal(r.matches.length,0);assert.ok(r.unresolved.some(x=>x.reason==='multiple-usgs-records-for-state-site'));
});
test('outside Michigan geographic box is not linked or published',()=>{
 const r=buildUPHydroCrosswalk({type:'FeatureCollection',features:[f('Niagara Falls',43.08,-79.07,'ny')]},g(['Bond Falls',46.40992,-89.132584,27]));
 assert.equal(r.matches.length,0);assert.equal(r.countyOnly.length,0);
});
