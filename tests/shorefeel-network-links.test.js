'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {waterEvidenceLink}=require('../lib/shorefeel/network-links.js');
const michigan=require('../data/beaches.json').beaches;
const us=require('../data/shorefeel-us-coast.json').beaches;
const ontario=require('../data/shorefeel-canada-ontario.json').locations;

test('All 96 current beach pages resolve to an approved existing NOAA evidence tool',()=>{
 assert.equal(michigan.length,50);
 assert.equal(us.length,16);
 assert.equal(ontario.length,30);
 const allowed=new Set([
  '/great-lakes-water-temperature/','/lake-michigan-water-temperature/',
  '/lake-huron-water-temperature/saginaw-bay/',
  '/lake-michigan-water-temperature/grand-haven/'
 ]);
 for(const beach of [...michigan,...us,...ontario]){
  const link=waterEvidenceLink(beach);
  assert.ok(allowed.has(link.href),beach.slug+' invalid target');
  assert.ok(link.label&&link.note,beach.slug+' missing evidence context');
  assert.match(link.note,/NOAA|Satellite|satellite/,beach.slug+' scope not specified');
 }
});
test('Differently formatted lake names share a single context route',()=>{
 const a=waterEvidenceLink({slug:'test-mi',lake:'Lake Michigan'});
 const b=waterEvidenceLink({slug:'test-us',lake:'Michigan'});
 assert.equal(a.href,b.href);
 assert.equal(a.href,'/lake-michigan-water-temperature/');
 assert.match(waterEvidenceLink({slug:'test-erie',lake:'Lake Erie'}).label,/Lake Erie/);
});
test('Dedicated nearshore pilots are never replaced with lakewide averages',()=>{
 assert.equal(waterEvidenceLink({slug:'grand-haven-state-park',lake:'Lake Michigan'}).href,
  '/lake-michigan-water-temperature/grand-haven/');
 assert.equal(waterEvidenceLink({slug:'bay-city-state-park',lake:'Lake Huron'}).href,
  '/lake-huron-water-temperature/saginaw-bay/');
});
