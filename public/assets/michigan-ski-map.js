(function(){'use strict';
const mount=document.getElementById('ski-point-map');if(!mount)return;
const NS='http://www.w3.org/2000/svg',MINLON=-90.7,MAXLON=-82.0,MINLAT=41.35,MAXLAT=48.45;
const W=920,H=620,P=30;
const pos=(lat,lon)=>({x:P+(lon-MINLON)/(MAXLON-MINLON)*(W-2*P),
 y:H-P-(lat-MINLAT)/(MAXLAT-MINLAT)*(H-2*P)});
const node=(tag,attributes={},text)=>{const e=document.createElementNS(NS,tag);
 for(const [k,v]of Object.entries(attributes))e.setAttribute(k,String(v));
 if(text!==undefined)e.textContent=String(text);return e;};
const text=(tag,cls,value)=>{const x=document.createElement(tag);if(cls)x.className=cls;x.textContent=String(value);return x;};
const safe=val=>Number.isFinite(val)?Number(val).toFixed(1).replace(/\.0$/,''):'Unknown';
const wind=val=>val==='FAVORS_SNOWBELT'?'Wind direction supports a broad lake-effect snowbelt (not a verified band)':
 val==='NOT_ALIGNED'?'Wind direction not in the established snowbelt sector':'Wind alignment unverified';
const color=inches=>!Number.isFinite(inches)?'#889aa4':inches>=6?'#12456d':inches>=3?'#187b9b':inches>=1?'#39a7ad':inches>=0.1?'#a1d6d4':'#d3e0e5';
let resorts=null,outline=null,selected=null;
function render(){
 if(!resorts||!outline)return;
 const day=document.getElementById('ski-day')?.value||'saturday';
 const svg=node('svg',{viewBox:'0 0 '+W+' '+H,'aria-label':'Michigan ski area map with NWS forecast snow points',role:'img',class:'michigan-point-svg'});
 const defs=node('defs');const grad=node('linearGradient',{id:'ski-map-sea',x1:0,y1:0,x2:0,y2:1});
 grad.append(node('stop',{offset:'0%','stop-color':'#dbeaf1'}),node('stop',{offset:'100%','stop-color':'#e9f4f6'}));
 defs.append(grad);svg.append(defs,node('rect',{x:0,y:0,width:W,height:H,rx:15,fill:'url(#ski-map-sea)'}));
 for(let i=0;i<outline.coordinates.length;i++){
  const polygon=outline.coordinates[i];
  for(const ring of polygon){
   const p=ring.map((xy,j)=>{const {x,y}=pos(xy[1],xy[0]);return (j?'L':'M')+x.toFixed(1)+','+y.toFixed(1)}).join('')+'Z';
   svg.append(node('path',{d:p,fill:'#f6f9ef',stroke:'#8aaca4','stroke-width':2,'stroke-linejoin':'round'}));
  }
 }
 svg.append(node('text',{x:102,y:168,class:'ski-map-water'},'Lake Superior'),
  node('text',{x:250,y:440,class:'ski-map-water'},'Lake Michigan'),
  node('text',{x:710,y:375,class:'ski-map-water'},'Lake Huron'));
 const seen=[];
 for(const r of resorts){
  const p=pos(r.lat,r.lon),d=r.weather?.skiDays?.[day]||{},v=d.snowInches;
  let x=p.x,y=p.y;
  for(let pass=0;pass<5;pass++){
   if(!seen.some(e=>Math.hypot(x-e.x,y-e.y)<24))break;
   const a=(pass+1)*2.1;x=p.x+Math.cos(a)*14*(pass+1);y=p.y+Math.sin(a)*14*(pass+1);
  }
  seen.push({x,y});
  const g=node('g',{role:'button',tabindex:0,'aria-label':r.name+', '+safe(v)+' inches forecast '+day+'; select hill',class:'ski-dot'+(r.slug===selected?' selected':'')});
  g.append(node('line',{x1:p.x,y1:p.y,x2:x,y2:y,stroke:'#7fa9b4','stroke-width':1.5}));
  const warn=(r.weather?.alerts||[]).some(a=>/Warning/i.test(a.event));
  if(warn)g.append(node('circle',{cx:x,cy:y,r:15,fill:'none',stroke:'#af5e22','stroke-width':3,'stroke-dasharray':'4 3'}));
  g.append(node('circle',{cx:x,cy:y,r:10,fill:color(v),stroke:'#164456','stroke-width':1.6}));
  g.append(node('title',{},r.name+': '+safe(v)+'″ NWS forecast '+day+(warn?'; active winter warning':'')));
  g.addEventListener('click',()=>{selected=r.slug;render();});
  g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();selected=r.slug;render();}});
  svg.append(g);
 }
 mount.replaceChildren(svg);
 const panel=document.getElementById('ski-map-selected');if(panel){
  panel.replaceChildren();
  const r=resorts.find(x=>x.slug===selected);
  if(r){
   const d=r.weather?.skiDays?.[day]||{},box=text('div','map-selection','');
   const title=text('h3',null,r.name),detail=text('p',null,
    safe(d.snowInches)+'″ forecast snowfall · '+(Number.isFinite(d.lowF)?d.lowF+'–'+d.highF+'°F':'temperature unavailable')+
    ' · '+wind(d.lakeWindStatus));
   const disclaimer=text('p','small','Official lift/trail status: '+(r.official?.status==='PUBLISHED_OFFICIAL_REPORT'?
     r.official.lifts.open+'/'+r.official.lifts.total+' lifts; '+r.official.trails.open+'/'+r.official.trails.total+' trails as checked':'not verified')+
    '. Forecast amount is NOT measured mountain snow.');
   const a=document.createElement('a');a.href='/michigan-ski-hills/'+r.slug+'/';a.textContent='View hill details ↗';
   const btn=document.createElement('button');btn.type='button';btn.textContent='Compare this hill';btn.className='outline-button';
   btn.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('michigan-ski:select',{detail:r.slug})));
   box.append(title,detail,disclaimer,a,btn);panel.append(box);
  }else panel.append(text('p','small','Select a mountain point to see its forecast, warnings and official operating-source coverage.'));
 }
}
document.addEventListener('michigan-ski:data',e=>{resorts=e.detail.resorts;render();});
document.getElementById('ski-day')?.addEventListener('change',render);
fetch('/assets/michigan-ski-outline.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('MAP_OUTLINE_UNAVAILABLE');return r.json();})
 .then(data=>{if(data.type!=='MultiPolygon'||!Array.isArray(data.coordinates))throw Error('MAP_SHAPE_INVALID');outline=data;render();})
 .catch(()=>{mount.replaceChildren(text('p','event','Map outline unavailable. The text-based ski comparisons remain operational.'));});
})();