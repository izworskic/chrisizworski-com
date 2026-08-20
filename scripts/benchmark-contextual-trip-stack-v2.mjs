#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=f=>readFile(path.join(root,f),'utf8');
const failures=[];let score=0;
function check(name,ok,points,detail=''){if(ok)score+=points;else failures.push(detail?`${name}: ${detail}`:name)}
const cfg=JSON.parse(await read('benchmarks/contextual-trip-stack-growth.json'));
const asset=await read('public/assets/contextual-trip-stack.js');
const field=await read('public/assets/field-camera.js');
const manistee=await read('public/assets/manistee-river-coverage-ui.js');
const weekend=await read('public/fall-color/this-weekend/index.html');
const llms=await read('public/llms.txt');
const pkg=JSON.parse(await read('package.json'));
check('Fall pages load contextual stack',field.includes('/assets/contextual-trip-stack.js')&&field.includes("pathname.startsWith('/fall-color/')"),20);
const regionIds=['wup','eup','tip','nwl','nel','cen','swl','sel'];
check('Eight regional trip stacks exist',regionIds.every(id=>asset.includes(`${id}:{title:`)),10);
const destKeys=['aurora','bridge','soo','pictured','circle','wine','outdoors','weekend','ausable','manistee','trout','salmon','birding','saginaw','beaches'];
check('Regional stacks span existing tool network',destKeys.filter(k=>asset.includes(`${k}:{label:`)).length>=15,10);
check('Weekend page has crawlable trip fallback',weekend.includes('data-contextual-trip-stack="fall-weekend"')&&['/northern-lights-michigan/','/mackinac-bridge-live/','https://picturedrocks.chrisizworski.com/','https://ausable.chrisizworski.com/','/manistee-river-map/','https://tcwine.chrisizworski.com/'].every(h=>weekend.includes(`href="${h}"`)),10);
check('Weekend ranking upgrades trip stack',weekend.includes('fall-weekend-ranked')&&weekend.includes('bestId:best.id'),5);
check('Manistee loads river continuation stack',manistee.includes('/assets/contextual-trip-stack.js')&&['trout','salmon','ausable','weekend'].every(k=>asset.includes(`'${k}'`)),15);
check('Handoffs use symbolic analytics only',asset.includes("name:'Contextual Tool Handoff'")&&!/geolocation|latitude|longitude|localStorage|sessionStorage|document\.cookie|fingerprint/i.test(asset),10);
const protectedTitles={
  'public/northern-lights-michigan/index.html':'Northern Lights Michigan Tonight: Aurora | Chris Izworski',
  'public/soo-locks/index.html':'Soo Locks Schedule Today: Ships &amp; Map | Chris Izworski',
  'public/when-to-plant-tomatoes-michigan/index.html':'When to Plant Tomatoes in Michigan: 2026 Dates by Region',
  'public/michigan-frost-dates/index.html':'Michigan Last Frost Dates by City: 2026 Planting Calendar',
  'public/great-lakes-freighter-tracking/index.html':'Great Lakes Ship Tracker Live: AIS Map | Chris Izworski'
};
let protectedOk=true;for(const [file,title] of Object.entries(protectedTitles)){const html=await read(file);if(!html.includes(`<title>${title}</title>`))protectedOk=false}
check('Protected experiment titles stay frozen',protectedOk,15);
check('Machine discovery exposes the connected fall and river owners',llms.includes('## Michigan Fall 2026 Decision Pages')&&llms.includes('## Michigan River Tools')&&llms.includes('Manistee River Field Map')&&llms.includes('Au Sable Field Map'),5);
check('Benchmark is in full release gate',pkg.scripts['benchmark:trip-stack']==='node scripts/benchmark-contextual-trip-stack-v2.mjs'&&pkg.scripts['verify:all'].includes('benchmark:trip-stack'),0);
console.log('\nCONTEXTUAL TRIP STACK GROWTH BENCHMARK');
console.log('='.repeat(72));
console.log(`Score: ${score}/100`);
console.log(`Observed evidence: ${cfg.searchConsoleEvidence.fall[0].impressions} impressions on Michigan fall color map 2026 at position ${cfg.searchConsoleEvidence.fall[0].averagePosition}; Au Sable tubing map ${cfg.searchConsoleEvidence.rivers[0].impressions} impressions at position ${cfg.searchConsoleEvidence.rivers[0].averagePosition}.`);
if(failures.length){console.log('Failures:');failures.forEach(f=>console.log(` - ${f}`));}
if(process.argv.includes('--check')){if(score<cfg.releaseGate.minimumScore||failures.length)process.exitCode=1;else console.log('benchmark:trip-stack PASS\n');}
