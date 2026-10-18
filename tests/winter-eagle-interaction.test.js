'use strict';
// Executes the actual production scripts in a DOM-like VM. The previous release passed
// static tests while throwing ReferenceError: markers is not defined on first pick().
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'../public/winter-eagle-watching');
function makeBrowser(){
 const nodes=new Map();
 class E {
  constructor(tag='div'){
   this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.listeners={};this.className='';
   this.style={setProperty(){}};this.textContent='';this.value='all';this.checked=false;
   this.clientWidth=650;this.clientHeight=420;this.hidden=false;this.disabled=false;
   this.classList={
    add:(c)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),c])].join(' ')},
    remove:(c)=>{this.className=this.className.split(/\s+/).filter(x=>x!==c).join(' ')},
    toggle:(c,force)=>{const active=this.className.split(/\s+/).includes(c),on=force===undefined?!active:!!force;this.classList[on?'add':'remove'](c);return on},
    contains:(c)=>this.className.split(/\s+/).includes(c)
   };
  }
  append(...kids){this.children.push(...kids);kids.forEach(x=>{if(x&&typeof x==='object')x.parentNode=this})}
  replaceChildren(...kids){this.children=[];this.append(...kids)}
  setAttribute(k,v){this.attrs[k]=String(v)}
  getAttribute(k){return this.attrs[k]??null}
  addEventListener(ev,fn){(this.listeners[ev]??=[]).push(fn)}
  click(){(this.listeners.click||[]).forEach(f=>f({target:this}))}
  dispatch(ev){(this.listeners[ev]||[]).forEach(f=>f({target:this}))}
  closest(){return null}
  querySelectorAll(selector){
   const out=[];const cls=selector.match(/\.([a-z-]+)/g)?.map(x=>x.slice(1))||[];
   const go=x=>{for(const child of x.children){if(cls.length&&cls.every(c=>child.classList?.contains(c)))out.push(child);go(child)}};
   go(this);return out
  }
  querySelector(selector){return this.querySelectorAll(selector)[0]||null}
 }
 const document={
  getElementById(id){if(!nodes.has(id))nodes.set(id,new E('div'));return nodes.get(id)},
  querySelectorAll(sel){if(sel==='#map .native-pin')return document.getElementById('map').querySelectorAll('.native-pin');return []},
  createElement:tag=>new E(tag),createElementNS:(_ns,tag)=>new E(tag)
 };
 const now=Date.now();
 const periods=Array.from({length:155},(_,i)=>({startTime:new Date(now+i*3600000).toISOString(),temperature:i%24<14?29:40,temperatureUnit:'F',windSpeed:'7 mph',windDirection:'NW',shortForecast:'Partly Cloudy'}));
 const fetch=async(url)=>{
   if(String(url).includes('/points/'))return {ok:true,json:async()=>({properties:{timeZone:'America/Detroit',forecastHourly:'https://api.weather.gov/gridpoints/DTX/12,13/forecast/hourly'}})};
   if(String(url).includes('/forecast/hourly'))return {ok:true,json:async()=>({properties:{updated:new Date(now).toISOString(),periods}})};
   return {ok:false,status:404,json:async()=>({})};
 };
 const window={addEventListener(){},EaglePlanning:undefined};
 const sandbox={document,window,fetch,location:{hash:''},history:{replaceState(){}},
   localStorage:{getItem(){return null},setItem(){}},navigator:{},Intl,Date,Math,Number,Set,Map,Array,Promise,
   console,setTimeout,clearTimeout};
 vm.runInNewContext(fs.readFileSync(path.join(dir,'planning.js'),'utf8'),sandbox,{filename:'planning.js'});
 vm.runInNewContext(fs.readFileSync(path.join(dir,'app.js'),'utf8'),sandbox,{filename:'app.js'});
 return {document,window,fetch,periods};
}
test('real production JS initializes interactive map and location list without ReferenceError',()=>{
 const {document}=makeBrowser(),node=id=>document.getElementById(id);
 assert.equal(node('spot-list').children.length,11);
 assert.equal(node('map').querySelectorAll('.native-pin').length,11);
 assert.equal(node('annual-calendar').children.length,12);
 assert.match(node('selected-place').textContent,/Detroit/);
 assert.match(node('map').children.at(-1).children[0].textContent,/Detroit/);
 // This used to throw ReferenceError (obsolete Leaflet markers array).
 const croton=node('map').querySelectorAll('.native-pin').find(x=>x.dataset.spot==='croton');
 croton.click();
 assert.match(node('selected-place').textContent,/Croton Dam/);
 assert.equal(croton.getAttribute('aria-pressed'),'true');
 assert.match(node('map').children.at(-1).children[0].textContent,/Croton Dam/);
 node('state-filter').value='MI';node('state-filter').dispatch('change');
 assert.equal(node('spot-list').children.length,3);
 assert.equal(node('map').querySelectorAll('.native-pin').filter(x=>!x.hidden).length,3);
 node('state-filter').value='all';node('state-filter').dispatch('change');
 assert.equal(node('spot-list').children.length,11);
});
test('monthly gathering and cartwheel modes remain distinct and are clickable',()=>{
 const {document}=makeBrowser(),node=id=>document.getElementById(id);
 node('mode-display').click();
 assert.equal(node('mode-display').getAttribute('aria-pressed'),'true');
 assert.match(node('behavior-guide').textContent,/nest/i);
 node('annual-calendar').children[2].click();
 assert.match(node('season-month').textContent,/Mar/);
 node('mode-gather').click();
 assert.equal(node('mode-gather').getAttribute('aria-pressed'),'true');
 assert.match(node('season-explainer').textContent,/open water/i);
});
test('7-day NWS planner is derived from actual hourly air forecasts, never synthetic wildlife predictions',async()=>{
 const {document}=makeBrowser(),node=id=>document.getElementById(id);
 // Allow the two async API fetches and DOM updates to settle.
 for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r));
 const cards=node('weekly-day-cards').children;
 assert.ok(cards.length>=6&&cards.length<=7,'expected real hourly forecast day aggregation');
 assert.match(node('setup-explanation').textContent,/Open water|Cold air|ice|roosts/i);
 assert.ok(!/\d+% eagle|% chance of eagle/i.test(cards.map(x=>x.textContent).join(' ')));
});
test('season engine has no display-probability model and distinguishes winter vs courtship peaks',()=>{
 const E=require('../public/winter-eagle-watching/planning.js');
 assert.equal(E.seasonalStage('gather',1).level,4);
 assert.equal(E.seasonalStage('gather',7).level,0);
 assert.equal(E.seasonalStage('display',3).level,4);
 assert.equal(E.seasonalStage('display',7).level,0);
 assert.equal(E.calendar('display').length,12);
 assert.match(E.summary('display',3,[]).evidence,/cartwheel|territorial/i);
 const d=E.summarizeHourly([{startTime:new Date(Date.now()+3600000).toISOString(),temperature:27,windSpeed:'5 mph',shortForecast:'Clear'}],'America/Detroit');
 assert.equal(d[0].coldHours,1);
 assert.equal(d[0].windMph,5);
});
