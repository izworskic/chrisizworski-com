'use strict';
// Offline product-parity research. Never treats another model as observed truth.
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const BF=require('../lib/shorefeel/beach-forecast.js');
const H=3600000,LEADS=[0,24,48],MAX_KM=2.5;
const TARGETS=Object.fromEntries(Object.values(BF.BEACHES).flat().flatMap(b=>[[''+b.key+':beach',b.cell],[''+b.key+':reference',b.ref]]));
const number=n=>typeof n==='number'&&Number.isFinite(n);
const temp=n=>number(n)&&n>=-2&&n<=36;
const hash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const utc=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s)&&Number.isFinite(Date.parse(s))?Date.parse(s):NaN;
const round=n=>n===null?null:Math.round(n*1000)/1000;
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
function distance(a,b){
 const rad=x=>x*Math.PI/180;
 const dlat=rad(b.lat-a.lat),dlon=rad(b.lon-a.lon);
 const h=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2;
 return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));
}
function location(p){return p&&number(p.lat)&&number(p.lon)&&p.lat>=41&&p.lat<=47&&p.lon>=-89&&p.lon<=-79;}
function artifact(meta,product,cycle,lead){
 if(!meta||!hash(meta.sha256)||!hash(meta.geometrySha256)||typeof meta.modelVersion!=='string'||!meta.modelVersion.trim())return false;
 let u;try{u=new URL(meta.url);}catch{return false;}
 if(u.protocol!=='https:'||u.username||u.password||!['opendap.co-ops.nos.noaa.gov','noaa-nos-ofs-pds.s3.amazonaws.com'].includes(u.hostname))return false;
 const d=new Date(cycle),day=d.toISOString().slice(0,10),ymd=day.replaceAll('-',''),cc=String(d.getUTCHours()).padStart(2,'0'),h=String(lead).padStart(3,'0');
 const file='lmhofs.t'+cc+'z.'+ymd+'.'+product+'.f'+h+'.nc';
 return u.pathname.endsWith('/'+file)&&u.pathname.includes('/'+day.replaceAll('-','/')+'/');
}
// Candidate horizontal inverse-distance weighting and vertical linear
// interpolation. Neighbour selection and wet connectivity must be reviewed
// independently; supplied nodes never establish NOAA's proprietary weights.
function reconstruct(point,nodes){
 if(!location(point)||!number(point.depthM)||point.depthM<0||!Array.isArray(nodes)||nodes.length<3||nodes.length>8)return null;
 const ids=new Set(),values=[];
 for(const node of nodes){
  if(!location(node)||!Number.isInteger(node.id)||node.id<0||ids.has(node.id)||node.wet!==true||node.sameWetComponent!==true||!Array.isArray(node.layers)||node.layers.length!==2)return null;
  ids.add(node.id);
  const d=distance(point,node),[a,b]=node.layers;
  if(d>MAX_KM||!a||!b||!number(a.depthM)||!number(b.depthM)||a.depthM<0||a.depthM>b.depthM||point.depthM<a.depthM||point.depthM>b.depthM||!temp(a.tempC)||!temp(b.tempC))return null;
  if(a.depthM===b.depthM&&a.tempC!==b.tempC)return null;
  const v=a.depthM===b.depthM?a.tempC:a.tempC+(b.tempC-a.tempC)*(point.depthM-a.depthM)/(b.depthM-a.depthM);
  values.push({d,v});
 }
 const exact=values.filter(x=>x.d<1e-6);
 if(exact.length)return exact.every(x=>Math.abs(x.v-exact[0].v)<1e-8)?exact[0].v:null;
 const weight=x=>1/(x.d*x.d);
 return values.reduce((a,x)=>a+x.v*weight(x),0)/values.reduce((a,x)=>a+weight(x),0);
}
function evaluateParity(input){
 if(input?.schemaVersion!==1||!['synthetic','historical-review'].includes(input.kind)||!Array.isArray(input.cycles)||!input.cycles.length||!Array.isArray(input.rows))throw Error('Explicit frozen cycle list and paired model records required');
 const cycles=input.cycles.map(utc);
 if(cycles.some(t=>!Number.isFinite(t)||t%(6*H)!==0)||new Set(cycles).size!==cycles.length)throw Error('Invalid or duplicate LMHOFS cycle');
 const expected=new Set(cycles.flatMap(t=>Object.keys(TARGETS).flatMap(k=>LEADS.map(h=>t+'|'+k+'|'+h))));
 const accepted=new Map(),bad=new Set();let invalid=0,offCohort=0;
 for(const row of input.rows){
  const t=utc(row?.cycleAt),h=row?.leadHours,key=t+'|'+row?.target+'|'+h;
  if(!expected.has(key)){offCohort++;continue;}
  const target=TARGETS[row.target],p=row.point;
  const valid=utc(row.validAt)===t+h*H&&p&&p.j===target.j&&p.i===target.i&&location(p)&&number(p.depthM)&&p.depthM>=0&&row.regularWet===true&&temp(row.regularTempC)&&
   artifact(row.regular,'regulargrid',t,h)&&artifact(row.native,'fields',t,h)&&row.regular.modelVersion===row.native.modelVersion;
  const candidate=valid?reconstruct(p,row.nativeNodes):null;
  if(candidate===null){invalid++;accepted.delete(key);bad.add(key);continue;}
  const normalized={cycle:t,target:row.target,lead:h,point:{j:p.j,i:p.i,lat:p.lat,lon:p.lon,depthM:p.depthM},regularC:row.regularTempC,nativeC:candidate,regular:row.regular,native:row.native};
  if(bad.has(key))continue;
  if(accepted.has(key)&&JSON.stringify(accepted.get(key))!==JSON.stringify(normalized)){accepted.delete(key);bad.add(key);continue;}
  accepted.set(key,normalized);
 }
 const groups={};
 for(const h of LEADS){
  const rows=[...accepted.values()].filter(x=>x.lead===h);
  const errors=rows.map(x=>(x.nativeC-x.regularC)*1.8);
  const deltaErrors=[];
  for(const x of rows){
   if(h===0)continue;
   const base=accepted.get(x.cycle+'|'+x.target+'|0');
   if(!base||JSON.stringify(base.point)!==JSON.stringify(x.point)||base.regular.geometrySha256!==x.regular.geometrySha256||base.native.geometrySha256!==x.native.geometrySha256||base.regular.modelVersion!==x.regular.modelVersion)continue;
   deltaErrors.push(((x.nativeC-base.nativeC)-(x.regularC-base.regularC))*1.8);
  }
  groups[h]={expected:cycles.length*Object.keys(TARGETS).length,matched:rows.length,coverage:round(rows.length/(cycles.length*Object.keys(TARGETS).length)),absoluteMAE_F:round(mean(errors.map(Math.abs))),biasF:round(mean(errors)),maxAbsErrorF:errors.length?round(Math.max(...errors.map(Math.abs))):null,changePairs:deltaErrors.length,changeMAE_F:round(mean(deltaErrors.map(Math.abs))),maxChangeErrorF:deltaErrors.length?round(Math.max(...deltaErrors.map(Math.abs))):null};
 }
 // Proposed conservative research screening thresholds, not calibrated
 // safety margins. Beach cells alone do not validate the buoy cohort.
 const reasons=[];
 if(cycles.length<3)reasons.push('INSUFFICIENT_CYCLES');
 if(Object.values(groups).some(x=>x.coverage<.9))reasons.push('INSUFFICIENT_MATCHED_GRID_COVERAGE');
 if(Object.values(groups).some(x=>x.maxAbsErrorF===null||x.maxAbsErrorF>.5))reasons.push('ABSOLUTE_GRID_DIFFERENCE');
 if([24,48].some(h=>groups[h].changePairs/groups[h].expected<.9||groups[h].maxChangeErrorF===null||groups[h].maxChangeErrorF>.3))reasons.push('MODEL_CHANGE_DIFFERENCE');
 return {status:input.kind==='synthetic'?'SYNTHETIC_NOT_PARITY':reasons.length?'INSUFFICIENT_PARITY_EVIDENCE':'CANDIDATE_PARITY_SOURCE_REVIEW_REQUIRED',cohortSha256:createHash('sha256').update(JSON.stringify([...expected].sort())).digest('hex'),expected:expected.size,accepted:accepted.size,invalid,offCohort,quarantined:bad.size,targets:Object.keys(TARGETS),groups,reasons,canSubstituteArchive:false,canCalibrateProduction:false,limits:['Candidate IDW power 2 and reviewed wet neighbours; NOAA exact interpolation neighbourhood and vertical target convention not established.','Supplied model versions, geometry hashes and source bytes require independent verification. Model-to-model agreement is not observation skill.','Current six beach/reference cells are not the original four buoy grid anchors; those require a separate identity review before holdout use.']};
}
if(require.main===module){try{console.log(JSON.stringify(evaluateParity(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={TARGETS,reconstruct,evaluateParity};
