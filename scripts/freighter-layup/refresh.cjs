#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {seasonForDate,rollover,validLedger}=require('../../lib/freighter-layup-season');
const {refresh}=require('../../lib/freighter-layup-feeds');
const root=path.resolve(__dirname,'../..');
async function run(){
 const now=new Date().toISOString(),season=seasonForDate(now);
 const file=path.join(root,'public/assets/freighter-layup-live-season.json'),reviewFile=path.join(root,'data/freighter-layup-review.json');
 const prior=fs.readFileSync(file,'utf8'),ledger=JSON.parse(prior);
 if(!validLedger(ledger))throw Error('Current season ledger failed validation');
 const m=new Date(now).getUTCMonth()+1;
 const preSeason=m===10&&Number(ledger.season.slice(0,4))===Number(season.slice(0,4))+1&&ledger.events.length===0;
 const current=preSeason?ledger:rollover(ledger,season),scan=m>=11||m<=4;
 const result=scan?await refresh({ledger:current,archive:JSON.parse(fs.readFileSync(path.join(root,'public/assets/freighter-layup-registry.json'),'utf8')),now}):{ledger:current,changed:false,reviews:[],outcomes:[]};
 const newText=JSON.stringify(result.ledger,null,2)+'\n',changed=newText!==prior;
 const oldReview=fs.existsSync(reviewFile)?JSON.parse(fs.readFileSync(reviewFile,'utf8')):{schemaVersion:1,candidates:[]};
 const suggestions=new Map(oldReview.candidates.map(x=>[x.url,x]));for(const r of result.reviews)suggestions.set(r.url,r);
 const reviewText=JSON.stringify({schemaVersion:1,candidates:[...suggestions.values()].slice(-250)},null,2)+'\n';
 const reviewChanged=!fs.existsSync(reviewFile)||fs.readFileSync(reviewFile,'utf8')!==reviewText;
 if(!process.argv.includes('--dry-run')){
  if(changed)fs.writeFileSync(file,newText);
  if(reviewChanged){fs.mkdirSync(path.dirname(reviewFile),{recursive:true});fs.writeFileSync(reviewFile,reviewText)}
 }
 console.log(JSON.stringify({season,scan,changed,reviewChanged,events:result.ledger.events.length,needReview:result.reviews.length,sources:result.outcomes}));
}
if(require.main===module)run().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={run};