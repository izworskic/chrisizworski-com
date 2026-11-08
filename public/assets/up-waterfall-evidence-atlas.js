(()=>{'use strict';
const $=id=>document.getElementById(id);
const search=$('ea-search'),kind=$('ea-kind'),county=$('ea-county'),list=$('ea-record-list'),count=$('ea-count'),more=$('ea-more'),detail=$('ea-detail'),mapState=$('ea-map-state'),mapRoot=$('ea-map');
if(!search||!kind||!county||!list||!count||!more||!detail||!mapRoot)return;
const labels={guide:'Visitor guide',gis:'State GIS',name:'Name only',tourism:'UP Travel index'};
const statusLabels={'verified-access-guide':'Published access guide (current conditions unknown)','verified-closure-guide':'Closure guide: not a current public outing','research-only-guide':'Source research, no cleared visitor approach','multi-falls-planner':'Multi-waterfall visitor planner'};
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const typeOf=r=>labels[r.kind]||'Research';
const text=(node,value)=>{node.textContent=String(value??'');return node;};
const el=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)text(n,content);return n;};
const safeUrl=value=>{try{const u=new URL(String(value),location.origin);return u.protocol==='https:'?u.href:null;}catch{return null;}};
const safePath=value=>typeof value==='string'&&/^\/[a-z0-9\/-]+\/$/.test(value)?value:null;
let records=[],shown=30,visible=[],selected=null,map=null,mapPins=null,baseLayer=null,usingFallback=false,baseErrors=0;
const guideLookup=new Map(),recordLookup=new Map();
function resetSelection(){selected=null;text(detail,'');detail.append(el('p','ea-eyebrow','Source inspection'),el('h3','', 'Select a waterfall name'),el('p','', 'Names and mapped points carry different kinds of evidence. A location is not a public parking or hiking route.'));}
function detailRow(dl,label,value){if(value===null||value===undefined||value==='')return;dl.append(el('dt','',label),el('dd','',value));}
function link(parent,label,href){const u=href?.startsWith('/')?safePath(href):safeUrl(href);if(!u)return;const a=el('a','',label);a.href=u;if(!u.startsWith('/')){a.target='_blank';a.rel='noopener noreferrer';}parent.append(a);}
function showDetail(r){
 selected=r.id;text(detail,'');detail.append(el('p','ea-eyebrow',typeOf(r)+' · source record'),el('h3','',r.name));
 const caution=el('p','ea-decision',r.kind==='guide'?
   (r.publication==='verified-closure-guide'?'This visitor page documents a closure. Do not assume access is open.':r.publication==='research-only-guide'?'Research-only guide: no verified legal visitor approach.':'This is a published guide, NOT a live opening report. Check current land-manager conditions.') :
   r.kind==='gis'?'State-mapped natural-feature coordinate. Never a parking pin, public trail or river crossing authorization.':
   r.kind==='tourism'?(r.listingRole==='related-place-or-activity'?'This is a related park, trail, business or facility listing, NOT a separately confirmed natural waterfall. ':'The listing URL contains a waterfall name. Its exact geographic identity and visitor access are not confirmed. ')+(r.directoryMembership==='observed-on-directory-first-page'?'Its road/town labels were seen in the public waterfall directory, but they are NOT visitor parking or a legal route.':'This indexed URL has NOT been confirmed as a current directory card, parking location or hiking destination.'): 
   'An independently cataloged name. No independently verified coordinates, parking, or public trail are provided by this source.');
 detail.append(caution);
 const dl=el('dl');detailRow(dl,'County',r.county||'Not confidently assigned');detailRow(dl,'River',r.river);
 detailRow(dl,'Area / town',r.place);detailRow(dl,'Source date',r.sourceReviewed);
 if(r.kind==='guide'){detailRow(dl,'Publication',statusLabels[r.publication]||r.publication);detailRow(dl,'Existing status',r.status);detailRow(dl,'Linked GIS IDs',r.linkedGisIds?.join(', ')||'None explicitly linked');}
 if(r.kind==='gis'){detailRow(dl,'GIS feature',String(r.gisObjectId));detailRow(dl,'Identity',r.relatedGuideId?'Explicitly linked to an existing guide':'Not linked to a visitor guide by GIS ID');}
 if(r.kind==='name'){detailRow(dl,'Name matching',r.identityStatus.split('_').join(' '));detailRow(dl,'GIS name matches',r.relatedGisIds?.join(', ')||'None independently confirmed');detailRow(dl,'Potential aliases',r.possibleAliasIds?.join(', ')||'None listed');}
 if(r.kind==='tourism'){
 detailRow(dl,'UP Travel listing ID',r.listingId);
 detailRow(dl,'Listing class',r.listingRole==='related-place-or-activity'?'Related place or activity, not an extra waterfall':'Waterfall-named URL, geographic identity unverified');
 detailRow(dl,'Source name quality',r.nameMethod==='directory-first-page-card'?'Read directly from directory card':'Derived from website URL slug (not full page text)');
 detailRow(dl,'Directory status',r.directoryMembership==='observed-on-directory-first-page'?'Observed as a directory card':'Not independently verified in current directory category');
 detailRow(dl,'Tourism road label',r.addressLabel);
 detailRow(dl,'Potential county names',r.candidateCounties?.length?r.candidateCounties.join(', ')+' (name-match hints only)':'No geographic county match');
 detailRow(dl,'Same-name GIS objects',r.candidateGisIds?.length?r.candidateGisIds.join(', ')+' (not verified as this tourism listing)':'None');
 detailRow(dl,'Same-name independent names',r.candidateExternalIds?.length?String(r.candidateExternalIds.length)+' source record(s), identity unverified':'None');
 detailRow(dl,'Earlier audit classification',r.identityStatus);detailRow(dl,'Caution',r.note);
 }
 detailRow(dl,'Map position',Number.isFinite(r.lat)&&Number.isFinite(r.lng)?'Natural feature only: '+r.lat.toFixed(5)+', '+r.lng.toFixed(5):'No verified geographic point in this record');detail.append(dl);
 const links=el('p','ea-source');
 if(r.kind==='guide')link(links,'Open existing waterfall guide',r.guidePath);
 if(r.kind==='gis'&&r.relatedGuideId){const g=guideLookup.get(r.relatedGuideId);if(g)link(links,'Open linked guide',g.guidePath);}
 if(r.kind==='name'&&r.relatedGuideIds?.length){for(const id of r.relatedGuideIds.slice(0,3)){const g=guideLookup.get(id);if(g)link(links,'Compare named guide: '+g.name,g.guidePath);}}
 if(r.kind==='tourism'){
 for(const id of [r.relatedGuideId,...(r.relatedGuideIds||[])]){const g=guideLookup.get(id);if(g)link(links,'Previously verified guide link: '+g.name,g.guidePath);}
 for(const id of (r.candidateGuideIds||[]).filter(id=>id!==r.relatedGuideId&&!(r.relatedGuideIds||[]).includes(id)).slice(0,4)){
 const g=guideLookup.get(id);if(g)link(links,'Compare same-named guide (unverified identity): '+g.name,g.guidePath);
 }
 }
 link(links,'Examine original source',r.sourceUrl);
 detail.append(links);
 if(r.kind==='tourism'&&r.candidateGisIds?.length){
 const compare=el('div','ea-compare');compare.append(el('p','','Same-name Michigan GIS features. Comparing them DOES NOT prove they are this exact listing or establish a safe route.'));
 for(const id of r.candidateGisIds.slice(0,5)){
  const g=recordLookup.get('gis:'+id);if(!g)continue;
  const btn=el('button','ea-compare-btn','Inspect state GIS #'+id+' · '+g.county+' County');
  btn.type='button';btn.addEventListener('click',()=>showDetail(g));compare.append(btn);
 }
 detail.append(compare);
 }
 if(Number.isFinite(r.lat)&&Number.isFinite(r.lng)&&map){map.setView([r.lat,r.lng],Math.max(map.getZoom(),10),{animate:false});mapState.textContent='Selected natural waterfall feature; never treat it as a vehicle arrival.';}else if(!Number.isFinite(r.lat)){mapState.textContent='No mapped point for this record; no coordinates were inferred from its name or address.';}
 document.querySelectorAll('.ea-record').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.evidenceId===r.id)));
}
function score(r,q){const n=norm(r.name);if(n===q)return 0;if(n.startsWith(q))return 1;if(n.includes(q))return 2;return 3;}
function applyFilters(){
 shown=30;const q=norm(search.value),k=kind.value,c=county.value;
 visible=records.filter(r=>(k==='all'||r.kind===k)&&(c==='all'||r.county===c)&&(!q||norm([r.name,r.river,r.place,r.addressLabel].filter(Boolean).join(' ')).includes(q)));
 if(q)visible.sort((a,b)=>score(a,q)-score(b,q)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 resetSelection();renderList();renderPins();
}
function renderList(){
 text(list,'');const size=visible.length;text(count,size+' source '+(size===1?'record':'records')+' matching · 640 source observations, NOT 640 distinct waterfalls');
 if(!size){list.append(el('p','', 'No source records match this filter. Clear filters or browse a different county.'));}
 for(const r of visible.slice(0,shown)){const btn=el('button','ea-record kind-'+r.kind),left=el('span'),title=el('span','ea-record-title',r.name);
 btn.type='button';btn.dataset.evidenceId=r.id;btn.setAttribute('aria-pressed','false');
 const sub=[r.county?r.county+' County':r.kind==='tourism'?(r.place||'Source URL only · location unverified'):r.place||'Area not verified',r.river,r.kind==='tourism'&&r.listingRole==='related-place-or-activity'?'Related site, not separate waterfall':null].filter(Boolean).join(' · ');
 left.append(title,el('span','ea-record-sub',sub||'Geographic identity research only'));
 btn.append(left,el('span','ea-type',typeOf(r)));btn.addEventListener('click',()=>showDetail(r));list.append(btn);}
 more.hidden=shown>=size;more.textContent='Show '+Math.min(30,Math.max(0,size-shown))+' more records';
}
function addFallback(){
 if(!map||usingFallback)return;usingFallback=true;if(baseLayer)map.removeLayer(baseLayer);
 const layer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:17,attribution:'&copy; OpenStreetMap contributors'});
 layer.on('tileload',()=>{mapState.textContent='OpenStreetMap fallback · natural features only, not parking.';});
 layer.on('tileerror',()=>{if(++baseErrors>=3)mapState.textContent='Map tiles unavailable. The searchable record list and source evidence still work.';});
 baseLayer=layer.addTo(map);
}
async function basemap(){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
 try{const response=await fetch('/api/carto-basemap-config',{credentials:'same-origin',signal:controller.signal,headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('CARTO config unavailable');const cfg=await response.json();
 if(cfg?.provider!=='CARTO'||typeof cfg.key!=='string'||!cfg.key.trim())throw Error('No keyed basemap');
 const url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key='+encodeURIComponent(cfg.key.trim());
 const layer=L.tileLayer(url,{maxZoom:17,subdomains:'abcd',attribution:'&copy; OpenStreetMap contributors &copy; CARTO'});
 layer.on('tileload',()=>{mapState.textContent='CARTO map loaded · natural features only, not visitor parking.';});
 let failed=0;layer.on('tileerror',()=>{if(++failed>=3)addFallback();});
 baseLayer=layer.addTo(map);
 }catch{addFallback();}finally{clearTimeout(timer);}
}
function initMap(){
 if(typeof L==='undefined'){text(mapRoot,'Map unavailable. Research names and sources remain accessible below.');mapState.textContent='Map library unavailable. No records have been hidden.';return;}
 try{mapRoot.replaceChildren();map=L.map(mapRoot,{scrollWheelZoom:false,zoomControl:true}).setView([46.65,-87.8],7);mapPins=L.layerGroup().addTo(map);void basemap();}
 catch{map=null;text(mapRoot,'Map unavailable. Search the text-only evidence catalog.');mapState.textContent='Map failed to initialize. Records are still accessible.';}
}
function renderPins(){
 if(!map||!mapPins)return;mapPins.clearLayers();
 // In All mode GIS feature points take precedence over duplicate curated guide points.
 const subset=visible.filter(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lng)&&
     (r.kind==='gis'||(r.kind==='guide'&&(kind.value==='guide'||!r.linkedGisIds?.length))));
 for(const r of subset){
   const isGuide=r.kind==='guide',marker=L.circleMarker([r.lat,r.lng],{radius:isGuide?6:4,color:isGuide?'#1f715b':'#536c7a',fillColor:isGuide?'#40a48b':'#849ba8',fillOpacity:.76,weight:1.3});
   const popup=el('div');popup.append(el('strong','',r.name),el('p','',typeOf(r)+'. Natural-feature coordinates; NOT parking, trailhead or an approved access route.'));
   const action=el('button','', 'Inspect source record');action.type='button';action.addEventListener('click',()=>showDetail(r));popup.append(action);
   marker.bindPopup(popup).addTo(mapPins);
 }
 const suffix=subset.length?' natural-feature dots. No name-only or tourism listing has been geocoded.':' geographic dots in these results. Unmapped names remain searchable.';
 mapState.textContent=subset.length+suffix;
}
async function load(){
 try{
  const response=await fetch('/assets/up-waterfall-evidence-atlas.json',{cache:'force-cache'});if(!response.ok)throw Error('Atlas unavailable');
  const payload=await response.json();
  if(payload.schemaVersion!==2||!Array.isArray(payload.records)||payload.records.length!==payload.counts.totalSourceRecords||payload.counts.totalSourceRecords!==640)throw Error('Atlas contract mismatch');
  for(const r of payload.records){
   if(!['guide','gis','name','tourism'].includes(r.kind)||typeof r.id!=='string'||typeof r.name!=='string')throw Error('Invalid record');
   if(['name','tourism'].includes(r.kind)&&(r.lat!==null||r.lng!==null))throw Error('Unsafe source location');
   recordLookup.set(r.id,r);if(r.kind==='guide')guideLookup.set(r.relatedGuideId,r);
  }
  records=payload.records;
  const counties=[...new Set(records.map(r=>r.county).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  for(const c of counties){const opt=el('option','',c+' County');opt.value=c;county.append(opt);}
  initMap();applyFilters();
 }catch(e){text(count,'Atlas data is unavailable; the verified waterfall trip planner is still accessible.');text(list,'');const p=el('p','', 'Could not load or verify the research catalog. No replacement names or coordinates have been invented.');link(p,'Use curated waterfall guides','/upper-peninsula-waterfalls/');list.append(p);text(mapRoot,'Map withheld because source records could not be validated.');more.hidden=true;}
}
search.addEventListener('input',applyFilters);kind.addEventListener('change',applyFilters);county.addEventListener('change',applyFilters);
$('ea-reset').addEventListener('click',()=>{search.value='';kind.value='all';county.value='all';applyFilters();search.focus();});
more.addEventListener('click',()=>{shown+=30;renderList();});
void load();
})();
