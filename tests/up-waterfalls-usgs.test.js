import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeUSGS} from '../scripts/import-up-usgs-waterfalls.mjs';
test('USGS GeoJSON import never claims public access',()=>{
  const point=(name,lat,lng,extra={})=>({type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties:{fall_name:name,...extra}});
  const x=normalizeUSGS({type:'FeatureCollection',features:[point('One',46.6,-89,{county:'Gogebic',fall_id:44,comid:555}),point('Three Rapids',46.8,-89),point('Elsewhere',44,-89),point('Undetermined',46.9,-88)]});
  assert.equal(x.stats.candidates,2);assert.equal(x.stats.countyVerified,1);assert.equal(x.stats.boundingBoxOnly,1);assert.equal(x.features[0].hydro.nhdComid,555);assert.ok(x.features.every(f=>f.publicAccess==='unknown'&&f.parking==='unknown'&&f.publication==='research-only'));
});
