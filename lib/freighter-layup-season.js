/* Living winter layup engine: dated sources establish layup; AIS never does. */
'use strict';
const SEASON_START_MONTH=11;
const PORTS=[
 {id:'superior',lat:46.724,lon:-92.086,radiusKm:14},
 {id:'sturgeon-bay',lat:44.833,lon:-87.378,radiusKm:13},
 {id:'milwaukee',lat:43.021,lon:-87.894,radiusKm:13},
 {id:'owen-sound',lat:44.578,lon:-80.944,radiusKm:12},
 {id:'toledo',lat:41.669,lon:-83.485,radiusKm:16}
];
const REPORT_CLASSES=new Set(['port_authority','operator','official_agency','maritime_historical_society','local_maritime_museum','journalistic_report','community_report']);
function seasonForDate(date){
 const d=new Date(date);
 if(!Number.isFinite(d.valueOf()))throw Error('Invalid date');
 const year=d.getUTCFullYear()-(d.getUTCMonth()+1<SEASON_START_MONTH?1:0);
 return year+'-'+String((year+1)%100).padStart(2,'0');
}
function utcStart(season){const year=Number(String(season).slice(0,4));return new Date(Date.UTC(year,10,1)).toISOString()}
function freshSeason(season){return {schemaVersion:1,season,startedAt:utcStart(season),updatedAt:null,events:[],previousSeasons:[]}}
function validLedger(s){
 if(!s||s.schemaVersion!==1||!/^20\d\d-\d\d$/.test(s.season)||!Array.isArray(s.events)||!Array.isArray(s.previousSeasons))return false;
 return s.events.every(x=>x.id&&x.vessel?.name&&x.vessel?.key&&PORTS.some(h=>h.id===x.harborId)&&['confirmed','reported'].includes(x.confidence)&&['arrival','berth_change','maintenance','departure','status_update'].includes(x.kind)&&/^20\d\d-\d\d-\d\d$/.test(x.date)&&x.source?.url?.startsWith('https://')&&x.source?.publisher&&REPORT_CLASSES.has(x.source?.class));
}
function rollover(ledger,season){
 if(!validLedger(ledger))throw Error('Invalid live layup ledger; refusing to overwrite');
 if(ledger.season===season)return ledger;
 if(Number(season.slice(0,4))<Number(ledger.season.slice(0,4)))throw Error('Refusing backward season rollover');
 const archives=ledger.previousSeasons.slice();
 if(ledger.events.length)archives.push({season:ledger.season,events:ledger.events.map(x=>({...x}))});
 return {...freshSeason(season),previousSeasons:archives.slice(-12)};
}
function norm(s){return String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
function stableSlug(name){return norm(name).replace(/ /g,'-').slice(0,85)}
function sameEvent(a,b){return a.vessel.key===b.vessel.key&&a.kind===b.kind&&a.harborId===b.harborId&&a.date===b.date&&a.source.url===b.source.url}
function addEvidence(ledger,input,now=new Date().toISOString()){
 if(!validLedger(ledger))throw Error('Invalid live ledger');
 const item={...input,vessel:{name:input?.vessel?.name,key:input?.vessel?.key},source:{...input?.source}};
 item.id=[ledger.season,item.vessel?.key,item.kind,item.date,item.harborId].map(stableSlug).join('--').slice(0,240);
 const candidate={...ledger,events:[...ledger.events,item]};
 if(!validLedger(candidate))throw Error('Invalid dated layup event');
 if(new Date(item.date).valueOf()<new Date(ledger.startedAt).valueOf()-86400000)throw Error('Dated event belongs to earlier winter');
 if(new Date(item.date).valueOf()>new Date(now).valueOf()+86400000)throw Error('Future event not accepted');
 // Immutable evidence: one source for the same vessel/harbor/event/date cannot be applied twice.
 if(ledger.events.some(x=>sameEvent(x,item)))return {changed:false,ledger};
 const eventId=item.id+'--'+stableSlug(new URL(item.source.url).hostname);
 item.id=eventId;
 const events=[...ledger.events,item].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 return {changed:true,ledger:{...ledger,updatedAt:now,events}};
}
function statusFor(ledger,key){
 const events=ledger.events.filter(x=>x.vessel.key===key).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 if(!events.length)return null;
 const last=events.at(-1),arrival=[...events].reverse().find(x=>x.kind==='arrival');
 return {vessel:last.vessel,harborId:last.harborId,stage:last.kind==='departure'?'departed':arrival?'laid_up_reported':'season_story',confidence:events.some(x=>x.confidence==='confirmed'&&x.kind==='arrival')?'confirmed':'reported',last,events};
}
function standings(ledger){
 const ids=[...new Set(ledger.events.map(x=>x.vessel.key))];
 return ids.map(id=>statusFor(ledger,id)).filter(Boolean);
}
function haversine(lat,lon,refLat,refLon){
 const rad=Math.PI/180,a=(lat-refLat)*rad,b=(lon-refLon)*rad;
 const f=Math.sin(a/2)**2+Math.cos(refLat*rad)*Math.cos(lat*rad)*Math.sin(b/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(f),Math.sqrt(1-f));
}
function aisActivity(vessels,now=Date.now()){
 return (Array.isArray(vessels)?vessels:[]).flatMap(v=>{
  const seen=Date.parse(v.seen||''),lat=Number(v.lat),lon=Number(v.lon),speed=v.speedKnots==null?NaN:Number(v.speedKnots);
  if(!/^\d{9}$/.test(String(v.mmsi||''))||!Number.isFinite(seen)||seen>now+60000||now-seen>20*60000||
    !Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(speed))return [];
  const candidates=PORTS.map(h=>({...h,km:haversine(lat,lon,h.lat,h.lon)})).filter(h=>h.km<=h.radiusKm).sort((a,b)=>a.km-b.km);
  if(!candidates.length)return [];
  return [{name:String(v.name||'Unnamed AIS vessel').slice(0,90),mmsi:String(v.mmsi),harborId:candidates[0].id,
   seen:v.seen,speedKnots:speed,signal:'recent_ais_near_harbor_not_layup_confirmation',
   // intentionally no exact lat/lon: no inferred berth; traffic may be transiting/unloading
   behavior:speed<1?'slow_or_stationary':'moving',kmFromHarborCenter:Math.round(candidates[0].km)}];
 }).sort((a,b)=>a.harborId.localeCompare(b.harborId)||a.name.localeCompare(b.name)).slice(0,100);
}
module.exports={PORTS,seasonForDate,utcStart,freshSeason,validLedger,rollover,norm,stableSlug,addEvidence,statusFor,standings,haversine,aisActivity};
