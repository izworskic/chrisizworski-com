#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {seasonForDate,rollover,validLedger,addEvidence}=require('../../lib/freighter-layup-season');
const {refresh}=require('../../lib/freighter-layup-feeds');
const root=path.resolve(__dirname,'../..');
async function run(){
 const now=new Date().toISOString(),season=seasonForDate(now);
 const file=path.join(root,'public/assets/freighter-layup-live-season.json'),reviewFile=path.join(root,'data/freighter-layup-review.json');
 const prior=fs.readFileSync(file,'utf8'),ledger=JSON.parse(prior);
 if(!validLedger(ledger))throw Error('Current season ledger failed validation');
 const localMonth=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',month:'numeric'}).format(new Date(now)));
 // The winter on the clock is the only live winter. Never pre-seed next
 // November with old ship positions or silently serve a future ledger.
 if(Number(ledger.season.slice(0,4))>Number(season.slice(0,4)))
  throw Error('Future ledger pre-seeded before Detroit winter boundary; reconcile before publishing');
 const current=rollover(ledger,season),scan=localMonth>=11||localMonth<=4;
 const result=scan?await refresh({ledger:current,archive:JSON.parse(fs.readFileSync(path.join(root,'public/assets/freighter-layup-registry.json'),'utf8')),now}):{ledger:current,changed:false,reviews:[],outcomes:[]};

 const editorial=JSON.parse(fs.readFileSync(path.join(root,'data/freighter-layup-editorial.json'),'utf8'));
 if(editorial.schemaVersion!==1||!Array.isArray(editorial.events))throw Error('Invalid editorial evidence list');
 for(const entry of editorial.events){
  if(entry.season!==current.season)continue;
  const e={...entry};delete e.season;
  result.ledger=addEvidence(result.ledger,e,now).ledger;
 }
 const newText=JSON.stringify(result.ledger,null,2)+'\n',changed=newText!==prior;
 const oldReview=fs.existsSync(reviewFile)?JSON.parse(fs.readFileSync(reviewFile,'utf8')):{schemaVersion:1,candidates:[]};
 const suggestions=new Map(oldReview.candidates.map(x=>[x.url,x]));for(const r of result.reviews)suggestions.set(r.url,r);
 const reviewText=JSON.stringify({schemaVersion:1,candidates:[...suggestions.values()].slice(-250)},null,2)+'\n';
 const reviewChanged=!fs.existsSync(reviewFile)||fs.readFileSync(reviewFile,'utf8')!==reviewText;
 const shadowPathArg=process.argv.find(arg=>arg.startsWith('--shadow-input='));
 if(shadowPathArg){
  const shadowFile=shadowPathArg.slice('--shadow-input='.length);
  if(!shadowFile)throw Error('Missing shadow input output path');
  const shadowInput={schemaVersion:1,season:result.ledger.season,
    observations:result.observations||[],sources:result.outcomes};
  fs.writeFileSync(shadowFile,JSON.stringify(shadowInput,null,2)+'\n');
 }
 if(!process.argv.includes('--dry-run')){
  if(changed)fs.writeFileSync(file,newText);
  if(reviewChanged){fs.mkdirSync(path.dirname(reviewFile),{recursive:true});fs.writeFileSync(reviewFile,reviewText)}
 }
 console.log(JSON.stringify({season,scan,changed,reviewChanged,events:result.ledger.events.length,needReview:result.reviews.length,sources:result.outcomes}));
}
if(require.main===module)run().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={run};