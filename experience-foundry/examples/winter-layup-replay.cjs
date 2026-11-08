'use strict';
/* Same synthetic inputs and same adapter executed by Foundry v0.3 on captured baseline and candidate.
 * Bounded policy/source acceptance, not browser or real-time maritime verification.
 */
const fs=require('node:fs');
const path=require('node:path');
const root=process.argv[process.argv.indexOf('--source-root')+1];
if(!root||root==='--source-root')throw Error('Expected --source-root');
const model=require(path.join(root,'public/assets/freighter-layup-model.js'));
const ui=fs.readFileSync(path.join(root,'public/assets/freighter-layup.js'),'utf8');
const handler=ui.slice(ui.indexOf('function initPortViewingGuide()'),ui.indexOf('async function boot()'));
const data={harbors:[{id:'superior'}],seasons:[
  {id:'2026-27',label:'Winter 2026–2027',state:'upcoming_unconfirmed',records:[]},
  {id:'2025-26',label:'Winter 2025–2026',state:'historical_snapshot',records:[
    {harborId:'superior',status:'confirmed_historical',statusAsOf:'2026-01-15'},
    {harborId:'superior',status:'reported_historical',statusAsOf:'2026-01-18'}]},
  {id:'2024-25',label:'Winter 2024–2025',state:'historical_snapshot',records:[
    {harborId:'superior',status:'confirmed_historical',statusAsOf:'2025-01-11'}]}
]};
const pick=typeof model.harborEvidenceOptions==='function'?model.harborEvidenceOptions:null;
const out=[];
const unknown=pick?pick(data,'superior','2026-27','2026-27'):null;
out.push({id:'unknown-current-season',passed:Boolean(unknown&&unknown.current.count===0&&
  unknown.history[0].id==='2025-26'&&unknown.history[0].count===2&&unknown.selected.id==='2026-27'),
 observed:unknown?'Current reports='+unknown.current.count+', selected='+unknown.selected.id+', archive='+unknown.history.map(s=>s.id+':'+s.count).join(','):'Harbor evidence chooser unavailable; legacy click silently switches to archive.'});
const active=JSON.parse(JSON.stringify(data));
active.seasons[0].state='active_current';
active.seasons[0].records=[
  {harborId:'superior',status:'confirmed_current',statusAsOf:'2026-11-07'},
  {harborId:'superior',status:'reported_current',statusAsOf:'2026-11-08'},
  {harborId:'superior',status:'departed_current',statusAsOf:'2026-11-09'}];
const current=pick?pick(active,'superior','2026-27','2026-27'):null;
out.push({id:'current-stay-vs-departed',passed:Boolean(current&&current.current.count===2&&
  current.current.confirmed===1&&current.current.reported===1&&current.current.latestAsOf==='2026-11-08'&&
  current.history[0].count===2),
 observed:current?'Current='+current.current.count+', confirmed='+current.current.confirmed+
  ', reported='+current.current.reported+', last='+current.current.latestAsOf+
  '; historical='+current.history[0].count:'Current/historical evidence options do not exist in the captured model.'});
const explicit=/harborEvidenceOptions/.test(handler)&&
  /chooseSeason\(s.id,'historical'\)/.test(handler)&&
  /data-harbor-evidence-choices/.test(handler)&&
  !/if\(historical\)\{[^}]*setSeason\(/.test(handler);
out.push({id:'explicit-archive-transition',passed:explicit,
  observed:explicit?'Port card exposes a dated archive choice; year changes only in the explicit chooseSeason handler.':
    'Legacy port button can call setSeason when no current harbor record exists, without a choice.'});
const historic=model.classify({status:'confirmed_historical'},data.seasons[1]);
const departed=model.classify({status:'departed_current'},active.seasons[0]);
out.push({id:'existing-status-classification',passed:historic.confirmed===true&&departed.departed===true&&departed.confirmed===false,
  observed:'Legacy policy reports historic confirmed='+historic.confirmed+
    ', departed='+departed.departed+', departed classified confirmed='+departed.confirmed+'.'});
console.log(JSON.stringify({cases:out}));
