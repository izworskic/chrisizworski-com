import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeUSGS} from '../scripts/import-up-usgs-waterfalls.mjs';
test('USGS GeoJSON import never claims public access',()=>{
  const point=(name,lat,lng,extra={})=>({type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties:{fall_name:name,...extra}});
  const x=normalizeUSGS({type:'FeatureCollection',features:[point('One',46.6,-89,{county:'Gogebic',fall_id:44,comid:555}),point('Three Rapids',46.8,-89),point('Elsewhere',44,-89),point('Undetermined',46.9,-88)]});
  assert.equal(x.stats.candidates,2);assert.equal(x.stats.countyVerified,1);assert.equal(x.stats.boundingBoxOnly,1);assert.equal(x.features[0].hydro.nhdComid,555);assert.ok(x.features.every(f=>f.publicAccess==='unknown'&&f.parking==='unknown'&&f.publication==='research-only'));
});

test('Published USGS V2 GeoJSON nesting preserves NHD addresses and stable feature ID',()=>{
  const f={type:'Feature',geometry:{type:'Point',coordinates:[-89.045729,46.74]},properties:{'feature id':'e40ed9f9-test','name':'Source-shaped Falls','fall type':'block','nhdplusv2 address':{'comid':'13617899','measure':'24.07','reachcode':'07130002000165'},'nhdhr address':{'reachcode':'07130002000165','measure':'23.63'},characteristics:[{'tallest drop feet':20}]}};
  const x=normalizeUSGS({type:'FeatureCollection',features:[f]});assert.equal(x.features.length,1);assert.equal(x.features[0].id,'usgs-v2-e40ed9f9-test');assert.equal(x.features[0].hydro.nhdComid,'13617899');assert.equal(x.features[0].hydro.nhdPlusReachCode,'07130002000165');assert.equal(x.features[0].hydro.nhdHrReachCode,'07130002000165');assert.equal(x.features[0].hydro.fallType,'block');assert.equal(x.features[0].hydro.tallestDropFeet,20);assert.equal(x.features[0].geoEvidence,'bounding-box-only');assert.equal(x.features[0].publicAccess,'unknown');
});
