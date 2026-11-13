'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../public/synced-national-tools/assets/launch-truth-desk.js'),'utf8');
const UUID='ef9850ad-1096-425b-9d27-f7bbd186e61a';
const BEFORE='2026-11-13T17:54:00Z',AFTER='2026-11-14T17:32:30Z';
const report=()=>({
  ok:true,selectedLaunchId:UUID,status:'recent',net:AFTER,netPrecision:'second',
  observedAt:'2026-11-13T16:38:42Z',headline:'The published launch target has changed',
  timeline:[{kind:'schedule-field-change',field:'target-time',before:BEFORE,after:AFTER,
    detectedAt:'2026-11-13T15:08:42Z',sourceUrl:'https://ll.thespacedevs.com/2.3.0/launches/'+UUID+'/'}],
  updates:[{kind:'ll2-contributor-update',publishedAt:'2026-11-13T14:46:00Z',
    summary:'Delayed to November 14 due to gaseous nitrogen supply issue.',
    sourceUrl:'https://x.com/ulalaunch/status/2121252131172671506'}]
});
function harness(){
  const listeners=new Map();
  function element(tag){
    return {tagName:tag,children:[],dataset:{},hidden:false,textContent:'',className:'',
      replaceChildren(...items){this.children=items;},
      appendChild(item){this.children.push(item);}};
  }
  const desk=element('div'),notice=element('aside');
  let response=report();
  const document={
    getElementById(id){return id==='launch-truth-desk'?desk:id==='rl-launch-change-alert'?notice:null;},
    createElement:element,
    addEventListener(type,callback){listeners.set(type,callback);}
  };
  const context={document,URL,Date,Intl,AbortSignal,encodeURIComponent,
    fetch:async()=>({ok:true,json:async()=>response})};
  vm.runInNewContext(code,context,{timeout:3000});
  const select=async(detail={launchId:UUID,net:AFTER,timezone:'America/New_York'})=>{
    listeners.get('rocket-truth:mission-selected')({detail});
    await new Promise(resolve=>setImmediate(resolve));
  };
  const textOf=node=>(node.textContent||'')+' '+node.children.map(textOf).join(' ');
  return {notice,desk,select,text:()=>textOf(notice),
    setResponse(value){response=value;}};
}
test('recent schedule shift shows old/new times, cited report and clearance warning',async()=>{
  const h=harness();await h.select();
  assert.equal(h.notice.hidden,false);
  assert.match(h.text(),/This launch has moved/);
  assert.match(h.text(),/Nov 13, 2026/);
  assert.match(h.text(),/Nov 14, 2026/);
  assert.match(h.text(),/gaseous nitrogen supply issue/);
  assert.match(h.text(),/A calendar change does not confirm liftoff or public access/);
  const links=h.notice.children.filter(x=>x.tagName==='a').map(x=>x.href);
  assert.equal(links.length,2);
  assert(links.every(x=>x.startsWith('https://')));
});
test('stale or mismatched mission evidence never shows a confident alert',async()=>{
  const h=harness();
  await h.select();assert.equal(h.notice.hidden,false);
  h.setResponse({...report(),status:'stale'});
  await h.select();assert.equal(h.notice.hidden,true);
  h.setResponse(report());
  await h.select({launchId:UUID,net:'2026-11-15T17:32:30Z',timezone:'America/New_York'});
  assert.equal(h.notice.hidden,true);
  await h.select({launchId:null});
  assert.equal(h.notice.hidden,true);
});
test('unrelated contributor notes are not mistaken for a change explanation',async()=>{
  const h=harness(),data=report();
  data.updates[0].publishedAt='2026-09-01T12:00:00Z';
  h.setResponse(data);await h.select();
  assert.equal(h.notice.hidden,false);
  assert.doesNotMatch(h.text(),/gaseous nitrogen supply issue/);
  assert.match(h.text(),/See the updated calendar/);
});
