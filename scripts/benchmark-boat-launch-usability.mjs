import fs from 'node:fs';

const js=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');
const html=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');
const media=JSON.parse(fs.readFileSync('public/assets/michigan-boat-launches/hero-source.json','utf8'));
const cfg=JSON.parse(fs.readFileSync('benchmarks/boat-launch-usability.json','utf8'));

const pass=(...v)=>v.every(Boolean);
const checks={
  authoritativeLocation:{max:25,ok:pass(
    js.includes('DNR_State_Sponsored_Developed_Boating_Access_Sites_Public_View'),
    js.includes("confidence:'approximate'"),
    js.includes('Verified Michigan DNR access point'),
    js.includes('Approximate location — verify before towing'),
    js.includes('function bestMatch'),
    js.includes('function resolveFromMatch'),
    js.includes('marker.setLatLng([res.lat,res.lng])'),
    js.includes('Boat Launch Coordinate Audit')
  )},
  conversationalDecisionValue:{max:20,ok:pass(
    js.includes('Quick launch read'),
    js.includes('Today at this launch'),
    js.includes('Launch setup:'),
    js.includes('function quickRead'),
    js.includes('function facilityFacts'),
    js.includes('nLanes'),
    js.includes('nTrailerableParking'),
    js.includes('RAMPCODE_NEW')
  )},
  conditionsInterpretation:{max:15,ok:pass(
    js.includes('function todayRead'),
    js.includes('Regional lake conditions are on the milder side'),
    js.includes('Regional wind or waves are elevated'),
    js.includes('nearest mapped NDBC station'),
    js.includes('can differ materially inside a river, marina, bay or harbor'),
    js.includes('not ramp, marina, harbor or boating-safety truth')
  )},
  mapCardGoogleControl:{max:15,ok:pass(
    js.includes('const markerBySlug=new Map()'),
    js.includes('function syncMapToVisible'),
    js.includes('function jumpToRecord'),
    js.includes('function focusMap'),
    js.includes('Boat Launch Map To Record'),
    js.includes('Boat Launch Record To Map'),
    js.includes('Open in Google Maps'),
    js.includes('google.com/maps/dir/?api=1&destination='),
    js.includes('google.com/maps/search/?api=1&query=')
  )},
  personaUsefulness:{max:10,ok:pass(
    js.includes('Who this launch fits'),
    js.includes('Trailer angler:'),
    js.includes('Kayak / paddlecraft:'),
    js.includes('Family / casual:'),
    js.includes('function personaFits'),
    js.includes('Facility details are incomplete; check the operator')
  )},
  nearbyAlternatives:{max:10,ok:pass(
    js.includes('Nearby alternatives'),
    js.includes('function nearbyFor'),
    js.includes('data-launch-compare'),
    js.includes('Boat Launch Alternative'),
    js.includes("selectedCard?.dataset.protection==='exposed'")
  )},
  authenticMedia:{max:5,ok:pass(
    media.type==='real-photograph',
    media.license==='CC BY 3.0',
    js.includes('Lake_erie_metropark_boat_launch.JPG'),
    js.includes('Dwight Burdette'),
    js.includes("dataset.photoSource='real-michigan-launch'")
  )}
};

let score=0;
for(const [key,c] of Object.entries(checks)){
  const earned=c.ok?c.max:0;score+=earned;
  console.log(`${c.ok?'PASS':'FAIL'}  ${earned}/${c.max}  ${key}`);
}

const fatals=[];
if(!checks.authoritativeLocation.ok)fatals.push('Launch location source/confidence contract is incomplete.');
if(!/if\(isVerified\(res\)\)return `https:\/\/www\.google\.com\/maps\/dir/.test(js)||!js.includes('google.com/maps/search/?api=1&query='))fatals.push('Approximate points can still become confident routing destinations.');
if(!checks.mapCardGoogleControl.ok)fatals.push('Map, card and Google Maps do not share one decision state.');
if(!checks.conditionsInterpretation.ok)fatals.push('Regional condition data is not safely interpreted.');
if(!checks.personaUsefulness.ok)fatals.push('The tool does not serve its three core visitor personas.');
if(!checks.authenticMedia.ok)fatals.push('Visible launch media is not traceable to a real photograph.');
if(!html.includes('"numberOfItems": 42'))fatals.push('The 42-launch search inventory changed unexpectedly.');
if(/navigator\.geolocation|getCurrentPosition|localStorage|sessionStorage/.test(js))fatals.push('Unexpected personal location/storage behavior was introduced.');

const loss=100-score;
console.log(`Boat Launch decision-usability baseline: ${cfg.baseline.score}/100 (loss ${cfg.baseline.loss})`);
console.log(`Boat Launch decision-usability candidate: ${score}/100 (loss ${loss})`);
if(fatals.length)fatals.forEach(x=>console.error(`FATAL: ${x}`));
if(process.argv.includes('--check')&&(score<cfg.target.minimumEffectiveScore||loss>cfg.target.maximumLoss||fatals.length))process.exit(1);
