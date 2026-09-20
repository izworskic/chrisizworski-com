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
