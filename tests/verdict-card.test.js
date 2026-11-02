const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const card = require('../public/assets/verdict-card.js');

const page = fs.readFileSync(require('node:path').join(__dirname,'../public/northern-lights-michigan/index.html'),'utf8');
const now = Date.parse('2026-11-02T04:00:00Z');
const fresh = {
  verdict: 'WORTH A LOOK',
  bestWindow: '11:00 PM – 1:00 AM ET',
  drivers: [
    {label:'Aurora',text:'NOAA Kp is an indicator, not a visibility guarantee.'},
    {label:'Clouds',text:'NWS sky cover is a forecast.'},
    {label:'Moon',text:'USNO moonlight may hide faint color.'}
  ],
  locationNote:'Upper Peninsula favored; Lower Peninsula less likely.',
  asOf:new Date(now).toISOString(),
  reason:'Check the official nowcast.',
  availability:'fresh'
};

test('reusable component accepts all four supported decisions and requires explanatory fields',()=>{
  for (const verdict of ['GO','WORTH A LOOK','NO-GO','UNCERTAIN']) {
    const result = card.resolve({...fresh,verdict}, {now});
    assert.equal(result.verdict,verdict);
  }
  assert.equal(card.resolve({...fresh,verdict:'GO',drivers:[]},{now}).verdict,'UNAVAILABLE');
  assert.equal(card.resolve({...fresh,verdict:'UNCERTAIN',reason:''},{now}).verdict,'UNAVAILABLE');
});

test('missing, expired, future and invalid feed states never retain a confident verdict',()=>{
  assert.equal(card.resolve({...fresh,availability:'missing'},{now}).verdict,'UNAVAILABLE');
  assert.equal(card.resolve({...fresh,availability:'stale'},{now}).verdict,'UNAVAILABLE');
  assert.equal(card.resolve({...fresh,asOf:null},{now}).verdict,'UNAVAILABLE');
  assert.equal(card.resolve({...fresh,asOf:new Date(now-21*60000).toISOString()},{now}).verdict,'UNAVAILABLE');
  assert.equal(card.resolve({...fresh,asOf:new Date(now+5*60000).toISOString()},{now}).verdict,'UNAVAILABLE');
  const expired = card.resolve({...fresh,verdict:'GO'},{now:now+21*60000});
  assert.equal(expired.label,'Forecast currently unavailable');
  assert.equal(expired.bestWindow,'No reliable window available');
  assert.match(expired.reason,/expired/i);
});

test('presentational renderer outputs plain text and removes old drivers on fallback',()=>{
  function node(){
    return {textContent:'',hidden:false,children:[],appendChild(child){this.children.push(child);},
      replaceChildren(...children){this.children=children;}};
  }
  const selectors=['[data-verdict-state]','[data-verdict-best]','[data-verdict-where]',
    '[data-verdict-asof]','[data-verdict-reason]','[data-verdict-drivers]'];
  const children=Object.fromEntries(selectors.map(key=>[key,node()]));
  const holder={dataset:{},ownerDocument:{createElement:node,createTextNode(value){return {textContent:value};}},
    querySelector(selector){return children[selector];}};
  card.render(holder,fresh,{now});
  assert.equal(holder.dataset.verdict,'worth-a-look');
  assert.equal(children['[data-verdict-drivers]'].children.length,3);
  assert.match(children['[data-verdict-asof]'].textContent,/As of:/);
  card.render(holder,{...fresh,availability:'missing'},{now});
  assert.equal(holder.dataset.verdict,'unavailable');
  assert.equal(children['[data-verdict-drivers]'].children.length,0);
  assert.equal(children['[data-verdict-drivers]'].hidden,true);
  assert.equal(children['[data-verdict-best]'].textContent,'No reliable window available');
});

test('pilot is present once, preserves canonical and creator identity, and uses short stable SEO metadata',()=>{
  assert.equal((page.match(/id="tonightsVerdict"/g)||[]).length,1);
  assert.match(page,/data-verdict-best/);
  assert.match(page,/data-verdict-asof/);
  assert.match(page,/data-verdict-where/);
  assert.match(page,/data-verdict-state/);
  assert.match(page,/src="\/assets\/verdict-card\.js\?v=1"/);
  const title=page.match(/<title>([^<]+)<\/title>/)[1];
  const description=page.match(/<meta name="description" content="([^"]+)"/)[1].replace(/&#39;/g,"'");
  assert.equal(title,'Northern Lights Michigan Tonight: Verdict | Chris Izworski');
  assert.ok(title.length<=60);
  assert.ok(description.length<=158);
  assert.match(description,/tonight.*verdict.*best viewing hours/i);
  assert.match(page,/<link rel="canonical" href="https:\/\/chrisizworski\.com\/northern-lights-michigan\/">/);
  assert.match(page,/Built by <a href="https:\/\/chrisizworski\.com\/chris-izworski\/">Chris Izworski<\/a>/);
});

