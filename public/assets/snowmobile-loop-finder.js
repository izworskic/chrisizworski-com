/*
 * Loop finder for the Michigan snowmobile region pages: "about 60 miles out
 * of this junction and back".
 *
 * The search itself runs on the server (lib/snowmobile/loops.mjs, Rust/WASM
 * with a JavaScript parity fallback) over the same closure-filtered official
 * DNR trail graph as the point-to-point planner. This file only validates
 * what came back, words it honestly and lets a rider compare the options.
 * It never invents a junction, a connection, a distance or a condition.
 *
 * Pure helpers are shared by the browser and the Node regression tests.
 * createController() is the small DOM layer used by snowmobile-region.js.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SnowmobileLoopFinder=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  const MIN_MILES=5,MAX_MILES=300,PRESETS=[30,60,100];
  const KINDS={LOOP:'Loop',LOLLIPOP:'Loop with an out-and-back stem',OUT_AND_BACK:'Out and back'};
  const inMichigan=(lon,lat)=>Number.isFinite(lon)&&Number.isFinite(lat)&&lon>=-91&&lon<=-82&&lat>=41&&lat<=49;

  // Whole miles only: a requested length is a rough intent, not a measurement.
  function parseMiles(value){
    const text=String(value??'').trim();
    if(!/^\d{1,3}$/.test(text))return null;
    const miles=Number(text);
    return miles>=MIN_MILES&&miles<=MAX_MILES?miles:null;
  }
  function requestUrl(region,start,miles){
    return '/api/snowmobile-route?region='+encodeURIComponent(region)+'&loop='+encodeURIComponent(start.lat.toFixed(5)+','+start.lon.toFixed(5))+'&miles='+encodeURIComponent(String(miles));
  }
  function kindLabel(kind){return KINDS[kind]||null;}

  /* A returned option is shown only if it is a real closed ride: known kind,
   * positive distance, official line geometry inside Michigan that ends where
   * it starts, segment evidence present and no closed segment anywhere. */
  function validateOption(option){
    if(option?.routable!==true||typeof option.id!=='string'||!kindLabel(option.kind))return false;
    if(!Number.isFinite(option.distanceMiles)||option.distanceMiles<=0||option.distanceMiles>2000)return false;
    if(!Number.isFinite(option.repeatedMiles)||option.repeatedMiles<0||option.repeatedMiles>option.distanceMiles)return false;
    if(!Number.isFinite(option.estimatedMinutes)||!Number.isFinite(option.assumedAvgMph))return false;
    const coords=option.geometry?.type==='LineString'?option.geometry.coordinates:null;
    if(!Array.isArray(coords)||coords.length<3||!coords.every(c=>Array.isArray(c)&&c.length===2&&inMichigan(c[0],c[1])))return false;
    const first=coords[0],last=coords[coords.length-1];
    // Same junction cluster: the router joins endpoints within 20 m.
    if(Math.abs(first[0]-last[0])>0.0005||Math.abs(first[1]-last[1])>0.0005)return false;
    if(!Array.isArray(option.segments)||!option.segments.length)return false;
    if(option.segments.some(s=>[s?.band,s?.legalState,s?.status].some(v=>/closed/i.test(String(v??'')))))return false;
    if(!inMichigan(option.halfway?.lon,option.halfway?.lat))return false;
    return true;
  }
  /* One unprovable option discredits the whole reply. */
  function validateResponse(payload){
    const loops=payload?.loops;
    if(!loops||typeof loops!=='object')return {ok:false,reason:'The loop search did not return a usable result.'};
    if(loops.routable!==true)return {ok:false,reason:String(loops.reason||'No ride that returns to this junction was found.')};
    if(!Array.isArray(loops.options)||!loops.options.length||loops.options.length>4||!loops.options.every(validateOption))return {ok:false,reason:'The loop search returned a ride that could not be verified against the mapped trail. Nothing is shown.'};
    if(new Set(loops.options.map(o=>o.id)).size!==loops.options.length)return {ok:false,reason:'The loop search returned duplicate options. Nothing is shown.'};
    return {ok:true,options:loops.options,note:typeof loops.note==='string'?loops.note:null,targetMiles:loops.targetMiles};
  }
  function duration(minutes){
    const m=Math.max(0,Math.round(minutes)),h=Math.floor(m/60);
    return h?h+' hr'+(m%60?' '+(m%60)+' min':''):m+' min';
  }
  /* Plain-words summary of one option against the length the rider asked for. */
  function optionSummary(option,targetMiles){
    const miles=option.distanceMiles,gap=Number.isFinite(targetMiles)?Math.round((miles-targetMiles)*10)/10:null;
    const target=gap===null?'':Math.abs(gap)<0.5?'Matches your '+targetMiles+' mi target':Math.abs(gap).toFixed(1)+' mi '+(gap>0?'over':'under')+' your '+targetMiles+' mi target';
    const repeat=option.kind==='OUT_AND_BACK'?'Same trail out and back':option.repeatedMiles<0.05?'No trail ridden twice':option.repeatedMiles.toFixed(1)+' mi of trail ridden twice';
    return {
      title:kindLabel(option.kind)+' · '+miles.toFixed(1)+' mi',
      time:'About '+duration(option.estimatedMinutes)+' at an assumed '+option.assumedAvgMph+' mph',
      target,
      repeat
    };
  }
  /* Three waypoints for the GPX file: start, the halfway junction, start. */
  function exportStops(option,start,halfwayLabel){
    const startLabel=String(start?.label||'Mapped DNR junction');
    return [
      {lat:start.lat,lng:start.lon,label:'Loop start: '+startLabel},
      {lat:option.halfway.lat,lng:option.halfway.lon,label:'Halfway: '+String(halfwayLabel||'mapped DNR junction')},
      {lat:start.lat,lng:start.lon,label:'Loop finish: '+startLabel}
    ];
  }

  /*
   * DOM controller. deps:
   *   doc, getData() -> region payload or null, findJunctions(features,query,component,limit),
   *   junctionById(id) -> GeoJSON point feature, showPlan({option,payload,start,halfwayLabel}),
   *   clearPlan(), esc(text), track(name,params), fetchJson(url,signal) -> {ok,json}
   */
  function createController(deps){
    const $=id=>deps.doc.getElementById(id);
    const state={start:null,options:[],selected:null,busy:false,requestId:0,abort:null,target:null,showing:false};
    const setStatus=text=>{const el=$('loopStatus');if(el)el.textContent=text;};
    function available(){const d=deps.getData();return Boolean(d?.routeJunctions?.features?.length);}
    function sync(){
      const ready=available();
      const search=$('loopStartSearch'),miles=$('loopMiles'),go=$('findLoops'),clear=$('clearLoops');
      if(search)search.disabled=!ready;
      if(miles)miles.disabled=!ready;
      if(go){go.disabled=!ready||!state.start||state.busy||parseMiles(miles?.value)===null;go.textContent=state.busy?'Searching…':'Find loops';}
      if(clear)clear.hidden=!state.options.length;
      const chosen=$('loopStartChosen');
      if(chosen){chosen.hidden=!state.start;chosen.textContent=state.start?'Start: '+state.start.label+' (near '+state.start.lat.toFixed(3)+', '+state.start.lon.toFixed(3)+')':'';}
      for(const b of deps.doc.querySelectorAll('[data-loop-miles]'))b.setAttribute('aria-pressed',String(String(miles?.value||'')===b.getAttribute('data-loop-miles')));
    }
    function renderMatches(){
      const input=$('loopStartSearch'),host=$('loopStartResults');
      if(!input||!host)return;
      if(!available()){host.textContent='Loop search is unavailable until official DNR junctions load.';return;}
      const query=input.value.trim();
      if(query.length<2){host.textContent=state.start?'':'Enter at least two letters or digits from a trail name or number.';return;}
      const matches=deps.findJunctions(deps.getData().routeJunctions.features,query,undefined,6);
      if(!matches.length){host.textContent='No mapped junction matches. Try a different trail name or number.';return;}
      host.innerHTML='<div class="junction-choices">'+matches.map(f=>{
        const [lon,lat]=f.geometry.coordinates;
        return '<button class="junction-choice" type="button" data-loop-start="'+deps.esc(f.properties.id)+'"><strong>'+deps.esc(f.properties.label||'Mapped trail junction')+'</strong><span>Near '+deps.esc(lat.toFixed(3))+', '+deps.esc(lon.toFixed(3))+' · Start here</span></button>';
      }).join('')+'</div>';
    }
    function renderOptions(){
      const host=$('loopOptions');
      if(!host)return;
      host.hidden=!state.options.length;
      host.innerHTML=state.options.map(o=>{
        const s=optionSummary(o,state.target),on=o.id===state.selected;
        return '<button type="button" class="loop-option" role="radio" aria-checked="'+on+'" data-loop-option="'+deps.esc(o.id)+'"><strong>'+deps.esc(s.title)+'</strong><span>'+deps.esc(s.time)+'</span>'+(s.target?'<span>'+deps.esc(s.target)+'</span>':'')+'<span>'+deps.esc(s.repeat)+'</span></button>';
      }).join('');
    }
    function reset(message){
      state.requestId++;state.abort?.abort?.();state.abort=null;state.busy=false;
      state.options=[];state.selected=null;state.payload=null;
      renderOptions();setStatus(message||'');sync();
    }
    function chooseStart(id){
      const f=deps.junctionById(id);
      if(!f)return;
      const [lon,lat]=f.geometry.coordinates;
      // A new start retires any loops, and any search still in flight, for the old one.
      if(state.showing)deps.clearPlan();
      reset('');
      state.start={junctionId:f.properties.id,lat,lon,label:String(f.properties.label||'Mapped trail junction')};
      const input=$('loopStartSearch'),host=$('loopStartResults');
      if(input)input.value='';
      if(host)host.textContent='';
      setStatus('Start chosen. Set a ride length, then choose Find loops.');
      sync();
    }
    function select(id,userInitiated=false){
      const option=state.options.find(o=>o.id===id);
      if(!option||!state.payload)return;
      state.selected=id;
      renderOptions();
      const halfway=deps.junctionById(option.halfway.junctionId);
      state.showing=false; // showPlan clears any earlier plan first; ignore that notice
      deps.showPlan({option,payload:state.payload,start:state.start,halfwayLabel:halfway?.properties?.label||null,userInitiated});
      state.showing=true;
      deps.track('snowmobile_loop_option_select',{region:deps.getData()?.key||'unknown',kind:option.kind,miles:option.distanceMiles});
    }
    async function search(){
      const d=deps.getData(),miles=parseMiles($('loopMiles')?.value);
      if(!d||!state.start||state.busy)return;
      if(miles===null){setStatus('Enter a whole number of miles from '+MIN_MILES+' to '+MAX_MILES+'.');return;}
      if(state.showing)deps.clearPlan();
      reset('Searching mapped DNR trail for rides that return to your start…');
      state.busy=true;sync();
      const requestId=state.requestId,controller=typeof AbortController==='function'?new AbortController():null;
      state.abort=controller;
      const timer=setTimeout(()=>controller?.abort(),20000);
      try{
        const reply=await deps.fetchJson(requestUrl(d.key,state.start,miles),controller?.signal);
        if(requestId!==state.requestId)return;
        if(!reply.ok)throw new Error(reply.json?.error||reply.json?.detail||'The loop search is unavailable.');
        const checked=validateResponse(reply.json);
        if(!checked.ok){setStatus(checked.reason);deps.track('snowmobile_loop_search',{region:d.key,miles,options:0});return;}
        state.options=checked.options;state.payload=reply.json;state.target=miles;
        const loops=checked.options.filter(o=>o.kind!=='OUT_AND_BACK').length;
        setStatus((checked.note?checked.note+' ':'')+(loops?loops+' loop option'+(loops===1?'':'s')+' found. ':'')+'Choose one to draw it on the map. Distances are measured on mapped DNR trail, not a promise of rideable snow.');
        renderOptions();
        deps.track('snowmobile_loop_search',{region:d.key,miles,options:checked.options.length,loops});
        select(checked.options[0].id);
      }catch(error){
        if(requestId!==state.requestId)return;
        setStatus(error?.name==='AbortError'?'The loop search timed out. Your start is saved; choose Find loops to retry.':'Loop search unavailable: '+String(error?.message||error));
      }finally{
        clearTimeout(timer);
        if(requestId===state.requestId){state.busy=false;state.abort=null;sync();}
      }
    }
    return {
      refresh(){sync();renderMatches();},
      // The page tells us when the shared map plan was cleared by something else.
      planCleared(){if(state.showing){state.showing=false;state.selected=null;renderOptions();}},
      handleInput(e){
        if(e.target?.id==='loopStartSearch'){renderMatches();return true;}
        if(e.target?.id==='loopMiles'){sync();return true;}
        return false;
      },
      handleClick(e){
        const t=e.target;
        const start=t?.closest?.('[data-loop-start]');
        if(start){chooseStart(start.getAttribute('data-loop-start'));return true;}
        const preset=t?.closest?.('[data-loop-miles]');
        if(preset){const input=$('loopMiles');if(input)input.value=preset.getAttribute('data-loop-miles');sync();return true;}
        const option=t?.closest?.('[data-loop-option]');
        if(option){select(option.getAttribute('data-loop-option'),true);return true;}
        if(t?.id==='findLoops'){search();return true;}
        if(t?.id==='clearLoops'){if(state.showing)deps.clearPlan();reset('Loop options cleared.');return true;}
        return false;
      },
      // Arrow keys move between options like a native radio group.
      handleKey(e){
        const current=e.target?.closest?.('[data-loop-option]');
        if(!current||!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(e.key))return false;
        const ids=state.options.map(o=>o.id),at=ids.indexOf(current.getAttribute('data-loop-option'));
        if(at<0)return false;
        const next=ids[(at+(e.key==='ArrowDown'||e.key==='ArrowRight'?1:ids.length-1))%ids.length];
        e.preventDefault?.();
        select(next,true);
        deps.doc.querySelector('[data-loop-option="'+next+'"]')?.focus?.();
        return true;
      },
      _state:state
    };
  }
  return Object.freeze({MIN_MILES,MAX_MILES,PRESETS,parseMiles,requestUrl,kindLabel,validateOption,validateResponse,optionSummary,exportStops,createController});
});
