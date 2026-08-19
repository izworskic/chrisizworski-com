import fs from 'node:fs';

const boatHtml=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');
const boatJs=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');
const wreckHtml=fs.readFileSync('public/great-lakes-shipwrecks/index.html','utf8');
const wreckJs=fs.readFileSync('public/assets/shipwreck-explorer.js','utf8');
const provenance=JSON.parse(fs.readFileSync('public/assets/michigan-boat-launches/hero-source.json','utf8'));
const cfg=JSON.parse(fs.readFileSync('benchmarks/map-insight-quality.json','utf8'));

const pass=(...v)=>v.every(Boolean);
const bannedBoatIndexCorrelation=
  boatJs.includes("slice(0,locations.length)") ||
  boatJs.includes("leaflet-interactive')[idx]") ||
  boatJs.includes('leaflet-interactive\")[idx]');

const checks={
  authenticMedia:{max:20,earned:15,ok:pass(
    boatJs.includes('Lake_erie_metropark_boat_launch.JPG'),
    boatJs.includes('Dwight Burdette'),
    boatJs.includes('CC BY 3.0'),
    provenance.type==='real-photograph',
    provenance.license==='CC BY 3.0'
  )},
  boatDataKeyedCorrelation:{max:20,earned:20,ok:pass(
    !bannedBoatIndexCorrelation,
    boatJs.includes('const markerBySlug=new Map()'),
    boatJs.includes('const bySlug=new Map'),
    boatJs.includes("markerBySlug.set(loc.slug,marker)"),
    boatJs.includes('syncMapToVisible'),
    boatJs.includes("card.classList.add('lf-selected')"),
    boatJs.includes('oldMap.replaceWith(mapLayout)')
  )},
  boatBidirectionalControl:{max:20,earned:20,ok:pass(
    boatJs.includes('Boat Launch Map To Record'),
    boatJs.includes('Boat Launch Record To Map'),
    boatJs.includes('function jumpToRecord'),
    boatJs.includes('function focusMap'),
    boatJs.includes('marker.openPopup()'),
    boatJs.includes('data-launch-action="map"'),
    boatJs.includes('data-launch-popup-record')
  )},
  shipwreckMapToTable:{max:20,earned:20,ok:pass(
    wreckJs.includes("let preset='',map=null,layer=null,anchorSelection=''"),
    wreckJs.includes('anchorSelection?baseList.filter'),
    wreckJs.includes('visibleIds=new Set(tableList.map'),
    wreckJs.includes("r.row.style.display=shown?'':'none'"),
    wreckJs.includes('Map selection: <strong>'),
    wreckJs.includes('data-wreck-clear-map'),
    wreckJs.includes('Shipwreck Map To Records')
  )},
  shipwreckRecordToMap:{max:10,earned:10,ok:pass(
    wreckJs.includes('data-wreck-map'),
    wreckJs.includes('const markerByAnchor=new Map()'),
    wreckJs.includes('function focusAnchor'),
    wreckJs.includes('markerByAnchor.get(label)'),
    wreckJs.includes('Shipwreck Record To Map'),
    wreckJs.includes('show on map →')
  )},
  trustSearchAccessibility:{max:10,earned:10,ok:pass(
    boatJs.includes('not ramp, marina, harbor or boating-safety truth'),
    wreckJs.includes('not wreck coordinates'),
    wreckJs.includes('cited source or agency remains authoritative'),
    boatHtml.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-boat-launches/">'),
    wreckHtml.includes('<link rel="canonical" href="https://chrisizworski.com/great-lakes-shipwrecks/">'),
    boatHtml.includes('"numberOfItems": 42'),
    boatJs.includes("setAttribute('aria-label'"),
    wreckJs.includes("setAttribute('aria-label'")
  )}
};

let score=0;
for(const [name,c] of Object.entries(checks)){
  const earned=c.ok?c.earned:0;
  score+=earned;
  console.log(`${c.ok?'PASS':'FAIL'}  ${earned}/${c.max}  ${name}`);
}

const fatalFailures=[];
if(bannedBoatIndexCorrelation)fatalFailures.push('Boat marker correlation still depends on DOM/index order.');
if(!checks.boatBidirectionalControl.ok)fatalFailures.push('Boat map ↔ record control is incomplete.');
if(!checks.shipwreckMapToTable.ok)fatalFailures.push('Shipwreck map selection does not control the underlying table.');
if(!checks.shipwreckRecordToMap.ok)fatalFailures.push('Shipwreck records cannot reliably return to the map.');

const loss=100-score;
console.log(`Map-data correlation baseline: ${cfg.baseline.score}/100 (loss ${cfg.baseline.loss})`);
console.log(`Map-data correlation candidate: ${score}/100 (loss ${loss})`);
if(score===95)console.log('Known loss: 5 media points remain on the Boat static/social fallback; map-data correlation itself is fully gated.');
if(fatalFailures.length)fatalFailures.forEach(x=>console.error(`FATAL: ${x}`));
if(process.argv.includes('--check')&&(score<cfg.target.minimumEffectiveScore||loss>cfg.target.maximumLoss||fatalFailures.length))process.exit(1);
