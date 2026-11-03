'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {locationIdentity,padRule,floridaLaunchNetwork,FACILITIES} =
  require('../lib/rocket-launch-florida-facilities');
const {normalizeLaunch}=require('../lib/space-coast-decision');

function mission(id,locationId,pad='Space Launch Complex 40'){
  return {id,name:'Test mission',net:'2026-11-08T17:00:00Z',
    locationId,pad,location:locationId===27?'Kennedy Space Center':'Cape Canaveral SFS'};
}
const CAPE='11111111-1111-4111-8111-111111111111';
const KENNEDY='22222222-2222-4222-8222-222222222222';

test('location IDs, not similar pad names, distinguish Kennedy from the Cape',()=>{
  assert.equal(locationIdentity(mission(KENNEDY,27,'Space Launch Complex 40')),'kennedy');
  assert.equal(locationIdentity(mission(CAPE,12,'Launch Complex 39A')),'cape');
  assert.equal(locationIdentity(mission(CAPE,42,'Launch Complex 39A')),null);
  assert.equal(locationIdentity({location:'Kennedy Space Center',pad:'LC-39B'}),'kennedy');
  assert.equal(locationIdentity({pad:'SLC-41'}),'cape');
  assert.equal(locationIdentity({pad:'LC-39A'}),'kennedy');
  assert.equal(locationIdentity({pad:'Unknown pad'}),null);
});

test('LL2 normalization keeps actual Florida location ID for shared calendars',()=>{
  const raw={
    id:CAPE,name:'Test',net:'2026-11-08T17:00:00Z',
    status:{name:'Go for Launch'},net_precision:{name:'Minute'},
    pad:{id:94,name:'SLC-40',latitude:'28.56',longitude:'-80.57',
      location:{id:12,name:'Cape Canaveral SFS'}}
  };
  const parsed=normalizeLaunch(raw);
  assert.equal(parsed.locationId,12);
  assert.equal(locationIdentity(parsed),'cape');
  assert.equal(normalizeLaunch({...raw,pad:{name:'Unverified'}}).locationId,null);
});

test('Gantry exclusions are pad-specific and do not confer admission to other pads',()=>{
  for(const pad of ['LC-39A','LC 39B','Launch Complex 39A']){
    const rule=padRule({pad});
    assert.equal(rule.code,'gantry-excluded');
    assert.match(rule.note,/excludes LC-39A and LC-39B/);
  }
  assert.equal(padRule({pad:'SLC-40'}).code,'mission-confirm');
  assert.equal(padRule({pad:'SLC-41'}).code,'mission-confirm');
  assert.equal(padRule({pad:'unknown launch area'}).code,'mission-confirm');
  assert.equal(padRule({pad:null}).code,'pad-unverified');
});

test('facility selector is a bounded mission roster without fake active schedules',()=>{
  const cape=mission(CAPE,12,'SLC-40');
  const kennedy=mission(KENNEDY,27,'LC-39A');
  const network=floridaLaunchNetwork([cape,kennedy],kennedy);
  assert.equal(FACILITIES.length,2);
  assert.equal(network.facilities.find(x=>x.id==='cape').nextLaunchId,CAPE);
  assert.equal(network.facilities.find(x=>x.id==='kennedy').nextLaunchId,KENNEDY);
  assert.equal(network.selected.id,'kennedy');
  assert.equal(network.selected.padRule.code,'gantry-excluded');
  assert.equal(network.unassignedCount,0);
  const none=floridaLaunchNetwork([],null);
  assert.equal(none.selected,null);
  assert.equal(none.facilities.every(x=>x.nextLaunchId===null),true);
  assert.match(none.facilities[0].note,/not proof of no operations/);
});

test('unknown source identity stays unknown, never converted to public access',()=>{
  const unidentified=mission(CAPE,null,null);
  unidentified.location='';
  const network=floridaLaunchNetwork([unidentified],unidentified);
  assert.equal(network.selected.id,'unverified');
  assert.equal(network.selected.padRule.code,'pad-unverified');
  assert.equal(network.unassignedCount,1);
  assert.equal(network.facilities.every(x=>x.countInFeed===0),true);
});

test('Florida and national surfaces contain connected controls and a single canonical owner',()=>{
  const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
  const page=read('public/synced-national-tools/space-coast-launch/index.html');
  const pageJs=read('public/synced-national-tools/space-coast-launch/app.js');
  const national=read('public/synced-national-tools/rocket-launch-live/app.js');
  assert.match(page,/data-fl-facility="kennedy"/);
  assert.match(page,/data-fl-facility="cape"/);
  assert.match(page,/id="fl-national-mission-link"/);
  assert.match(page,/rel="canonical" href="https:\/\/chrisizworski.com\/national-tools\/space-coast-launch\/"/);
  assert.match(pageJs,/renderFacilityNetwork\(d\)/);
  assert.match(pageJs,/space-coast:launch-loaded/);
  assert.match(pageJs,/incoming && UUID_RE.test\(incoming\)/);
  assert.match(national,/floridaSpecialistLink\(s.source,data\)/);
  assert.match(national,/floridaSpecialistLink\(r.specialist\)/);
  assert.match(national,/floridaSpecialistLink\(data.region.specialist,data\)/);
});
