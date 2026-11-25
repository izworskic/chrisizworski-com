'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {evaluate,DATES,CONFIRM_DATES,STATIONS}=require('../scripts/shorefeel-forecast-reliability.cjs');
function fixture(dates=DATES){
 const cycles=dates.map(day=>({pairs:STATIONS.flatMap(station=>[24,48].map(leadHours=>({station,cycleAt:day+'T00:00:00+00:00',leadHours,reason:'missing observation'})))}));
 const cohort=cycles.flatMap(c=>c.pairs.map(({station,cycleAt,leadHours})=>({station,cycleAt,leadHours})));
 return {status:'FROZEN_WARM_SEASON_RELIABILITY_REVIEW_ONLY',canPromoteModel:false,cycles,cohort};
}
test('fixed candidates share identical observed rows, no missing-as-zero',()=>{
 const d=fixture(),p=d.cycles[0].pairs[0];delete p.reason;
 Object.assign(p,{baselineC:20,actualC:20,modelBaseC:20,modelValidC:18,modelChangeErrorF:-3.6,persistenceErrorF:0});
 const a=evaluate(d);assert.equal(a.canPromoteModel,false);
 assert.equal(a.leads[24].expected,80);assert.equal(a.leads[24].matched,1);
 assert.equal(a.leads[24].methods.persistence.maeF,0);
 assert.equal(a.leads[24].methods.conservative.maeF,.9);
 assert.equal(a.leads[24].methods.equalBlend.maeF,1.8);
 assert.equal(a.leads[24].methods.original.maeF,3.6);
 assert.equal(a.leads[48].methods.original.maeF,null);
});
test('reject modified cohort, repeated slots, mismatched arithmetic and promoted data',()=>{
 const a=fixture();a.cycles[0].pairs.pop();assert.throws(()=>evaluate(a),/Incomplete/);
 const b=fixture();b.cycles[0].pairs.push(b.cycles[0].pairs[0]);assert.throws(()=>evaluate(b),/duplicate/);
 const c=fixture();c.canPromoteModel=true;assert.throws(()=>evaluate(c),/Wrong/);
 const d=fixture();const p=d.cycles[0].pairs[0];delete p.reason;Object.assign(p,{baselineC:20,actualC:20,modelBaseC:20,modelValidC:18,modelChangeErrorF:0,persistenceErrorF:0});assert.throws(()=>evaluate(d),/Inconsistent/);
});

test('confirmation freezes horizon-specific candidates and fails missing coverage',()=>{
 const d=fixture(CONFIRM_DATES);d.status='FROZEN_HORIZON_RELIABILITY_CONFIRMATION_ONLY';
 const r=evaluate(d);assert.equal(r.leads[24].expected,100);assert.equal(r.leads[48].expected,100);
 assert.equal(r.leads[24].confirmation.weight,.25);assert.equal(r.leads[48].confirmation.weight,1);
 assert.equal(r.leads[24].confirmation.passesResearchGates,false);assert.equal(r.leads[48].confirmation.passesResearchGates,false);
 assert.equal(r.canPromoteModel,false);
});
test('preserved eight-date review reproduces from exact source bytes',()=>{
 const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
 const raw=fs.readFileSync(path.join(__dirname,'../data/shorefeel/reliability-cohort-actual-20261125.json'));
 const archived=require('../data/shorefeel/reliability-review-actual-20261125.json');
 const actual={...evaluate(JSON.parse(raw)),sourceSha256:crypto.createHash('sha256').update(raw).digest('hex')};
 assert.deepEqual(actual,archived);
});

