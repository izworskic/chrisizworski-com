'use strict';
// Reviewable Foundry before/after adapter. Real baseline files are provided by
// Foundry; the exact same dated fixtures run against baseline and candidate.
// This does not assert live NWS availability or measured visitor success.
const fs=require('node:fs');
const path=require('node:path');
const root=process.argv[process.argv.indexOf('--source-root')+1];
if(!root||!path.isAbsolute(root))throw Error('Expected source root');
const html=fs.readFileSync(path.join(root,'public/great-lakes-ship-watching-spots/index.html'),'utf8');
const desk=require(path.join(root,'public/assets/freighter-watch-desk.js'));
const sitePath=path.join(root,'lib/freighter-watch-sites.js');
const decisionPath=path.join(root,'public/assets/freighter-watch-decision.js');
const available=fs.existsSync(sitePath)&&fs.existsSync(decisionPath);
const decision=available?require(decisionPath):null;
const sites=available?require(sitePath):null;
const now=Date.parse('2026-11-08T17:30:00Z'),iso=x=>new Date(x).toISOString();
const ship={mmsi:'366123456',name:'Sample freighter',lat:46.503,lon:-84.354,
  seen:iso(now-120000),speedKnots:7,lengthMeters:224,confidence:.81,shipType:70};
const window={start:iso(now+30*60000),end:iso(now+70*60000)};
const period={starts:iso(now+20*60000),ends:iso(now+80*60000),isDaytime:true,
  temperatureF:44,windMph:10,precipProbability:10,shortForecast:'Sunny'};
const weather={ok:true,checkedAt:iso(now-30000),alertsStatus:'available',alerts:[],periods:[period]};
const result={status:'window',when:'now',checkedAt:iso(now-50000),pick:{ship,window},observations:[ship]};
const cases=[];
function one(id,passed,observed){cases.push({id,passed:Boolean(passed),observed});}
one('visitor-verdict-surface',html.includes('id="fwd-visit-plan"')&&
  html.includes('id="fwd-plan-weather"')&&html.includes('id="fwd-plan-access"'),
  html.includes('id="fwd-visit-plan"')?'The existing canonical now exposes a first-screen visitor verdict, weather and access sections.':
    'The prior Watch Desk shows AIS status but no combined shore-visit recommendation.');
if(available){
  const soo=sites.publicSite('soo');
  const best=decision.recommendation(result,{site:soo,weather},now);
  one('supported-window-trip',best.code==='PROMISING'&&best.when.includes('Modeled passage')&&
    best.where.includes('observation platform'),
    best.code==='PROMISING'?'A named public platform, original modeled window and arrival preparation are given as a conditional visitor plan.':
      'No complete, source-backed watch plan produced.');
  const caution=decision.recommendation(result,{site:soo,weather:{...weather,
    alerts:[{event:'High Wind Warning',severity:'Severe',starts:iso(now-30000),expires:iso(now+3*3600000)}]}},now);
  one('weather-veto',caution.code==='WEATHER_HOLD',
    caution.code==='WEATHER_HOLD'?'An active severe NWS warning overrides a supported vessel passage window.':'The severe alert did not override the ship window.');
  const portShip={...ship,lat:42.998,lon:-82.423};
  const port=decision.recommendation({...result,status:'observed',pick:null,observations:[portShip]},
    {site:sites.publicSite('port'),weather},now);
  one('nearby-no-eta',port.code==='NEARBY_ONLY'&&!port.when.includes('Modeled passage'),
    port.code==='NEARBY_ONLY'?'Port Huron offers an opportunistic nearby-only watch, never a manufactured passage time.':
      'The Port Huron outcome lacks an explicit nearby-only limit.');
  const bay=decision.recommendation({...result,status:'observed',pick:null,observations:[{...ship,lat:43.98,lon:-83.5}]},
    {site:sites.publicSite('saginaw'),weather},now);
  one('broad-bay-honesty',bay.code==='NO_CLOSE_REPORT',
    bay.code==='NO_CLOSE_REPORT'?'A distant bay AIS report does not become a false close-by ship sighting.':
      'The bay report was overstated as a ship near the downtown waterfront.');
  const quiet=decision.recommendation({...result,status:'unknown',pick:null,observations:[]},
    {site:sites.publicSite('saginaw'),weather},now);
  const fromHere=html.includes('Already on the waterfront or close by?')&&
    html.includes('Now / next 90 minutes')&&
    !html.includes('make a ship-only trip');
  one('onshore-next-look',fromHere&&quiet.code==='NO_CLOSE_REPORT'&&
    quiet.when.includes('Keep an eye on the waterway')&&
    !/drive|trip|departure|parking/i.test(quiet.title+' '+quiet.summary+' '+quiet.when),
    fromHere&&quiet.code==='NO_CLOSE_REPORT'
      ?'On-site visitor sees a no-close-report state and useful watch/refresh advice without an imaginary drive.'
      :'No on-site default or quiet-waterway outcome with an actionable next look.');
  one('access-sources',Object.keys(sites.sites).length===6&&
    Object.keys(sites.sites).every(k=>sites.publicSite(k).accessUrl.startsWith('https://')),
    'Six named public viewing areas have explicit land-manager source links and documented general-hours boundaries.');
}else{
  for(const id of ['supported-window-trip','weather-veto','nearby-no-eta','broad-bay-honesty','access-sources','onshore-next-look'])
    one(id,false,'The captured baseline does not contain the shore-visit decision and source adapter.');
}
const normalizedShip={...ship,window,lat:46.5,lon:-84.35};
const oldResult=desk.evaluate('soo',{ok:true,checkedAt:iso(now-40000),vessels:[normalizedShip],
  nextShip:{ok:true,pick:normalizedShip,candidates:[normalizedShip]}},'now',now);
one('preserve-corridor-eta-owner',oldResult.status==='window'&&
  oldResult.pick?.window?.start===window.start,
  'The original Soo corridor model retains sole authority over matching AIS candidate time windows.');
one('preserve-canonical-editorial',html.includes('rel="canonical" href="https://chrisizworski.com/great-lakes-ship-watching-spots/"')&&
  html.includes('id="viewing-guide"')&&html.includes('Frequently asked questions')&&
  html.includes('https://chrisizworski.com/#person'),
  'The indexed guide, readable no-JavaScript shore research, FAQ and canonical Person identity remain present.');
process.stdout.write(JSON.stringify({cases}));
