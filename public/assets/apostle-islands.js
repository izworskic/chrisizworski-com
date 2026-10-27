/* Apostle Islands Explorer · only progressive enhancement; every source/answer exists in HTML. */
(()=>{'use strict';
const radio=[...document.querySelectorAll('input[name="mode"]')];
const duration=document.getElementById('time-choice');
const cards=[...document.querySelectorAll('.stop')];
const results=document.getElementById('result');
const empty=document.getElementById('no-results');
const mapEl=document.getElementById('ap-map');
const points=[
{id:'meyers',name:'Meyers Beach',lat:46.8834,lng:-91.0484,kind:'Mainland trailhead · road access',url:'https://www.google.com/maps/search/?api=1&query=90500+Meyers+Beach+Road+Bayfield+WI'},
{id:'grand-tour',name:'Bayfield ferry and cruise area',lat:46.8122497,lng:-90.8127362,kind:'Road access · check specific operator dock',url:'https://www.google.com/maps/search/?api=1&query=20+Washington+Avenue+Bayfield+WI'},
{id:'sand',name:'Sand Island (orientation)',lat:46.9791,lng:-90.9485,kind:'Water access only · not a landing coordinate',url:'https://www.nps.gov/places/sand-island.htm'},
{id:'madeline',name:'Big Bay State Park',lat:46.787904,lng:-90.675362,kind:'Via Madeline Island ferry · state park',url:'https://www.google.com/maps/search/?api=1&query=2402+Hagen+Road+La+Pointe+WI'}
];
let markers=[],map=null;
const matches=(card)=>{
const mode=radio.find(r=>r.checked)?.value||'all';
const time=duration?.value||'all';
const modes=(card.dataset.modes||'').split(/\s+/);
const times=(card.dataset.times||'').split(/\s+/);
return (mode==='all'||modes.includes(mode))&&(time==='all'||times.includes(time));
};
const update=()=>{
let count=0;
for(const c of cards){const visible=matches(c);c.hidden=!visible;if(visible)count++;}
if(empty)empty.hidden=count!==0;
if(results)results.textContent=count?('Showing '+count+' of '+cards.length+' experiences. Check official sources for conditions, transport and access.'):'No experiences match both filters.';
for(const p of markers){const c=document.getElementById('stop-'+p.id);if(!map)continue; if(c&&!c.hidden){p.marker.addTo(map);}else{map.removeLayer(p.marker);}}
};
for(const r of radio)r.addEventListener('change',update);
if(duration)duration.addEventListener('change',update);
update();
if(!mapEl||typeof window.L==='undefined'){if(mapEl)mapEl.dataset.state='fallback';return;}
const L=window.L;
try{
map=L.map(mapEl,{scrollWheelZoom:false,zoomControl:true,preferCanvas:false}).setView([46.91,-90.85],9);
mapEl.classList.add('is-ready');
map.attributionControl.setPrefix('Leaflet');
const osm=()=>L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'});
let active=osm().addTo(map),fallback=false;
const onError=()=>{if(fallback)return;fallback=true;const old=active;active=osm().addTo(map);map.removeLayer(old);mapEl.dataset.tiles='osm-fallback';};
for(const p of points){
const marker=L.circleMarker([p.lat,p.lng],{radius:8,color:'#fff',weight:2,fillColor:'#17616b',fillOpacity:1});
const node=document.createElement('div');
const heading=document.createElement('strong');heading.textContent=p.name;node.appendChild(heading);
const desc=document.createElement('p');desc.textContent=p.kind;desc.style.margin='5px 0';node.appendChild(desc);
const a=document.createElement('a');a.textContent=p.id==='sand'?'Official island information ↗':'Google Maps directions ↗';a.href=p.url;a.target='_blank';a.rel='noopener noreferrer';node.appendChild(a);
marker.bindPopup(node);markers.push({id:p.id,marker});marker.addTo(map);
marker.on('click',()=>{const c=document.getElementById('stop-'+p.id);if(c){c.classList.add('selected');setTimeout(()=>c.classList.remove('selected'),1400);}});
}
map.fitBounds(L.latLngBounds(points.map(p=>[p.lat,p.lng])).pad(.2),{maxZoom:11});
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>map.invalidateSize({pan:false})).observe(mapEl);
window.addEventListener('load',()=>map.invalidateSize({pan:false}),{once:true});
update();
fetch('/api/carto-basemap-config',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(conf=>{
if(!conf||conf.provider!=='CARTO'||!conf.key||typeof conf.key!=='string')return;
const u='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+encodeURIComponent(conf.key.trim());
const layer=L.tileLayer(u,{subdomains:'abcd',maxZoom:19,attribution:'© OpenStreetMap contributors © CARTO'});
let loaded=false,errors=0;
layer.on('tileload',()=>{loaded=true;mapEl.dataset.tiles='carto';});
layer.on('tileerror',()=>{if(++errors>=2){if(map.hasLayer(layer))map.removeLayer(layer);mapEl.dataset.tiles='osm-fallback';}});
layer.addTo(map);
layer.once('load',()=>{if(loaded&&map.hasLayer(active)){map.removeLayer(active);active=layer;}});
}).catch(()=>{mapEl.dataset.tiles='osm';});
}catch(err){mapEl.dataset.state='fallback';mapEl.dataset.mapError=String(err?.message||err).slice(0,150);console.warn('Apostle Islands map fallback:',mapEl.dataset.mapError);if(map){map.remove();map=null;}/* Native HTML fallback remains. */}
})();
