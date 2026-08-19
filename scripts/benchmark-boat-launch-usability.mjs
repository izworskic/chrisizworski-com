import fs from 'node:fs';

const js=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');
const html=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');
const cfg=JSON.parse(fs.readFileSync('benchmarks/boat-launch-usability.json','utf8'));

const pass=(...v)=>v.every(Boolean);
const checks={
  sourceCreatesInventory:{max:30,ok:pass(
    js.includes('PRDBASPublicView/FeatureServer/0'),
    js.includes("bas_type='Boating Access Site'"),
    js.includes("launch_status='Open'"),
    js.includes("greatlakesaccess LIKE 'Yes%'"),
    js.includes("const raw=(j.features||[]).map(cleanFeature).filter(Boolean)"),
    !html.includes('id="locdata"'),
    !html.includes('"numberOfItems": 42')
  )},
  noLegacyOrFuzzyFallback:{max:20,ok:pass(
    !js.includes('MANUAL_VERIFIED'),
    !js.includes('ALIASES'),
    !js.includes('bestMatch'),
    !js.includes('nameSimilarity'),
    !js.includes("confidence:'approximate'"),
    !html.includes('Bay City State Park Launch')
  )},
  sourceQualityFilters:{max:15,ok:pass(
    js.includes("referenceonly||''"),
    js.includes("if(String(a.flag||'').trim())return null"),
    js.includes('latitude IS NOT NULL'),
    js.includes('longitude IS NOT NULL'),
    js.includes('waterwaysprogramconfirmation'),
    js.includes('qaqc_1_date')
  )},
  mapRecordCorrelation:{max:15,ok:pass(
    js.includes('const markerById=new Map()'),
    js.includes('markerById.set(a.id,m)'),
    js.includes('data-launch-id'),
    js.includes("m.on('click',()=>select(a.id,'marker'))"),
    js.includes('function select(id,source='),
    js.includes('Directions')
  )},
  decisionDetails:{max:10,ok:pass(
    js.includes('ntrailerableparking'),
    js.includes('nlanes'),
    js.includes('rampcode_new'),
    js.includes('operating_hours'),
    js.includes('greatlakesaccess'),
    js.includes('carrydowntype')
  )},
  failClosed:{max:10,ok:pass(
    js.includes('No legacy or guessed launch pins are being shown.'),
    js.includes("records=[];filtered=[]"),
    js.includes('if(layer)layer.clearLayers()'),
    html.includes('If the source cannot be reached, the map stays empty')
  )}
};

let score=0;
for(const [key,c] of Object.entries(checks)){
  const earned=c.ok?c.max:0;
  score+=earned;
  console.log(`${c.ok?'PASS':'FAIL'}  ${earned}/${c.max}  ${key}`);
}

const fatals=[];
if(!checks.sourceCreatesInventory.ok)fatals.push('The DNR source is not the sole launch inventory.');
if(!checks.noLegacyOrFuzzyFallback.ok)fatals.push('Legacy/fuzzy launch creation remains possible.');
if(!checks.sourceQualityFilters.ok)fatals.push('Source quality filters are incomplete.');
if(!checks.mapRecordCorrelation.ok)fatals.push('Map and launch records are not keyed to one facility ID.');
if(!checks.failClosed.ok)fatals.push('The tool does not fail closed when source data is unavailable.');
if(/navigator\.geolocation|getCurrentPosition|localStorage|sessionStorage/.test(js))fatals.push('Unexpected precise location or persistent browser storage introduced.');

const loss=100-score;
console.log(`Boat Launch source-integrity candidate: ${score}/100 (loss ${loss})`);
if(fatals.length)fatals.forEach(x=>console.error(`FATAL: ${x}`));
if(process.argv.includes('--check')&&(score<cfg.target.minimumEffectiveScore||loss>cfg.target.maximumLoss||fatals.length))process.exit(1);
