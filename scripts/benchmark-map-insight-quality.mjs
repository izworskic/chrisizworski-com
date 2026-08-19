import fs from 'node:fs';

const boatHtml=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');
const boatJs=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');
const wreckHtml=fs.readFileSync('public/great-lakes-shipwrecks/index.html','utf8');
const wreckJs=fs.readFileSync('public/assets/shipwreck-explorer.js','utf8');
const provenance=JSON.parse(fs.readFileSync('public/assets/michigan-boat-launches/hero-source.json','utf8'));
const cfg=JSON.parse(fs.readFileSync('benchmarks/map-insight-quality.json','utf8'));

const pass=(...v)=>v.every(Boolean);
const checks={
  authenticMedia:{max:20,earned:15,ok:pass(
    boatJs.includes('Lake_erie_metropark_boat_launch.JPG'),
    boatJs.includes('Dwight Burdette'),
    boatJs.includes('CC BY 3.0'),
    provenance.type==='real-photograph',
    provenance.license==='CC BY 3.0'
  )},
  boatMarkerInsight:{max:25,earned:25,ok:pass(
    boatJs.includes('launch-map-insight'),
    boatJs.includes('Map insight'),
    boatJs.includes('View launch details'),
    boatJs.includes('Verify access'),
    boatJs.includes('Regional screening signal')
  )},
  shipwreckMarkerInsight:{max:25,earned:25,ok:pass(
    wreckJs.includes('Why this marker matters:'),
    wreckJs.includes('data-wreck-row'),
    wreckJs.includes('we-insight'),
    wreckJs.includes('Open filtered database'),
    wreckJs.includes('recorded death')
  )},
  trustAndSourceBoundary:{max:15,earned:15,ok:pass(
    boatJs.includes('not ramp, marina, harbor or boating-safety truth'),
    wreckJs.includes('regional anchor, not wreck coordinates'),
    wreckJs.includes('source/agency record as authoritative')
  )},
  searchIntegrity:{max:10,earned:10,ok:pass(
    boatHtml.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-boat-launches/">'),
    wreckHtml.includes('<link rel="canonical" href="https://chrisizworski.com/great-lakes-shipwrecks/">'),
    boatHtml.includes('"numberOfItems": 42')
  )},
  measurementAndAccessibility:{max:5,earned:5,ok:pass(
    boatJs.includes('Boat Launch Map Insight'),
    boatJs.includes("setAttribute('aria-label'"),
    wreckJs.includes('Shipwreck Map Insight'),
    wreckJs.includes('aria-live')
  )}
};
let score=0;
for(const [name,c] of Object.entries(checks)){
  const earned=c.ok?c.earned:0;score+=earned;
  console.log(`${c.ok?'PASS':'FAIL'}  ${earned}/${c.max}  ${name}`);
}
const loss=100-score;
console.log(`Map insight quality baseline: ${cfg.baseline.score}/100 (loss ${cfg.baseline.loss})`);
console.log(`Map insight quality candidate: ${score}/100 (loss ${loss})`);
if(score===95)console.log('Known loss: 5 points remain on static hero/social fallback; visible hero and map insights meet the release target.');
if(process.argv.includes('--check')&&(score<cfg.target.minimumEffectiveScore||loss>cfg.target.maximumLoss))process.exit(1);
