'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../public/assets/rocket-foundry-handoff.js'),'utf8');
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const paths={
 california:'/vandenberg-rocket-launch-viewing/',
 florida:'/national-tools/space-coast-launch/',
 texas:'/starbase-rocket-launch-viewing/',
 virginia:'/wallops-rocket-launch-viewing/',
 alaska:'/kodiak-rocket-launch-viewing/',
 hawaii:'/barking-sands-rocket-launch-viewing/'
};
function harness(region,{id=A,withVia=true,stage='access',api=null,analytics=true}={}){
 const listeners={},ga=[],va=[],fetches=[];
 const children=[];
 const main={children,insertBefore(x){children.unshift(x);},
  get firstChild(){return children[0]||null}};
 const links=[{href:'https://chrisizworski.com/national-tools/rocket-launch-live/?region=california#rl-vandenberg'}];
 const doc={
  body:main,querySelector:()=>main,
  querySelectorAll:q=>q==='a[data-vg-planner]'?links:[],
  createElement:tag=>({
   tag,style:{},dataset:{},attrs:{},children:[],textContent:'',
   get firstChild(){return this.children[0]||null;},
   get lastChild(){return this.children[this.children.length-1]||null;},
   setAttribute(k,v){this.attrs[k]=v;},
   append(...nodes){this.children.push(...nodes);}
  }),
  addEventListener(k,cb){(listeners[k]??=[]).push(cb);},
  fire(k,detail){for(const f of listeners[k]||[])f({detail});}
 };
 const url='https://chrisizworski.com'+paths[region]+
  '?launchId='+id+(withVia?'&via=rocket-foundry&stage='+stage:'');
 const win={
  location:{href:url,origin:'https://chrisizworski.com'}
 };
 if(analytics){
  win.gtag=(...args)=>ga.push(args);
  win.va=(...args)=>va.push(args);
 }
 const context={
  window:win,document:doc,URL,URLSearchParams,
  fetch:async q=>{fetches.push(q);return api?api(q):{ok:false,status:404};}
 };
 vm.runInNewContext(code,context,{filename:'rocket-foundry-handoff.js'});
 return {win,doc,links,main,ga,va,fetches};
}
test('regional mission restoration requires exact loaded ID and never trusts URL alone',()=>{
 for(const region of ['texas','virginia','alaska','hawaii']){
  const h=harness(region);
  assert.equal(h.main.children.length,0,region+' emitted success before loaded data');
  assert.equal(h.win.RocketFoundryHandoff.loaded(region,A,'Mission A'),true);
  assert.equal(h.main.children[0].dataset.restoration,'restored');
  assert.match(h.main.children[0].children[1].textContent,/Mission A/);
  assert.equal(h.ga[0][0],'event');
  assert.equal(h.ga[0][1],'rocket_foundry_mission_restored');
  assert.equal(h.ga[0][2].stage,'access');
  assert.equal(h.ga[0][2].destination,'regional_guide');
  const wire=JSON.stringify({ga:h.ga,va:h.va});
  assert.equal(wire.includes(A),false,region+' leaked mission ID');
  assert.equal(wire.includes('Mission A'),false,region+' leaked mission name');
  assert.equal(h.win.RocketFoundryHandoff.loaded(region,A),true,'same mission remains correct');
  assert.equal(h.ga.length,1,'cannot double-count restoration');
 }
});
test('regional A to B to A updates receipt without stale claims or additional conversions',()=>{
 const h=harness('texas');
 assert.equal(h.win.RocketFoundryHandoff.loaded('texas',A,'Mission A'),true);
 assert.equal(h.win.RocketFoundryHandoff.loaded('texas',B,'Mission B'),false);
 assert.equal(h.main.children[0].dataset.restoration,'changed');
 assert.match(h.main.children[0].children[0].textContent,/different regional mission/);
 assert.equal(h.win.RocketFoundryHandoff.loaded('texas',A,'Mission A'),true);
 assert.equal(h.main.children[0].dataset.restoration,'restored');
 assert.match(h.main.children[0].children[0].textContent,/reselected/);
 assert.equal(h.ga.length,1,'returning to original should not mint another handoff');
});
test('removed or changed mission is explained, not a completed restoration',()=>{
 const h=harness('texas');
 assert.equal(h.win.RocketFoundryHandoff.loaded('texas',B,'Fallback B'),false);
 assert.equal(h.main.children[0].dataset.restoration,'unavailable');
 assert.match(h.main.children[0].children[1].textContent,/NEW selection/);
 assert.equal(h.ga[0][1],'rocket_foundry_mission_unavailable');
 assert.equal(h.ga.some(x=>x[1]==='rocket_foundry_mission_restored'),false);
});
test('a wrong region, malformed handoff or direct guide visit cannot report success',()=>{
 const wrong=harness('hawaii');
 assert.equal(wrong.win.RocketFoundryHandoff.loaded('texas',A),false);
 assert.equal(wrong.ga.length,0);
 const direct=harness('alaska',{withVia:false});
 assert.equal(direct.win.RocketFoundryHandoff.loaded('alaska',A),false);
 assert.equal(direct.main.children.length,0);
 const invalid=harness('virginia',{stage:'forged'});
 assert.equal(invalid.win.RocketFoundryHandoff.loaded('virginia',A),false);
 assert.equal(invalid.ga.length,0);
});
test('Florida only reports mission restored after matching loaded roster event',()=>{
 const h=harness('florida');
 h.doc.fire('space-coast:launch-loaded',{selectedLaunchId:A,launches:[{id:B,name:'Other mission'}]});
 assert.equal(h.main.children[0].dataset.restoration,'unavailable');
 assert.equal(h.ga[0][1],'rocket_foundry_mission_unavailable');
 const correct=harness('florida');
 correct.doc.fire('space-coast:launch-loaded',{selectedLaunchId:A,launches:[{id:A,name:'Mission A'}]});
 assert.equal(correct.ga[0][1],'rocket_foundry_mission_restored');
 assert.equal(correct.ga.length,1);
});
test('Vandenberg verifies selected ID via existing national API before preserving return link',async()=>{
 const matching={ok:true,selectedRegion:'california',selectedLaunchId:A,
  selectedLaunch:{id:A,name:'Verified fixture'},regions:[{id:'california',launches:[{id:A}]}]};
 const h=harness('california',{api:async()=>({ok:true,json:async()=>matching})});
 await new Promise(setImmediate);
 assert.equal(h.fetches.length,1);
 assert.match(h.fetches[0],/\/api\/rocket-launch-usa\?region=california&launchId=/);
 assert.equal(h.main.children[0].dataset.restoration,'restored');
 const link=new URL(h.links[0].href,'https://chrisizworski.com');
 assert.equal(link.searchParams.get('launchId'),A);
 const bad=harness('california',{api:async()=>({ok:true,json:async()=>({...matching,selectedLaunchId:B})})});
 await new Promise(setImmediate);
 assert.equal(bad.main.children[0].dataset.restoration,'unavailable');
 assert.equal(new URL(bad.links[0].href).searchParams.has('launchId'),false);
});
test('regional restoration queues its bounded event even before optional analytics loads',()=>{
 const h=harness('hawaii',{analytics:false});
 assert.equal(typeof h.win.va,'function','regional queue must be initialized by receipt');
 assert.equal(h.win.RocketFoundryHandoff.loaded('hawaii',A,'Mission A'),true);
 assert.equal(h.win.vaq.length,1);
 const event=Array.from(h.win.vaq[0]);
 assert.equal(event[0],'event');
 assert.equal(event[1].name,'Rocket Foundry Mission Restored');
 assert.equal(event[1].data.region,'hawaii');
 assert.equal(event[1].data.stage,'access');
 assert.equal(event[1].data.destination,'regional_guide');
 assert.doesNotMatch(JSON.stringify(event),new RegExp(A));
});
test('no-JS navigation remains a static guide without a false mission-success claim',()=>{
 for(const file of Object.values({
  california:'public/vandenberg-rocket-launch-viewing/index.html',
  florida:'public/synced-national-tools/space-coast-launch/index.html',
  texas:'public/starbase-rocket-launch-viewing/index.html',
  virginia:'public/wallops-rocket-launch-viewing/index.html',
  alaska:'public/kodiak-rocket-launch-viewing/index.html',
  hawaii:'public/barking-sands-rocket-launch-viewing/index.html'
 })){
  const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  assert.match(html,/rocket-foundry-handoff\.js/);
  assert.match(html,/<a\b[^>]*href=/);
  assert.doesNotMatch(html,/Mission restored<\/strong>/);
 }
});
