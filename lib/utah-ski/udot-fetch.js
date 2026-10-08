'use strict';
// Opt-in diagnostic ONLY. Do not import into a publicly accessible route.
// UDOT documents 10 calls per 60 seconds: no per-visitor polling.
// Never log upstream URLs; they contain the developer key.
const {classify}=require('./udot');
const ENDPOINTS=Object.freeze({events:'event',roadconditions:'roadconditions',messagesigns:'messagesigns'});
const BASE='https://www.udottraffic.utah.gov/api/v2/get/';
async function diagnostic({key,fetchImpl=globalThis.fetch,now=Math.floor(Date.now()/1000),timeoutMs=5000}={}){
 const feeds={events:null,roadconditions:null,messagesigns:null},health={};
 if(typeof key!=='string'||!key.trim()){
   for(const name of Object.keys(ENDPOINTS))health[name]='MISSING_KEY';
   return {health,canyons:{SR190:classify(feeds,'SR190',now),SR210:classify(feeds,'SR210',now)}};
 }
 if(typeof fetchImpl!=='function')throw new TypeError('Missing fetch');
 const data=await Promise.all(Object.entries(ENDPOINTS).map(async ([name,endpoint])=>{
   const u=new URL(endpoint,BASE);u.searchParams.set('key',key);u.searchParams.set('format','json');
   const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),timeoutMs);
   try{
     const response=await fetchImpl(u.toString(),{signal:ac.signal,headers:{Accept:'application/json'}});
     if(!response?.ok){
       const code=response?.status;
       return [name,code===429?'RATE_LIMITED':[401,403].includes(code)?'AUTH_REJECTED':'HTTP_ERROR',null];
     }
     const body=await response.json();
     if(!Array.isArray(body))return [name,'INVALID_SCHEMA',null];
     return [name,'RECEIVED',body];
   }catch(_){return [name,'REQUEST_FAILED',null];}
   finally{clearTimeout(timer);}
 }));
 for(const [name,state,body] of data){health[name]=state;feeds[name]=body;}
 return {health,canyons:{SR190:classify(feeds,'SR190',now),SR210:classify(feeds,'SR210',now)}};
}
module.exports={ENDPOINTS,diagnostic};