test('preserved ten-date confirmation reproduces exactly and remains blocked by exact coverage',()=>{
 const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
 const raw=fs.readFileSync(path.join(__dirname,'../data/shorefeel/horizon-confirm-cohort-actual-20261125.json'));
 const archived=require('../data/shorefeel/horizon-confirm-review-actual-20261125.json');
 const actual={...evaluate(JSON.parse(raw)),sourceSha256:crypto.createHash('sha256').update(raw).digest('hex')};
 assert.deepEqual(actual,archived);
 for(const [h,matched] of [[24,72],[48,69]]){
  const lead=actual.leads[h];assert.equal(lead.expected,100);assert.equal(lead.matched,matched);
  assert.equal(lead.confirmation.gates.exactCoverage,false);
  for(const gate of ['allTenBlocks','maeBeatsPersistence','maeNoWorseThanOriginal','p90NoWorseThanBoth'])assert.equal(lead.confirmation.gates[gate],true);
  assert.equal(lead.confirmation.passesResearchGates,false);
 }
 assert.equal(actual.canPromoteModel,false);
});
test('recovered near-time rows do not turn into exact matches or authorization',()=>{
 const d=require('../data/shorefeel/reliability-near-time-actual-20261125.json');
 const review=require('../data/shorefeel/reliability-review-actual-20261125.json');
 assert.equal(d.sourceDatasetSha256,review.sourceSha256);
 assert.equal(d.originalCohortSha256,review.cohortSha256);
 assert.equal(d.maximumOffsetMinutes,15);assert.equal(d.canPromoteModel,false);
 for(const [h,n] of [[24,54],[48,51]]){
  const m=d.metrics[h];assert.equal(m.originalExact,n);assert.equal(m.newNearTime,16);
  assert.equal(m.originalExact+m.newNearTime+m.remainingMissing,m.expected);
  assert.equal(m.originalExact,review.leads[h].matched);
 }
});

test('confirmation missingness audit accounts for every slot without promoting near-time candidates',()=>{
 const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
 const raw=fs.readFileSync(path.join(__dirname,'../data/shorefeel/horizon-confirm-cohort-actual-20261125.json'));
 const src=JSON.parse(raw),a=require('../data/shorefeel/horizon-confirm-coverage-audit-20261125.json');
 assert.equal(a.sourceDatasetSha256,crypto.createHash('sha256').update(raw).digest('hex'));
 assert.equal(a.sourceCohortSha256,src.cohortSha256);assert.equal(a.canPromoteModel,false);
 assert.equal(a.maximumNearTimeMinutes,15);
 const rows=src.cycles.flatMap(c=>c.pairs);
 const count=ps=>{
  const exact=ps.filter(p=>!p.reason).length;
  const potentialNearTime=ps.filter(p=>p.reason==='missing exact-hour independent observation'&&Number.isFinite(p.baselineGapMinutes)&&Number.isFinite(p.outcomeGapMinutes)&&p.baselineGapMinutes<=15&&p.outcomeGapMinutes<=15).length;
  return {expected:ps.length,exact,potentialNearTime,otherMissing:ps.length-exact-potentialNearTime};
 };
 for(const h of [24,48]){
  const lead=rows.filter(p=>p.leadHours===h);
  assert.deepEqual(a.leads[h],count(lead));
  for(const station of STATIONS)assert.deepEqual(a.stations[station][h],count(lead.filter(p=>p.station===station)));
  for(const day of CONFIRM_DATES)assert.deepEqual(a.dates[day][h],count(lead.filter(p=>p.cycleAt.startsWith(day))));
  assert.equal(a.stations['45210'][h].exact,0);assert.equal(a.stations['45210'][h].potentialNearTime,10);
 }
 assert.equal(a.stationProvenance['45210'].receiptTimesAuthenticated,false);
 assert.equal(a.stationProvenance['45210'].temperatureSensorDepthM,null);
 assert.equal(a.stationProvenance['45214'].receiptTimesAuthenticated,false);
});

