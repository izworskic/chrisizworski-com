(()=>{'use strict';
const box=document.getElementById('show-geo-candidates'),status=document.getElementById('geo-candidate-status');
if(!box||!status)return;
let layer=null,data=null,crosslinks=null,request=0;
const say=t=>{status.textContent=t;};
const clear=()=>{if(layer){layer.remove();layer=null;}};
async function readJSON(path){const r=await fetch(path,{cache:'force-cache'});if(!r.ok)throw Error(String(r.status));return r.json();}
async function render(){
  const run=++request;
  if(!box.checked){clear();say('Unverified geographic research hidden by default.');return;}
  if(typeof L==='undefined'||!window.UPWaterfallMap){box.checked=false;say('Map unavailable; visitor guides and official sources remain accessible.');return;}
  say('Reading geographic research references…');
  try{
    if(!data)data=await readJSON('/assets/up-waterfalls-geography.json');
    if(!crosslinks){try{crosslinks=await readJSON('/assets/up-waterfalls-usgs-matches.json');}catch{crosslinks={researchOnly:true,matches:[]};}}
  }catch{if(run!==request)return;box.checked=false;say('Map reference data unavailable. Please use the verified visitor guides.');return;}
  if(run!==request||!box.checked)return;
  clear();
  const research=new Map((crosslinks.matches||[]).map(m=>[m.oid,m]));
  const existing=new Set([...document.querySelectorAll('[data-fall]')].map(x=>x.dataset.name.toLowerCase().replace(/[^a-z0-9]/g,'')));
  const pts=data.points.filter(p=>!existing.has(p.name.toLowerCase().replace(/[^a-z0-9]/g,'')));
  const local=L.layerGroup();let shown=0,linked=0;
  for(const p of pts){
    if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng))continue;
    const m=research.get(p.oid);if(m)linked++;
    const marker=L.circleMarker([p.lat,p.lng],{radius:4,color:m?'#387775':'#6a7370',fillColor:m?'#9bbbbb':'#afb7b3',fillOpacity:.7,weight:1});
    const body=document.createElement('div'),title=document.createElement('strong'),county=document.createElement('p'),caution=document.createElement('p');
    title.textContent=p.name;county.textContent=p.county+' County · State GIS '+p.oid;
    body.append(title,county);
    if(m){
      const science=document.createElement('p');
      science.textContent='Matched to USGS 2020 stream network (NHDPlus COMID '+(m.nhdComid||'not assigned')+'), with approximately '+Math.round(m.separationMeters)+' m between mapped source locations.';
      const source=document.createElement('a');source.href='https://doi.org/10.5066/P9QQTKA0';source.textContent='USGS scientific source';source.target='_blank';source.rel='noopener noreferrer';
      body.append(science,source);
    }
    caution.textContent='Geographic research only. Neither source establishes legal access, trail, land manager, parking or current conditions. Do not navigate to this waterfall coordinate.';
    body.append(caution);marker.bindPopup(body);marker.addTo(local);shown++;
  }
  layer=local.addTo(window.UPWaterfallMap);
  say(shown+' geographic research points displayed; '+linked+' independently cross-referenced to USGS stream hydrography. Not visitor access locations.');
}
box.addEventListener('change',render);
})();