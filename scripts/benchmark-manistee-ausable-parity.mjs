import fs from 'node:fs';

const depth=fs.readFileSync('public/assets/manistee-river-live-depth.js','utf8');
const data=fs.readFileSync('public/assets/manistee-river-data.js','utf8');
const map=fs.readFileSync('public/assets/manistee-river-map.js','utf8');
const conditions=fs.readFileSync('api/manistee-river-conditions.js','utf8');
const weather=fs.readFileSync('api/manistee-river-weather.js','utf8');
const html=fs.readFileSync('public/manistee-river-map/index.html','utf8');

// Reference snapshot audited 2026-08-20 from izworskic/michigan-trout-report:
// public/map.html blob d4679e1f31efc7f7e275055cb5515af917f984f1
// public/river.html blob 5a8ffb5613d15869f75b948f110587293fdbed83
// lib/usgs.js blob d2e8df60713aca07ad4833d07f6d90bb70f76e98
// The parity matrix below contains the useful Au Sable capabilities we want to match,
// while the second matrix protects Manistee-specific advantages rather than cloning its ratings.
const parity=[
  {name:'Map key + access navigation',weight:10,baseline:0,ok:/River key/.test(depth)&&/River access/.test(depth)},
  {name:'Multi-gauge river coverage',weight:15,baseline:15,ok:/04123500.*04124000.*04124200.*04125550.*04125460/s.test(conditions)},
  {name:'Seasonal flow comparison',weight:15,baseline:0,ok:/USGS_STAT/.test(conditions)&&/p10,p25,p50,p75,p90/.test(conditions)&&/percent_of_median/.test(conditions)},
  {name:'Optional turbidity + dissolved oxygen',weight:10,baseline:0,ok:/63680,00300/.test(conditions)&&/turbidity_fnu/.test(depth)&&/dissolved_oxygen_mgl/.test(depth)},
  {name:'NWS weather, wind + precipitation',weight:15,baseline:0,ok:/forecastHourly/.test(weather)&&/windSpeed/.test(weather)&&/probabilityOfPrecipitation/.test(weather)&&/Weather near this access/.test(depth)},
  {name:'Rich access decision card',weight:15,baseline:5,ok:['Access type','Best for','Location trust','Reach context','River right now','Before you go'].every(x=>depth.includes(x))},
  {name:'Regulation, source + directions handoffs',weight:10,baseline:10,ok:/regulationMap/.test(depth)&&/p\.source\.url/.test(depth)&&/Directions/.test(map)},
  {name:'Freshness + missing-data expression',weight:10,baseline:10,ok:/age_minutes/.test(conditions)&&/Not reported/.test(depth)&&/Stale \/ unavailable/.test(depth)},
];

const advantages=[
  {name:'Requested left-side river key',ok:/manistee-river-key\{[^}]*left:14px/.test(depth)},
  {name:'Exact selected-access NWS forecast + alerts',ok:/manistee-river-weather\?lat=\$\{p\.lat\}&lon=\$\{p\.lon\}/.test(depth)&&/alerts\/active\?point=/.test(weather)},
  {name:'Nearest same-waterway gauge context',ok:/filter\(g=>!g\.historic&&g\.waterway===p\.waterway\)/.test(depth)&&/straight-line from the access/.test(depth)},
  {name:'Source-backed NHD channel routing',ok:/buildGraph\(features\)/.test(map)&&/routeGraph\(state\.graphs\[from\.waterway\],from,to\)/.test(map)},
  {name:'No imported go/no-go fishing score',ok:!/Prime|Fishing Well|Blown Out|Drop everything and go|Stay home/.test(depth+conditions+weather)&&/not a fishing-quality or boating-safety score/.test(conditions)},
  {name:'Core works without enhancement',ok:/Optional decision layers are additive/.test(data)&&/access points and guide still work/.test(map)},
  {name:'Current regulations remain a source handoff',ok:/Michigan DNR Fishing Regulations/.test(html)&&/michigan\.gov\/dnr\/things-to-do\/fishing\/fishing-regulations/.test(html)&&/does not turn a point location into a legal-rule claim/i.test(map)},
];

const baseline=parity.reduce((n,x)=>n+x.baseline,0);
const candidate=parity.reduce((n,x)=>n+(x.ok?x.weight:0),0);
const advantageScore=Math.round(100*advantages.filter(x=>x.ok).length/advantages.length);
const failed=parity.filter(x=>!x.ok);
const failedAdvantages=advantages.filter(x=>!x.ok);

console.log('Manistee ↔ Au Sable capability benchmark');
console.log('Au Sable reference target: 100/100 (defines parity capabilities)');
console.log(`Manistee before this pass: ${baseline}/100`);
console.log(`Manistee candidate parity: ${candidate}/100`);
for(const x of parity)console.log(`${x.ok?'PASS':'FAIL'} ${String(x.weight).padStart(2)}/${x.weight}  ${x.name}`);
console.log(`Manistee-specific advantage / truth score: ${advantageScore}/100`);
for(const x of advantages)console.log(`${x.ok?'PASS':'FAIL'}  ${x.name}`);

if(process.argv.includes('--check')&&(candidate<95||advantageScore<95||failed.length||failedAdvantages.length))process.exit(1);
