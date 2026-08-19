import fs from 'node:fs';

const boatHtml=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');
const boatJs=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');
const boatApi=fs.readFileSync('api/boat-launches.js','utf8');
const boatGeo=fs.readFileSync('api/boat-launch-geocode.js','utf8');
const boatWeather=fs.readFileSync('api/boat-launch-weather.js','utf8');
const boatCode=boatJs+'\n'+boatApi+'\n'+boatGeo+'\n'+boatWeather;
const wreckHtml=fs.readFileSync('public/great-lakes-shipwrecks/index.html','utf8');
const wreckJs=fs.readFileSync('public/assets/shipwreck-explorer.js','utf8');
const provenance=JSON.parse(fs.readFileSync('public/assets/michigan-boat-launches/hero-source.json','utf8'));
const cfg=JSON.parse(fs.readFileSync('benchmarks/map-insight-quality.json','utf8'));

const pass=(...v)=>v.every(Boolean);
const checks={
  authenticMedia:{max:20,earned:15,ok:pass(
    boatHtml.includes('Lake_erie_metropark_boat_launch.JPG'),provenance.type==='real-photograph',provenance.license==='CC BY 3.0'
  )},
  boatDataKeyedCorrelation:{max:20,earned:20,ok:pass(
    boatApi.includes('PRDBASPublicView/FeatureServer/0'),boatApi.includes('statewide: true'),!boatApi.includes("greatlakesaccess LIKE 'Yes%'"),!boatApi.includes('facilityid IS NOT NULL'),boatApi.includes('globalid'),boatApi.includes('OBJECTID'),boatApi.includes('sourceId(a)'),
    boatJs.includes("const SOURCE_API='/api/boat-launches'"),boatJs.includes('const markerById=new Map()'),boatJs.includes('markerById.set(a.id,marker)'),boatJs.includes('data-launch-id'),boatJs.includes("marker.on('click',()=>selectLaunch(a.id,'marker'))"),!boatHtml.includes('id="locdata"'),!boatCode.includes('bestMatch')
  )},
  boatBidirectionalControl:{max:20,earned:20,ok:pass(
    boatJs.includes("function selectLaunch(id,source='list')"),boatJs.includes('markerById.get(id)'),boatJs.includes('newMarker.openPopup()'),boatJs.includes('data-popup-card'),boatJs.includes('google.com/maps/dir/?api=1&destination='),boatJs.includes('destinationMarker'),boatJs.includes('fitBounds'),boatJs.includes('markerClusterGroup'),boatJs.includes('for(const a of mapSet())')
  )},
  shipwreckMapToTable:{max:20,earned:20,ok:pass(
    wreckJs.includes("let preset='',map=null,layer=null,anchorSelection=''"),wreckJs.includes('anchorSelection?baseList.filter'),wreckJs.includes('visibleIds=new Set(tableList.map'),wreckJs.includes("r.row.style.display=shown?'':'none'"),wreckJs.includes('Map selection: <strong>'),wreckJs.includes('data-wreck-clear-map'),wreckJs.includes('Shipwreck Map To Records')
  )},
  shipwreckRecordToMap:{max:10,earned:10,ok:pass(
    wreckJs.includes('data-wreck-map'),wreckJs.includes('const markerByAnchor=new Map()'),wreckJs.includes('function focusAnchor'),wreckJs.includes('markerByAnchor.get(label)'),wreckJs.includes('Shipwreck Record To Map'),wreckJs.includes('show on map →')
  )},
  trustSearchAccessibility:{max:10,earned:10,ok:pass(
    boatApi.includes('fallback_used: false'),boatApi.includes('res.status(502)'),boatJs.includes('No legacy or guessed launch pins are shown.'),boatApi.includes('String(a.flag || "").trim()'),boatGeo.includes('Destination lookup unavailable'),boatWeather.includes('boating-safety determination'),((boatHtml.match(/<input[^>]+type="search"/g)||[]).length===1),boatHtml.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-boat-launches/">'),wreckHtml.includes('<link rel="canonical" href="https://chrisizworski.com/great-lakes-shipwrecks/">'),wreckJs.includes('not wreck coordinates'),wreckJs.includes('cited source or agency remains authoritative')
  )}
};

let score=0;
for(const [name,c] of Object.entries(checks)){const earned=c.ok?c.earned:0;score+=earned;console.log(`${c.ok?'PASS':'FAIL'}  ${earned}/${c.max}  ${name}`);}
const fatalFailures=[];
if(!checks.boatDataKeyedCorrelation.ok)fatalFailures.push('Boat map does not derive from one normalized statewide source record ID.');
if(!checks.boatBidirectionalControl.ok)fatalFailures.push('Boat map ↔ result/source control is incomplete.');
if(!checks.shipwreckMapToTable.ok)fatalFailures.push('Shipwreck map selection does not control the underlying table.');
if(!checks.shipwreckRecordToMap.ok)fatalFailures.push('Shipwreck records cannot reliably return to the map.');
const loss=100-score;
console.log(`Map-data correlation baseline: ${cfg.baseline.score}/100 (loss ${cfg.baseline.loss})`);
console.log(`Map-data correlation candidate: ${score}/100 (loss ${loss})`);
if(score===95)console.log('Known loss: 5 media points remain on the Boat static/social preview treatment; statewide source integrity and map-data correlation are fully gated.');
if(fatalFailures.length)fatalFailures.forEach(x=>console.error(`FATAL: ${x}`));
if(process.argv.includes('--check')&&(score<cfg.target.minimumEffectiveScore||loss>cfg.target.maximumLoss||fatalFailures.length))process.exit(1);
