#!/usr/bin/env node
import fs from 'node:fs';

const cfg=JSON.parse(fs.readFileSync('benchmarks/boat-launch-product-v3.json','utf8'));
const html=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');
const js=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');
const api=fs.readFileSync('api/boat-launches.js','utf8');
const geocode=fs.readFileSync('api/boat-launch-geocode.js','utf8');
const code=js+'\n'+api+'\n'+geocode;

const score={sourceTruth:0,destinationSearchCoverage:0,decisionUtility:0,mapAndMobileUX:0,conditionsAndTrust:0,discoveryPerformance:0};
const failures=[];const fatals=[];
const add=(key,points,ok,msg)=>{if(ok)score[key]+=points;else failures.push(`${key}: ${msg}`);};

// SOURCE TRUTH — 30
add('sourceTruth',8,/PRDBASPublicView\/FeatureServer\/0/.test(api),'primary DNR source is missing');
add('sourceTruth',5,!/MANUAL_VERIFIED|ALIASES|bestMatch|nameSimilarity|tokenScore/.test(code),'legacy/fuzzy launch creation remains');
add('sourceTruth',4,!/id="locdata"/.test(html)&&!/Bay City State Park Launch/.test(code+html),'static or known-false launch inventory remains');
add('sourceTruth',5,/fallback_used:\s*false/.test(api)&&/No legacy or guessed launch pins/.test(js),'source failure can fall back to guessed launch data');
const stableFallback=/globalid/.test(api)&&/OBJECTID/.test(api)&&!/facilityid IS NOT NULL/.test(api)&&/sourceId\(a\)/.test(api);
add('sourceTruth',8,stableFallback,'nullable facilityid is not protected by a stable authoritative ID fallback');
if(!stableFallback)fatals.push('Nullable facilityid can still erase an otherwise valid DNR launch.');

// DESTINATION SEARCH + COVERAGE — 25
const hasGeocoder=/GEOCODE_API='\/api\/boat-launch-geocode'/.test(js)&&/nominatim\.openstreetmap\.org/.test(geocode)&&/bounded/.test(geocode);
const hasDistance=/function distanceMiles/.test(js)&&/toRadians/.test(js);
const substringOnly=/hay\.includes\(q\)/.test(js);
add('destinationSearchCoverage',8,hasGeocoder,'destination-to-coordinate resolution is missing or browser-direct');
add('destinationSearchCoverage',8,hasDistance,'geospatial launch-distance calculation is missing');
add('destinationSearchCoverage',5,!substringOnly,'destination search is still a launch-record substring filter');
add('destinationSearchCoverage',4,/chooseNearby/.test(js)&&/within25/.test(js)&&/radiusUsed/.test(js),'nearby shortlist/radius expansion is not implemented');
if(substringOnly||!hasGeocoder||!hasDistance)fatals.push('Destination search is not a complete geocoded geographic search.');

// DECISION UTILITY — 20
add('decisionUtility',4,/trailerParking/.test(js),'trailer parking is missing');
add('decisionUtility',3,/\.lanes/.test(js),'launch lanes are missing');
add('decisionUtility',3,/rampClass/.test(js),'ramp class is missing');
add('decisionUtility',3,/operatingHours/.test(js),'operating hours are missing');
add('decisionUtility',2,/\.fee/.test(js),'fee/passport information is missing');
add('decisionUtility',2,/operatorText|\.operator/.test(js),'operator context is missing');
add('decisionUtility',3,/distanceMiles\.toFixed|distance from/i.test(js),'distance from destination is missing');

// MAP + MOBILE UX — 15
add('mapAndMobileUX',5,/markerById=new Map\(\)/.test(js)&&/data-launch-id/.test(js)&&/select\(a\.id,'marker'\)/.test(js),'map/card correlation is incomplete');
add('mapAndMobileUX',3,/fitBounds/.test(js),'map does not fit destination and results');
add('mapAndMobileUX',3,/destinationMarker/.test(js)&&/destination-map-marker/.test(html+js),'destination is not distinct on the map');
add('mapAndMobileUX',2,/@media\(max-width:|@media \(max-width:/.test(html),'mobile layout protection is missing');
add('mapAndMobileUX',2,/google\.com\/maps\/dir/.test(js),'verified-coordinate directions action is missing');

// CONDITIONS + TRUST — 5
add('conditionsAndTrust',3,!/safety score|safe to launch|safe boating score/i.test(code+html),'unsupported safety certainty is presented');
add('conditionsAndTrust',2,/source record|Michigan DNR|source layer/i.test(html+js),'source/trust language is missing');

// DISCOVERY + PERFORMANCE — 5
add('discoveryPerformance',2,/canonical" href="https:\/\/chrisizworski\.com\/michigan-boat-launches\//.test(html),'canonical URL changed or is missing');
add('discoveryPerformance',2,/Boat Launch Destination Search/.test(js)&&/Boat Launch Select/.test(js)&&/Boat Launch Action/.test(js),'decision analytics are incomplete');
add('discoveryPerformance',1,!/navigator\.geolocation|getCurrentPosition|localStorage|sessionStorage|document\.cookie/.test(code),'precise-location or persistent browser tracking introduced');

if(/Bay City State Park Launch/.test(code+html))fatals.push('Known false positive Bay City State Park Launch is present.');
if(/MANUAL_VERIFIED|bestMatch|nameSimilarity/.test(code))fatals.push('Legacy/manual/fuzzy launch creation is possible.');
if(!/fallback_used:\s*false/.test(api))fatals.push('Source failure does not explicitly prohibit fallback data.');
if(/facilityid IS NOT NULL/.test(api))fatals.push('Nullable facilityid is still a hard source gate.');
if(!/Destination lookup unavailable/.test(geocode))fatals.push('Geocoder outage does not have a distinct unavailable state.');

const total=Object.values(score).reduce((a,b)=>a+b,0);const loss=cfg.maxScore-total;
console.log(`Boat Launch Product V3: ${total}/${cfg.maxScore} (loss ${loss})`);
for(const d of cfg.dimensions)console.log(`  ${d.key}: ${score[d.key]}/${d.weight}`);
if(failures.length)console.log('\nNonfatal gaps:\n- '+failures.join('\n- '));
if(fatals.length)console.error('\nFatal failures:\n- '+fatals.join('\n- '));
const failed=total<cfg.target.minimumEffectiveScore||loss>cfg.target.maximumLoss||fatals.length>cfg.target.fatalFailuresAllowed;
if(process.argv.includes('--check')&&failed)process.exit(1);
