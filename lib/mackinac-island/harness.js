"use strict";

const DEFAULT_HARNESS_URL =
  process.env.HARNESS_URL ||
  "https://agentbase-registry-izworski-gmailcoms-projects.vercel.app/api/harness";
const DEFAULT_TIMEOUT_MS = 3200;
let oidcModulePromise = null;

function safe(value,max=180){
  return String(value==null?"":value)
    .replace(/[<>\u0000-\u001f]/g," ")
    .replace(/\s+/g," ")
    .trim()
    .slice(0,max);
}

async function oidcToken(){
  if(process.env.HARNESS_ACCESS_KEY) return {token:String(process.env.HARNESS_ACCESS_KEY),source:"shared-key"};
  try{
    oidcModulePromise ||= import("@vercel/oidc");
    const mod=await oidcModulePromise;
    const token=await mod.getVercelOidcToken();
    if(token) return {token:String(token),source:"vercel-oidc"};
  }catch(error){
    return {token:"",source:"none",error:safe(error?.message||error,220)};
  }
  return {token:"",source:"none",error:"Vercel OIDC token unavailable"};
}

function normalizedChoice(result,allowed){
  const choice=result?.result?.choice||{};
  const id=choice.choice;
  const confidence=Number(choice.confidence)||0;
  const injectionDependency=Number(result?.result?.injection_dependency);
  return {
    id,
    confidence,
    injectionDependency,
    model:result?.result?.model||"jev-latest",
    valid:allowed.has(id) && confidence>=.52 && !(Number.isFinite(injectionDependency)&&injectionDependency>=.45)
  };
}

async function decideClosedSet({
  task,
  options,
  context={},
  constraints=[],
  evidence=[],
  fallbackId=null,
  timeoutMs=DEFAULT_TIMEOUT_MS,
  minConfidence=.52
}){
  const ids=Object.keys(options||{});
  if(!ids.length) return {mode:"deterministic",choiceId:fallbackId,confidence:0,reason:"No candidates",auth:"none"};
  const allowed=new Set(ids);
  const auth=await oidcToken();
  if(!auth.token){
    return {mode:"deterministic",choiceId:fallbackId??ids[0],confidence:0,reason:`Shared JEV auth unavailable: ${auth.error||"no token"}`,auth:auth.source};
  }
  const payload={action:"decide",task,options,context,constraints,evidence};
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const res=await fetch(DEFAULT_HARNESS_URL,{
      method:"POST",
      redirect:"error",
      signal:controller.signal,
      headers:{
        authorization:`Bearer ${auth.token}`,
        "content-type":"application/json",
        accept:"application/json"
      },
      body:JSON.stringify(payload)
    });
    const data=await res.json().catch(()=>null);
    if(!res.ok||!data?.result) throw new Error(`Harness HTTP ${res.status}`);
    const judged=normalizedChoice(data,allowed);
    if(!(judged.valid && judged.confidence>=minConfidence)){
      return {
        mode:"deterministic",
        choiceId:fallbackId??ids[0],
        confidence:judged.confidence,
        reason:"JEV output did not pass closed-set confidence/security gates",
        model:judged.model,
        auth:auth.source,
        injection_dependency:Number.isFinite(judged.injectionDependency)?judged.injectionDependency:null
      };
    }
    return {
      mode:"shared-harness-jev",
      choiceId:judged.id,
      confidence:judged.confidence,
      reason:null,
      model:judged.model,
      auth:auth.source,
      injection_dependency:Number.isFinite(judged.injectionDependency)?judged.injectionDependency:null
    };
  }catch(error){
    return {
      mode:"deterministic",
      choiceId:fallbackId??ids[0],
      confidence:0,
      reason:`JEV unavailable: ${safe(error?.message||error,180)}`,
      auth:auth.source
    };
  }finally{
    clearTimeout(timer);
  }
}

async function health(){
  const auth=await oidcToken();
  if(!auth.token) return {ok:false,auth:auth.source,reason:auth.error||"No token"};
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),DEFAULT_TIMEOUT_MS);
  try{
    const res=await fetch(`${DEFAULT_HARNESS_URL}?deep=1`,{
      method:"GET",
      redirect:"error",
      signal:controller.signal,
      headers:{authorization:`Bearer ${auth.token}`,accept:"application/json"}
    });
    const data=await res.json().catch(()=>null);
    return {ok:res.ok&&data?.status==="ready",status:res.status,auth:auth.source,data};
  }catch(error){
    return {ok:false,auth:auth.source,reason:safe(error?.message||error,220)};
  }finally{
    clearTimeout(timer);
  }
}

module.exports={decideClosedSet,health,_test:{oidcToken,normalizedChoice,safe}};
