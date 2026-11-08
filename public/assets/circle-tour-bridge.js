/* Circle Tour independent tool bridge: read-only registry links, no specialist mutation. */
(function(root){
  'use strict';
  const CATALOG='/assets/circle-tour-tool-catalog.json';
  const IDS=['1','2','3','4','5','6','7','8','9','10','11','12','31','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30'];
  const STOPS=new Set(IDS);
  const THEMES=new Set(['all','parks','falls','water','ships','history','logistics','seasonal']);
  const ROAD_HOSTS=new Set(['511wi.gov','mdotjboss.state.mi.us','511on.ca','511mn.org']);
  const LIMIT=6;
  function safeDate(v){
    if(typeof v!=='string'||!/^\d{4}-\d\d-\d\d$/.test(v))return '';
    const d=new Date(v+'T12:00:00Z');
    return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v?v:'';
  }
  function safeTheme(v){return THEMES.has(v)?v:'all';}
  function safeToolUrl(value){
    try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&!u.search
      &&(u.hostname==='chrisizworski.com'||u.hostname.endsWith('.chrisizworski.com'))?u.href:'';}
    catch{return '';}
  }
  function safeRoadUrl(value){
    try{const u=new URL(value);return u.protocol==='https:'&&ROAD_HOSTS.has(u.hostname)&&!u.username&&!u.password&&!u.port&&!u.hash?u.href:'';}
    catch{return '';}
  }
  function rankConnections(catalog,opts={}){
    const selected=[...new Set((Array.isArray(opts.selectedIds)?opts.selectedIds:[]).map(String).filter(x=>STOPS.has(x)))];
    const focused=STOPS.has(String(opts.focusStop))?String(opts.focusStop):'';
    const scope=focused?[focused]:selected;
    const theme=safeTheme(opts.theme),date=safeDate(opts.date),month=date?Number(date.slice(5,7)):null;
    const region=['wi','mi','on','mn'].includes(opts.region)?opts.region:'all';
    const route=Array.isArray(catalog?.routeOrder)?catalog.routeOrder.map(String):IDS;
    const entries=(Array.isArray(catalog?.connections)?catalog.connections:[]).filter(item=>{
      if(!item||!item.toolId||!safeToolUrl(item.url)||!Array.isArray(item.stopIds)
        ||!item.stopIds.some(s=>STOPS.has(String(s))))return false;
      if(theme!=='all'&&item.theme!==theme)return false;
      if(scope.length)return item.stopIds.some(s=>scope.includes(String(s)));
      return region==='all'||item.stopIds.some(s=>catalog.stopRegion?.[s]===region);
    });
    const items=entries.map(item=>{
      const matching=item.stopIds.filter(s=>scope.includes(String(s)));
      const first=matching.length?matching.sort((a,b)=>scope.indexOf(a)-scope.indexOf(b))[0]:item.stopIds[0];
      const inSeason=!month||!Array.isArray(item.seasons)||item.seasons.includes(month);
      const index=scope.length?scope.indexOf(first):route.indexOf(first);
      return {...item,firstStop:first,inSeason,rank:Math.max(0,index)+(!inSeason?route.length:0)};
    }).sort((a,b)=>a.rank-b.rank||a.toolId.localeCompare(b.toolId));
    return {items,total:items.length,scope,focused,theme,date,month,region};
  }
  function roadChecks(catalog,opts={}){
    const scope=Array.isArray(opts.scope)?opts.scope:[];
    const regions=new Set(scope.map(id=>catalog.stopRegion?.[id]).filter(Boolean));
    // Border stops require source checks on both sides of the crossing, not one state's coverage.
    if(scope.some(id=>['13','14'].includes(String(id)))){regions.add('mi');regions.add('on');}
    if(scope.some(id=>['20','21'].includes(String(id)))){regions.add('mn');regions.add('on');}
    if(!scope.length&&opts.region&&opts.region!=='all')regions.add(opts.region);
    return (Array.isArray(catalog.roadChecks)?catalog.roadChecks:[])
      .filter(x=>(!regions.size||regions.has(x.region))&&safeRoadUrl(x.url));
  }
  function buildReturnHref(current,context={}){
    const url=new URL(current),date=safeDate(context.date),theme=safeTheme(context.theme);
    if(date)url.searchParams.set('ctDate',date);else url.searchParams.delete('ctDate');
    if(theme!=='all')url.searchParams.set('ctTheme',theme);else url.searchParams.delete('ctTheme');
    const focus=String(context.focusStop||'');
    if(STOPS.has(focus))url.searchParams.set('ctStop',focus);else url.searchParams.delete('ctStop');
    return url.href;
  }
  const helpers={rankConnections,roadChecks,buildReturnHref,safeDate,safeTheme,safeToolUrl,safeRoadUrl};
  if(typeof module!=='undefined'&&module.exports)module.exports=helpers;
  if(!root?.document)return;
  const document=root.document,host=document.querySelector('[data-circle-tour-bridge]');
  if(!host)return;
  const $=id=>document.getElementById(id);
  const state={catalog:null,showAll:false,focusStop:'',date:'',theme:'all',region:'all',selectedIds:[]};
  const params=new URLSearchParams(root.location.search);
  state.focusStop=STOPS.has(params.get('ctStop'))?params.get('ctStop'):'';
  state.date=safeDate(params.get('ctDate'));
  state.theme=safeTheme(params.get('ctTheme'));
  function el(tag,cls,text){
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(text!==undefined)n.textContent=text;
    return n;
  }
  function link(label,url,cls){
    const a=el('a',cls||'ctb-link',label);
    a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
  }
  function track(action,meta={}){
    try{root.CircleTourPage?.track?.('tool-bridge-'+action,{source:'circle-tour',...meta});}catch{}
  }
  function selectedIds(){
    const live=root.CircleTourPage?.selectedIds?.();
    return (Array.isArray(live)?live:state.selectedIds).map(String).filter(x=>STOPS.has(x));
  }
  function remember(){
    root.history.replaceState(null,'',buildReturnHref(root.location.href,state));
  }
  function controls(){
    if($('ctb-stop'))$('ctb-stop').value=state.focusStop;
    if($('ctb-date'))$('ctb-date').value=state.date;
    if($('ctb-theme'))$('ctb-theme').value=state.theme;
  }
  function renderRail(scope){
    const rail=$('ctb-route');if(!rail)return;
    rail.replaceChildren();
    if(!scope.length){rail.append(el('span','ctb-route-empty','Choose a stop or select stops in the trip planner above.'));return;}
    rail.append(el('span','ctb-route-prefix',scope.length+' route stop'+(scope.length===1?'':'s')));
    scope.slice(0,9).forEach(id=>{
      const name=$('stop-'+id)?.querySelector('.stop-name')?.textContent.trim()||'Stop '+id;
      const chip=el('a','ctb-route-chip',name);chip.href='#stop-'+id;rail.append(chip);
    });
    if(scope.length>9)rail.append(el('span','ctb-route-more','+'+(scope.length-9)+' more'));
  }
  function renderRoad(opts){
    const box=$('ctb-road');if(!box)return;
    box.replaceChildren();
    for(const source of roadChecks(state.catalog,opts)){
      const li=el('li');
      li.append(link(source.name,source.url,'ctb-road-link'),el('span','ctb-road-note',source.note));
      box.append(li);
    }
    if(!box.children.length)box.append(el('li','ctb-road-note','No official source links in this region; check the highway authority directly.'));
  }
  function render(){
    if(!state.catalog)return;
    state.selectedIds=selectedIds();
    controls();
    const ranked=rankConnections(state.catalog,{selectedIds:state.selectedIds,focusStop:state.focusStop,
      theme:state.theme,date:state.date,region:state.region});
    const box=$('ctb-results');if(!box)return;
    box.replaceChildren();
    for(const item of (state.showAll?ranked.items:ranked.items.slice(0,LIMIT))){
      const article=el('article','ctb-entry');
      const header=el('div','ctb-entry-head'),id=item.firstStop;
      const stopName=$('stop-'+id)?.querySelector('.stop-name')?.textContent.trim()||'Stop '+id;
      const anchor=el('a','ctb-stop-link','Stop '+id+' · '+stopName);
      anchor.href='#stop-'+id;
      header.append(anchor,el('span','ctb-theme-name',item.theme));
      article.append(header,el('h3','ctb-entry-title',item.decision),el('p','ctb-entry-caveat',item.caveat));
      if(ranked.date&&!item.inSeason)article.append(el('p','ctb-season-caution','Outside typical listed season. Verify dates and access with the specialist.'));
      const actions=el('div','ctb-entry-actions');
      const handoff=link('Open '+item.name,item.url,'ctb-link');
      handoff.addEventListener('click',()=>track('handoff',{destination:item.toolId,stop:id,theme:item.theme}));
      actions.append(handoff);article.append(actions);box.append(article);
    }
    const count=ranked.total;
    if($('ctb-status'))$('ctb-status').textContent=count
      ?count+' approved connection'+(count===1?'':'s')+' · '+(ranked.scope.length?'matched to your route':'all-route discovery')
      :'No approved specialist matches this stop and interest. The base itinerary and independent guide links still work.';
    if($('ctb-more')){
      $('ctb-more').hidden=count<=LIMIT;
      $('ctb-more').textContent=state.showAll?'Show fewer':'Show all '+count+' connections';
    }
    renderRail(ranked.scope.length?ranked.scope:state.selectedIds);
    renderRoad({scope:ranked.scope.length?ranked.scope:state.selectedIds,region:state.region});
  }
  function populate(){
    const input=$('ctb-stop');if(!input)return;
    IDS.forEach(id=>{
      const name=$('stop-'+id)?.querySelector('.stop-name')?.textContent.trim();
      if(!name)return;
      const option=el('option','',id+' · '+name);
      option.value=id;input.append(option);
    });
  }
  function attach(){
    populate();
    function change(field,value){
      state[field]=value;state.showAll=false;remember();render();
      track('selection',{dimension:field,scope:state.focusStop?'stop':state.selectedIds.length?'trip':'all'});
    }
    $('ctb-stop')?.addEventListener('change',e=>change('focusStop',STOPS.has(e.target.value)?e.target.value:''));
    $('ctb-date')?.addEventListener('change',e=>change('date',safeDate(e.target.value)));
    $('ctb-theme')?.addEventListener('change',e=>change('theme',safeTheme(e.target.value)));
    $('ctb-more')?.addEventListener('click',()=>{state.showAll=!state.showAll;render();});
    $('ctb-copy')?.addEventListener('click',async()=>{
      const url=buildReturnHref(root.location.href,state),msg=$('ctb-copy-status');
      try{
        if(!root.navigator.clipboard?.writeText)throw Error('clipboard not available');
        await root.navigator.clipboard.writeText(url);
        if(msg)msg.textContent='Circle Tour return link copied.';
      }catch{
        root.prompt?.('Copy your return link:',url);
        if(msg)msg.textContent='Copy the return link shown above.';
      }
      track('return-link',{hasPlan:state.selectedIds.length>0});
    });
    root.addEventListener('circle-tour:trip-change',event=>{
      state.selectedIds=(event.detail?.ids||[]).map(String);
      if(state.focusStop&&!state.selectedIds.includes(state.focusStop))state.focusStop='';
      remember();render();
    });
    root.addEventListener('circle-tour:stop-open',event=>{
      const id=String(event.detail?.id);
      if(!STOPS.has(id))return;
      state.focusStop=id;remember();render();
    });
    root.addEventListener('circle-tour:filter-change',event=>{
      state.region=event.detail?.region||'all';
      if(!state.focusStop&&!state.selectedIds.length)render();
    });
  }
  async function init(){
    attach();state.selectedIds=selectedIds();controls();
    try{
      const response=await root.fetch(CATALOG,{credentials:'same-origin'});
      if(!response.ok)throw Error('catalog request unavailable');
      const data=await response.json();
      if(data.schemaVersion!==1||data.owner!=='circle-tour'||data.connectionPolicy!=='approved-only'
        ||!Array.isArray(data.connections))throw Error('invalid catalog');
      state.catalog=data;
      $('ctb-fallback')?.setAttribute('hidden','');
      render();track('ready',{approved:data.connections.length});
    }catch{
      if($('ctb-status'))$('ctb-status').textContent='The independent tool connections are temporarily unavailable. The original Circle Tour map, stops and itineraries remain available.';
      track('unavailable');
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})(typeof window==='undefined'?null:window);