test('completed confirmation recovery preserves all 35 near-time pairs without changing exact coverage',()=>{
 const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
 const raw=fs.readFileSync(path.join(__dirname,'../data/shorefeel/horizon-confirm-cohort-actual-20261125.json'));
 const d=JSON.parse(raw),r=require('../data/shorefeel/horizon-confirm-near-time-actual-20261125.json');
 const k=p=>[p.station,p.cycleAt,p.leadHours].join('|');
 assert.equal(r.sourceDatasetSha256,crypto.createHash('sha256').update(raw).digest('hex'));
 assert.equal(r.originalCohortSha256,d.cohortSha256);assert.equal(r.canPromoteModel,false);
 const missing=new Set(d.cycles.flatMap(c=>c.pairs).filter(p=>p.reason).map(k));
 const all=[...r.recovered,...r.unresolved].map(k);
 assert.equal(r.recovered.length,35);assert.equal(r.unresolved.length,24);
 assert.equal(new Set(all).size,59);assert.deepEqual(all.sort(),[...missing].sort());
 assert.equal(r.exactObservationRevisionChecks.length,0);
 for(const x of r.recovered){
  assert.ok(x.baselineOffsetMinutes>=-15&&x.baselineOffsetMinutes<=0);
  assert.ok(Math.abs(x.targetOffsetMinutes)<=15);
  assert.match(x.baselineSha256,/^[a-f0-9]{64}$/);assert.match(x.targetSha256,/^[a-f0-9]{64}$/);
 }
 for(const [h,exact,near] of [[24,72,18],[48,69,17]]){
  assert.equal(r.metrics[h].originalExact,exact);assert.equal(r.metrics[h].newNearTime,near);
  assert.equal(evaluate(d).leads[h].confirmation.gates.exactCoverage,false);
 }
});

test('provider archives do not supply new exact pairs or duplicate independent evidence',()=>{
 const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
 const read=n=>fs.readFileSync(path.join(__dirname,'../data/shorefeel/'+n+'-actual-20261125.json'));
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
 const d=JSON.parse(read('provider-reconciliation'));
 assert.equal(d.sourceDatasetSha256,sha(read('horizon-confirm-cohort')));
 assert.equal(d.recoverySha256,sha(read('horizon-confirm-near-time')));
 assert.equal(d.canPromoteModel,false);
 assert.deepEqual(Object.keys(d.sources).sort(),['cdip269','glos45210','glos45214']);
 for(const [name,n] of [['cdip269',10964],['glos45210',2585],['glos45214',1652]]){
  const s=d.sources[name];assert.equal(s.status,'parsed');assert.equal(s.counts.rows,n);
  assert.equal(s.slots.length,20);assert.equal(s.exactCandidatePairs,0);
  assert.equal(s.slots.filter(x=>x.exactBaseline&&x.exactTarget).length,0);
  assert.match(s.source.sha256,/^[a-f0-9]{64}$/);
 }
 assert.equal(d.sources.cdip269.station,d.sources.glos45210.station);
 assert.equal(d.sources.cdip269.counts.conflictingTimestamps,2741);
});

test('June preflight failure is preserved and does not authorize forecast acquisition',()=>{
 const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
 const dir=path.join(__dirname,'../data/shorefeel');
 const raw=fs.readFileSync(path.join(dir,'horizon-confirm-coverage-audit-20261125.json'));
 const d=require('../data/shorefeel/june-coverage-preflight-actual-20261125.json');
 assert.equal(d.priorAuditSha256,crypto.createHash('sha256').update(raw).digest('hex'));
 assert.equal(d.canAcquireFixedPrimaryForecastCohort,false);assert.equal(d.canPromoteModel,false);
 assert.equal(d.slots.length,200);
 assert.equal(new Set(d.slots.map(x=>[x.station,x.cycleAt,x.leadHours].join('|'))).size,200);
 for(const h of [24,48]){
  const rows=d.slots.filter(x=>x.leadHours===h&&x.stratum==='primary');
  assert.equal(rows.length,80);assert.equal(rows.filter(x=>x.exactPairPresent).length,62);
  assert.equal(d.metrics[h].primary.passesFeasibility,false);
  assert.equal(d.metrics[h].primary.dateBlocks,10);
  assert.equal(rows.filter(x=>x.station==='45024'&&x.exactPairPresent).length,0);
  assert.equal(rows.filter(x=>x.station==='45026'&&x.exactPairPresent).length,5);
 }
});

