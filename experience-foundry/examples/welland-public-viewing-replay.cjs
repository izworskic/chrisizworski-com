'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const i=process.argv.indexOf('--source-root');
if(i<0||!process.argv[i+1])throw Error('Expected --source-root');
const root=path.resolve(process.argv[i+1]),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('public/welland-canal/index.html'),script=read('public/assets/welland-canal.js');
const enginePath=path.join(root,'public/assets/welland-viewing-intelligence.js');
const hasPanel=html.includes('id="shoreComparison"');
const engine=fs.existsSync(enginePath)?require(enginePath):null;
if(hasPanel&&!engine)throw Error('Comparison panel missing its captured engine');
const T=Date.parse('2026-11-25T15:00:00Z'),M=60000,iso=t=>new Date(t).toISOString();
const a={lat:43.155230,lon:-79.193058},b={lat:43.123446,lon:-79.193895},c={lat:42.899122,lon:-79.246166};
const mid={lat:(a.lat+b.lat)/2,lon:(a.lon+b.lon)/2};
const ship=(id,point,age=2,type=70)=>({mmsi:String(366000000+id),name:'Fixture '+id,...point,seen:iso(T-age*M),shipType:type,speedKnots:3,course:180});
const data=vessels=>({ok:true,checkedAt:iso(T),vessels});
const cases=[],add=(id,passed,observed)=>cases.push({id,passed:Boolean(passed),observed:JSON.stringify(observed)});
function extract(start,end){
 const from=script.indexOf(start),to=script.indexOf(end,from+start.length);
 if(from<0||to<0)throw Error('Captured source boundary absent: '+start);
 return script.slice(from,to);
}
function harness({input=null,now=T,state='available',active='3'}={}){
 const nodes={},choices=['3','7','8'].map(spot=>({dataset:{spot},setAttribute(k,v){this[k]=v;}}));
 function node(id){
  if(!html.includes('id="'+id+'"'))return null;
  return nodes[id]??={textContent:'',hidden:true,href:'',children:[],replaceChildren(){this.children=[];},append(x){this.children.push(x);},querySelectorAll(){return choices;}};
 }
 class FixedDate extends Date{static now(){return now;}}
 const ctx={Date:FixedDate,Intl,URL,window:{},ZONE:'America/Toronto',$:node,viewingIntelligence:engine,comparisonData:input,comparisonChoice:null,aisState:state,activeWatchSpot:active,vesselData:[],el:(tag,text)=>({tag,textContent:text,addEventListener(){}})};
 const common=extract('  const LOCKS = [','  // Photography')+extract('  const WATCH_SPOTS=','  let activeWatchSpot=')+extract('  function when(','  function minutesOld(')+extract('  function distanceKm(','  function nearest(')+extract('  function recentNearSpot(','  function hideLockPreview(');
 vm.createContext(ctx);vm.runInContext(common,ctx,{timeout:5000});
 ctx.renderShoreWatch();
 if(!hasPanel)return {answer:null,detail:null,action:null,plan:node('shoreWatchPlace').textContent,status:node('shoreWatchStatus').textContent,directions:node('shoreWatchDirections').href,official:node('shoreWatchOfficial').href};
 const button=node('shoreComparisonChoose');
 return {answer:node('shoreComparisonAnswer').textContent,detail:node('shoreComparisonDetail').textContent,action:button.hidden?null:button.textContent,plan:node('shoreWatchPlace').textContent,status:node('shoreWatchStatus').textContent,directions:node('shoreWatchDirections').href,official:node('shoreWatchOfficial').href};
}
const one=harness({input:data([ship(1,b),ship(2,a,2,37)])});
add('single-area',/Lock 7 is the only/.test(one.answer||'')&&one.action==='Compare Lock 7'&&/Not an arrival time/.test(one.detail||''),one);
const shared=harness({input:data([ship(3,mid)])}),multiple=harness({input:data([ship(1,a),ship(2,c,2,80)])});
add('shared-and-multiple',/Lock 3, Lock 7/.test(shared.answer||'')&&/shared between overlapping/.test(shared.answer||'')&&/Lock 3, Lock 8/.test(multiple.answer||'')&&/No basis to favor/.test(multiple.answer||'')&&shared.action===null&&multiple.action===null,{shared,multiple});
const old=harness({input:data([ship(1,b,15)]),now:T+1}),stale=harness({input:data([ship(1,b)]),now:T+5*M+1}),failed=harness({input:null,state:'unavailable'});
add('withdraw-on-expiry',/does not mean the canal is empty/.test(old.answer||'')&&/fresh comparison is unavailable/.test(stale.answer||'')&&/fresh comparison is unavailable/.test(failed.answer||'')&&[old,stale,failed].every(x=>x.action===null),{old,stale,failed});
const links=[...html.matchAll(/data-shore-spot-google="([378])" href="([^"]+)"/g)].map(([,id,href])=>({id,url:new URL(href.replaceAll('&amp;','&'))}));
add('public-links',links.length===3&&links.every(x=>x.url.hostname==='www.google.com'&&x.url.pathname==='/maps/search/'&&/[a-z]/i.test(x.url.searchParams.get('query')))&&html.includes('https://www.seaway-greatlakes.com/vessel-transit/order-of-turn'),links.map(x=>({id:x.id,query:x.url.searchParams.get('query')})));
const empty=harness({input:data([])}),offline=harness({input:null,state:'unavailable'});
add('existing-no-report-plan',[empty,offline].every(x=>x.plan.includes('Lock 3')&&x.directions.includes('St+Catharines+Museum')&&x.official.includes('stcatharines.ca'))&&/not proof of an empty canal/.test(empty.status)&&/could not be verified/.test(offline.status),{empty,offline});
console.log(JSON.stringify({cases}));