// Execute the ACTUAL hub pilot (not a reimplementation) with deterministic
// feed fixtures. No external network required and no fake values in production.
const begin=page.indexOf('function michiganDateKeyForVerdict(date)');
const end=page.indexOf('\nfunction renderDecisionData(data){',begin);
assert.ok(begin>0 && end>begin,'Pilot assessment source found');
const pilotSource=page.slice(begin,end);
function evaluate(fixture,overrides={}){
  const sandbox={
    Intl,Date,Number,Object,Array,Math,String,window:{},
    DARK_REF:{lat:45.787,lng:-84.76},
    asFiniteNumber(value){return value==null?null:Number(value);},
    sunAltitudeDeg(){return -20;},
    findSunCrossing(){return new Date(now+8*3600000);},
    skyCoverAt(region){return region.cloud==null?null:region.cloud;},
    michiganClock(date){return date.toISOString().slice(11,16);}
  };
  Object.assign(sandbox,overrides);
  vm.createContext(sandbox);
  vm.runInContext(pilotSource,sandbox);
  return vm.runInContext('computeTonightVerdict',sandbox)(fixture,now);
}
function fixture(kp=5,upCloud=10,lpCloud=30,moonPhase='Waxing Crescent'){
  return {
    fetched_at:new Date(now).toISOString(),
    source_freshness:{ovation_fresh:true},
    forecast:{periods:[{time_tag:new Date(now-3600000).toISOString(),kp}]},
    moon:{phase:moonPhase,illumination_percent:15,date:'2026-11-01'},
    ovation:{regions:[
      {id:'keweenaw',label:'Keweenaw Peninsula',planning_kp:4,cloud:upCloud,level:'active'},
      {id:'mackinaw-city',label:'Mackinaw City',planning_kp:5,cloud:lpCloud,level:'possible'}
    ]}
  };
}
test('pilot reads existing regional Kp levels and dark 3-hour intervals',()=>{
  const yes=evaluate(fixture());
  assert.equal(yes.verdict,'WORTH A LOOK');
  assert.match(yes.bestWindow,/04:00 – 06:00 ET/);
  assert.equal(yes.drivers.length,3);
  assert.match(yes.locationNote,/Upper Peninsula/);
  assert.match(yes.locationNote,/Lower Peninsula/);
  assert.equal(evaluate(fixture(3)).verdict,'NO-GO');
});
test('pilot only shows GO for confirmed strong, clear, moonless, active nowcast conditions',()=>{
  assert.equal(evaluate(fixture(7,0,20,'New Moon')).verdict,'GO');
  assert.equal(evaluate(fixture(7,10,20,'New Moon')).verdict,'WORTH A LOOK');
  assert.equal(evaluate(fixture(7,0,20,'Full Moon')).verdict,'WORTH A LOOK');
});
test('pilot handles unsupported sky combinations as uncertain, not a made-up cloud cutoff',()=>{
  const uncertain=evaluate(fixture(4,100,70));
  assert.equal(uncertain.verdict,'UNCERTAIN');
  assert.match(uncertain.reason,/no cloud-opacity cutoff/i);
  assert.equal(evaluate(fixture(6,100,100)).verdict,'NO-GO');
});
test('pilot fails closed when required underlying forecast drivers are missing or stale',()=>{
  const stale=fixture();
  stale.fetched_at=new Date(now-60*60000).toISOString();
  assert.equal(evaluate(stale).availability,'stale');
  const noMoon=fixture();
  noMoon.moon=null;
  assert.equal(evaluate(noMoon).availability,'missing');
  const noOvation=fixture();
  noOvation.source_freshness.ovation_fresh=false;
  assert.equal(evaluate(noOvation).availability,'missing');
  const noCloud=fixture();
  noCloud.ovation.regions[0].cloud=null;
  assert.equal(evaluate(noCloud).availability,'missing');
  const noDarkRows=fixture();
  noDarkRows.forecast.periods=[];
  assert.equal(evaluate(noDarkRows).availability,'missing');
});