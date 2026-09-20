"use strict";

const HARNESS_URL = process.env.HARNESS_URL || "https://agentbase-registry-izworski-gmailcoms-projects.vercel.app/api/harness";
const DEFAULT_TIMEOUT_MS = 3200;

function safe(value,max=220){
  return String(value==null?"":value).replace(/[<>\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);
}

async function vercelOidcToken(){
  if(process.env.HARNESS_ACCESS_KEY) return {token:String(process.env.HARNESS_ACCESS_KEY),source:"shared-key"};
  if(process.env.VERCEL_OIDC_TOKEN) return {token:String(process.env.VERCEL_OIDC_TOKEN),source:"vercel-oidc-env"};
  try{
    const mod=await import("@vercel/oidc");
    const token=await mod.getVercelOidcToken();
    if(token) return {token:String(token),source:"vercel-oidc-helper"};
  }catch(error){
    return {token:"",source:"none",error:safe(error?.message||error)};
  }
  return {token:"",source:"none"};
}

async function decideClosedSet({
  task,
  options,
  context={},
  constraints=[],
  evidence=[],
  fallbackChoice=null,
  minConfidence=.52,
  maxInjectionDependency=.45,
  timeoutMs=DEFAULT_TIMEOUT_MS,
  gateReason="JEV output did not pass closed-set confidence gates",
  unavailableReason="Shared JEV authentication unavailable"
}={}){
  const ids=Object.keys(options||{});
  const fallback=ids.includes(fallbackChoice)?fallbackChoice:(ids[0]||null);
  if(!ids.length)return{mode:"deterministic",choiceId:null,confidence:0,reason:"No candidates",auth_source:"none"};

  const auth=await vercelOidcToken();
  if(!auth.token)return{mode:"deterministic",choiceId:fallback,confidence:0,reason:auth.error?unavailableReason+": "+auth.error:unavailableReason,auth_source:auth.source};

  const payload={action:"decide",task,options,context,constraints,evidence};
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.max(1200,Number(timeoutMs)||DEFAULT_TIMEOUT_MS));
  try{
    const res=await fetch(HARNESS_URL,{
      method:"POST",
      redirect:"error",
      signal:controller.signal,
      headers:{
        authorization:"Bearer "+auth.token,
        "content-type":"application/json",
        accept:"application/json"
      },
      body:JSON.stringify(payload)
    });
    const data=await res.json().catch(()=>null);
    if(!res.ok||!data?.result)throw new Error("Harness HTTP "+res.status);
    const judged=data.result.choice||{};
    const id=judged.choice;
    const confidence=Number(judged.confidence)||0;
    const injectionDependency=Number(data.result.injection_dependency);
    if(
      !ids.includes(id) ||
      confidence<minConfidence ||
      (Number.isFinite(injectionDependency)&&injectionDependency>=maxInjectionDependency)
    ){
      return{
        mode:"deterministic",
        choiceId:fallback,
        confidence,
        reason:gateReason,
        auth_source:auth.source,
        injection_dependency:Number.isFinite(injectionDependency)?injectionDependency:null
      };
    }
    return{
      mode:"shared-harness-jev",
      choiceId:id,
      confidence,
      model:data.result.model||"jev-latest",
      reason:null,
      auth_source:auth.source,
      injection_dependency:Number.isFinite(injectionDependency)?injectionDependency:null
    };
  }catch(error){
    return{
      mode:"deterministic",
      choiceId:fallback,
      confidence:0,
      reason:"JEV unavailable: "+safe(error?.message||error),
      auth_source:auth.source
    };
  }finally{
    clearTimeout(timer);
  }
}

module.exports={HARNESS_URL,DEFAULT_TIMEOUT_MS,vercelOidcToken,decideClosedSet,_test:{safe}};
