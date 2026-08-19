#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=rel=>readFile(path.join(root,rel),'utf8');
const config=JSON.parse(await read('benchmarks/decision-network-growth.json'));
const [tools,greatLakes,boat,wreck,boatJs,wreckJs,networkJs,networkCss]=await Promise.all([
  read('public/tools/index.html'),read('public/great-lakes/index.html'),read('public/michigan-boat-launches/index.html'),read('public/great-lakes-shipwrecks/index.html'),read('public/assets/boat-launch-finder.js'),read('public/assets/shipwreck-explorer.js'),read('public/assets/decision-network.js'),read('public/assets/decision-network.css')
]);
const failures=[];
const score={authorityGraph:0,boatDecisionUsefulness:0,shipwreckExplorerDepth:0,searchIntegrity:0,trustAndPrivacy:0,measurement:0};
const add=(key,pts,ok,msg)=>{if(ok)score[key]+=pts;else failures.push(`${key}: ${msg}`);};
const title=html=>(html.match(/<title>([^<]+)<\/title>/i)||[])[1]||'';
const meta=html=>(html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)||[])[1]||'';
const canonical=html=>(html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)||[])[1]||'';

// Authority graph: 20
const toolLinks=(tools.match(/data-decision-network=/g)||[]).length;
const glLinks=(greatLakes.match(/data-decision-network=/g)||[]).length;
add('authorityGraph',8,toolLinks>=15,`tools task graph has ${toolLinks} measured links; expected at least 15`);
add('authorityGraph',6,glLinks>=9,`Great Lakes graph has ${glLinks} measured links; expected at least 9`);
add('authorityGraph',3,/decision-network\.css/.test(tools)&&/decision-network\.css/.test(greatLakes),'shared decision-network CSS is not loaded on both hubs');
add('authorityGraph',3,/decision-network\.js/.test(tools)&&/decision-network\.js/.test(greatLakes),'shared handoff measurement is not loaded on both hubs');

// Boat: 20
add('boatDecisionUsefulness',5,/PRDBASPublicView\/FeatureServer\/0/.test(boatJs)&&/launch_status='Open'/.test(boatJs)&&/greatlakesaccess LIKE 'Yes%'/.test(boatJs),'boat inventory is not source-first');
add('boatDecisionUsefulness',5,!/id="locdata"/.test(boat)&&!/MANUAL_VERIFIED|ALIASES|bestMatch|nameSimilarity/.test(boatJs)&&!/Bay City State Park Launch/.test(boat),'legacy/fuzzy launch inventory remains');
add('boatDecisionUsefulness',4,/const markerById=new Map\(\)/.test(boatJs)&&/google\.com\/maps\/dir/.test(boatJs)&&/data-launch-id/.test(boatJs),'map/card/directions correlation is incomplete');
add('boatDecisionUsefulness',3,/ntrailerableparking/.test(boatJs)&&/nlanes/.test(boatJs)&&/rampcode_new/.test(boatJs)&&/operating_hours/.test(boatJs),'source-backed launch decision details are incomplete');
add('boatDecisionUsefulness',3,/URLSearchParams/.test(boatJs)&&/replaceState/.test(boatJs),'shareable boat filter state missing');

// Shipwreck: 20
const wreckRows=(wreck.match(/<tr><td><strong>/g)||[]).length;
add('shipwreckExplorerDepth',5,wreckRows>=60,`wreck inventory fell below 60 (${wreckRows})`);
add('shipwreckExplorerDepth',5,/shipwreck-explorer\.js/.test(wreck)&&/Great Storm of 1913/.test(wreckJs)&&/Lake Superior/.test(wreckJs)&&/Highest loss of life/.test(wreckJs),'shipwreck explorer presets are incomplete');
add('shipwreckExplorerDepth',4,/named-place (?:story )?anchors/i.test(wreckJs)&&/not wreck coordinates/i.test(wreckJs),'shipwreck map precision boundary missing');
add('shipwreckExplorerDepth',3,/Daniel J\. Morrell<\/strong><\/td><td>Huron<\/td>/.test(wreck)&&/Harbor Beach, MI/.test(wreck),'Daniel J. Morrell lake/location correction missing');
add('shipwreckExplorerDepth',3,/Edmund Fitzgerald<\/strong>[\s\S]{0,500}Restricted \/ licensed/.test(wreck)&&/Hamilton &(?:amp;)? Scourge<\/strong>[\s\S]{0,500}Restricted \/ licensed/.test(wreck)&&!/designated a maritime burial ground, diving is prohibited/i.test(wreck),'prescribed Ontario wreck access labels or FAQ wording are inconsistent');

