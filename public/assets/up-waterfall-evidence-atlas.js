(()=>{'use strict';
const $=id=>document.getElementById(id);
const search=$('ea-search'),kind=$('ea-kind'),county=$('ea-county'),list=$('ea-record-list'),count=$('ea-count'),more=$('ea-more'),detail=$('ea-detail'),mapState=$('ea-map-state'),mapRoot=$('ea-map');
if(!search||!kind||!county||!list||!count||!more||!detail||!mapRoot)return;
const labels={guide:'Visitor guide',gis:'State GIS',name:'Name only',tourism:'UP Travel index'};
const reviewLabels={'existing-guide-umbrella':'Existing waterfall group','existing-guide-alias':'Existing waterfall, alternate name','existing-guide-region':'Existing waterfall trail area','existing-closure-guide':'Known waterfall, LAND-MANAGER CLOSED','research-name-alias':'Alternate name supported; visitor route unknown','research-distinct-wilderness':'Distinct remote waterfall; no approved route','unresolved-specific-feature':'Identity unresolved; do not navigate'};
const statusLabels={'verified-access-guide':'Published access guide (current conditions unknown)','verified-closure-guide':'Closure guide: not a current public outing','research-only-guide':'Source research, no cleared visitor approach','multi-falls-planner':'Multi-waterfall visitor planner'};
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/['\u2018\u2019](?=s\b)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const typeOf=r=>labels[r.kind]||'Research';
const text=(node,value)=>{node.textContent=String(value??'');return node;};
const el=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)text(n,content);return n;};
const safeUrl=value=>{try{const u=new URL(String(value),location.origin);return u.protocol==='https:'?u.href:null;}catch{return null;}};
const safePath=value=>typeof value==='string'&&/^\/[a-z0-9\/-]+\/$/.test(value)?value:null;
let records=[],shown=30,visible=[],selected=null,map=null,mapPins=null,selectedCompareMarker=null,officialComparisonLayer=null,officialComparisonVisible=false,officialComparisonEpoch=0,officialComparisonCache=null,baseLayer=null,usingFallback=false,baseErrors=0;
const guideLookup=new Map(),recordLookup=new Map();
function resetSelection(){clearOfficialComparison();if(selectedCompareMarker&&map){map.removeLayer(selectedCompareMarker);selectedCompareMarker=null;}selected=null;text(detail,'');detail.append(el('p','ea-eyebrow','Source inspection'),el('h3','', 'Select a waterfall name'),el('p','', 'Names and mapped points carry different kinds of evidence. A location is not a public parking or hiking route.'));}
function clearOfficialComparison(){
 officialComparisonEpoch++;
 if(officialComparisonLayer&&map)map.removeLayer(officialComparisonLayer);
 officialComparisonLayer=null;officialComparisonVisible=false;
}
function detailRow(dl,label,value){if(value===null||value===undefined||value==='')return;dl.append(el('dt','',label),el('dd','',value));}
function link(parent,label,href){const u=href?.startsWith('/')?safePath(href):safeUrl(href);if(!u)return;const a=el('a','',label);a.href=u;if(!u.startsWith('/')){a.target='_blank';a.rel='noopener noreferrer';}parent.append(a);}
function showDetail(r){
 clearOfficialComparison();
 if(selectedCompareMarker&&map){map.removeLayer(selectedCompareMarker);selectedCompareMarker=null;}
 selected=r.id;text(detail,'');detail.append(el('p','ea-eyebrow',typeOf(r)+' · source record'),el('h3','',r.name));
 const caution=el('p','ea-decision',r.kind==='guide'?
   (r.publication==='verified-closure-guide'?'This visitor page documents a closure. Do not assume access is open.':r.publication==='research-only-guide'?'Research-only guide: no verified legal visitor approach.':'This is a published guide, NOT a live opening report. Check current land-manager conditions.') :
   r.kind==='gis'?'State-mapped natural-feature coordinate. Never a parking pin, public trail or river crossing authorization.':
   r.kind==='tourism'&&r.priorityAccess?'Source review: '+r.priorityAccess.accessVerdict+'. This is NOT a completed visitor route or approved arrival.':
   r.kind==='tourism'&&r.identityReview?.disposition==='existing-closure-guide'?'This source name refers to an existing land-manager CLOSED waterfall guide. There is NO authorized visitor route.':
   r.kind==='tourism'?(r.listingRole==='related-place-or-activity'?'This is a related park, trail, business or facility listing, NOT a separately confirmed natural waterfall. ':'The listing URL contains a waterfall name. Its exact geographic identity and visitor access are not confirmed. ')+(r.directoryMembership==='observed-on-directory-first-page'?'Its road/town labels were seen in the public waterfall directory, but they are NOT visitor parking or a legal route.':'This indexed URL has NOT been confirmed as a current directory card, parking location or hiking destination.'): 
   'An independently cataloged name. No independently verified coordinates, parking, or public trail are provided by this source.');
 detail.append(caution);
 if(r.kind==='tourism'&&r.identityReview){
 const v=r.identityReview,box=el('section','ea-investigation');box.append(el('p','ea-eyebrow','Reviewed November 8, 2026'),el('h4','',reviewLabels[v.disposition]||'Investigated waterfall identity'),el('p','ea-canonical','Source identity: '+v.canonicalName),el('p','',v.finding),el('p','ea-barrier','Access decision: '+v.barrier));
 if(!v.publicRouteCleared||!v.newDestinationAuthorized)box.append(el('p','ea-no-route','No new destination or visitor route authorized by this source review.'));
 detail.append(box);
 }
 if(r.kind==='tourism'&&r.priorityAccess){
   const v=r.priorityAccess,box=el('section','ea-access-dossier');
   box.append(el('p','ea-eyebrow','Primary land-manager investigation / '+v.reviewed),el('h4','',v.accessVerdict),el('p','ea-access-verdict',v.shortVerdict));
   const context=el('dl','ea-access-context');
   detailRow(context,'Land manager',v.landManager);
   detailRow(context,'Documented access',v.establishedStart);
   detailRow(context,'Not established',v.waterfallViewpoint);
   detailRow(context,'Seasonal rule',v.seasonality);
   detailRow(context,'Do not confuse',v.falseEquivalence);
   box.append(context);
   const evidence=el('details','ea-access-sources');
   evidence.append(el('summary','','Read land-manager evidence and original references'));
   const paragraph=el('p','','Primary-source findings');
   evidence.append(paragraph);
   const facts=el('ul');
   for(const fact of v.officialFacts){
     const li=el('li','',fact.fact);
     const src=v.references.find(x=>x.id===fact.sourceId);
     if(src){li.append(el('span','', ' '));link(li,'See official source',src.url);}
     facts.append(li);
   }
   evidence.append(facts);
   const independent=el('p','','Independent identity checks and limitations');evidence.append(independent);
   const outside=el('ul');
   for(const fact of v.independentFacts){
     const li=el('li','',fact.fact);
     const src=v.references.find(x=>x.id===fact.sourceId);
     if(src){li.append(el('span','', ' '));link(li,'Review source',src.url);}
     outside.append(li);
   }
   evidence.append(outside);
   const next=el('p','','What evidence would be needed before an independent waterfall outing could be published');evidence.append(next);
   const remaining=el('ul');
   for(const proof of v.nextEvidence)remaining.append(el('li','',proof));
   evidence.append(remaining);
   box.append(evidence);
   box.append(el('p','ea-no-route','Research only. No new GPS coordinate, waterfall parking, legal walking route or trip-planning destination is authorized.'));
   detail.append(box);
   if(r.listingId===4474){
     const compare=el('section','ea-federal-compare');
     compare.append(el('p','ea-eyebrow','Official GIS crosswalk · checked November 9, 2026'));
     compare.append(el('h4','','Two USGS waterfalls. One DNR trail. No invented connection.'));
     compare.append(el('p','','The federal Gazetteer identifies Pinkerton Falls and Traders Falls as distinct features. Compare their published natural-feature positions with Michigan DNR Pinkerton hiking-trail segments. This is a source-evidence map, NOT a destination map.'));
     const btn=el('button','ea-compare-action','Compare federal names and DNR trail');
     btn.type='button';btn.setAttribute('aria-pressed','false');
     const results=el('div','ea-federal-results');
     const info=el('p','ea-federal-state','Comparison is hidden. No visitor route, off-trail connector or parking point will be drawn.');
     info.setAttribute('role','status');
     btn.addEventListener('click',()=>{void revealOfficialComparison(btn,results,info,r.id);});
     compare.append(btn,info,results);
     detail.append(compare);
   }
 }
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
 detailRow(dl,'Earlier audit classification',r.identityStatus);
 if(r.identityReview){detailRow(dl,'Reviewed identity',reviewLabels[r.identityReview.disposition]||r.identityReview.disposition);detailRow(dl,'Investigation date',r.identityReview.reviewed);}
 detailRow(dl,'Caution',r.note);
 }
 const arrivalReference=r.kind==='guide'&&r.mapRole==='multi-falls-day-use-reference-not-natural-waterfall-feature';
 detailRow(dl,'Map position',arrivalReference
   ?'No natural waterfall point is assigned to this combined guide. Its Upper Falls day-use reference is deliberately omitted from this map; inspect the two individually mapped falls below.'
   :Number.isFinite(r.lat)&&Number.isFinite(r.lng)
     ?'Natural feature only: '+r.lat.toFixed(5)+', '+r.lng.toFixed(5)
     :'No verified geographic point in this record');detail.append(dl);
 if(arrivalReference){
   const compare=el('div','ea-compare');
   compare.append(el('p','','This combined visitor guide covers separate waterfalls. Its day-use reference is deliberately not plotted as a natural waterfall. Inspect each separately mapped state GIS feature below. These are NOT parking, trailheads or approved routes.'));
   for(const id of (r.linkedGisIds||[])){
     const feature=recordLookup.get('gis:'+id);if(!feature)continue;
     const btn=el('button','ea-compare-btn','Inspect '+feature.name+' · state GIS #'+id);
     btn.type='button';btn.addEventListener('click',()=>showDetail(feature));compare.append(btn);
   }
   detail.append(compare);
 }
 const links=el('p','ea-source');
 if(r.kind==='guide')link(links,'Open existing waterfall guide',r.guidePath);
 if(r.kind==='gis'&&r.relatedGuideId){const g=guideLookup.get(r.relatedGuideId);if(g)link(links,'Open linked guide',g.guidePath);}
 if(r.kind==='name'&&r.relatedGuideIds?.length){for(const id of r.relatedGuideIds.slice(0,3)){const g=guideLookup.get(id);if(g)link(links,'Compare named guide: '+g.name,g.guidePath);}}
 if(r.kind==='tourism'){
 for(const id of (r.identityReview?.reviewedGuideIds||[])){
  const g=guideLookup.get(id);if(g)link(links,r.identityReview.disposition==='existing-closure-guide'?'Read existing closure guide: '+g.name:'Read existing researched guide: '+g.name,g.guidePath);
 }
 for(const id of [r.relatedGuideId,...(r.relatedGuideIds||[])]){const g=guideLookup.get(id);if(g)link(links,'Previously verified guide link: '+g.name,g.guidePath);}
 for(const id of (r.candidateGuideIds||[]).filter(id=>id!==r.relatedGuideId&&!(r.relatedGuideIds||[]).includes(id)).slice(0,4)){
 const g=guideLookup.get(id);if(g)link(links,'Compare same-named guide (unverified identity): '+g.name,g.guidePath);
 }
 }
 link(links,'Examine original UP Travel listing',r.sourceUrl);
 if(r.kind==='tourism'&&r.identityReview?.sourceUrls?.length){
 for(const source of r.identityReview.sourceUrls)if(source!==r.sourceUrl)link(links,'Supporting identity/access source',source);
 }
 detail.append(links);
 if(r.kind==='tourism'&&(r.candidateGisIds?.length||r.identityReview?.linkedGisIds?.length)){
 const compare=el('div','ea-compare');compare.append(el('p','',r.identityReview?.linkedGisIds?.length?'Source-reviewed Michigan GIS identity. The GIS point is the waterfall, NOT parking or a lawful visitor trail.':'Same-name Michigan GIS features. Comparing them DOES NOT prove they are this exact listing or establish a safe route.'));
 const ids=[...new Set([...(r.identityReview?.linkedGisIds||[]),...(r.candidateGisIds||[])])];
 for(const id of ids.slice(0,5)){
  const g=recordLookup.get('gis:'+id);if(!g)continue;
  const btn=el('button','ea-compare-btn','Inspect '+((r.identityReview?.linkedGisIds||[]).includes(id)?'reviewed ':'')+'state GIS #'+id+' · '+g.county+' County');
  btn.type='button';btn.addEventListener('click',()=>showDetail(g));compare.append(btn);
 }
 detail.append(compare);
 }
 if(!arrivalReference&&Number.isFinite(r.lat)&&Number.isFinite(r.lng)&&map){
 map.setView([r.lat,r.lng],Math.max(map.getZoom(),10),{animate:false});
 if(!visible.some(x=>x.id===r.id)&&typeof L!=='undefined'){
   selectedCompareMarker=L.circleMarker([r.lat,r.lng],{radius:8,color:'#254f66',fillColor:'#89b6c3',fillOpacity:.9,weight:3});
   const popup=el('div');popup.append(el('strong','',r.name),el('p','','Comparison-only Michigan GIS natural feature, never visitor parking or a verified tourist route.'));
   selectedCompareMarker.bindPopup(popup).addTo(map).openPopup();
 }
 mapState.textContent='Selected natural waterfall feature for evidence comparison; never treat it as a vehicle arrival.';
 }else if(arrivalReference){mapState.textContent='The combined guide gives a visitor-area reference, not a natural waterfall point. Choose an individual state GIS feature to compare its map position.';}else if(!Number.isFinite(r.lat)){mapState.textContent='No mapped point for this record; no coordinates were inferred from its name or address.';}
 document.querySelectorAll('.ea-record').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.evidenceId===r.id)));
}
function score(r,q){const n=norm(r.name);if(n===q)return 0;if(n.startsWith(q))return 1;if(n.includes(q))return 2;return 3;}
function applyFilters(){
 shown=30;const q=norm(search.value),k=kind.value,c=county.value;
 visible=records.filter(r=>(k==='all'||r.kind===k)&&(c==='all'||r.county===c)&&(!q||norm([r.name,r.river,r.place,r.addressLabel,r.identityReview?.canonicalName,r.identityReview?.finding,r.priorityAccess?.caseName].filter(Boolean).join(' ')).includes(q)));
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
 // Only replace a guide pin when the linked GIS feature is actually visible.
 // A combined visitor-area reference (Tahquamenon) is never a natural waterfall pin.
 const shownGisIds=new Set(visible.filter(r=>r.kind==='gis'&&Number.isFinite(r.lat)&&Number.isFinite(r.lng)).map(r=>r.gisObjectId));
 const native=window.UPWaterfallEvidenceRust?.atlas?.()||null;
 const subset=visible.filter(r=>native?
     native.canPlot(r,shownGisIds,kind.value):
     Number.isFinite(r.lat)&&Number.isFinite(r.lng)&&
     (r.kind==='gis'||(r.kind==='guide'&&r.mapRole==='natural-waterfall-feature-not-arrival'&&
       (kind.value==='guide'||!(r.linkedGisIds||[]).some(id=>shownGisIds.has(id))))));
 for(const r of subset){
   const isGuide=r.kind==='guide',marker=L.circleMarker([r.lat,r.lng],{radius:isGuide?6:4,color:isGuide?'#1f715b':'#536c7a',fillColor:isGuide?'#40a48b':'#849ba8',fillOpacity:.76,weight:1.3});
   const popup=el('div');popup.append(el('strong','',r.name),el('p','',typeOf(r)+'. Natural-feature coordinates; NOT parking, trailhead or an approved access route.'));
   const action=el('button','', 'Inspect source record');action.type='button';action.addEventListener('click',()=>showDetail(r));popup.append(action);
   marker.bindPopup(popup).addTo(mapPins);
 }
 const suffix=subset.length?' natural-feature dots. No name-only or tourism listing has been geocoded.':' geographic dots in these results. Unmapped names remain searchable.';
 mapState.textContent=subset.length+suffix;
}

