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
   localStorage:{getItem(){return null},setItem(){}},navigator:{},Intl,Date,Math,Number,Set,Map,Array,Promise,AbortController,
   console,setTimeout,clearTimeout};
 vm.runInNewContext(fs.readFileSync(path.join(dir,'planning.js'),'utf8'),sandbox,{filename:'planning.js'});
 vm.runInNewContext(fs.readFileSync(path.join(dir,'app.js'),'utf8'),sandbox,{filename:'app.js'});
 return {document,window,fetch,periods};
}
test('real production JS initializes interactive map and location list without ReferenceError',()=>{
 const {document}=makeBrowser(),node=id=>document.getElementById(id);
 assert.equal(node('spot-list').children.length,15);
 assert.equal(node('map').querySelectorAll('.native-pin').length,15);
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
 assert.equal(node('spot-list').children.length,7);
 assert.equal(node('map').querySelectorAll('.native-pin').filter(x=>!x.hidden).length,7);
 node('state-filter').value='all';node('state-filter').dispatch('change');
 assert.equal(node('spot-list').children.length,15);
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
 assert.match(node('season-explainer').textContent,/tailwaters|ice edges/i);
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
 
test('UP-only filter and selected-place seasonal context actually update the live map',()=>{
 const {document}=makeBrowser(),node=id=>document.getElementById(id);
 node('region-filter').value='upper-peninsula';node('region-filter').dispatch('change');
 assert.equal(node('spot-list').children.length,2);
 assert.equal(node('map').querySelectorAll('.native-pin').filter(x=>!x.hidden).length,2);
 const soo=node('map').querySelectorAll('.native-pin').find(x=>x.dataset.spot==='soo-cfre');
 soo.click();
 assert.match(node('selected-place').textContent,/St. Marys/);
 assert.match(node('selected-region').textContent,/Upper Peninsula/);
 assert.match(node('region-context').textContent,/snow|thaw/i);
 node('mode-display').click();
 assert.match(node('region-heading').textContent,/Upper Peninsula/);
 assert.equal(node('annual-calendar').children.length,12);
 node('region-filter').value='northern-lower';node('region-filter').dispatch('change');
 assert.equal(node('spot-list').children.length,2);
 node('region-filter').value='southern-lower';node('region-filter').dispatch('change');
 assert.equal(node('spot-list').children.length,3);
});
test('UP seasonal emphasis reflects geographic context without presenting a calculated eagle probability',()=>{
 const E=require('../public/winter-eagle-watching/planning.js');
 assert.equal(E.regionForSpot({state:'MI',lat:46.49}),'upper-peninsula');
 assert.equal(E.regionForSpot({state:'MI',lat:44.43}),'northern-lower');
 assert.equal(E.regionForSpot({state:'MI',lat:42.11}),'southern-lower');
 assert.equal(E.regionForSpot({state:'WI',lat:43.3}),'upper-midwest');
 assert.equal(E.seasonalStage('display',4,'upper-peninsula').level,4);
 assert.equal(E.seasonalStage('display',4,'southern-lower').level,3);
 assert.equal(E.seasonalStage('gather',3,'upper-peninsula').level,4);
 assert.match(E.regionDetails('upper-peninsula').note,/ice|river|snow/i);
 assert.ok(!JSON.stringify(E.regionDetails('upper-peninsula')).match(/probability|odds|sighting rate/i));
});

test('field-first page order is flight guide, public places, then site-specific timing',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const markers=['id="read-the-sky"','id="finder"','id="location-details"','id="eagle-season-planner"','id="weekly-day-cards"'];
 const order=markers.map(s=>html.indexOf(s));
 assert.ok(order.every(n=>n>0),'Every field-plan element must exist');
 assert.ok(order.every((n,i)=>i===0||n>order[i-1]),'The useful field steps must appear in order');
 assert.ok(html.includes('id="show-locations"'));
 assert.ok(html.includes('none of our map pins is a verified cartwheel venue'));
 assert.ok(html.includes('class="flight-quiz-disclosure"'),'The optional quiz must not dominate the trip-planning page');
 const ids=[...html.matchAll(/\\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size,'Duplicate IDs break controls and tracking');
});
test('aerial-flight intent changes location guidance and weather without treating venues as confirmed displays',async()=>{
 const {document}=makeBrowser(),node=id=>document.getElementById(id);
 node('finder-display').click();
 assert.equal(node('finder-display').getAttribute('aria-pressed'),'true');
 assert.equal(node('mode-display').getAttribute('aria-pressed'),'true');
 assert.match(node('finder-purpose').textContent,/No mapped site is a confirmed cartwheel location/i);
 assert.match(node('site-purpose-heading').textContent,/not a known cartwheel venue/i);
 assert.match(node('where-look-label').textContent,/scan the sky/i);
 assert.match(node('week-lead').textContent,/wind and precipitation/i);
 assert.ok(node('weekly-key-primary').textContent.includes('without rain/snow'));
 const at=node('map').querySelectorAll('.native-pin').find(x=>x.dataset.spot==='soo-cfre');
 at.click();
 assert.match(node('site-purpose-text').textContent,/not verified/i);
 assert.equal(node('finder-display').getAttribute('aria-pressed'),'true');
 for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r));
 assert.ok(node('weekly-day-cards').children.length>=6);
 assert.ok(node('weekly-day-cards').children.some(x=>x.children.some(y=>y.className.includes('dry-bar'))));
 node('finder-gather').click();
 assert.equal(node('mode-gather').getAttribute('aria-pressed'),'true');
 assert.match(node('weekly-key-primary').textContent,/32°F/);
 assert.match(node('site-purpose-heading').textContent,/lead|habitat/i);
 assert.match(node('finder-purpose').textContent,/freezing-air context/i);
});