test('separate-year acquisition retains failed observation gate and no model evaluation',()=>{
 const d=require('../data/shorefeel/separate-year-validation-actual-20261125.json');
 assert.equal(d.slots.length,200);
 assert.equal(new Set(d.slots.map(p=>[p.station,p.cycleAt,p.leadHours].join('|'))).size,200);
 assert.equal(d.observationGate,false);assert.equal(d.modelAcquisitionAllowed,false);
 assert.equal(d.modelProbes.length,0);assert.equal(d.cycles.length,0);assert.equal(d.scores,null);
 assert.equal(d.canPromoteModel,false);
 for(const [h,n] of [[24,55],[48,56]]){
  const rows=d.slots.filter(p=>p.leadHours===h&&p.stratum==='primary');
  assert.equal(rows.length,80);assert.equal(rows.filter(p=>p.exactPairPresent).length,n);
  assert.equal(d.metrics[h].primary.passes,false);
 }
});
test('failure-mode evidence reproduces and cannot qualify or train a candidate',()=>{
 const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
 const raw=fs.readFileSync(path.join(__dirname,'../data/shorefeel/horizon-confirm-cohort-actual-20261125.json'));
 const {diagnose}=require('../scripts/shorefeel-failure-mode-diagnostic.cjs');
 const a={...diagnose(JSON.parse(raw)),sourceSha256:crypto.createHash('sha256').update(raw).digest('hex')};
 assert.deepEqual(a,require('../data/shorefeel/failure-mode-diagnostic-actual-20261125.json'));
 assert.equal(a.canPromoteModel,false);
 for(const [h,n] of [[24,72],[48,69]]){
  const l=a.leads[h];
  assert.equal(l.matched,n);assert.equal(l.exactCoveragePassed,false);
  assert.equal(l.stations.reduce((s,x)=>s+x.expected,0),100);
  assert.equal(l.observedChangeMagnitude.reduce((s,x)=>s+x.n,0),n);
  assert.equal(l.leaveOneStationOut.length,10);assert.equal(l.leaveOneDateOut.length,10);
 }
 assert.ok(a.leads[48].observedChangeMagnitude[0].deltaMaeF>0);
 assert.ok(a.leads[48].observedChangeMagnitude[2].deltaMaeF<0);
});

test('decision-time model regimes reproduce without using realized temperature to assign bands',()=>{
 const {analyze}=require('../scripts/shorefeel-decision-time-regime.cjs');
 const expected=require('../data/shorefeel/decision-time-regime-actual-20261125.json');
 const sources={review:require('../data/shorefeel/reliability-cohort-actual-20261125.json'),confirmation:require('../data/shorefeel/horizon-confirm-cohort-actual-20261125.json')};
 for(const [name,source] of Object.entries(sources)){
  const r=analyze(source);assert.deepEqual(r,expected.cohorts[name]);assert.equal(r.canPromoteModel,false);
  for(const h of [24,48]){
   const l=r.leads[h];assert.equal(l.featureAvailable,l.expected);
   assert.equal(l.bands.reduce((s,b)=>s+b.scored,0),l.scored);
   assert.equal(l.bands.reduce((s,b)=>s+b.featureAvailable,0),l.featureAvailable);
   assert.equal(l.exactCoveragePassed,false);
  }
  const changed=structuredClone(source);
  for(const c of changed.cycles)for(const p of c.pairs)if(!p.reason){
   p.actualC=p.baselineC;p.persistenceErrorF=0;p.modelChangeErrorF=(p.modelValidC-p.modelBaseC)*1.8;
  }
  const altered=analyze(changed);
  for(const h of [24,48])assert.deepEqual(altered.leads[h].bands.map(b=>[b.band,b.featureAvailable,b.scored]),r.leads[h].bands.map(b=>[b.band,b.featureAvailable,b.scored]));
  const late=structuredClone(source);late.cycles[0].models[4].lastModified='2027-01-01T00:00:00Z';
  const blocked=analyze(late);
  for(const h of [24,48])assert.equal(blocked.leads[h].featureAvailable,r.leads[h].featureAvailable-10);
 }
 assert.equal(expected.cohorts.review.leads[48].largeChange.TP,9);
 assert.equal(expected.cohorts.confirmation.leads[48].largeChange.FP,6);
 assert.equal(expected.canPromoteModel,false);
});
