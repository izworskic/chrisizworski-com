const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

const detail=JSON.parse(fs.readFileSync(path.join(root,'benchmarks/beach-detail-page-one-ctr.json'),'utf8'));
const statewide=JSON.parse(fs.readFileSync(path.join(root,'benchmarks/beach-conditions-ctr-experiment.json'),'utf8'));
const detailPages=detail.pages.map(p=>({
  cfg:p,
  html:fs.readFileSync(path.join(root,'public',p.path,'index.html'),'utf8')
}));

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

test('protected beach titles and H1s remain frozen during measurement',()=>{
  for(const {cfg,html} of detailPages){
    const expectedTitle=cfg.title.replace(/&/g,'&amp;');
    assert.match(html,new RegExp('<title>'+expectedTitle.replace(/[.*+?^$()|[\]\\]/g,'\\    assert.match(html,new RegExp('<title>'+cfg.title.replace(/[.*+?^$()|[\]\\]/g,'\\$&')+'<\\/title>'));')+'<\\/title>'));
    assert.match(html,new RegExp('<h1[^>]*>'+cfg.h1.replace(/[.*+?^$()|[\]\\]/g,'\\$&')+'<\\/h1>'));
  }
  const rootHtml=fs.readFileSync(path.join(root,'public/great-lakes-beaches/index.html'),'utf8');
  assert.match(rootHtml,/<title>Michigan Beach Conditions Today \| Chris Izworski<\/title>/);
  assert.match(rootHtml,/<h1 id="page-title">Michigan Beach Conditions Today<\/h1>/);
  assert.equal(statewide.measurementDecision.action,'observe-no-rewrite');
});
