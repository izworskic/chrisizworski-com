'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('national composition smoke checks the approved owner runtime at the canonical URL, not a cache-busted substitute',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../scripts/smoke-national-composition.mjs'),'utf8');
 const block=source.slice(source.indexOf("await check('planting canonical page"),source.indexOf("await check('planting page JS"));
 assert.ok(block.includes("request('/national-tools/planting/',{cacheBust:false,noCacheHeader:false})"));
 for(const marker of ['data-planting-ui="v3.4"','id="packet-crop"','id="horizon-grid"','national-planting-page-v3.js?v=20261101-v36'])assert.ok(block.includes(marker),marker);
 assert.ok(!block.includes('20260903-v35'));
 assert.ok(block.includes('throw new Error'));
});
