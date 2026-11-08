'use strict';
// This is a bounded model replay, not browser proof or current launch evidence.
const path=require('node:path');
const root=process.argv[process.argv.indexOf('--source-root')+1];
const model=require(path.join(root,'public/assets/rocket-flight-desk.js'));
const id='22222222-2222-4222-8222-222222222222';
const data={ok:true,region:{id:'florida',timezone:'America/New_York',authority:'https://www.nasa.gov/kennedy/'},
  selectedLaunch:{id,region:'florida',net:'2026-11-23T15:25:00Z',netPrecision:'minute'},
  scheduleFreshness:'recent',regions:[{id:'florida',feedState:'ok'}],access:{},weather:{level:'unavailable'}};
const next=model.nextCheck(data),empty=model.nextCheck(null);
const destination=new URL(next.href,'https://chrisizworski.com');
console.log(JSON.stringify({cases:[
  {id:'selected-mission-link',passed:destination.pathname==='/national-tools/space-coast-launch/'&&destination.searchParams.get('launchId')===id,
    observed:'Selected '+id+'; next link resolves to '+destination.href},
  {id:'unavailable-source',passed:empty.gate==='source'&&new URL(empty.href).hostname==='www.nasa.gov'&&!empty.href.includes(id),
    observed:'No response returns gate '+empty.gate+' and source '+empty.href}
]}));
