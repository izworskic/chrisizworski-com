#!/usr/bin/env node
import fs from 'node:fs';

const cfg=JSON.parse(fs.readFileSync('benchmarks/boat-launch-product-v3.json','utf8'));
const html=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');
const js=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');
const api=fs.readFileSync('api/boat-launches.js','utf8');

const score={
  sourceTruth:0,
  destinationSearchCoverage:0,
  decisionUtility:0,
  mapAndMobileUX:0,
  conditionsAndTrust:0,
  discoveryPerformance:0,
};
const failures=[];
const fatals=[];
const add=(key,points,ok,msg)=>{if(ok)score[key]+=points;else failures.push(`${key}: ${msg}`);};

// SOURCE TRUTH — 30
add('sourceTruth',8,/PRDBASPublicView\/FeatureServer\/0/.test(api),'primary DNR source is missing');
add('sourceTruth',5,!/MANUAL_VERIFIED|ALIASES|bestMatch|nameSimilarity|tokenScore/.test(js+api),'legacy/fuzzy launch creation remains');
add('sourceTruth',4,!/id="locdata"/.test(html)&&!/Bay City State Park Launch/.test(html+js+api),'static or known-false launch inventory remains');
add('sourceTruth',5,/fallback_used:\s*false/.test(api)&&/No legacy or guessed launch pins/.test(js),'source failure can fall back to guessed launch data');
const stableFallback=/globalid|OBJECTID/.test(api+js)&&!/facilityid IS NOT NULL/.test(api);
add('sourceTruth',8,stableFallback,'authoritative records can be discarded solely because nullable facilityid is absent');
if(!stableFallback)fatals.push('Nullable facilityid is still a hard source filter instead of using a stable authoritative ID fallback.');

// DESTINATION SEARCH + COVERAGE — 25
const hasGeocoder=/geocod|destinationPoint|destinationLat|destinationLng/i.test(js+api);
const hasDistance=/haversine|distanceMiles|distanceKm|greatCircle|toRadians/i.test(js+api);
const substringOnly=/hay\.includes\(q\)/.test(js)&&!hasGeocoder&&!hasDistance;
add('destinationSearchCoverage',8,hasGeocoder,'no destination-to-coordinate resolution is implemented');
add('destinationSearchCoverage',8,hasDistance,'no geospatial launch-distance calculation is implemented');
add('destinationSearchCoverage',5,!substringOnly,'destination search is still only a substring filter over launch record text');
add('destinationSearchCoverage',4,/radius|nearby|nearest|shortlist/i.test(js),'no nearby-launch shortlist/radius behavior is evident');
if(substringOnly)fatals.push('Destination search is substring-only; Bay City/Saginaw Bay can return zero even when verified launches exist nearby.');

// DECISION UTILITY — 20
add('decisionUtility',4,/ntrailerableparking/.test(js),'trailer parking is missing');
add('decisionUtility',3,/nlanes/.test(js),'launch lanes are missing');
add('decisionUtility',3,/rampcode_new/.test(js),'ramp class is missing');
add('decisionUtility',3,/operating_hours/.test(js),'operating hours are missing');
add('decisionUtility',2,/recpassport/.test(js),'fee/passport information is missing');
add('decisionUtility',2,/dnradmin|ownedby|operator/i.test(js),'operator/source ownership context is missing');
add('decisionUtility',3,/distance from|distanceMiles|distanceKm/i.test(js),'results do not tell the user how far each launch is from the chosen destination');

// MAP + MOBILE UX — 15
add('mapAndMobileUX',5,/markerById=new Map\(\)/.test(js)&&/data-launch-id/.test(js)&&/select\(a\.id,'marker'\)/.test(js),'map/card bidirectional record correlation is incomplete');
add('mapAndMobileUX',3,/fitBounds/.test(js),'map does not fit useful results');
add('mapAndMobileUX',3,/destination.*marker|destinationMarker|searchMarker/i.test(js),'chosen destination is not shown distinctly on the map');
add('mapAndMobileUX',2,/@media\(max-width:|@media \(max-width:/.test(html),'mobile layout protection is missing');
add('mapAndMobileUX',2,/google\.com\/maps\/dir/.test(js),'verified directions action is missing');

// CONDITIONS + TRUST — 5
const unsupportedSafety=/safety score|safe to launch|safe boating score/i.test(js+html);
add('conditionsAndTrust',3,!unsupportedSafety,'unsupported safety certainty is presented');
add('conditionsAndTrust',2,/source|DNR|official/i.test(html+js),'source/trust language is missing');

// DISCOVERY + PERFORMANCE — 5
add('discoveryPerformance',2,/canonical" href="https:\/\/chrisizworski\.com\/michigan-boat-launches\//.test(html),'canonical URL changed or is missing');
add('discoveryPerformance',2,/Boat Launch Filter|Boat Launch Select|Boat Launch Action/.test(js),'decision analytics are missing');
add('discoveryPerformance',1,!/localStorage|sessionStorage|document\.cookie/.test(js),'persistent browser tracking/storage introduced');

if(/Bay City State Park Launch/.test(html+js+api))fatals.push('Known false positive Bay City State Park Launch is present.');
if(/MANUAL_VERIFIED|bestMatch|nameSimilarity/.test(js+api))fatals.push('Legacy/manual/fuzzy launch creation is possible.');
if(!/fallback_used:\s*false/.test(api))fatals.push('Source failure does not explicitly prohibit fallback data.');

const total=Object.values(score).reduce((a,b)=>a+b,0);
const loss=cfg.maxScore-total;
console.log(`Boat Launch Product V3: ${total}/${cfg.maxScore} (loss ${loss})`);
for(const d of cfg.dimensions)console.log(`  ${d.key}: ${score[d.key]}/${d.weight}`);
if(failures.length)console.log('\nNonfatal gaps:\n- '+failures.join('\n- '));
if(fatals.length)console.error('\nFatal failures:\n- '+fatals.join('\n- '));
const failed=total<cfg.target.minimumEffectiveScore||loss>cfg.target.maximumLoss||fatals.length>cfg.target.fatalFailuresAllowed;
if(process.argv.includes('--check')&&failed)process.exit(1);