async function revealOfficialComparison(button,results,status,recordId){
 if(officialComparisonVisible){
   clearOfficialComparison();button.textContent='Compare federal names and DNR trail';
   button.setAttribute('aria-pressed','false');results.replaceChildren();
   status.textContent='Official geometry hidden. No navigation or waterfall route was generated.';
   mapState.textContent='Official research overlay hidden; source-only waterfalls have no public-arrival pins.';
   return;
 }
 const epoch=++officialComparisonEpoch;button.disabled=true;
 status.textContent='Loading reviewed USGS and Michigan DNR geography…';
 try{
   if(!officialComparisonCache){
     const response=await fetch('/assets/up-waterfall-pinkerton-official-comparison.json',{cache:'force-cache'});
     if(!response.ok)throw Error('Source data unavailable');
     const data=await response.json();
     if(data.schemaVersion!==1||data.sourceCheckedOn!=='2026-11-09'||
       data.counts.federalDistinctNamedFalls!==2||data.counts.dnrApprovedHikingTrailSegments!==66||
       data.counts.approvedWaterfallViewpointRoutes!==0||data.officialNamedFalls?.length!==2||
       data.dnrHikingTrail?.segmentPolylines?.length!==66||data.mapRules?.publicWaterfallItineraryApproved!==false||
       data.mapRules?.drawFootpathToFalls!==false||data.mapRules?.drawStraightLineConnectors!==false||
       data.mapRules?.drawParkingMarkers!==false||data.mapRules?.drawUnverifiedThirdPartyPoints!==false||
       data.mapRules?.tourismUnnamedFallsLinkedToNamedFeature!==false)throw Error('Unsafe source contract');
     const ids=data.officialNamedFalls.map(x=>x.featureId).sort().join(',');
     if(ids!=='1615029,2126322'||data.officialNamedFalls.some(x=>x.semanticRole!=='federal-geographic-feature-point-not-trailhead-or-viewpoint'||
       !Array.isArray(x.coordinateLonLat)||x.coordinateLonLat.length!==2||
       !x.coordinateLonLat.every(Number.isFinite)))throw Error('Unexpected feature identity');
     if(data.dnrHikingTrail.segmentPolylines.some(x=>!Array.isArray(x.coordinatesLonLat)||
       x.coordinatesLonLat.length<2||x.coordinatesLonLat.some(p=>p.length!==2||!p.every(Number.isFinite))))throw Error('Invalid DNR trail coordinates');
     officialComparisonCache=data;
   }
   if(epoch!==officialComparisonEpoch||selected!==recordId)return;
   const data=officialComparisonCache,plot=el('dl','ea-federal-measures');
   for(const f of data.officialNamedFalls){
     detailRow(plot,f.featureName+' · USGS '+f.featureId,Math.round(f.nearestDNRHikingTrailMeters)+' m straight-line to nearest DNR hiking trail segment. NOT walking distance.');
   }
   detailRow(plot,'Federal falls separation',(data.officialFallsStraightLineSeparationMeters/1000).toFixed(2)+' km between named geographic-feature points');
   detailRow(plot,'DNR mapped trail',data.counts.dnrApprovedHikingTrailSegments+' approved segments · '+data.dnrHikingTrail.mappedSumOfSegmentMiles.toFixed(2)+' mapped mi (DNR brochure: '+data.dnrHikingTrail.dnrPrintedTrailMiles.toFixed(1)+' mi). GIS Open is not live road access.');
   const example=el('p','','Independent Western U.P. brochure Traders Falls point differs by '+Math.round(data.independentLocationChecks.find(x=>x.sourceReliability==='independent-tourism').distanceFromFederalFeatureMeters)+' m from the federal Traders Falls point. Unverified directory points are deliberately excluded.');
   const legend=el('p','ea-federal-legend','Research map: teal lines = DNR-approved Pinkerton hiking segments; two labeled circles = USGS natural waterfall feature points. No waterfall approaches, connectors or parking markers.');
   const links=el('p','ea-federal-links');
   link(links,'Examine USGS geographic names',data.provenance.usgsGazetteerLayer);
   link(links,'Examine Michigan DNR hiking GIS',data.provenance.dnrGISLayer);
   link(links,'DNR park map labeling Traders Falls',data.provenance.dnrBackcountryMap);
   results.replaceChildren(plot,example,legend,links);
   if(map&&typeof L!=='undefined'){
     const group=L.layerGroup();const bounds=L.latLngBounds([]);
     for(const seg of data.dnrHikingTrail.segmentPolylines){
       const line=L.polyline(seg.coordinatesLonLat.map(p=>[p[1],p[0]]),{
         color:'#226c62',weight:4,opacity:.85,interactive:false});
       line.addTo(group);bounds.extend(line.getBounds());
     }
     for(const f of data.officialNamedFalls){
       const isPinkerton=f.featureId===2126322;
       const pin=L.circleMarker([f.coordinateLonLat[1],f.coordinateLonLat[0]],{
         radius:9,color:isPinkerton?'#825533':'#3e597d',
         weight:2.8,fillColor:isPinkerton?'#d09a61':'#8ba7cd',fillOpacity:.93});
       const popup=el('div');popup.append(el('strong','',f.featureName+' · USGS '+f.featureId));
       popup.append(el('p','','Federal geographic-feature point. Approximately '+Math.round(f.nearestDNRHikingTrailMeters)+' m straight line from the DNR hiking trail. No official waterfall-viewpoint route, parking or off-trail connection is established.'));
       pin.bindPopup(popup);pin.addTo(group);bounds.extend(pin.getLatLng());
     }
     if(epoch!==officialComparisonEpoch||selected!==recordId)return;
     officialComparisonLayer=group.addTo(map);
     map.fitBounds(bounds.pad(.22),{animate:false,maxZoom:14});
     status.textContent='Official-source comparison drawn: two federal falls, 66 DNR trail segments. No routes or parking pins.';
     mapState.textContent='Official research overlay only · two federal waterfall points and 66 actual DNR trail segments; no walking connectors or arrival.';
   }else{
     status.textContent='Verified source distances shown. Map unavailable; no route or arrival has been inferred.';
   }
   officialComparisonVisible=true;
   button.textContent='Hide official GIS comparison';
   button.setAttribute('aria-pressed','true');
 }catch(error){
   if(epoch!==officialComparisonEpoch||selected!==recordId)return;
   status.textContent='Official geometry cannot be verified or loaded. No substitute coordinates or routes are shown. Original DNR and USGS references remain in the investigation above.';
 }finally{if(epoch===officialComparisonEpoch&&selected===recordId)button.disabled=false;}
}
async function load(){
 try{
  const response=await fetch('/assets/up-waterfall-evidence-atlas.json?v=4-20261109-map-truth',{cache:'force-cache'});if(!response.ok)throw Error('Atlas unavailable');
  const payload=await response.json();
  if(payload.schemaVersion!==4||!Array.isArray(payload.records)||payload.records.length!==payload.counts.totalSourceRecords||payload.counts.totalSourceRecords!==640||payload.counts.priorityAccessInvestigations!==3)throw Error('Atlas contract mismatch');
  for(const r of payload.records){
   if(!['guide','gis','name','tourism'].includes(r.kind)||typeof r.id!=='string'||typeof r.name!=='string')throw Error('Invalid record');
   if(['name','tourism'].includes(r.kind)&&(r.lat!==null||r.lng!==null))throw Error('Unsafe source location');
   if(r.priorityAccess){
     const a=r.priorityAccess;
     if(r.kind!=='tourism'||a.sourceRecordId!==r.id||a.routeCleared!==false||a.newDestinationAuthorized!==false||
       a.featurePoint!==null||a.parkingPoint!==null||a.routeGeometry!==null||!Array.isArray(a.references)||!Array.isArray(a.officialFacts))throw Error('Unsafe access source record');
   }
   recordLookup.set(r.id,r);if(r.kind==='guide')guideLookup.set(r.relatedGuideId,r);
  }
  records=payload.records;
  if(records.filter(x=>x.priorityAccess).length!==3)throw Error('Priority access count mismatch');
  for(const btn of document.querySelectorAll('[data-review-listing]'))btn.disabled=false;
  const counties=[...new Set(records.map(r=>r.county).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  for(const c of counties){const opt=el('option','',c+' County');opt.value=c;county.append(opt);}
  initMap();applyFilters();
  // Atlas still renders without WASM. Activate Rust only after validating all
  // 640 existing source records and shadowed-GIS marker cases.
  window.UPWaterfallEvidenceRust?.loadAtlas?.(records)?.then(engine=>{
    if(engine)renderPins();
  });
 }catch(e){text(count,'Atlas data is unavailable; the verified waterfall trip planner is still accessible.');text(list,'');const p=el('p','', 'Could not load or verify the research catalog. No replacement names or coordinates have been invented.');link(p,'Use curated waterfall guides','/upper-peninsula-waterfalls/');list.append(p);text(mapRoot,'Map withheld because source records could not be validated.');more.hidden=true;}
}
search.addEventListener('input',applyFilters);kind.addEventListener('change',applyFilters);county.addEventListener('change',applyFilters);
for(const btn of document.querySelectorAll('[data-review-listing]')){
  btn.addEventListener('click',()=>{
    const r=recordLookup.get('tourism:'+btn.dataset.reviewListing);
    if(!r?.priorityAccess)return;
    kind.value='tourism';county.value='all';search.value=r.name;
    applyFilters();showDetail(r);
    $('atlas-workbench')?.scrollIntoView({block:'start'});
  });
}
$('ea-reset').addEventListener('click',()=>{search.value='';kind.value='all';county.value='all';applyFilters();search.focus();});
more.addEventListener('click',()=>{shown+=30;renderList();});
void load();
})();
