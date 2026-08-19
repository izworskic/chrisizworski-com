import fs from 'node:fs';

const js=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');
const api=fs.readFileSync('api/boat-launches.js','utf8');
const html=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');
const cfg=JSON.parse(fs.readFileSync('benchmarks/boat-launch-usability.json','utf8'));
const sourceCode=js+'\n'+api;

const pass=(...v)=>v.every(Boolean);
const checks={
  sourceCreatesInventory:{max:30,ok:pass(
    api.includes('PRDBASPublicView/FeatureServer/0'),
    api.includes("bas_type='Boating Access Site'"),
    api.includes("launch_status='Open'"),
    api.includes("greatlakesaccess LIKE 'Yes%'"),
    api.includes('facilityid IS NOT NULL'),
    js.includes("const SOURCE_API='/api/boat-launches'"),
    js.includes("const raw=(j.features||[]).map(cleanFeature).filter(Boolean)"),
    !html.includes('id="locdata"'),
    !html.includes('"numberOfItems": 42')
  )},
  noLegacyOrFuzzyFallback:{max:20,ok:pass(
    !sourceCode.includes('MANUAL_VERIFIED'),
    !sourceCode.includes('ALIASES'),
    !sourceCode.includes('bestMatch'),
    !sourceCode.includes('nameSimilarity'),
    !sourceCode.includes("confidence:'approximate'"),
    !html.includes('Bay City State Park Launch')
  )},
  sourceQualityFilters:{max:15,ok:pass(
    api.includes("referenceonly || \"\""),
    api.includes("String(a.flag || \"\").trim()"),
    api.includes('latitude IS NOT NULL'),
    api.includes('longitude IS NOT NULL'),
    api.includes('waterwaysprogramconfirmation'),
    api.includes('qaqc_1_date'),
    js.includes('if(!a.facilityid||!a.name')
  )},
  mapRecordCorrelation:{max:15,ok:pass(
    js.includes('const markerById=new Map()'),
    js.includes('markerById.set(a.id,m)'),
    js.includes('data-launch-id'),
    js.includes("m.on('click',()=>select(a.id,'marker'))"),
    js.includes('function select(id,source='),
    js.includes('Facility ID'),
    js.includes('Directions')
  )},
  decisionDetails:{max:10,ok:pass(
    sourceCode.includes('ntrailerableparking'),
    sourceCode.includes('nlanes'),
    sourceCode.includes('rampcode_new'),
    sourceCode.includes('operating_hours'),
    sourceCode.includes('greatlakesaccess'),
    sourceCode.includes('carrydowntype')
  )},
  failClosed:{max:10,ok:pass(
    api.includes('fallback_used: false'),
    api.includes('res.status(502)'),
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
if(/navigator\.geolocation|getCurrentPosition|localStorage|sessionStorage/.test(sourceCode))fatals.push('Unexpected precise location or persistent browser storage introduced.');

const loss=100-score;
console.log(`Boat Launch source-integrity candidate: ${score}/100 (loss ${loss})`);
if(fatals.length)fatals.forEach(x=>console.error(`FATAL: ${x}`));
if(process.argv.includes('--check')&&(score<cfg.target.minimumEffectiveScore||loss>cfg.target.maximumLoss||fatals.length))process.exit(1);
