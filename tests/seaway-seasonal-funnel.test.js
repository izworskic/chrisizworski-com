'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const funnel=require('../public/assets/seaway-seasonal-funnel.js');

const BASE='https://chrisizworski.com/st-lawrence-seaway/?region=all';
function item(attributes, selector) {
  const node={
    getAttribute(name){return attributes[name]||null;},
    closest(name){return name===selector?node:null;}
  };
  return node;
}
function fixture() {
  const events=[],handlers={},observers=[];
  const root={
    dataset:{},
    addEventListener(name,callback){handlers[name]=callback;},
    contains(node){return Boolean(node)}
  };
  const doc={
    getElementById(id){return id==='seaway-seasonal-lens'?root:id==='seaway-seasonal-title'?{}:null;}
  };
  class Observer {
    constructor(callback,options){this.callback=callback;this.options=options;observers.push(this);}
    observe(element){this.element=element;}
    disconnect(){this.disconnected=true;}
    fire(ratio){this.callback([{isIntersecting:ratio>0,intersectionRatio:ratio}]);}
  }
  const win={location:{href:BASE},IntersectionObserver:Observer,gtag:(type,name,props)=>events.push({type,name,props})};
  return {doc,win,events,root,observers,click(node){handlers.click({target:node});}};
}
test('exposure is a single observed viewport event, not page load or an invented visit',()=>{
  const f=fixture();
  assert.equal(funnel.mount(f.doc,f.win),true);
  assert.equal(funnel.mount(f.doc,f.win),false);
  assert.equal(f.events.length,0);
  assert.equal(f.observers[0].options.threshold,0.5);
  f.observers[0].fire(0.2);
  assert.equal(f.events.length,0);
  f.observers[0].fire(0.9);
  f.observers[0].fire(0.9);
  assert.deepEqual(f.events.map(x=>x.name),['seaway_seasonal_exposed']);
  assert.equal(f.observers[0].disconnected,true);
  assert.equal(f.events[0].props.transport_type,'beacon');
});
test('manual comparison then welland follow-through preserves exact step order',()=>{
  const f=fixture();
  funnel.mount(f.doc,f.win);
  f.click(item({'data-seaway-month':'10'},'[data-seaway-month]'));
  f.click(item({'data-seasonal-destination':'welland',href:'/welland-canal/'},'a[data-seasonal-destination]'));
  assert.deepEqual(f.events.map(x=>x.name),['seaway_seasonal_month_selected','seaway_seasonal_next_step']);
  assert.equal(f.events[0].props.selected_month,'10');
  assert.equal(f.events[1].props.after_manual_compare,'yes');
  assert.equal(f.events[1].props.selected_month,'10');
  assert.equal(f.events[1].props.destination,'welland');
  assert.equal(f.events[1].props.destination_kind,'ship_watch_tool');
  assert.equal(f.events[1].props.page_family,'seaway');
});
test('plan click without manual month action must never be claimed comparison-driven',()=>{
  const f=fixture();
  funnel.mount(f.doc,f.win);
  f.click(item({'data-seasonal-destination':'eisenhower',href:'/eisenhower-lock/'},'a[data-seasonal-destination]'));
  assert.equal(f.events.length,1);
  assert.equal(f.events[0].props.after_manual_compare,'no');
  assert.equal(f.events[0].props.selected_month,'none');
  assert.equal(f.events[0].props.destination_kind,'lock_guide');
});
test('verified official planning link is classified separately from a tool visit',()=>{
  const f=fixture();
  funnel.mount(f.doc,f.win);
  f.click(item({'data-seaway-month':'11'},'[data-seaway-month]'));
  f.click(item({'data-seasonal-destination':'official_queue',href:'https://seaway-greatlakes.com/vessel-transit/order-of-turn'},'a[data-seasonal-destination]'));
  assert.equal(f.events[1].props.destination,'official_queue');
  assert.equal(f.events[1].props.destination_kind,'official_planning');
});
test('unrecognized, redirected or wrong-route links cannot masquerade as successful next steps',()=>{
  const f=fixture();
  funnel.mount(f.doc,f.win);
  for(const [key,href] of [
    ['unrecognized','/welland-canal/'],
    ['welland','/eisenhower-lock/'],
    ['ship_watch','https://other.example/#ship-watch'],
    ['official_queue','https://example.org/vessel-transit/order-of-turn'],
    ['welland','javascript:alert(1)']
  ]){
    assert.equal(funnel.validDestination(item({'data-seasonal-destination':key,href},'a'),BASE),null);
    f.click(item({'data-seasonal-destination':key,href},'a[data-seasonal-destination]'));
  }
  assert.equal(f.events.length,0);
});
test('out-of-range months and missing GA tag fail closed without breaking click path',()=>{
  const f=fixture();
  funnel.mount(f.doc,f.win);
  for(const month of ['0','13','NaN','2026'])
    f.click(item({'data-seaway-month':month},'[data-seaway-month]'));
  assert.equal(f.events.length,0);
  const g=fixture();
  delete g.win.gtag;
  funnel.mount(g.doc,g.win);
  assert.doesNotThrow(()=>g.click(item({'data-seaway-month':'8'},'[data-seaway-month]')));
  assert.doesNotThrow(()=>g.click(item({'data-seasonal-destination':'eisenhower',href:'/eisenhower-lock/'},'a[data-seasonal-destination]')));
});
test('generated page connects the monthly fieldbook to real trip and ship-watching paths',()=>{
  const html=fs.readFileSync('public/st-lawrence-seaway/index.html','utf8');
  for(const destination of ['ship_watch','eisenhower','welland','official_queue','operator_hours','seaway_notices'])
    assert.ok(html.includes('data-seasonal-destination="'+destination+'"'),destination);
  assert.match(html,/src="\/assets\/seaway-seasonal-funnel\.js\?v=20261105a"/);
  assert.match(html,/href="\/welland-canal\/"/);
  assert.match(html,/href="#ship-watch"/);
  assert.match(html,/\/assets\/seaway\.js\?v=20261105c/);
  assert.match(html,/id="seawaySeasonalReadout"/);
  assert.match(html,/Read the 2022–2024 comparison as a table/);
});

test('mobile month selector has discovery hint and centers current month without scrolling the page',()=>{
  const html=fs.readFileSync('public/st-lawrence-seaway/index.html','utf8');
  const js=fs.readFileSync('public/assets/seaway.js','utf8');
  assert.match(html,/class="seasonal-swipe-hint"/);
  assert.match(html,/swipe this row sideways/i);
  assert.match(html,/seaway\.css\?v=20261105c/);
  assert.match(js,/monthStrip\.scrollLeft=Math\.max\(0,centered\)/);
  assert.doesNotMatch(js,/selected\.scrollIntoView/);
});
