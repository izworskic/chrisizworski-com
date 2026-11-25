(function(){'use strict';
// One selection spine: the forecast map and the native resort carousel always show the same hill.
// An NWS forecast color never establishes the operating status of a resort.
const mount=document.getElementById('ski-point-map');
const track=document.getElementById('ski-resort-carousel');
if(!mount||!track)return;
const statusEl=document.getElementById('ski-carousel-status');
const prev=document.getElementById('ski-carousel-prev'),next=document.getElementById('ski-carousel-next');
const NS='http://www.w3.org/2000/svg',W=920,H=620,P=30;
const MINLON=-90.7,MAXLON=-82.0,MINLAT=41.35,MAXLAT=48.45;
const pos=(lat,lon)=>({x:P+(lon-MINLON)/(MAXLON-MINLON)*(W-2*P),y:H-P-(lat-MINLAT)/(MAXLAT-MINLAT)*(H-2*P)});
const svgNode=(tag,attrs={},value)=>{const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(value!==undefined)el.textContent=String(value);return el;};
const html=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=String(value);return el;};
const fmt=v=>Number.isFinite(v)?Number(v).toFixed(1).replace(/\.0$/,''):'Unavailable';
const color=v=>!Number.isFinite(v)?'#889aa4':v>=6?'#12456d':v>=3?'#187b9b':v>=1?'#39a7ad':v>=.1?'#a1d6d4':'#d3e0e5';
const isConfirmed=r=>['OPEN_PER_OPERATOR','CLOSED_PER_OPERATOR'].includes(r.official?.status);
function reportDate(value){
 if(!value)return 'No dated operator report';
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return 'Report dated '+new Date(value+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',year:'numeric'});
 const n=Date.parse(value);
 return Number.isFinite(n)?'Report updated '+new Date(n).toLocaleString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'No dated operator report';
}
function liftStatus(r){
 const off=r.official||{};
 if(off.status==='OPEN_PER_OPERATOR')return 'Operator confirms '+off.lifts.open+' of '+off.lifts.total+' lifts open';
 if(off.status==='CLOSED_PER_OPERATOR')return 'Operator reports 0 operating lifts';
 if(off.status==='STALE_REPORT')return 'Operator lift report is outdated';
 if(off.status==='NOT_CONNECTED')return 'No connected operator lift report';
 return 'Current lift operations not verified';
}
function plans(){
 const out=new Map();
 for(const tr of document.querySelectorAll('.ski-opening-evidence tbody tr')){
  const label=tr.querySelector('th')?.textContent.trim();
  const detail=tr.querySelector('td')?.textContent.trim();
  if(label&&detail&&!detail.startsWith('Not announced'))out.set(label,detail);
 }
 return out;
}
let resorts=[],outline=null,outlineFailed=false,selected=null,visible=[],scrollFrame=0,ignoreScroll=false;
let filters={region:'all',openOnly:false,planOnly:false};
const currentDay=()=>document.getElementById('ski-day')?.value||'saturday';
const dayLabel=()=>currentDay()==='saturday'?'Saturday':'Sunday';
function candidates(){
 const announced=plans();
 const list=resorts.filter(r=>(filters.region==='all'||r.region===filters.region)&&
  (filters.planOnly?announced.has(r.name):!filters.openOnly||r.official?.status==='OPEN_PER_OPERATOR'));
 if(filters.planOnly)list.sort((a,b)=>{
  const aDate=Date.parse(announced.get(a.name)?.split(' · ')[0]||'');
  const bDate=Date.parse(announced.get(b.name)?.split(' · ')[0]||'');
  return (Number.isFinite(aDate)?aDate:Infinity)-(Number.isFinite(bDate)?bDate:Infinity)||a.name.localeCompare(b.name);
 });
 return list;
}
function selectedIndex(){return visible.findIndex(r=>r.slug===selected);}
function updateSelection(announce=true){
 const i=selectedIndex();
 for(const card of track.querySelectorAll('.ski-carousel-card')){
  const on=card.dataset.slug===selected;
  card.classList.toggle('is-selected',on);
  if(on)card.setAttribute('aria-current','true');else card.removeAttribute('aria-current');
  card.querySelector('.ski-card-select')?.setAttribute('aria-pressed',String(on));
 }
 if(prev)prev.disabled=i<=0;
 if(next)next.disabled=i<0||i>=visible.length-1;
 if(statusEl&&announce){
  if(i<0){statusEl.textContent='No resort matches these filters. Clear a filter to inspect more hills.';return;}
  const r=visible[i],forecast=r.weather?.skiDays?.[currentDay()]?.snowInches;
  statusEl.textContent=(i+1)+' of '+visible.length+': '+r.name+'. '+liftStatus(r)+'. '+(Number.isFinite(forecast)?fmt(forecast)+' inches NWS forecast '+dayLabel():'No NWS forecast for '+dayLabel())+'.';
 }
}
function scrollCard(){
 const i=selectedIndex();if(i<0)return;
 const card=track.querySelectorAll('.ski-carousel-card')[i];if(!card)return;
 ignoreScroll=true;
 track.scrollTo({left:card.offsetLeft-track.offsetLeft,behavior:'instant'});
 requestAnimationFrame(()=>{ignoreScroll=false;});
}
function pick(slug,fromMapKeyboard=false){
 if(!visible.some(r=>r.slug===slug))return;
 selected=slug;updateSelection();drawMap(fromMapKeyboard);scrollCard();
}
function cardFor(r){
 const card=html('article','ski-carousel-card');card.dataset.slug=r.slug;
 const heading=html('h4',null);
 const choose=html('button','ski-card-select',r.name);choose.type='button';
 choose.setAttribute('aria-label','Show '+r.name+' on the map');choose.addEventListener('click',()=>pick(r.slug));
 heading.append(choose);
 const location=html('p','small',r.location+' · '+(r.kind==='nordic'?'Nordic trails':'Downhill skiing'));
 const d=r.weather?.skiDays?.[currentDay()]||{},v=d.snowInches;
 const weather=html('p','ski-carousel-forecast',Number.isFinite(v)?fmt(v)+'″ NWS forecast '+dayLabel():'NWS forecast unavailable for '+dayLabel());
 const operating=html('p','ski-carousel-status '+(r.official?.status==='OPEN_PER_OPERATOR'?'open':r.official?.status==='CLOSED_PER_OPERATOR'?'closed':''),liftStatus(r));
 const date=html('p','small',reportDate(r.official?.reportUpdatedAt));
 const alerts=(r.weather?.alerts||[]).filter(a=>/Warning/i.test(a.event));
 const links=html('div','ski-carousel-links');
 const detail=html('a',null,'Resort details');detail.href='/michigan-ski-hills/'+r.slug+'/';
 const source=html('a',null,'Official report');source.href=r.official?.url||r.snow;
 source.target='_blank';source.rel='noopener noreferrer';
 const compare=html('button',null,'Compare trip cost');compare.type='button';
 compare.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('michigan-ski:select',{detail:r.slug})));
 links.append(detail,source);
 const mapsUrl=window.VisitorMapLinks?.placeSearch({role:'public-place',query:r.name+', '+r.location+', Michigan'});
 if(mapsUrl){
  const maps=html('a','ski-card-maps','View in Google Maps');maps.href=mapsUrl;
  maps.target='_blank';maps.rel='noopener noreferrer';maps.setAttribute('aria-label','View '+r.name+' in Google Maps');
  links.append(maps);
 }
 links.append(compare);
 card.append(heading,location,weather,operating,date);
 if(alerts.length)card.append(html('p','event','NWS winter warning: check travel conditions'));
 if(filters.planOnly){
  const plan=plans().get(r.name);if(plan)card.append(html('p','ski-carousel-plan','Opening plan: '+plan+'. Target only, not confirmed open.'));
 }
 card.append(links);return card;
}
function renderCarousel(){
 track.replaceChildren();
 if(!visible.length){
  track.append(html('p','event','No ski hills match these filters. Clear an operating-status or area filter to see the full map.'));
  selected=null;updateSelection();return;
 }
 if(!visible.some(r=>r.slug===selected)){
  selected=(visible.find(r=>r.official?.status==='OPEN_PER_OPERATOR')||visible[0]).slug;
 }
 for(const r of visible)track.append(cardFor(r));
 updateSelection();scrollCard();
}
function drawMap(focusSelected=false){
 if(outlineFailed){mount.replaceChildren(html('p','event','Map outline is unavailable. Use the resort carousel and official links below.'));return;}
 if(!outline){mount.replaceChildren(html('p','small','Loading Michigan outline. Resort cards remain available below.'));return;}
 const svg=svgNode('svg',{viewBox:'0 0 '+W+' '+H,role:'group','aria-label':'Michigan ski areas, resort markers selectable by keyboard',class:'michigan-point-svg'});
 const defs=svgNode('defs'),grad=svgNode('linearGradient',{id:'ski-map-sea',x1:0,y1:0,x2:0,y2:1});
 grad.append(svgNode('stop',{offset:'0%','stop-color':'#dbeaf1'}),svgNode('stop',{offset:'100%','stop-color':'#e9f4f6'}));
 defs.append(grad);svg.append(defs,svgNode('rect',{x:0,y:0,width:W,height:H,rx:15,fill:'url(#ski-map-sea)'}));
 for(const polygon of outline.coordinates){
  for(const ring of polygon){
   const path=ring.map((xy,i)=>{const p=pos(xy[1],xy[0]);return (i?'L':'M')+p.x.toFixed(1)+','+p.y.toFixed(1)}).join('')+'Z';
   svg.append(svgNode('path',{d:path,fill:'#f6f9ef',stroke:'#8aaca4','stroke-width':2,'stroke-linejoin':'round'}));
  }
 }
 svg.append(svgNode('text',{x:102,y:168,class:'ski-map-water'},'Lake Superior'),
  svgNode('text',{x:250,y:440,class:'ski-map-water'},'Lake Michigan'),
  svgNode('text',{x:710,y:375,class:'ski-map-water'},'Lake Huron'));
 const seen=[];
 for(const r of visible){
  const p=pos(r.lat,r.lon),d=r.weather?.skiDays?.[currentDay()]||{},v=d.snowInches;
  let x=p.x,y=p.y;
  for(let pass=0;pass<5;pass++){
   if(!seen.some(e=>Math.hypot(x-e.x,y-e.y)<24))break;
   const angle=(pass+1)*2.1;x=p.x+Math.cos(angle)*14*(pass+1);y=p.y+Math.sin(angle)*14*(pass+1);
  }
  seen.push({x,y});
  const g=svgNode('g',{role:'button',tabindex:0,'data-slug':r.slug,'aria-label':'Show '+r.name+' on the carousel; '+(Number.isFinite(v)?fmt(v)+' inches NWS forecast':'NWS forecast unavailable'),class:'ski-dot'+(r.slug===selected?' selected':'')});
  g.append(svgNode('line',{x1:p.x,y1:p.y,x2:x,y2:y,stroke:'#7fa9b4','stroke-width':1.5}));
  const warning=(r.weather?.alerts||[]).some(a=>/Warning/i.test(a.event));
  if(warning)g.append(svgNode('circle',{cx:x,cy:y,r:16,fill:'none',stroke:'#b96a16','stroke-width':2.5,'stroke-dasharray':'4 3'}));
  if(isConfirmed(r))g.append(svgNode('circle',{cx:x,cy:y,r:13,fill:'none',stroke:'#8fa7af','stroke-width':3,class:'ski-status-ring '+(r.official.status==='OPEN_PER_OPERATOR'?'open':'closed')}));
  g.append(svgNode('circle',{cx:x,cy:y,r:10,fill:color(v),stroke:'#164456','stroke-width':1.6,class:'ski-map-pin'}));
  g.append(svgNode('title',{},r.name+': '+(Number.isFinite(v)?fmt(v)+' inches NWS forecast':'forecast unavailable')+'; '+liftStatus(r)));
  g.addEventListener('click',()=>pick(r.slug));
  g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();pick(r.slug,true);}});
  svg.append(g);
 }
 mount.replaceChildren(svg);
 if(focusSelected)svg.querySelector('.ski-dot.selected')?.focus();
}
function refresh(){
 if(!resorts.length)return;
 visible=candidates();renderCarousel();drawMap();
}
track.addEventListener('scroll',()=>{
 if(ignoreScroll||scrollFrame||!visible.length)return;
 scrollFrame=requestAnimationFrame(()=>{
  scrollFrame=0;if(ignoreScroll)return;
  const left=track.getBoundingClientRect().left;
  let nearest=null,distance=Infinity;
  for(const card of track.querySelectorAll('.ski-carousel-card')){
   const d=Math.abs(card.getBoundingClientRect().left-left);
   if(d<distance){distance=d;nearest=card.dataset.slug;}
  }
  if(nearest&&nearest!==selected){selected=nearest;updateSelection();drawMap();}
 });
},{passive:true});
track.addEventListener('keydown',e=>{
 if(e.target!==track||!['ArrowLeft','ArrowRight'].includes(e.key))return;
 e.preventDefault();
 const i=selectedIndex(),n=Math.max(0,Math.min(visible.length-1,i+(e.key==='ArrowRight'?1:-1)));
 if(visible[n])pick(visible[n].slug);
});
prev?.addEventListener('click',()=>{const r=visible[selectedIndex()-1];if(r)pick(r.slug);});
next?.addEventListener('click',()=>{const r=visible[selectedIndex()+1];if(r)pick(r.slug);});
document.addEventListener('michigan-ski:data',event=>{resorts=event.detail.resorts||[];refresh();});
document.addEventListener('michigan-ski:filters',event=>{
 filters={region:event.detail?.region||'all',openOnly:!!event.detail?.openOnly,planOnly:!!event.detail?.planOnly};refresh();
});
document.addEventListener('michigan-ski:error',()=>{
 mount.replaceChildren(html('p','event','Live ski conditions are unavailable. Use the static resort guides below.'));
 track.replaceChildren(html('p','event','Resort reports unavailable. The dated opening announcement table remains available.'));
 if(statusEl)statusEl.textContent='Live map and carousel unavailable.';
 if(prev)prev.disabled=true;if(next)next.disabled=true;
});
document.getElementById('ski-day')?.addEventListener('change',refresh);
fetch('/assets/michigan-ski-outline.json',{cache:'force-cache'}).then(response=>{
 if(!response.ok)throw Error('MAP_OUTLINE_UNAVAILABLE');return response.json();
}).then(data=>{
 if(data.type!=='MultiPolygon'||!Array.isArray(data.coordinates))throw Error('MAP_SHAPE_INVALID');
 outline=data;drawMap();
}).catch(()=>{outlineFailed=true;drawMap();});
})();