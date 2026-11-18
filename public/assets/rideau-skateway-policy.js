/* Official National Capital Commission Skateway source policy.
 * No weather-based opening inference. Only fresh, complete official section data.
 * Static import supports browser and independent Node tests.
 */
(function(root,make){
 const api=make();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.RideauSkatewayPolicy=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const known=new Set(['Very Good','Good','Fair','Poor','Open','Closed','Closed for the Season','Snow Covered','Walking Only (Skateway closed)']);
 const skate=new Set(['Very Good','Good','Fair','Poor','Open']);
 const MAX_AGE_MS=18*60*60*1000;
 const FUTURE_TOLERANCE_MS=10*60*1000;
 function normalizeStatus(value){
   const status=typeof value==='string'?value.trim():null;
   return known.has(status)?status:null;
 }
 function safeNum(n){return typeof n==='number'&&Number.isFinite(n);}
 function seasonMonth(date){
   const month=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Toronto',month:'numeric'}).format(date));
   return month===12||month===1||month===2||month===3;
 }
 function assess(archive,metadata,feed,now=new Date()){
   const base={verified:false,state:'unavailable',observedAt:null,sections:[],
     totals:{reportedOpenSections:null,reportedOpenKm:null},reason:'The NCC status feed is unavailable. Check the official ice conditions before approaching the ice.'};
   if(!archive||archive.schemaVersion!==1||!Array.isArray(archive.sections)||archive.sections.length!==14){
     return {...base,reason:'The audited Skateway reference inventory is unavailable.'};
   }
   const byId=new Map();
   const fallback=archive.sections.slice().sort((a,b)=>a.id-b.id).map(x=>({...x,status:null,skatingReportedOpen:false,condition:null}));
   const unchanged={...base,sections:fallback};
   const ts=metadata?.editingInfo?.dataLastEditDate;
   if(!safeNum(ts)||ts<=0||!Array.isArray(feed?.features)){
     return {...unchanged,reason:'Official section observations could not be verified. Check the NCC source.'};
   }
   const clock=now instanceof Date?now:new Date(now);
   const t=clock.getTime();
   if(!Number.isFinite(t))return {...unchanged,reason:'The current observation time is unavailable.'};
   const observedAt=new Date(ts).toISOString();
   const age=t-ts;
   const sourceFieldsOk=feed.features.length===14;
   if(sourceFieldsOk)for(const feature of feed.features){
     const a=feature?.attributes||{},id=a.ID;
     if(!Number.isInteger(id)||id<1||id>14||byId.has(id))return {...unchanged,state:'partial',observedAt,reason:'The NCC returned duplicate or invalid section IDs.'};
     const ref=fallback.find(x=>x.id===id);
     const lengthMatch=typeof a.Length_KM==='string'&&a.Length_KM.trim()===String(ref?.km)+' km';
     if(!ref||a.From_!==ref.from||a.To_!==ref.to||!lengthMatch||!normalizeStatus(a.Status)){
       return {...unchanged,state:'partial',observedAt,reason:'The NCC section names, distances or statuses changed. Read the official report.'};
     }
     byId.set(id,normalizeStatus(a.Status));
   }
   if(!sourceFieldsOk||byId.size!==14)return {...unchanged,state:'partial',observedAt,reason:'The NCC returned an incomplete section report. No opening is inferred.'};
   const records=fallback.map(x=>({...x,status:byId.get(x.id),skatingReportedOpen:false,condition:null}));
   if(age < -FUTURE_TOLERANCE_MS)return {...unchanged,state:'stale',observedAt,reason:'Official source timestamp is in the future. No opening can be verified.'};
   if(age>MAX_AGE_MS||!seasonMonth(clock)){
     return {...unchanged,state:'archived',observedAt,reason:!seasonMonth(clock)
       ?'Winter Skateway season has not been verified for today. The latest NCC section report belongs to an earlier season.'
       :'The latest NCC section report is too old to confirm skating access today.'};
   }
   const rows=records.map(x=>({...x,skatingReportedOpen:skate.has(x.status),
     condition:x.status}));
   const opened=rows.filter(x=>x.skatingReportedOpen);
   const km=Math.round(opened.reduce((n,x)=>n+x.km,0)*100)/100;
   return {verified:true,state:'current',observedAt,sections:rows,
     totals:{reportedOpenSections:opened.length,reportedOpenKm:km},
     reason:'This is the latest NCC source report, not an independent ice-safety judgment. Recheck conditions and entrance access before going.'};
 }
 function select(assessment,id){
   if(!assessment?.sections?.length)return null;
   const chosen=assessment.sections.find(x=>x.id===Number(id))||assessment.sections[0];
   return {...chosen,current:assessment.verified,
     labelStatus:assessment.verified?chosen.status:'Not currently verified'};
 }
 const entranceNames=Object.freeze({
  1:['Rideau','Mackenzie King West'],
  2:['Mackenzie King West','Laurier East'],
  3:['Laurier East','Somerset East'],
  4:['Somerset East'],
  5:['Concord'],
  6:['Concord','Pretoria'],
  7:['Pretoria','Fifth'],
  8:[],
  9:['Fifth'],
  10:['Holmwood'],
  11:['Bronson'],
  12:['Bronson',"Dow's"],
  13:["Dow's"],
  14:["Dow's",'Library']
 });
 function entrancesFor(id,knownEntrances){
  const names=entranceNames[Number(id)]||[];
  return names.map(n=>(knownEntrances||[]).find(e=>e.name===n)).filter(Boolean);
 }
 return Object.freeze({assess,select,normalizeStatus,entrancesFor,seasonMonth,MAX_AGE_MS});
});
