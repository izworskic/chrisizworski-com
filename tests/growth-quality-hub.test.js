import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
  GOALS,summarizeGsc,createUnifiedReport,markdownScorecard,buildUnifiedReport
} from '../scripts/growth-quality-hub.mjs';

const fixture = () => ({
  version:1,generatedAt:new Date().toISOString(),siteUrl:GOALS.site,
  windows:{current:{startDate:'2026-09-21',endDate:'2026-10-18'}},
  totals:{current:{impressions:150000,clicks:3600,ctr:0.024,position:8}},
  pages:{
    top:[{page:'https://chrisizworski.com/northern-lights-michigan/',impressions:2500,clicks:20,position:9.2,classification:'EMERGING',potentialClicks:60}],
    ctrOpportunities:[{page:'https://chrisizworski.com/northern-lights-michigan/',impressions:2500,ctr:0.8,position:9.2,potentialClicks:60}]
  }
});
const smallHtml = '<!doctype html><html lang="en"><head>'+
'<meta name="viewport" content="width=device-width,initial-scale=1">'+
'<title>Northern Lights Michigan Tonight: Can You See Them?</title>'+
'<meta name="description" content="Track the aurora tonight in Michigan using live NOAA conditions.">'+
'<link rel="canonical" href="https://chrisizworski.com/northern-lights-michigan/">'+
'<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>'+
'</head><body><main><h1>Michigan Northern Lights</h1>'+
'<p>'+('Check the official conditions and current moon illumination before planning to view the lights. ').repeat(20)+'</p>'+
'<a href="/tools/">All tools</a></main></body></html>';
test('no GSC report is explicitly unavailable, not zero impressions',()=>{
  assert.equal(summarizeGsc(null).status,'UNAVAILABLE');
});
test('uses GSC separate site totals and preserves classifier opportunity estimate',()=>{
  const g=summarizeGsc(fixture());
  assert.equal(g.status,'MEASURED');
  assert.equal(g.totals.impressions,150000);
  assert.equal(g.totals.ctrPct,2.4);
  assert.equal(g.goals.impressionProgressPct,15);
  assert.equal(g.opportunities[0].potentialClicks,60);
});
test('GSC window, property and totals are mandatory',()=>{
  const noTotals=fixture();delete noTotals.totals;
  assert.throws(()=>summarizeGsc(noTotals),/separate property totals/);
  const otherSite=fixture();otherSite.siteUrl='sc-domain:other.com';
  assert.throws(()=>summarizeGsc(otherSite),/property differs/);
  const partial=fixture();partial.windows.current.startDate='2026-10-01';
  assert.throws(()=>summarizeGsc(partial),/28 inclusive days/);
});
test('prevents untruthful clicks/CTR and negative metrics',()=>{
  const bad=fixture();bad.totals.current.clicks=200000;
  assert.throws(()=>summarizeGsc(bad),/exceed impressions/);
  const badCtr=fixture();badCtr.totals.current.ctr=0.9;
  assert.throws(()=>summarizeGsc(badCtr),/does not reconcile/);
});
test('prioritizes technical blocking issues ahead of CTR opportunities',()=>{
  const g=summarizeGsc(fixture());
  const technical={reports:[{name:'Aurora',source:'example',errors:1,warnings:0,issues:[{level:'error',code:'noindex'}],
    measurements:{canonical:'https://chrisizworski.com/northern-lights-michigan/'}}],
    summary:{passed:0,review:0,failed:1}};
  const result=createUnifiedReport({technical,gsc:g});
  assert.equal(result.actionQueue.technicalBlockers[0].priority,'P0');
  assert.equal(result.actionQueue.measuredCtrOpportunities[0].priority,'P0');
  assert.match(result.actionQueue.nextAction,/technical blockers/);
});
test('creates one combined JSON and Markdown scorecard without production builds',async()=>{
  const folder=await mkdtemp(path.join(tmpdir(),'growth-hub-'));
  try {
    await writeFile(path.join(folder,'page.html'),smallHtml);
    await writeFile(path.join(folder,'manifest.json'),JSON.stringify([{name:'Aurora',file:'page.html',canonical:'https://chrisizworski.com/northern-lights-michigan/'}]));
    await writeFile(path.join(folder,'gsc.json'),JSON.stringify(fixture()));
    const {report,exitCode}=await buildUnifiedReport({cwd:folder,manifestPath:'manifest.json',
      gscPath:'gsc.json',outputJson:'scorecard.json',outputMd:'scorecard.md'});
    assert.equal(exitCode,0);
    assert.equal(report.gsc.totals.impressions,150000);
    assert.match(await readFile(path.join(folder,'scorecard.md'),'utf8'),/150,000/);
    const saved=JSON.parse(await readFile(path.join(folder,'scorecard.json'),'utf8'));
    assert.equal(saved.objective.impressions,1000000);
    assert.match(markdownScorecard(report),/Technical first-response audit/);
  } finally {await rm(folder,{force:true,recursive:true});}
});
