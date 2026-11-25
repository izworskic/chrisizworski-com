#!/usr/bin/env node
'use strict';
// Offline relevance comparison. No network, HF inference, production writes, or PII.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const finder=require('../public/assets/adventure-intent.js');
const fixture=require('./fixtures/adventure-intent-acceptance.json');
const html=fs.readFileSync(path.join(root,'public/michigan-destinations/index.html'),'utf8');
function clean(input) {
  return String(input||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&')
    .replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
}
function catalogFromHtml(source) {
  const cards=[];
  for(const m of source.matchAll(/<article class="destination" id="([^"]+)"([^>]*)>([\s\S]*?)<\/article>/g)) {
    const body=m[3];
    const title=clean(body.match(/<h3>([\s\S]*?)<\/h3>/)?.[1]);
    const copy=clean(body.match(/<div class="destination-body">([\s\S]*?)<\/div><\/article>/)?.[1]||body.split('<div class="destination-body">')[1]||'');
    cards.push({id:m[1],title,region:m[2].match(/data-region="([^"]+)"/)?.[1]||'',
      tags:(m[2].match(/data-tags="([^"]+)"/)?.[1]||'').split(',').filter(Boolean),
      description:copy});
  }
  if(cards.length!==20||new Set(cards.map(c=>c.id)).size!==20)throw Error('Invalid source catalog '+cards.length);
  return cards;
}
function terms(s) {
  const stop=new Set(('a an and are around at be by can for from go i in into is it my near of on or the to want where with would').split(' '));
  return String(s).toLowerCase().match(/[a-z0-9]+/g)?.filter(w=>w.length>2&&!stop.has(w))
    .map(w=>w.length>4?w.replace(/(ing|ed|es|s)$/,''):w)||[];
}
function legacy(cards,q){
 const words=[...new Set(terms(q))];
 return cards.map(c=>{
  const count=value=>{const t=new Set(terms(value));return words.reduce((n,w)=>n+Number(t.has(w)),0);};
  return {id:c.id,score:5*count(c.title)+3*count(c.tags.join(' '))+2*count(c.region)+count(c.description)};
 }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).map(x=>x.id);
}
function grade(queries,ranker){
 const records=queries.map(item=>{
  const ranked=ranker(item.query);
  const first=ranked.findIndex(x=>item.expected.includes(x));
  return {query:item.query,expected:item.expected,top3:ranked.slice(0,3),
    hit3:item.expected.length?ranked.slice(0,3).some(id=>item.expected.includes(id)):ranked.length===0,
    reciprocalRank:first>=0?1/(first+1):0};
 });
 const positive=records.filter(x=>x.expected.length),negative=records.filter(x=>!x.expected.length);
 const round=n=>Number(n.toFixed(3));
 return {count:records.length,positive:positive.length,noAnswer:negative.length,
   hitAt3:round(positive.filter(x=>x.hit3).length/positive.length),
   mrr:round(positive.reduce((n,x)=>n+x.reciprocalRank,0)/positive.length),
   unsupportedRejection:round(negative.filter(x=>x.hit3).length/negative.length),
   cases:records};
}
function run(){
 const cards=catalogFromHtml(html);
 const ids=new Set(cards.map(c=>c.id));
 for(const x of fixture)if(!x.query||!Array.isArray(x.expected)||x.expected.some(id=>!ids.has(id)))throw Error('Unknown destination in acceptance questions');
 const baseline=grade(fixture,q=>legacy(cards,q));
 const intent=grade(fixture,q=>finder.search(cards,q,{limit:8}).map(x=>x.id));
 const decision=intent.hitAt3>baseline.hitAt3 && intent.mrr>=baseline.mrr && intent.unsupportedRejection>=baseline.unsupportedRejection
    ? 'EXPERIMENT' : 'NEEDS_REVIEW';
 return {status:decision,source:'existing 20 Adventure Finder HTML cards',
   change:'deterministic local phrase matching; no hosted AI',
   baseline, intent,delta:{hitAt3:Number((intent.hitAt3-baseline.hitAt3).toFixed(3)),
     mrr:Number((intent.mrr-baseline.mrr).toFixed(3))},
   caveat:'Editorial acceptance examples, not blind holdout or real visitor performance.'};
}
if(require.main===module){
 try{
  const report=run();
  if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
  else console.log(JSON.stringify({status:report.status,baseline:{hitAt3:report.baseline.hitAt3,mrr:report.baseline.mrr,unsupportedRejection:report.baseline.unsupportedRejection},
    intent:{hitAt3:report.intent.hitAt3,mrr:report.intent.mrr,unsupportedRejection:report.intent.unsupportedRejection},
    failed:report.intent.cases.filter(x=>!x.hit3).map(x=>x.query)},null,2));
  if(process.argv.includes('--check') && report.status!=='EXPERIMENT')process.exitCode=1;
 }catch(e){console.error(e.stack||e);process.exitCode=1}
}
module.exports={catalogFromHtml,legacy,grade,run};
