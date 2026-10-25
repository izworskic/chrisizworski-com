'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const m=require('../lib/freighter-layup-season');
const winter='2026-27',empty=m.freshSeason(winter);
const event={vessel:{key:'lee-a-tregurtha',name:'Lee A. Tregurtha'},kind:'arrival',harborId:'superior',date:'2027-01-13',confidence:'reported',summary:'Local harbor report documents arrival for winter layup.',source:{url:'https://www.duluthharborcam.com/2027/01/lee-arrived.html',title:'Layup arrival',publisher:'Duluth Harbor Cam',class:'journalistic_report'}};
test('winter resets on November 1 UTC, never on January 1',()=>{
 assert.equal(m.seasonForDate('2026-10-31T12:00:00Z'),'2025-26');
 assert.equal(m.seasonForDate('2026-11-01T00:00:00Z'),'2025-26');
 assert.equal(m.seasonForDate('2026-11-01T04:00:00Z'),'2026-27');
 assert.equal(m.seasonForDate('2027-01-01T12:00:00Z'),'2026-27');
 assert.equal(m.seasonForDate('2027-10-31T12:00:00Z'),'2026-27');
 assert.equal(m.seasonForDate('2027-11-01T04:00:00Z'),'2027-28');
});
test('reports never appear before their season; duplicate URLs do not multiply arrivals',()=>{
 assert.throws(()=>m.addEvidence(empty,event,'2026-12-25T00:00:00Z'),/Future event/);
 const x=m.addEvidence(empty,event,'2027-01-14T00:00:00Z');assert.equal(x.changed,true);
 assert.equal(m.addEvidence(x.ledger,event,'2027-01-14T00:00:00Z').changed,false);
 assert.equal(m.standings(x.ledger)[0].confidence,'reported');
 assert.equal(m.standings(x.ledger)[0].stage,'laid_up_reported');
});
test('verified source status, departure and rollover are independent',()=>{
 const arrival={...event,confidence:'confirmed',source:{...event.source,class:'port_authority'}};
 const one=m.addEvidence(empty,arrival,'2027-01-15T00:00:00Z').ledger;
 const departed=m.addEvidence(one,{...arrival,kind:'departure',date:'2027-03-24',summary:'Departed winter dock.'},'2027-03-25T00:00:00Z').ledger;
 assert.equal(m.standings(departed)[0].stage,'departed');
 const next=m.rollover(departed,'2027-28');
 assert.equal(next.events.length,0);
 assert.equal(next.previousSeasons[0].events.length,2);
 assert.equal(next.previousSeasons[0].season,'2026-27');
 assert.throws(()=>m.rollover(next,'2026-27'),/backward/);
});
test('stale AIS, missing speed and unknown MMSI never become candidates',()=>{
 const now=Date.parse('2027-01-10T20:00:00Z'),raw={mmsi:'123456789',name:'Sample Vessel',lat:46.73,lon:-92.1,speedKnots:0,seen:'2027-01-10T19:55:00Z'};
 assert.equal(m.aisActivity([raw],now).length,1);
 assert.equal(m.aisActivity([raw],now)[0].signal,'recent_harbor_AIS_only'.replace('recent_harbor_AIS_only','recent_ais_near_harbor_not_layup_confirmation'));
 assert.equal(m.aisActivity([{...raw,seen:'2027-01-10T16:00:00Z'}],now).length,0);
 assert.equal(m.aisActivity([{...raw,lat:41,lon:-75}],now).length,0);
 assert.equal(m.aisActivity([{...raw,speedKnots:null}],now).length,1);
 assert.equal(m.aisActivity([{...raw,speedKnots:null}],now)[0].behavior,'movement_unknown');
});
test('community report cannot become verified by speed; no AIS fields in evidence ledger',()=>{
 const result=m.addEvidence(empty,event,'2027-01-14T00:00:00Z').ledger;
 assert.equal('speedKnots' in result.events[0],false);
 assert.equal(m.standings(result)[0].confidence,'reported');
});

test('November rollover respects America/Detroit midnight and keeps the new winter empty',()=>{
 assert.equal(m.seasonForDate('2026-11-01T03:59:59Z'),'2025-26');
 assert.equal(m.seasonForDate('2026-11-01T04:00:00Z'),'2026-27');
 assert.equal(m.seasonForDate('2027-11-01T03:59:59Z'),'2026-27');
 assert.equal(m.seasonForDate('2027-11-01T04:00:00Z'),'2027-28');
 const a=m.addEvidence(m.freshSeason('2026-27'),{vessel:{key:'sample-vessel',name:'Sample Vessel'},kind:'arrival',harborId:'sarnia',date:'2027-01-15',confidence:'reported',summary:'Dated reporting only.',source:{url:'https://example.org/report',title:'Winter arrival',publisher:'Example',class:'journalistic_report'}},'2027-01-16T12:00:00Z').ledger;
 const b=m.rollover(a,'2027-28');
 assert.equal(b.events.length,0);assert.equal(b.previousSeasons[0].events.length,1);
});

test('out-of-order departure or maintenance needs an established same-winter arrival',()=>{
 const missing={...event,kind:'departure',date:'2027-02-02',summary:'Reported departure'};
 assert.throws(()=>m.addEvidence(empty,missing,'2027-02-03T12:00:00Z'),/requires a dated arrival/);
 const previous=m.addEvidence(empty,event,'2027-01-15T12:00:00Z').ledger;
 assert.equal(m.addEvidence(previous,missing,'2027-02-03T12:00:00Z').changed,true);
});
