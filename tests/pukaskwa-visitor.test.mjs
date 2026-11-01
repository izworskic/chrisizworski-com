import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { recordSuccess, recordFailure } from '../lib/pukaskwa/condition-monitor.mjs';
import { projectPukaskwaFeed, unavailablePukaskwa, torontoDate } from '../lib/pukaskwa/public-status.mjs';
import { suitableOutings, decisionMessage, statusLabel } from '../public/assets/pukaskwa-choice.mjs';
import { SOURCES } from '../lib/pukaskwa/trail-registry.mjs';

const repo=process.cwd();
const read=path=>fs.readFileSync(repo+'/'+path,'utf8');

function snapshot(issued='2026-10-12',bridgeStatus='closed',bridgeIssued='2026-10-22') {
  return {
    schemaVersion:1,park:'pukaskwa',retrievedAt:'2026-10-31T12:00:00.000Z',
    sourceUrl:SOURCES.conditions,collectionMethod:'public-html-table',
    sourceRecords:[
      'Boardwalk Beach Trail','Beach Trail','Southern Headland trail',
      'Manito Miikana Trail','Bimose Kinoomagewnan Trail',
    ].map(name=>({name,status:'open',rawStatus:'Open.',issuedOn:issued,difficulty:'Moderate',comment:issued+': Respect signs'})).concat([{
      name:'White River Suspension Bridge Trail',status:bridgeStatus,
      rawStatus:bridgeStatus==='closed'?'Closed.':'Open.',issuedOn:bridgeIssued,
      difficulty:'Difficult',comment:bridgeIssued+': Respect closures',
    }]),
  };
}
const at='2026-10-31T14:40:00.000Z';
const observe=(obj=snapshot())=>recordSuccess(null,obj,at).feed;

test('published Nov 1 Toronto date is not UTC-date dependent',()=>{
  assert.equal(torontoDate(Date.parse('2026-11-01T03:30:00.000Z')),'2026-10-31');
  assert.equal(torontoDate(Date.parse('2026-11-01T06:30:00.000Z')),'2026-11-01');
});

test('bridge closure excludes hard expedition; older open reports stay stale',()=>{
  const projected=projectPukaskwaFeed(observe(),Date.parse('2026-10-31T15:00:00Z'));
  assert.equal(projected.ok,true);
  assert.equal(projected.dayHikes.find(t=>t.id==='white-river-bridge').status,'closed');
  assert.equal(projected.dayHikes.find(t=>t.id==='southern-headland').status,'stale');
  assert.equal(projected.dayHikes.find(t=>t.id==='hattie-cove-fire-walk').status,'unverified');
  const hard=suitableOutings(projected.dayHikes,{minutes:540,effort:'difficult',vibe:'challenge'});
  assert.equal(hard.matches.some(x=>x.id==='white-river-bridge'),false);
  assert.ok(hard.blocked.some(x=>x.id==='white-river-bridge'));
  assert.match(decisionMessage(hard).lead,/confirmed|official|verify|best/i);
});

test('unknown bridge never recommended even if the monitor failed',()=>{
  const empty=unavailablePukaskwa();
  const hard=suitableOutings(empty.dayHikes,{minutes:540,effort:'difficult',vibe:'challenge'});
  assert.equal(hard.matches.some(x=>x.id==='white-river-bridge'),false);
  assert.equal(statusLabel('source-unverified'),'Current access not confirmed');
  assert.equal(empty.ok,false);
});

test('unhealthy and expired monitor never yield affirmative open reports',()=>{
  const report=observe(snapshot('2026-10-30','open','2026-10-30'));
  const live=projectPukaskwaFeed(report,Date.parse('2026-10-31T15:00:00Z'));
  assert.equal(live.dayHikes.find(t=>t.id==='beach').status,'recently-reported-open');
  const timedOut=projectPukaskwaFeed(report,Date.parse('2026-11-01T12:00:01Z'));
  assert.equal(timedOut.ok,false);
  assert.equal(timedOut.dayHikes.find(t=>t.id==='beach').status,'source-unverified');
  const failed=recordFailure(report,new Error('network down'),'2026-10-31T15:00:00Z').feed;
  const bad=projectPukaskwaFeed(failed,Date.parse('2026-10-31T15:30:00Z'));
  assert.equal(bad.ok,false);
  assert.equal(bad.dayHikes.find(t=>t.id==='beach').status,'source-unverified');
});

test('unverified connecting paths and all backcountry dates are conservative',()=>{
  const report=observe(snapshot('2026-10-30'));
  const page=projectPukaskwaFeed(report,Date.parse('2026-10-31T15:00:00Z'));
  assert.equal(page.dayHikes.find(t=>t.id==='combination-hike').status,'unverified');
  assert.ok(page.backcountry.every(t=>t.status==='out-of-season' || t.status==='closed'));
});

test('visitor guide markup retains no-JS, accessible chooser, author and legitimate photo credits',()=>{
  const html=read('public/pukaskwa-national-park/index.html');
  assert.match(html,/<meta name="robots" content="index,follow,max-image-preview:large">/);
  assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski.com\/pukaskwa-national-park\/">/);
  assert.match(html,/"@id":"https:\/\/chrisizworski.com\/#person"/);
  assert.match(html,/<noscript>/);
  assert.match(html,/<form id="pk-preferences"/);
  assert.match(html,/<a[^>]+href="https:\/\/parks.canada.ca\/pn-np\/on\/pukaskwa\/activ\/experience\/randonnees-hiking\/etat-sentiers-trail-conditions"/);
  assert.match(html,/<script type="module" defer src="\/assets\/pukaskwa-explorer.js/);
  assert.equal((html.match(/class="pk-trail" id="pk-/g)||[]).length,8);
  assert.match(html,/Andre Carrotflower/);
  assert.match(html,/Hirgax/);
  assert.match(html,/CC BY-SA 4.0/);
  assert.doesNotMatch(html,/<iframe[^>]+map/i);
  assert.match(read('public/assets/pukaskwa-explorer.js'),/suitableOutings/);
});

test('API restricts methods and fails closed on source error',async()=>{
  const handler=require('../api/pukaskwa-conditions.js');
  const recorder=()=>({
    headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},
    status(code){this.statusCode=code;return this;},
    json(value){this.data=value;return value;},
  });
  const rejected=recorder();
  await handler({method:'POST',url:'/api/pukaskwa-conditions'},rejected);
  assert.equal(rejected.statusCode,405);
  assert.equal(rejected.headers['x-robots-tag'],'noindex, nofollow');
  const bad=recorder();
  const previous=global.fetch;
  handler._test.reset();
  global.fetch=async()=>{throw new Error('mock network failure')};
  try {
    await handler({method:'GET',url:'/api/pukaskwa-conditions'},bad);
    assert.equal(bad.statusCode,503);
    assert.equal(bad.data.ok,false);
    assert.ok(bad.data.dayHikes.every(t=>t.status==='source-unverified'));
    assert.equal(bad.headers['cache-control'],'no-store');
  } finally {global.fetch=previous;handler._test.reset();}
});
