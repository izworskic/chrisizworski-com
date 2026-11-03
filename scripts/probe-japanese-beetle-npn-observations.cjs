'use strict';
// One-time source-discovery probe; no PII, raw records, observer IDs or site coordinates written.
// USA-NPN data services require request_src self-identification.
const BASE='https://services.usanpn.org/npn_portal';
async function read(url,timeoutMs=22000){
 const res=await fetch(url,{headers:{accept:'application/json','user-agent':'FreighterViewFarms-JapaneseBeetleMonitoring/1.0 (https://chrisizworski.com/michigan-garden-pest-watch/)'},signal:AbortSignal.timeout(timeoutMs)});
 if(!res.ok)throw Error('HTTP_'+res.status);
 const body=await res.text();
 if(body.length>9000000)throw Error('EXCESSIVE_RESPONSE');
 try{return JSON.parse(body)}catch{throw Error('JSON_INVALID_'+body.slice(0,90))}
}
async function probe(){
 const species=await read(BASE+'/species/getSpecies.json');
 if(!Array.isArray(species))throw Error('SPECIES_LIST_INVALID');
 const matches=species.filter(x=>String(x.genus).toLowerCase()==='popillia'&&String(x.species).toLowerCase()==='japonica');
 if(matches.length!==1)throw Error('SPECIES_UNIQUE_MATCH_MISSING');
 const target=matches[0];
 const phases=await read(BASE+'/phenophases/getPhenophases.json');
 const adultPhases=phases.filter(x=>String(x.phenophase_name).trim().toLowerCase()==='adults');
 const candidate=adultPhases.map(x=>({id:x.phenophase_id,name:x.phenophase_name,category:x.phenophase_category,class_id:x.pheno_class_id}));
 const years=[2025,2026],observations=[];
 for(const year of years){
  const u=new URL(BASE+'/observations/getObservations.json');
  Object.entries({year,species_id:target.species_id,state:'MI',request_src:'FreighterViewFarms',format:'json'}).forEach(([k,v])=>u.searchParams.set(k,String(v)));
  try{
   const data=await read(u.href,26000);
   const rows=Array.isArray(data)?data:Array.isArray(data.data)?data.data:null;
   observations.push({year,type:Array.isArray(data)?'array':typeof data,totalRows:rows?.length??null,
    firstRowKeys:rows?.[0]?Object.keys(rows[0]).slice(0,60):[],
    firstRowData:rows?.[0]?Object.fromEntries(Object.entries(rows[0]).filter(([k])=>/phenophase|status|date|species|year|latitude|longitude|station|site|intensity|count|observed/i.test(k)).map(([k,v])=>[k,/lat|long|station_name|site_name/i.test(k)?'<not displayed>':v]).slice(0,20)):null,
    error:!rows?JSON.stringify(data).slice(0,300):null});
  }catch(e){observations.push({year,error:String(e.message||e)})}
 }
 return {speciesCount:species.length,species:{id:target.species_id,name:target.genus+' '+target.species,commonName:target.common_name,genusId:target.genus_id},
  allAdultPhases:candidate,phenophaseCount:phases.length,observations};
}
if(require.main===module)probe().then(r=>{console.log('NPN_MONITORING_PROBE '+JSON.stringify(r,null,2))}).catch(e=>{console.error('NPN_MONITORING_PROBE_ERROR '+String(e));process.exitCode=1});
module.exports={probe,read};
