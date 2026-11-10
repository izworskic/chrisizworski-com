'use strict';
// The identical adapter runs against Git-captured baseline and candidate
// copies. No remote data, no shell, no source-path exceptions by version.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const sourceArg=process.argv.indexOf('--source-root');
if(sourceArg<0||!process.argv[sourceArg+1])throw Error('Expected --source-root');
const root=path.resolve(process.argv[sourceArg+1]);
const html=fs.readFileSync(path.join(root,'public/nyc-crossing/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'public/assets/nyc-crossing.js'),'utf8');
const caseResult=(id,passed,observed)=>({id,passed:Boolean(passed),observed:String(observed)});

const samples=[
  ['gwb','George Washington Bridge',2279,18,'CROSSING_APPROACH'],
  ['lincoln','Lincoln Tunnel',2279,14,'CROSSING_APPROACH'],
  ['holland','Holland Tunnel',2279,17,'CROSSING_APPROACH'],
  ['queens-midtown','Queens–Midtown Tunnel',1646,16,'CROSSING_APPROACH'],
  ['queensboro','Ed Koch Queensboro Bridge',900,null,'CROSSING_APPROACH'],
  ['hugh-carey','Hugh L. Carey Tunnel',1646,null,'CROSSING_APPROACH'],
  ['brooklyn','Brooklyn Bridge',900,19,'APPROACH_CORRIDOR'],
  ['manhattan','Manhattan Bridge',900,15,'APPROACH_CORRIDOR'],
  ['williamsburg','Williamsburg Bridge',900,12,'CROSSING_APPROACH'],
  ['rfk','Robert F. Kennedy Bridge',1646,11,'APPROACH_SEGMENT'],
  ['verrazzano','Verrazzano–Narrows Bridge',746,9,'CROSSING_ONLY']
];
function fixture(prohibited=false){
 const routes=samples.map(([id,name,total,eta,scope])=>({
   id,name,corridor:'Documented NYC approach',etaState:eta==null?'UNAVAILABLE':'LIVE',
   etaMinutes:eta,etaScope:scope,direction:'Documented measured direction',
   trafficSourceName:eta==null?null:'NYC DOT Traffic Management Center',
   trafficPending:eta==null?'Mapbox fixed probe rejected: outside validated corridor':null,
   reportedAt:'2026-11-10T10:30:00Z',
   speedMph:null,delayMinutes:null,baselineMinutes:null,
   cost:{total,toll:id==='queensboro'?0:total-900,zone:id==='verrazzano'?0:900,credit:0,periodLabel:'Selected travel time'},
   eligibility:{state:prohibited&&id==='queensboro'?'PROHIBITED':'ELIGIBLE',
     reason:prohibited&&id==='queensboro'?'Vehicle restriction must be obeyed.':'Verify posted approach and vehicle restrictions.'},
   cameraUrl:'https://511ny.org/map',disruption:{incidentCount:0,events:[],signCount:0,signs:[]}
 }));
 return {routes,trafficState:'PARTIAL',recommendationState:'LIVE_CROSSING_CONDITIONS',
   ny511:{state:'STALE',eventsUpdatedAt:null,signsUpdatedAt:null},
   lowestToll:routes[4],departure:{state:'UNAVAILABLE',reason:'History unavailable in fixture'}};
}
function element(){return {innerHTML:'',textContent:'',className:'',value:'',
  handlers:{},addEventListener(name,handler){this.handlers[name]=handler;}};}
class FormDataStub{*[Symbol.iterator](){}}
async function world(data,{fail=false}={}){
 const nodes=Object.fromEntries(['crossingForm','results','answer','trafficStatus','departureIntelligence'].map(id=>[id,element()]));
 if(html.includes('id="pairA"')){
   for(const id of ['pairA','pairB','pairResult'])nodes[id]=element();
 }
 let requests=0;
 const ctx={document:{getElementById:id=>nodes[id]||null,hidden:false},FormData:FormDataStub,
   URLSearchParams,Intl,Date,Math,setInterval(){return 0},
   fetch:async()=>{requests++;if(fail)throw Error('source unavailable');return {ok:true,json:async()=>data};}};
 vm.runInNewContext(js,ctx,{filename:'nyc-crossing-client.js',timeout:5000});
 await new Promise(resolve=>setImmediate(resolve));
 return {nodes,get requests(){return requests;},change(id,value){
   if(!nodes[id])return false;
   nodes[id].value=value;
   nodes[id].handlers.change?.();
   return true;
 }};
}
async function main(){
 const cases=[];
 const normal=await world(fixture());
 const nodes=normal.nodes;
 const early=html.indexOf('id="crossingForm"')>=0 &&
   html.indexOf('id="crossingForm"')<html.indexOf('NYC_TOLL_RATE_TABLE_START') &&
   html.indexOf('id="crossing-pair"')>html.indexOf('id="answer"') &&
   html.indexOf('id="crossing-pair"')<html.indexOf('id="comparison-results"');
 cases.push(caseResult('decision-first-hierarchy',early,
   early?'Trip setup and two-crossing decision precede the full toll ledger.':'Long-form toll reference still precedes the crossing decision.'));
 const pair=nodes.pairResult?.innerHTML||'';
 const cardOkay=pair.includes('Option A')&&pair.includes('Option B')&&pair.includes('Queens–Midtown Tunnel')&&
    pair.includes('Ed Koch Queensboro Bridge')&&pair.includes('$7.46 lower modeled road charges')&&
    pair.includes('Live measurement unavailable')&&pair.includes('NYC DOT Traffic Management Center');
 cases.push(caseResult('two-crossing-answer',cardOkay,cardOkay?
   'Two named crossings show modeled difference, source-qualified time and explicit unavailable state.':
   'No complete source-qualified two-crossing answer is available.'));
 const callsBefore=normal.requests;
 const middle=normal.change('pairB','lincoln')?nodes.pairResult.innerHTML:'';
 const reversed=middle.includes('Lincoln Tunnel')&&middle.includes('$6.33 lower modeled road charges');
 normal.change('pairB','queensboro');
 const restored=(nodes.pairResult?.innerHTML||'').includes('$7.46 lower modeled road charges')&&
   nodes.pairB?.value==='queensboro'&&nodes.pairA?.value==='queens-midtown';
 cases.push(caseResult('selection-round-trip',reversed&&restored&&normal.requests===callsBefore,
   reversed&&restored&&normal.requests===callsBefore?
   'Switching to Lincoln changes the answer; returning to Queensboro restores it without a new API call.':
   'A → B → A did not restore the same locally sourced comparison or repeated a provider call.'));
 const noWinner=pair.includes('cannot establish which route is fastest')&&!pair.includes('fastest: Queensboro');
 cases.push(caseResult('uncertain-traffic',noWinner,
   noWinner?'Unknown Queensboro ETA remains unavailable; unlike segment lengths are never ranked.':
   'No two-crossing evidence contract for unavailable or incomparable travel times.'));
 const restricted=await world(fixture(true));
 const restrictedMarkup=restricted.nodes.pairResult?.innerHTML||'';
 const restrictionOkay=restrictedMarkup.includes('PROHIBITED')&&
    restrictedMarkup.includes('prevent a valid price comparison')&&!restrictedMarkup.includes('lower modeled road charges');
 cases.push(caseResult('restricted-vehicle',restrictionOkay,restrictionOkay?
   'A prohibited crossing blocks the low-price conclusion and shows the vehicle warning.':
   'The candidate fails to treat prohibited vehicle eligibility as a comparison veto.'));
 const realRows=(nodes.results?.innerHTML.match(/<tr role="row">/g)||[]).length;
 cases.push(caseResult('preserve-eleven-crossings',realRows===11,
   'Existing source-based crossing ledger renders '+realRows+' crossing rows.'));
 const outState=nodes.answer?.innerHTML||'';
 const safety=outState.includes('official 511NY conditions')&&
   !outState.includes('Incident feed awaiting first update')&&
   !(nodes.results?.innerHTML||'').includes('Incident feed awaiting first update');
 cases.push(caseResult('preserve-incident-truth',safety,
   safety?'Unverified incident coverage has one official-source fallback and no repeated placeholder.':'Incident-coverage fallback regressed.'));
 const nojs=html.includes('NYC_TOLL_RATE_TABLE_START')&&
   html.includes('static-toll-rates')&&
   html.includes('rel="canonical" href="https://chrisizworski.com/nyc-crossing/"')&&
   html.includes('pagead/js/adsbygoogle.js');
 cases.push(caseResult('preserve-no-js-seo',nojs,
   nojs?'Canonical, one AdSense loader and the published non-JS car toll table remain.':'Crawlable/static surface missing.'));
 const failure=await world(fixture(),{fail:true});
 const noFalseLive=failure.nodes.trafficStatus.textContent==='Unable to load decision service'&&
   failure.nodes.trafficStatus.className.includes('off')&&
   !(failure.nodes.results?.innerHTML||'').includes('16 min');
 cases.push(caseResult('preserve-api-failure',noFalseLive,
   noFalseLive?'API outage does not fabricate a live ETA.':'Outage behavior could fabricate or retain live ETA.'));
 process.stdout.write(JSON.stringify({cases}));
}
main().catch(e=>{process.stderr.write(String(e.stack||e));process.exitCode=1});
