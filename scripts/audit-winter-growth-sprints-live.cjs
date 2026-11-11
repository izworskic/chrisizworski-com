'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const BASE='https://chrisizworski.com',out={checkedAt:new Date().toISOString(),checks:[]};
async function get(path,html=false,timeout=30000,extra={}){
 let last;for(let i=0;i<2;i++){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{
   const r=await fetch(path.startsWith('https://')?path:BASE+path,{headers:{accept:html?'text/html':'application/json','cache-control':'no-cache',...extra},signal:ctrl.signal});
   if(!r.ok)throw Error('HTTP '+r.status+' '+path);
   return {data:html?await r.text():await r.json(),headers:r.headers};
  }catch(e){last=e;}finally{clearTimeout(timer);}
 }throw last;
}
const recent=(time,max=4)=>{const age=(Date.now()-Date.parse(time||''))/3600000;assert.ok(Number.isFinite(age)&&age>=-0.1&&age<=max,'missing or stale data timestamp '+time);};
async function run(name,fn){
 try{let note=await fn();out.checks.push({name,status:'PASS',note:note||'source contract valid'});}
 catch(e){out.checks.push({name,status:'FAIL',reason:String(e.message||e).slice(0,270)});}
}
const jobs=[
 ['Aurora NOAA',async()=>{let d=(await get('/api/aurora')).data;recent(d.fetched_at);assert.ok(d.forecast&&d.source_freshness);return 'degraded='+d.degraded;}],
 ['Mackinac Bridge',async()=>{let d=(await get('/api/mackinac')).data;recent(d.fetched_at);assert.equal(typeof d.official?.available,'boolean');return 'official available='+d.official.available;}],
 ['Snow reports',async()=>{let d=(await get('/api/michigan-snow-totals')).data;assert.equal(d.ok,true);recent(d.generatedAt);assert.ok(d.windows?.['24h']&&d.windows?.['168h']);return '24h reports='+d.windows['24h'].reportCount+'; zero reports allowed; degraded='+d.degraded;}],
 ['ACIS season snow',async()=>{let d=(await get('/api/michigan-snow-totals?view=season')).data;assert.equal(d.ok,true);recent(d.generatedAt);}],
 ['Duluth AIS',async()=>{let d=(await get('/api/duluth-canal')).data;assert.equal(d.ok,true);recent(d.checkedAt);assert.ok(Array.isArray(d.mapVessels));return 'vessels='+d.mapVessels.length+'; zero traffic allowed';}],
 ['Welland AIS',async()=>{let d=(await get('/api/welland-canal')).data;assert.equal(d.ok,true);recent(d.checkedAt);assert.ok(Array.isArray(d.vessels));return 'vessels='+d.vessels.length;}],
 ['Freighter tracker',async()=>{let d=(await get('/api/freighter-ais')).data;assert.equal(d.ok,true);recent(d.checkedAt);assert.ok(Array.isArray(d.vessels));}],
 ['Lake-effect NWS',async()=>{let d=(await get('/api/lake-effect?list=1')).data;assert.ok(d.regions?.some(x=>x.id==='mi-gaylord'));for(let id of ['mi-gaylord','mi-keweenaw']){let v=(await get('/api/lake-effect?region='+id)).data;assert.equal(v.status,'ok');assert.equal(v.verdict?.data_ok,true);assert.ok(v.verdict.first_12h?.valid_hours>=12);}return 'two Michigan regions have 12 valid NWS hours';}],
 ['Snow-depth decision and CORS',async()=>{let url='https://national-snowpack-melt.vercel.app/api/michigan-good-snow?lat=43.60&lon=-83.90&driveHours=3&activity=snowshoe&tripHours=72';let x=await get(url,false,45000,{Origin:BASE});assert.equal(typeof x.data.verdict,'string');assert.ok(Array.isArray(x.data.destinations));assert.equal(x.headers.get('access-control-allow-origin'),BASE);return 'verdict='+x.data.verdict;}],
 ['Ski resort weather',async()=>{let d=(await get('/api/michigan-ski',false,45000)).data;assert.equal(d.ok,true);recent(d.generatedAt);assert.equal(d.resorts?.length,18);assert.ok(d.health?.nwsGridAvailable>0,'no NWS grids');return d.health.nwsGridAvailable+'/18 grids, '+d.health.officialReportsParsed+'/18 official operator reports';}],
 ['Snowmobile season gate',async()=>{let d=(await get('/api/snowmobile',false,45000)).data;recent(d.generatedAt);assert.equal(d.regions?.length,7);if(d.season.active===false)assert.equal(d.statewide.rankableRegionCount,0);return '7 regions; season active='+d.season.active;}],
 ['Five ice cave evidence sites',async()=>{let d=(await get('/api/ice?view=caves',false,45000)).data;assert.equal(d.ok,true);recent(d.generatedAt);assert.equal(d.sites?.length,5);for(let s of d.sites)if(s.evidence?.prime)assert.ok(s.evidence.reportFresh&&s.evidence.access==='reviewed-open');}],
 ['Saginaw Bay NWS 72h forcing',async()=>{let d=(await get('/api/ice-now?region=saginaw-bay',false,45000)).data;assert.equal(d.ok,true);assert.ok(d.forecast,'200 OK but forecast null');assert.ok(d.forecast.next72h?.hours>=72,'incomplete NWS data');recent(d.forecast.issuedAt,26);return d.forecast.source;}],
 ['CARTO map source config',async()=>{let d=(await get('/api/carto-basemap-config')).data;assert.ok(d.provider==='CARTO'&&typeof d.key==='string'&&d.key.length>10);return 'map configuration exists; tile rendering not tested';}]
];
const pages=[
 ['/great-lakes-freighter-tracking/','freighter'],['/mackinac-bridge-live/','toll'],['/northern-lights-michigan/','northern'],
 ['/michigan-snow-totals/','town-shortcuts'],['/duluth-canal-park/','harborlookout.com'],['/welland-canal/','welland'],
 ['/soo-locks/','soo'],['/michigan-snow-depth/','michigan-good-snow.js'],['/lake-effect-snow/','lake-effect.js'],
 ['/michigan-winter-weekends/','michigan-winter-weekend-desk.js'],['/michigan-ski-hills/','Three checks before you buy or drive'],
 ['/michigan-cross-country-skiing/','groom'],['/snowmobile/','Before you load the sleds'],
 ['/snowmobile/regions/grayling-gaylord.html','Three checks the map cannot replace'],
 ['/frozen-michigan/','frozen-michigan-readiness.js'],['/michigan-ice-caves/','/frozen-michigan/#frozen-trip-desk']
];
jobs.push(['All sixteen sprint landing pages',async()=>{
 let errors=[];
 await Promise.all(pages.map(async ([url,marker])=>{try{let h=(await get(url,true)).data;assert.ok(h.includes('rel="canonical" href="'+BASE+url+'"'),'canonical');assert.match(h,/<h1(?:\s|>)/i);assert.ok(h.toLowerCase().includes(marker.toLowerCase()),'feature marker '+marker);}catch(e){errors.push(url+': '+e.message);}}));
 assert.equal(errors.length,0,errors.join('; '));return pages.length+' canonicals and feature markers';
}]);
async function main(){let i=0;await Promise.all(Array.from({length:4},async()=>{while(i<jobs.length){const n=i++;await run(jobs[n][0],jobs[n][1]);}}));
 out.checks.sort((a,b)=>jobs.findIndex(j=>j[0]===a.name)-jobs.findIndex(j=>j[0]===b.name));
 out.failures=out.checks.filter(x=>x.status==='FAIL').length;
 out.limitations=['Valid no-snow, empty harbor and preseason states are not outages.','Browser maps, pins and touch gestures need a separate real-browser run.'];
 fs.mkdirSync('artifacts',{recursive:true});
 fs.writeFileSync('artifacts/winter-sprints-production-health.json',JSON.stringify(out,null,2)+'\n');
 for(let c of out.checks)console.log(c.status+' '+c.name+' '+(c.note||c.reason));
 console.log('FAIL '+out.failures+'/'+out.checks.length);if(out.failures)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});