#!/usr/bin/env node
import fs from 'node:fs';
const cfg=JSON.parse(fs.readFileSync('benchmarks/boat-launch-product-v3.json','utf8'));
const html=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');
const js=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');
const api=fs.readFileSync('api/boat-launches.js','utf8');
const weather=fs.readFileSync('api/boat-launch-weather.js','utf8');
const geocode=fs.readFileSync('api/boat-launch-geocode.js','utf8');
const ranking=fs.readFileSync('public/assets/boat-launch-ranking.js','utf8');
const drive=fs.readFileSync('api/boat-launch-drive.js','utf8');
const code=html+'\n'+js+'\n'+api+'\n'+weather+'\n'+geocode;
const score={sourceTruth:0,statewideCoverage:0,mapAndSearchUX:0,decisionUtility:0,weatherAndTrust:0,discoveryPerformance:0};
const failures=[];const fatals=[];
const add=(key,points,ok,msg)=>{if(ok)score[key]+=points;else failures.push(`${key}: ${msg}`);};

add('sourceTruth',8,/PRDBASPublicView\/FeatureServer\/0/.test(api),'DNR source missing');
add('sourceTruth',6,!/MANUAL_VERIFIED|ALIASES|bestMatch|nameSimilarity|tokenScore/.test(code),'legacy/fuzzy launch creation remains');
add('sourceTruth',5,/globalid/.test(api)&&/OBJECTID/.test(api)&&!/facilityid IS NOT NULL/.test(api),'stable ID fallback missing');
add('sourceTruth',6,/fallback_used:\s*false/.test(api)&&/No legacy or guessed launch pins/.test(js),'source failure can create fallback pins');

const statewide=!/greatlakesaccess LIKE 'Yes%'/i.test(api)&&/statewide:\s*true/.test(api)&&/waterScope/.test(api);
add('statewideCoverage',10,statewide,'API is not statewide');
add('statewideCoverage',5,/inland-or-other/.test(api+html),'inland launch state is missing');
add('statewideCoverage',5,/All Michigan waters/.test(html)&&/All Michigan launches/.test(html),'UI is not statewide by default');
if(!statewide)fatals.push('Great-Lakes-only source gate still excludes inland launches.');

const searchInputs=(html.match(/<input[^>]+type="search"/g)||[]).length;
add('mapAndSearchUX',6,searchInputs===1,'finder must have exactly one user-facing text search box');
add('mapAndSearchUX',6,/markerClusterGroup/.test(js)&&/mapSet\(\)/.test(js)&&/for\(const a of mapSet\(\)\)/.test(js),'full filtered inventory is not mapped');
add('mapAndSearchUX',5,/GEOCODE_API='\/api\/boat-launch-geocode'/.test(js)&&/rankNearDestination/.test(js),'destination search/ranking missing');
add('mapAndSearchUX',4,/sort-filter/.test(html)&&/parking-filter/.test(html)&&/ramp-filter/.test(html),'sort/refinement controls missing');
add('mapAndSearchUX',4,/const markerById=new Map\(\)/.test(js)&&/data-launch-id/.test(js)&&/selectLaunch/.test(js),'map/list selection correlation missing');
if(searchInputs!==1)fatals.push('Redundant text-entry boxes remain.');
if(!/markerClusterGroup/.test(js))fatals.push('Statewide map does not cluster the full inventory.');

add('decisionUtility',4,/trailerParking/.test(js),'trailer parking missing');
add('decisionUtility',3,/rampClass/.test(js),'ramp class missing');
add('decisionUtility',2,/operatingHours/.test(js),'hours missing');
add('decisionUtility',2,/operatorText/.test(js),'operator missing');
add('decisionUtility',2,/google\.com\/maps\/dir/.test(js),'directions missing');
add('decisionUtility',2,/DRIVE_API='\/api\/boat-launch-drive'/.test(js)&&/driveMinutes/.test(js),'drive ranking missing');
if(!/DRIVE_API='\/api\/boat-launch-drive'/.test(js)||!/finalizeShortlist/.test(js))fatals.push('Destination search lost Claude/PR #83 drive-distance ranking.');
if(/function roundRadius/.test(js))fatals.push('Uncapped radius logic returned.');
if(!/STRAIGHT_LINE_DETOUR_RATIO/.test(ranking)||!resStatus502(drive))fatals.push('Routing fallback/range guard is incomplete.');

add('weatherAndTrust',4,/WEATHER_API='\/api\/boat-launch-weather'/.test(js)&&/api\.weather\.gov/.test(weather),'launch-local NWS weather missing');
add('weatherAndTrust',2,/alerts\/active\?point=/.test(weather),'point alerts missing');
add('weatherAndTrust',2,/not a .*boating-safety determination|not a .*boating-safety/i.test(weather+html),'weather safety boundary missing');
const reviewTrust=/Some details being verified/.test(html+js)&&/This launch is listed Open by Michigan DNR/.test(js)&&/does not mean the launch itself is closed or unsafe/i.test(html)&&/Review Needed/.test(html+api);
add('weatherAndTrust',2,reviewTrust,'plain-English review-state trust language missing');
if(/safe to boat|safe to launch|boating safety score/i.test(code))fatals.push('Weather is presented as a boating-safety determination.');

add('discoveryPerformance',2,/canonical" href="https:\/\/chrisizworski\.com\/michigan-boat-launches\//.test(html),'canonical missing');
add('discoveryPerformance',2,/Boat Launch Destination Search/.test(js)&&/Boat Launch Select/.test(js)&&/Boat Launch Action/.test(js),'analytics incomplete');
add('discoveryPerformance',1,!/navigator\.geolocation|getCurrentPosition|localStorage|sessionStorage|document\.cookie/.test(code),'precise-location/persistent tracking introduced');

if(/Bay City State Park Launch/.test(code))fatals.push('Known false Bay City State Park Launch is present.');
if(/facilityid IS NOT NULL/.test(api))fatals.push('Nullable facilityid is still a source gate.');
if(!/exceededTransferLimit/.test(api))fatals.push('Truncated DNR inventory can be served as complete.');
function resStatus502(src){return /res\.status\(502\)/.test(src);}
const total=Object.values(score).reduce((a,b)=>a+b,0);const loss=cfg.maxScore-total;
console.log(`Boat Launch Product V4: ${total}/${cfg.maxScore} (loss ${loss})`);
for(const d of cfg.dimensions)console.log(`  ${d.key}: ${score[d.key]}/${d.weight}`);
if(failures.length)console.log('\nNonfatal gaps:\n- '+failures.join('\n- '));
if(fatals.length)console.error('\nFatal failures:\n- '+fatals.join('\n- '));
const failed=total<cfg.target.minimumEffectiveScore||loss>cfg.target.maximumLoss||fatals.length>cfg.target.fatalFailuresAllowed;
if(process.argv.includes('--check')&&failed)process.exit(1);
