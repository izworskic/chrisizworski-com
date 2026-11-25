/* Opt-in device-only visit memory. Never an AIS cache or a live data source. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.SooVisitMemory=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const KEY='ciz:soo-locks:spots:v1',MIN=60000,GAP=15*MIN,CHECK_TTL=24*60*MIN,PREF_TTL=30*CHECK_TTL,MAX_BYTES=160000;
 const OFFSETS=[0,30,60,90,120,180,240],STAYS=[45,90,180,240];
 const valid=(n,now,age)=>Number.isSafeInteger(n)&&n>0&&n<=now&&now-n<=age;
 const identity=id=>typeof id==='string'&&/^\d{9}$/.test(id);
 function prefs(p){return p&&OFFSETS.includes(p.startOffset)&&STAYS.includes(p.stay)?{startOffset:p.startOffset,stay:p.stay}:null;}
 function item(s,checked,allowExpired){
   if(!s||!identity(s.id)||typeof s.name!=='string'||!s.name.trim()||s.name.length>100||!['timed','chamber','slow'].includes(s.kind)||!valid(s.seen,checked,GAP))return null;
   const out={id:s.id,name:s.name,kind:s.kind,seen:s.seen};
   if(s.kind==='timed'){
     if(![s.start,s.mid,s.end].every(Number.isSafeInteger)||s.start>s.mid||s.mid>s.end||s.end<=s.start||s.end-s.start>7*CHECK_TTL||s.end>checked+7*CHECK_TTL||(!allowExpired&&s.end<=checked))return null;
     Object.assign(out,{start:s.start,mid:s.mid,end:s.end});
   }
   return out;
 }
 function baseline(b,now){
   if(!b||!valid(b.checked,now,GAP)||!Array.isArray(b.ships)||b.ships.length>128||!Array.isArray(b.listed)||b.listed.length>128||!Array.isArray(b.accepted)||b.accepted.length>512)return null;
   const checked=b.checked,ships=[],accepted=[],ids=new Set(),marks=new Map(),listed=new Set(b.listed);
   if(listed.size!==b.listed.length||b.listed.some(id=>!identity(id)))return null;
   for(const raw of b.accepted){
     // Expired marks are omitted, never renewed by reading storage.
     const s=item(raw,checked,true);
     if(!s||marks.has(s.id)||!valid(raw.at,checked,GAP)||raw.at<s.seen)return null;
     marks.set(s.id,{...s,at:raw.at});
     if(valid(s.seen,now,GAP))accepted.push({...s,at:raw.at});
   }
   for(const raw of b.ships){
     const s=item(raw,checked,false),mark=s&&marks.get(s.id);
     if(!s||ids.has(s.id)||!listed.has(s.id)||!mark||['kind','seen','start','mid','end'].some(k=>mark[k]!==s[k]))return null;
     ids.add(s.id);
     if(valid(s.seen,now,s.kind==='slow'?5*MIN:GAP)&&(s.kind!=='timed'||s.end>now))ships.push(s);
   }
   return {checked,ships,listed:[...listed],accepted};
 }
 function normalize(value,now){
   if(!value||value.version!==1||!valid(value.savedAt,now,PREF_TTL)||!prefs(value.prefs))return null;
   const lastCheck=valid(value.lastCheck,now,CHECK_TTL)?value.lastCheck:null;
   const b=baseline(value.baseline,now);
   return {version:1,savedAt:value.savedAt,prefs:prefs(value.prefs),lastCheck,baseline:b&&b.checked===lastCheck?b:null};
 }
 function read(storage,now){
   try{
     const raw=storage.getItem(KEY);
     if(raw===null)return {ok:true,value:null};
     let v=null;
     if(typeof raw==='string'&&raw.length<=MAX_BYTES){try{v=normalize(JSON.parse(raw),now);}catch(_){}}
     if(!v){storage.removeItem(KEY);return {ok:true,value:null};}
     const clean=JSON.stringify(v);
     if(clean!==raw)storage.setItem(KEY,clean);
     return {ok:true,value:v};
   }catch(_){return {ok:false,value:null};}
 }
 function write(storage,value,now){
   try{
     const v=normalize(value,now);
     if(!v)return {ok:false,value:null};
     const raw=JSON.stringify(v);
     if(raw.length>MAX_BYTES)return {ok:false,value:null};
     storage.setItem(KEY,raw);return {ok:true,value:v};
   }catch(_){return {ok:false,value:null};}
 }
 function clear(storage){
   try{storage.removeItem(KEY);return true;}catch(_){return false;}
 }
 function create(p,now){const checked=prefs(p);return checked?{version:1,savedAt:now,prefs:checked,lastCheck:null,baseline:null}:null;}
 function capture(record,change,now){
   if(!record)return null;
   const current=normalize(record,now);
   if(!current)return null;
   if(!change||change.failed||!change.last)return {...current,baseline:null};
   const last=change.last;
   if(!valid(last.checked,now,GAP)||last.checked<(current.lastCheck||0))return current;
   const raw={checked:last.checked,ships:Object.values(last.ships),listed:[...last.listed],accepted:Object.values(change.accepted||{})};
   return {...current,lastCheck:last.checked,baseline:baseline(raw,now)};
 }
 function restore(record,changing,now){
   const fresh=normalize(record,now),b=fresh?.baseline;
   if(!b)return changing.initial();
   const ships=Object.create(null),accepted=Object.create(null),anchors=Object.create(null);
   b.ships.forEach(s=>{ships[s.id]=s;anchors[s.id]={...s,at:b.checked};});
   b.accepted.forEach(s=>{accepted[s.id]=s;});
   return {...changing.initial(),last:{checked:b.checked,ships,listed:new Set(b.listed)},accepted,anchors};
 }
 return {KEY,GAP,CHECK_TTL,PREF_TTL,OFFSETS,STAYS,normalize,read,write,clear,create,capture,restore};
});
