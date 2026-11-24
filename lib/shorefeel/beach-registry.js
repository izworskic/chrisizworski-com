'use strict';
// One registry of physical destinations and source records, not a live swim report.
// All legacy URLs, forecast keys and source coordinates remain available.
const mi=require('../../data/beaches.json');
const us=require('../../data/shorefeel-us-coast.json');
const ca=require('../../data/shorefeel-canada-ontario.json');
const epaMi=require('../../data/shorefeel-epa-mi-2025.json');
const epaOther=require('../../data/shorefeel-epa-other-2025.json');
const LAKES=new Set(['Superior','Michigan','Huron','Erie','Ontario']);
const STATES=new Set(['MI','MN','WI','IL','IN','OH','PA','NY']);
const BASE='/great-lakes-beaches/';
const EPA_MAP='https://beacon.epa.gov/ords/beacon2/r/beacon_apex/beacon2/map-page';
// Explicitly reviewed catalog associations: matching name or existing alias,
// same state and lake (and county when supplied), <=1 km. Not an assertion that
// the mapped shoreline and editorial reference are the same physical point.
// Never merge adjacent source segments with one another.
const ASSOCIATIONS=Object.freeze({
 'mi:holland-state-park':'MI000349','mi:grand-haven-state-park':'MI000340',
 'mi:sleeping-bear-dunes-empire':'MI001101','mi:sleeping-bear-platte-river':'MI001396',
 'mi:caseville-county-park':'MI000455','mi:harrisville-state-park':'MI000348',
 'mi:sand-point-pictured-rocks':'MI566719','mi:grand-marais-beach':'MI439427',
 'mi:black-river-harbor':'MI001556','mi:crisp-point':'MI540942',
 'mi:sterling-state-park':'MI000379','mi:luna-pier':'MI000363',
 'mi:caseville-state-park':'MI000464','mi:oval-beach':'MI001148',
 'mi:pere-marquette-park':'MI000385','mi:stearns-park-beach':'MI001569',
 'mi:miners-beach':'MI909175','mi:marquette-south-beach':'MI000372',
 'mi:bird-creek-county-park':'MI000452','us:park-point-beach-house':'MN346355',
 'us:north-avenue-beach':'IL666876','us:illinois-beach-north':'IL677426',
 'us:evangola-state-park':'NY271506','us:woodlawn-beach-state-park':'NY626819',
 'us:southwick-beach-state-park':'NY304236'
});
const norm=s=>String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'').replace(/beach$/,'');
const lake=s=>{const k=String(s||'').replace(/^Lake /,'');return LAKES.has(k)?k:null;};
function distanceKm(a,b){
 const rad=Math.PI/180, dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;
 const x=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
 return 6371*2*Math.asin(Math.sqrt(Math.min(1,x)));
}
function location(lat,lon,precision){return {lat,lon,precision};}
function validLocation(p){
 return Number.isFinite(p?.lat)&&Number.isFinite(p?.lon)&&p.lat>=40&&p.lat<=50&&p.lon>=-93&&p.lon<=-75;
}
function sourceRef(key,name,point,source,guide,forecast){
 return {key,name,point,source,guide:guide||null,forecast};
}
function makeEntry(id,name,country,region,county,lakeName,point,kind,ref,aliases=[]){
 if(!validLocation(point)||!name||!id||!ref?.forecast)throw Error('Invalid beach registry record: '+id);
 if(!['US','CA'].includes(country)||(country==='US'&&!STATES.has(region))||(country==='CA'&&region!=='ON'))throw Error('Invalid region '+id);
 return {id,name,country,region,county:county||null,lake:lakeName,point,kind,
  mapEligible:kind==='beach',aliases:[...new Set(aliases.filter(Boolean))],refs:[ref],
  // Catalog presence does not establish current swimming safety or access.
  access:'not-verified-current',swimStatus:'unknown'};
}
function curatedRows(){
 return [
 ...mi.beaches.map(b=>{
  const key='mi:'+b.slug,point=location(b.lat,b.lng,'Editorial destination reference');
  const ref=sourceRef(key,b.name,point,'Michigan Beach Report catalog',BASE+b.slug+'/',{adapter:'mi',key:b.slug});
  return makeEntry(key,b.name,'US','MI',b.county,lake(b.lake),point,b.swimming===false?'viewpoint':'beach',ref,b.aliases||[]);
 }),
 ...us.beaches.map(b=>{
  const key='us:'+b.slug,point=location(b.lat,b.lon,b.coordinateNote||'Approximate destination');
  const ref=sourceRef(key,b.name,point,b.coordinateSource,BASE+'around-the-lakes/'+b.slug+'/',{adapter:'us',key:b.slug});
  return makeEntry(key,b.name,'US',b.state,null,lake(b.lake),point,'beach',ref);
 }),
 ...ca.locations.map(b=>{
  const key='ca:'+b.slug,point=location(b.reference.lat,b.reference.lon,b.reference.precision);
  const ref=sourceRef(key,b.name,point,b.officialUrl,BASE+'canada/'+b.slug+'/',{adapter:'ca',key:b.slug});
  return makeEntry(key,b.name,'CA','ON',null,lake(b.lake),point,'beach',ref,[b.nearbyTown]);
 })
 ];
}
function buildRegistry(){
 const sourceRows=[...epaMi.records,...epaOther.records];
 const entries=sourceRows.map(b=>{
  const id='epa:'+b.id,point=location(b.lat,b.lon,'Approximate source shoreline midpoint');
  const slug='epa-'+b.id.toLowerCase();
  const ref=sourceRef(id,b.name,point,b.coordinateSource||epaMi.sourceUrl,BASE+'around-the-lakes/?beach='+slug,{adapter:'us',key:slug});
  return makeEntry(id,b.name,'US',b.state,b.county,lake(b.lake),point,/\(INLAND\)/i.test(b.name)?'inland':'beach',ref);
 });
 const byId=new Map(entries.map(b=>[b.id,b]));
 if(byId.size!==entries.length)throw Error('Duplicate EPA identity');
 const reviewed=new Set(),pending=[];
 for(const b of curatedRows()){
  const linked=ASSOCIATIONS[b.id];
  const matching=entries.filter(e=>e.id.startsWith('epa:')&&e.region===b.region&&(!b.county||b.county===e.county)&&
    (!e.lake||e.lake===b.lake)&&[b.name,...b.aliases].some(n=>norm(n)===norm(e.refs[0].name))&&distanceKm(b.point,e.point)<=3);
  if(linked){
   const e=byId.get('epa:'+linked);
   if(!e||e.refs.length!==1||b.kind!=='beach'||e.kind!=='beach'||e.lake!==b.lake||
      distanceKm(b.point,e.point)>1||!matching.includes(e))throw Error('Review stale association '+b.id);
   e.name=b.name;
   e.aliases=[...new Set([...b.aliases,e.refs[0].name].filter(n=>n!==b.name))];
   e.refs.push(b.refs[0]);reviewed.add(b.id);
  }else{
   entries.push(b);
   for(const e of matching)pending.push({curated:b.id,source:e.id,distanceKm:Math.round(distanceKm(b.point,e.point)*100)/100,
    reason:e.lake?'name-match-needs-review':'lake-unassigned-needs-review'});
  }
 }
 if(reviewed.size!==Object.keys(ASSOCIATIONS).length)throw Error('Missing association');
 const keys=new Set();
 for(const e of entries)for(const ref of e.refs){
  if(keys.has(ref.key))throw Error('Duplicate source reference '+ref.key);
  keys.add(ref.key);
 }
 entries.sort((a,b)=>a.id.localeCompare(b.id,'en'));
 pending.sort((a,b)=>a.curated.localeCompare(b.curated,'en')||a.source.localeCompare(b.source,'en'));
 const stats={sourceRecords:sourceRows.length+mi.beaches.length+us.beaches.length+ca.locations.length,
  linked:reviewed.size,entries:entries.length,mapEntries:entries.filter(e=>e.mapEligible).length,
  us:entries.filter(e=>e.country==='US').length,ca:entries.filter(e=>e.country==='CA').length,
  unknownLake:entries.filter(e=>e.mapEligible&&!e.lake).length,pendingMatches:pending.length};
 return {version:1,coverage:'Source-controlled directory; not an exhaustive list of distinct physical beaches',stats,entries,pending};
}
function resolve(registry,key){return registry.entries.find(e=>e.id===key||e.refs.some(r=>r.key===key))||null;}
function mapCatalog(registry=buildRegistry()){
 return {version:registry.version,coverage:registry.coverage,stats:registry.stats,beaches:registry.entries.filter(e=>e.mapEligible).map(e=>({
  id:e.id,name:e.name,country:e.country,region:e.region,county:e.county,lake:e.lake,lat:e.point.lat,lon:e.point.lon,
  aliases:e.aliases,refs:e.refs.map(r=>({key:r.key,guide:r.guide,forecast:r.forecast})),
  access:e.access,swimStatus:e.swimStatus
 }))};
}
module.exports={buildRegistry,mapCatalog,resolve,distanceKm,ASSOCIATIONS};
