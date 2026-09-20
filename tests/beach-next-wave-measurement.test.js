const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

const detail=JSON.parse(fs.readFileSync(path.join(root,'benchmarks/beach-detail-page-one-ctr.json'),'utf8'));
const statewide=JSON.parse(fs.readFileSync(path.join(root,'benchmarks/beach-conditions-ctr-experiment.json'),'utf8'));

test('latest beach detail measurement improves the cluster without reopening the search treatment',()=>{
  assert.equal(detail.latestObserved.aggregate.impressions,363);
  assert.equal(detail.latestObserved.aggregate.clicks,3);
  assert.ok(detail.latestObserved.aggregate.ctr>detail.aggregateBaseline.ctr);
  assert.ok(detail.latestObserved.aggregate.weightedAveragePosition<detail.aggregateBaseline.weightedAveragePosition);
  assert.equal(detail.measurementDecision.action,'observe-no-rewrite');
  assert.deepEqual(detail.measurementDecision.nextOutliers,[
    '/great-lakes-beaches/warren-dunes-state-park/',
    '/great-lakes-beaches/pj-hoffmaster-state-park/'
  ]);
});

test('New Buffalo clears target while Warren Dunes and Hoffmaster remain measured outliers',()=>{
  const byPath=new Map(detail.latestObserved.pages.map(p=>[p.path,p]));
  assert.ok(byPath.get('/great-lakes-beaches/new-buffalo-beach/').ctr>=detail.measurement.targetAggregateCtr);
  assert.equal(byPath.get('/great-lakes-beaches/warren-dunes-state-park/').clicks,0);
  assert.equal(byPath.get('/great-lakes-beaches/pj-hoffmaster-state-park/').clicks,1);
});

test('measurement decision preserves the existing beach search freeze',()=>{
  for(const field of ['title','metaDescription','h1','firstAnswer','structuredData','canonical','indexability']){
    assert.ok(detail.freeze.includes(field),field);
  }
  assert.equal(statewide.measurementDecision.action,'observe-no-rewrite');
  assert.match(detail.measurementDecision.reason,/summer beach demand is rolling off/i);
});
