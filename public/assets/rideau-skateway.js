/* Official NCC ice only. A source date is not the time this page loads. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const Policy=window.RideauSkatewayPolicy;
 const BASE='https://services2.arcgis.com/WLyMuW006nKOfa5Z/arcgis/rest/services/NCC_Rideau_Canal_Skateway_Ice_condition/FeatureServer/0';
 const QUERY=BASE+'/query?where=1%3D1&outFields=OBJECTID%2CID%2CFrom_%2CTo_%2CLength_KM%2CStatus&returnGeometry=false&returnCentroid=true&outSR=4326&f=json';
 const statusPage='https://ncc-ccn.gc.ca/places/skateway-ice-conditions';
 let archive=null,entrances=null,assessment=null,selection=1,filter='all';
 let map=null,markers=new Map(),tileLayer=null;
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 const set=(id,value)=>{const e=$(id);if(e)e.textContent=value;};
 const dateText=iso=>{
   if(!iso)return 'Not available';
   const date=new Date(iso);
   if(Number.isNaN(date.getTime()))return 'Not available';
   return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(date);
 };
 function sourceReport(){
  if(!assessment)return;
  if(assessment.verified){
    const n=assessment.totals.reportedOpenSections;
    set('overall-verdict',n>0?n+' '+(n===1?'section':'sections')+' in the latest NCC report '+(n===1?'lists':'list')+' skating conditions':'NCC currently reports no skateable sections');
    set('overall-story',n>0?'NCC reports '+assessment.totals.reportedOpenKm.toFixed(2)+' km across those section records. This is an addition of published section lengths, not a single continuous route or a personal ice-safety clearance.':'The complete recent NCC report lists no sections with an opening or skating condition. Check its official page for updates.');
  }else{
    set('overall-verdict','No current skating opening verified here');
    set('overall-story',assessment.reason);
  }
  set('source-time',assessment.observedAt?'NCC source last edited '+dateText(assessment.observedAt)+(assessment.verified?' (passes freshness check).':' (archived or unavailable for current access).'):'No trustworthy NCC update time available.');
  set('filter-explain',assessment.verified?'14 NCC sections checked; statuses can change quickly.':'No reliable current openings to filter.');
 }
 function changeSelection(id,scroll){
   selection=Number(id);
   if(!archive?.sections?.some(x=>x.id===selection))selection=1;
   const url=new URL(location.href);
   url.searchParams.set('section',String(selection));
   history.replaceState(null,'',url.pathname+url.search+url.hash);
   renderSelected();
   document.querySelectorAll('#section-list button').forEach(b=>b.setAttribute('aria-current',String(Number(b.dataset.sectionId)===selection)));
   markers.forEach((m,key)=>{const pin=m.getElement()?.querySelector('i');if(pin)pin.classList.toggle('active',key===selection);});
   if(map&&markers.has(selection)){
     map.panTo(markers.get(selection).getLatLng(),{animate:false});
   }
   if(scroll&&matchMedia('(max-width:900px)').matches)$('selected-title')?.scrollIntoView({block:'start',behavior:'auto'});
 }
 function renderSelected(){
   const s=Policy.select(assessment,selection);if(!s)return;
   set('selected-title',s.label);
   set('selected-length','NCC-listed section length: '+s.km+' km. Not an estimate of uninterrupted skating distance.');
   const status=$('selected-status');status.dataset.current=s.current?'yes':'no';
   status.textContent=s.current?'NCC reports: '+s.labelStatus:'Skating access unverified';
   set('selected-description',s.current
     ?(s.skatingReportedOpen?'The NCC currently lists skating conditions for this section. Use the NCC report and signed entrances before stepping onto the ice.':'The NCC does not currently list this section as available for skating. Do not enter.')
     :'This is an official mapped section, but there is no recent complete source report establishing skating access. An archived closure or quality grade is not a new season opening.');
   set('selected-timestamp',assessment.observedAt?'NCC report last edited: '+dateText(assessment.observedAt):'No current NCC update is available.');
   const list=$('selected-access');list.replaceChildren();
   const nearby=Policy.entrancesFor(s.id,entrances?.entrances);
   if(!nearby.length){
     list.append(make('li',null,'No entrance is directly matched to this section in the NCC recommended-entrance table. Check the official map.'));
   }else for(const e of nearby){
     const li=make('li');li.append(make('strong',null,e.name+(e.accessible?' (NCC-listed universal access)':'')));
     li.append(make('span',null,' Transit: '+e.transit+'.'));
     const a=make('a',null,'Open Google Maps place search');a.href=e.googleSearch;a.rel='noopener noreferrer';a.target='_blank';li.append(a);list.append(li);
   }
 }
 function renderList(){
   const list=$('section-list');list.replaceChildren();
   const visible=assessment.sections.filter(s=>filter==='all'||(assessment.verified&&s.skatingReportedOpen));
   set('section-count',visible.length+' sections shown from the NCC inventory.');
   for(const s of visible){
     const li=make('li'),b=make('button','section-button');
     b.type='button';b.dataset.sectionId=s.id;
     b.setAttribute('aria-current',String(s.id===selection));
     b.append(make('span',null,s.label));
     b.append(make('b',null,s.km+' km'));
     b.append(make('small',null,assessment.verified?s.status:'Not currently verified'));
     b.addEventListener('click',()=>changeSelection(s.id,true));
     li.append(b);list.append(li);
   }
   if(!visible.length)list.append(make('li','empty-list','There are no fresh NCC-reported skating openings to display. Choose All sections or check the official NCC update.'));
   document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
 }
 function render(){sourceReport();renderList();renderSelected();refreshMapPins();}
 async function fetchJSON(url,signal){
   const r=await fetch(url,{signal,cache:'no-store',mode:'cors'});
   if(!r.ok)throw Error('NCC source response '+r.status);
   const data=await r.json();if(data?.error)throw Error('NCC source unavailable');
   return data;
 }
 async function tileSource(){
   try{
     const r=await fetch('/api/carto-basemap-config',{cache:'no-store'});
     if(r.ok){
       const d=await r.json(),key=d?.key;
       if(typeof key==='string'&&/^[a-zA-Z0-9_-]{5,200}$/.test(key)){
         return {type:'carto',url:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+encodeURIComponent(key),
           attribution:'&copy; OpenStreetMap contributors &copy; CARTO'};
       }
     }
   }catch(_){}
   return {type:'osm',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:'&copy; OpenStreetMap contributors'};
 }
 function mapFailure(){
   $('map-shell').hidden=true;$('map-fallback').hidden=false;
   try{map?.remove();}catch(_){}
   map=null;markers.clear();
 }
 function refreshMapPins(){
   if(!map)return;
   markers.forEach((m,key)=>{
     const s=assessment?.sections?.find(x=>x.id===key),pin=m.getElement()?.querySelector('i');
     if(pin){pin.classList.toggle('active',key===selection);pin.style.background=assessment?.verified?(s?.skatingReportedOpen?'#2a8066':'#aa6855'):'#68848a';}
     m.setTooltipContent((s?.label||'NCC Skateway section')+' | '+(assessment?.verified?s?.status:'status unverified'));
   });
 }
 async function initMap(){
   if(!window.L||!archive?.sections?.length){mapFailure();return;}
   try{
     map=L.map('skateway-map',{scrollWheelZoom:false,zoomControl:true}).setView([45.405,-75.69],12);
     $('map-shell').hidden=false;$('map-fallback').hidden=true;map.invalidateSize({pan:false});
     let attempts=0;
     const install=tile=>{
       if(!map)return;
       if(tileLayer)map.removeLayer(tileLayer);
       let loaded=false,errors=0;const stamp=++attempts;
       tileLayer=L.tileLayer(tile.url,{maxZoom:17,attribution:tile.attribution}).addTo(map);
       tileLayer.on('tileload',()=>loaded=true);
       tileLayer.on('tileerror',()=>{
         if(++errors>=5&&stamp===attempts){
           if(tile.type==='carto')install({type:'osm',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:'&copy; OpenStreetMap contributors'});
           else mapFailure();
         }
       });
       setTimeout(()=>{if(map&&!loaded&&stamp===attempts){
         if(tile.type==='carto')install({type:'osm',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:'&copy; OpenStreetMap contributors'});
         else mapFailure();
       }},10000);
     };
     install(await tileSource());
     const bounds=[];
     for(const s of archive.sections){
       const m=L.marker([s.lat,s.lon],{title:s.label+' NCC section center',
         icon:L.divIcon({className:'skateway-pin',html:'<i aria-hidden="true"></i>',iconSize:[23,23],iconAnchor:[12,12]})});
       m.bindTooltip(s.label+' | section center, not entrance');
       m.addTo(map).on('click',()=>changeSelection(s.id,false));markers.set(s.id,m);
       bounds.push([s.lat,s.lon]);
     }
     map.fitBounds(bounds,{padding:[26,26]});refreshMapPins();
   }catch(_){mapFailure();}
 }
 async function main(){
   if(!Policy)return;
   const ac=new AbortController(),timeout=setTimeout(()=>ac.abort(),12000);
   try{
     [archive,entrances]=await Promise.all([
       fetchJSON('/assets/rideau-skateway-sections.json',ac.signal),
       fetchJSON('/assets/rideau-skateway-entrances.json',ac.signal)
     ]);
     if(archive.schemaVersion!==1||archive.sections?.length!==14||entrances.schemaVersion!==1||entrances.entrances?.length!==11)throw Error('Audited inventory mismatch');
     const q=new URL(location.href).searchParams.get('section');
     if(archive.sections.some(s=>s.id===Number(q)))selection=Number(q);
     assessment=Policy.assess(archive,null,null,new Date());
     $('static-sections').hidden=true;$('interactive').hidden=false;$('filter-bar').hidden=false;
     document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{
       filter=b.dataset.filter;
       if(filter==='open'&&assessment.verified&&assessment.sections.some(s=>s.skatingReportedOpen)&&!assessment.sections.some(s=>s.id===selection&&s.skatingReportedOpen)){
         selection=assessment.sections.find(s=>s.skatingReportedOpen).id;
       }
       render();
     }));
     render();initMap();
     try{
       const [metadata,features]=await Promise.all([fetchJSON(BASE+'?f=json',ac.signal),fetchJSON(QUERY,ac.signal)]);
       assessment=Policy.assess(archive,metadata,features,new Date());
     }catch(_){
       assessment=Policy.assess(archive,null,null,new Date());
     }
     render();
   }catch(_){
     $('interactive').hidden=true;$('static-sections').hidden=false;
     set('overall-verdict','Official skating status not available');
     set('overall-story','Use the source-linked section list below and confirm current NCC conditions before going onto the ice.');
   }finally{clearTimeout(timeout);}
 }
 main();
})();