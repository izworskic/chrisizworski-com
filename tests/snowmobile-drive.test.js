import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const drive=require('../api/snowmobile-drive.js');

test('snowmobile drive endpoint is fixed to Grayling',()=>{
  assert.equal(drive._test.DESTINATION.label,'Grayling, Michigan');
  assert.equal(drive._test.DESTINATION.lat,44.6614);
  assert.equal(drive._test.DESTINATION.lon,-84.7148);
});

test('snowmobile drive parser accepts valid coordinate and rejects malformed input',()=>{
  assert.deepEqual(drive._test.parsePoint('43.5945,-83.8889'),{lat:43.5945,lon:-83.8889});
  assert.equal(drive._test.parsePoint('Bay City'),null);
  assert.equal(drive._test.parsePoint('91,-83'),null);
});

test('snowmobile routing uses https providers only',()=>{
  assert.ok(drive._test.HOSTS.length>=1);
  assert.ok(drive._test.HOSTS.every(x=>x.base.startsWith('https://')));
});

test('destinationFor resolves a hub for every statewide region and falls back to Grayling for an unknown key',()=>{
  const keys=['eastern-up','keweenaw-copper-country','central-western-up','grayling-gaylord','northeast-sunrise','northwest-michigan','west-michigan'];
  for(const key of keys){
    const dest=drive._test.destinationFor(key,null);
    assert.ok(Number.isFinite(dest.lat)&&Number.isFinite(dest.lon),`${key} destination must have numeric coordinates`);
    assert.ok(dest.label.includes('Michigan'),`${key} destination label should read as a Michigan town`);
  }
  assert.deepEqual(drive._test.destinationFor('not-a-real-region',null),drive._test.DESTINATION);
});

test('destinationFor prefers a live regions list over the static fallback map when both are available',()=>{
  const fakeRegions=[{key:'eastern-up',hubTown:'Testville',hubLat:1,hubLon:2}];
  const dest=drive._test.destinationFor('eastern-up',fakeRegions);
  assert.equal(dest.label,'Testville, Michigan');
  assert.equal(dest.lat,1);
  assert.equal(dest.lon,2);
});
