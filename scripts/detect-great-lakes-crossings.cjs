#!/usr/bin/env node
'use strict';
// Offline geometric evidence only. Never an independent passage label or live ETA.
const fs=require('node:fs'),crypto=require('node:crypto');
const soo=require('../lib/soo-locks-next'),duluth=require('../lib/duluth-canal');
const M=111195,MIN=60000,MAX_GAP=5*MIN,REPEAT=20*MIN,MAX_ROWS=250000,MAX_BYTES=32*1024*1024,MAX_SPEED_MPS=35*1852/3600,DEADBAND=10,REVERSAL=8,EDGE=5;
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
function expect(ok,msg){if(!ok)throw Error(msg);}
function utc(s){
 expect(typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(s),'Explicit UTC timestamp required');
 const t=Date.parse(s);expect(Number.isFinite(t)&&new Date(t).toISOString().slice(0,19)===s.slice(0,19),'Invalid UTC timestamp');return t;
}
function validPoint(p){return p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=85&&Number.isFinite(p.lon)&&Math.abs(p.lon)<=180;}
function projector(origin){
 const scale=M*Math.cos(origin.lat*Math.PI/180);
 return p=>({x:(p.lon-origin.lon)*scale,y:(p.lat-origin.lat)*M});
}
function gate(id,site,center,bearing,halfWidth,positive,negative,reference){
 expect(validPoint(center)&&Number.isFinite(bearing)&&Number.isFinite(halfWidth)&&halfWidth>=15&&halfWidth<=250,'Invalid gate geometry');
 const theta=bearing*Math.PI/180;
 return {id,site,center,bearing,halfWidth,positive,negative,reference,geometryStatus:'PROVISIONAL_REFERENCE_NOT_SURVEYED'};
}
function provisionalGates(){
 // Chamber bounds are the owning engine's existing OSM-derived rectangles, not surveyed gates.
 const eastBearing=90;
 const chamber=(id,c)=>gate('soo-'+id,'soo',{lat:(c.lat[0]+c.lat[1])/2,lon:soo.LOCK_POINT[1]},eastBearing,(c.lat[1]-c.lat[0])*M/2,'downbound','upbound',
  'Existing chamber rectangle at modeled reference longitude; not entrance, exit or lockage completion');
 return [chamber('poe',soo.LOCKS.poe),chamber('macarthur',soo.LOCKS.macarthur),
  gate('duluth-bridge','duluth',{lat:46.77898660,lon:-92.09290579},60,60,'departure','arrival',
   'MnDOT bridge reference point, approximate channel heading and review width; different from modeled canal point')];
}
function coordinates(g,p){
 const {x,y}=projector(g.center)(p),theta=g.bearing*Math.PI/180;
 return {normal:x*Math.sin(theta)+y*Math.cos(theta),along:x*Math.cos(theta)-y*Math.sin(theta),x,y};
}
const stable=p=>p.normal>DEADBAND?1:p.normal<-DEADBAND?-1:0;
function normalize(doc){
 expect(doc&&doc.schemaVersion===1&&['synthetic','historical-research'].includes(doc.kind),'Unknown crossing input');
 expect(doc.source&&typeof doc.source.url==='string'&&doc.source.url.startsWith('https://')&&/^[a-f0-9]{64}$/.test(doc.source.receiptSha256||'')&&typeof doc.source.review==='string'&&doc.source.review.trim().length>0,'Source receipt and review required');
 const start=utc(doc.start),end=utc(doc.end);expect(end>start&&end-start<=7*24*60*MIN,'Scope exceeds seven days');
 expect(Array.isArray(doc.observations)&&doc.observations.length<=MAX_ROWS,'Observation count exceeds offline cap');
 const tracks=new Map();let duplicates=0,conflicts=0,invalidPositions=0,excludedType=0;
 for(const v of doc.observations){
  expect(v&&/^\d{9}$/.test(String(v.mmsi)),'Invalid identity; cannot safely segment track');
  const t=utc(v.seen);expect(t>=start&&t<end,'Observation outside declared time scope');
  const id=String(v.mmsi),kind=Number.isInteger(v.shipType)?v.shipType:null;
  const ok=validPoint(v)&&kind>=70&&kind<=89;
  if(!validPoint(v))invalidPositions++;
  else if(!ok)excludedType++;
  if(!tracks.has(id))tracks.set(id,new Map());
  const map=tracks.get(id),p=ok?{t,lat:v.lat,lon:v.lon,shipType:kind}:null;
  const prior=map.get(t);
  if(map.has(t)){
   if(prior&&p&&prior.lat===p.lat&&prior.lon===p.lon&&prior.shipType===p.shipType){duplicates++;continue;}
   if(prior!==null||p!==null)conflicts++;
   map.set(t,null); // A conflicting or unusable minute is a barrier, never bridged.
  }else map.set(t,p);
 }
 return {tracks,start,end,counts:{inputRows:doc.observations.length,distinctTracks:tracks.size,duplicates,conflicts,invalidPositions,excludedType}};
}
function intersection(points){
 // Count actual sign transitions, including one exactly-on-line observation.
 // A multi-fix dwell on the line is ambiguous. No timestamp interpolation.
 const nonzero=points.map((p,i)=>({p,i})).filter(x=>Math.abs(x.p.normal)>1e-6);
 let crossings=[];
 for(let j=1;j<nonzero.length;j++){
  const a=nonzero[j-1],b=nonzero[j];
  if(Math.sign(a.p.normal)===Math.sign(b.p.normal))continue;
  if(b.i-a.i>2)return null;
  if(b.i-a.i===2){crossings.push(points[a.i+1].along);continue;}
  const f=-a.p.normal/(b.p.normal-a.p.normal);
  crossings.push(a.p.along+f*(b.p.along-a.p.along));
 }
 return crossings.length===1?crossings[0]:null;
}
function assess(points,left,right,g){
 const a=points[left],b=points[right],dir=stable(b);
 if(b.t-a.t>MAX_GAP)return 'crossing_gap';
 if(left===0||right===points.length-1)return 'missing_context';
 const p=points[left-1],q=points[right+1];
 if(stable(p)!==-dir||stable(q)!==dir)return 'ambiguous_context';
 if(a.t-p.t>MAX_GAP||q.t-b.t>MAX_GAP)return 'context_gap';
 const evidence=points.slice(left-1,right+2);
 for(let i=1;i<evidence.length;i++){
  const u=evidence[i-1],v=evidence[i],dt=(v.t-u.t)/1000;
  if(dt<=0||dt>MAX_GAP/1000)return 'context_gap';
  if(Math.hypot(v.x-u.x,v.y-u.y)/dt>MAX_SPEED_MPS)return 'implausible_displacement';
  if(dir*(v.normal-u.normal)<-REVERSAL)return 'reversal';
 }
 const core=points.slice(left,right+1);
 if(core.some(v=>Math.abs(v.along)>g.halfWidth+25))return 'outside_corridor';
 const at=intersection(core);
 if(at===null)return 'ambiguous_intersection';
 if(Math.abs(at)>g.halfWidth-EDGE)return 'outside_finite_gate';
 return {start:a.t,end:b.t,direction:dir===1?g.positive:g.negative,gate:g.id,site:g.site,
  bracketSeconds:(b.t-a.t)/1000,observations:evidence.map(v=>({seen:new Date(v.t).toISOString(),lat:v.lat,lon:v.lon}))};
}
function detect(doc,gates=provisionalGates()){
 const n=normalize(doc),found=[],stats={},gateIds=new Set();
 for(const g of gates){
  expect(g&&typeof g.id==='string'&&!gateIds.has(g.id)&&g.geometryStatus==='PROVISIONAL_REFERENCE_NOT_SURVEYED','Invalid or duplicate provisional gate');
  gateIds.add(g.id);const stat=stats[g.id]={site:g.site,oppositeSidePairs:0,retainedCandidates:0,withheld:{}};
  const reject=reason=>{stat.withheld[reason]=(stat.withheld[reason]||0)+1;};
  for(const [id,map] of n.tracks){
   let run=[];
   function scan(){
    let last=-1;
    for(let i=0;i<run.length;i++){
     if(!stable(run[i]))continue;
     if(last>=0&&stable(run[last])!==stable(run[i])){
      // Ignore far-away infinite-line crossings before counting possible gate encounters.
      if(Math.min(Math.abs(run[last].normal),Math.abs(run[i].normal))<=1500&&
         Math.min(Math.abs(run[last].along),Math.abs(run[i].along))<=g.halfWidth+500){
       stat.oppositeSidePairs++;
       const result=assess(run,last,i,g);
       if(typeof result==='string')reject(result);else found.push({...result,mmsi:id});
      }
     }
     last=i;
    }
    run=[];
   }
   for(const [t,p] of [...map].sort((a,b)=>a[0]-b[0])){
    if(!p){scan();continue;}
    run.push({...p,...coordinates(g,p)});
   }
   scan();
  }
 }
 // Multiple gate crossings by the same vessel at one site within 20 minutes
 // are withheld, including reversals and incompatible adjacent chamber hits.
 const byVessel=new Map();
 for(const c of found){const k=c.site+':'+c.mmsi;if(!byVessel.has(k))byVessel.set(k,[]);byVessel.get(k).push(c);}
 const ambiguous=new Set();
 for(const rows of byVessel.values()){
  rows.sort((a,b)=>a.start-b.start);
  for(let i=1;i<rows.length;i++)if(rows[i].start-rows[i-1].end<=REPEAT){ambiguous.add(rows[i-1]);ambiguous.add(rows[i]);}
 }
 const review=[];
 for(const c of found){
  const stat=stats[c.gate];
  if(ambiguous.has(c)){stat.withheld.repeated_or_competing_gate=(stat.withheld.repeated_or_competing_gate||0)+1;continue;}
  stat.retainedCandidates++;
  review.push({candidateId:digest([doc.source.receiptSha256,c.gate,c.mmsi,c.start,c.end].join('|')).slice(0,32),
   kind:'UNREVIEWED_GEOMETRIC_CANDIDATE',geometryStatus:'PROVISIONAL_REFERENCE_NOT_SURVEYED',mmsi:c.mmsi,site:c.site,gate:c.gate,direction:c.direction,
   start:new Date(c.start).toISOString(),end:new Date(c.end).toISOString(),bracketSeconds:c.bracketSeconds,observations:c.observations,
   independentEvidenceRef:null,eligibleForReplay:false});
 }
 review.sort((a,b)=>a.start.localeCompare(b.start)||a.gate.localeCompare(b.gate)||a.candidateId.localeCompare(b.candidateId));
 return {report:{schemaVersion:1,kind:'OFFLINE_GEOMETRIC_CROSSING_CANDIDATES',datasetKind:doc.kind,sourceReceiptSha256:doc.source.receiptSha256,
  scope:{start:doc.start,end:doc.end},counts:n.counts,gates:gates.map(g=>({...g,modelTarget:g.site==='soo'?{lat:soo.LOCK_POINT[0],lon:soo.LOCK_POINT[1]}:duluth.CANAL})),
  byGate:stats,candidates:review.length,independentlyReviewedCrossings:0,receiptTimesAvailable:false,fieldAccuracyVerified:false,productionCalibrationAuthorized:false,
  note:'AIS antenna crossing candidate only. Not lock entry, lockage completion, bridge opening, independent ground truth or a prediction. Zero candidates does not establish zero passages.'},review};
}
module.exports={detect,gate,provisionalGates,coordinates};
if(require.main===module){
 const [input,output,flag,reviewPath,...extra]=process.argv.slice(2);
 expect(input&&output&&!extra.length&&(!flag||flag==='--local-review'&&reviewPath),'Usage: node scripts/detect-great-lakes-crossings.cjs input.json report.json [--local-review private-review.json]');
 expect(fs.statSync(input).size<=MAX_BYTES,'Input exceeds 32 MiB offline cap');
 expect(!fs.existsSync(output)&&(!reviewPath||!fs.existsSync(reviewPath)&&reviewPath!==output),'Output already exists or paths collide');
 const raw=fs.readFileSync(input,'utf8'),doc=JSON.parse(raw),result=detect(doc);
 result.report.inputSha256=digest(raw);
 fs.writeFileSync(output,JSON.stringify(result.report,null,2)+'\n',{flag:'wx',mode:0o600});
 if(reviewPath)fs.writeFileSync(reviewPath,JSON.stringify({kind:'PRIVATE_UNREVIEWED_CANDIDATES',inputSha256:result.report.inputSha256,eligibleForReplay:false,candidates:result.review},null,2)+'\n',{flag:'wx',mode:0o600});
}