// Search integrity: 15
add('searchIntegrity',3,title(boat).length>0&&title(boat).length<=60,`boat title length ${title(boat).length}`);
add('searchIntegrity',3,title(wreck).length>0&&title(wreck).length<=60,`wreck title length ${title(wreck).length}`);
add('searchIntegrity',2,meta(boat).length>0&&meta(boat).length<=158,`boat meta length ${meta(boat).length}`);
add('searchIntegrity',2,meta(wreck).length>0&&meta(wreck).length<=158,`wreck meta length ${meta(wreck).length}`);
add('searchIntegrity',3,canonical(boat)==='https://chrisizworski.com/michigan-boat-launches/'&&canonical(wreck)==='https://chrisizworski.com/great-lakes-shipwrecks/','parent canonical ownership changed');
const launchChildren=(await readdir(path.join(root,'public/michigan-boat-launches'),{withFileTypes:true})).filter(x=>x.isDirectory()).map(x=>x.name).sort();
add('searchIntegrity',2,launchChildren.join(',')==='lake-michigan,saginaw-bay',`unexpected launch child URLs: ${launchChildren.join(',')}`);

// Trust/privacy: 15
const newCode=boatJs+'\n'+wreckJs+'\n'+networkJs;
add('trustAndPrivacy',5,!/navigator\.geolocation|getCurrentPosition/i.test(newCode),'precise geolocation introduced');
add('trustAndPrivacy',4,!/localStorage|sessionStorage|document\.cookie/i.test(newCode),'browser storage/cookies introduced');
add('trustAndPrivacy',3,/No legacy or guessed launch pins are being shown/.test(boatJs)&&/if\(layer\)layer\.clearLayers\(\)/.test(boatJs),'boat source failure does not fail closed');
add('trustAndPrivacy',3,/not navigation coordinates, dive coordinates/i.test(wreckJs),'wreck regional map could imply operational coordinates');

// Measurement: 10
add('measurement',3,/Boat Launch Filter/.test(boatJs)&&/Boat Launch Select/.test(boatJs)&&/Boat Launch Action/.test(boatJs),'boat decision events missing');
add('measurement',3,/Shipwreck Explorer Filter/.test(wreckJs)&&/Shipwreck Explorer Preset/.test(wreckJs)&&/Shipwreck Detail Open/.test(wreckJs),'shipwreck events missing');
add('measurement',4,/Decision Network Handoff/.test(networkJs)&&/destination:a\.dataset\.decisionNetwork/.test(networkJs)&&!/href/.test(networkJs),'network measurement must use symbolic destination metadata, not URLs');

const raw=Object.values(score).reduce((a,b)=>a+b,0);const fatal=raw<config.target.minimumEffectiveScore;const loss=config.maxScore-raw;
console.log(`Decision network growth candidate: ${raw}/${config.maxScore} (loss ${loss})`);
for(const d of config.dimensions)console.log(`  ${d.key}: ${score[d.key]}/${d.weight}`);
if(failures.length)console.log('Failures:\n- '+failures.join('\n- '));
if(process.argv.includes('--check')&&(fatal||loss>config.target.maximumLoss)){console.error('DECISION NETWORK GROWTH: FAIL');process.exit(1);}console.log('DECISION NETWORK GROWTH: PASS');
