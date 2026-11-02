(()=>{'use strict';
const inputs=[...document.querySelectorAll('input[name="cr-visit"]')],season=document.getElementById('cr-season'),answer=document.getElementById('cr-answer'),heading=document.getElementById('cr-answer-title'),description=document.getElementById('cr-answer-copy'),steps=document.getElementById('cr-answer-steps'),seasonNote=document.getElementById('cr-season-note'),mapElement=document.getElementById('cr-geo-map');
if(!inputs.length||!season||!heading||!description||!steps||!seasonNote)return;
const cases={
 carp:{title:'Choose the managed overlook, not the gorge scramble',copy:'Start from the NTN South Trailhead on CR 553. The 2024 NTN Carp River Falls Trail provides a documented waterfall overlook, but a surveyed turn-by-turn path from the lot to the overlook has not been established here. Follow the current NTN trail signs and manager map. Trailforks maps the 3,363-foot (0.64-mile) Carp River Falls Trail segment itself. It is not the measured distance from NTN South parking; follow current NTN trail signs for the remaining connections. If you cannot identify the signed overlook approach, turn back rather than following a raw waterfall GPS point.',steps:['Park at the public NTN South Trailhead, not the highway shoulder.','Use the marked pedestrian crossing of M-553; do not drive motor-restricted Mount Marquette Road.','For the 0.64-mile Carp River Falls Trail segment, use the Trailforks mapped alignment. Current NTN signs determine the connections from parking and the location of the managed overlook. Do not leave maintained trails.'],risk:'caution',map:[46.503807,-87.44655]},
 morgan:{title:'Morgan Falls is the simpler established waterfall walk',copy:'The visitor bureau documents the designated M-553 crossing, a nonmotorized walk along Mount Marquette Road, and a short descent toward Morgan Creek. This is a separate 20-foot falls experience, not the full Carp River gorge.',steps:['Begin at the NTN South Trailhead on CR 553.','Use the marked highway crossing; no dirt-shoulder parking.','Walk the motor-vehicle-restricted road and the published footpath to Morgan Falls.'],risk:'caution',map:[46.507745,-87.446107]},
 gorge:{title:'Do not choose an unverified gorge-bottom descent',copy:'Older accounts describe a narrow, slippery descent to reach the base. The newer NTN-managed trail and waterfall overlook make the cliff scramble unnecessary for planning. A public trail description does not certify a safe route down the rock wall.',steps:['Do not follow unofficial creek crossings, cliffside tracks or a downloaded line to the base.','If you go, use an NTN-maintained overlook while the trail is open and signed.','For a less exposed outing, choose the published Morgan Falls walking route.'],risk:'stop',map:[46.503807,-87.44655]},
 upper:{title:'This is the different Upper Carp River Falls near Ishpeming',copy:'Michigan GIS #163 and #169 both carry a Carp River name but describe different places. The upper Ishpeming feature has an older first-person report of a posted No Trespassing trail near utility property. It is not a lawful replacement trailhead for the Marquette gorge.',steps:['Do not navigate to the Ishpeming natural-feature coordinate as a parking lot.','Do not use older SEMCO Energy property approach directions.','Return to Morgan Falls or the signed NTN Carp River Falls Trail for an established public outing.'],risk:'stop',map:[46.521504,-87.572418]}
};
const seasons={
 dry:'In dry, snow-free conditions, expect rocky uneven tread and cyclists on the shared NTN network. This is not an ADA-certified waterfall route.',
 wet:'Rain and spring melt make stream edges and bedrock slippery. Stay at the managed overlook; avoid informal creek crossings and the gorge bottom.',
 winter:'NTN manages some winter trail grooming, but that does not establish waterfall-specific opening or safe ice footing. Check posted uses and grooming; do not approach icy gorge edges.'
};
let map=null,markers={};
if(mapElement&&typeof L!=='undefined'){try{map=L.map(mapElement,{scrollWheelZoom:false,zoomControl:true}).setView([46.506,-87.447],14);L.tileLayer('https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:17,attribution:'&copy; OpenStreetMap contributors &copy; CARTO'}).addTo(map);
const p=[['carp',[46.503807,-87.44655],'Carp River Falls • Michigan GIS #169. Natural location, not parking.',false],['morgan',[46.507745,-87.446107],'Morgan Falls • Michigan GIS #166. Different creek waterfall, not parking.',false],['upper',[46.521504,-87.572418],'Upper Carp River Falls near Ishpeming • posted access reported. Not a visitor destination.',true]];
for(const [id,xy,copy,restricted] of p){const icon=L.divIcon({className:'cr-waterfall-mark'+(restricted?' restricted':''),html:'<span></span>',iconSize:[24,24],iconAnchor:[12,12]});markers[id]=L.marker(xy,{icon}).addTo(map).bindPopup(copy);}
}catch(e){mapElement.innerHTML='<p class="cr-map-fallback">Map unavailable. Use the source-backed parking and walking guidance; do not navigate to waterfall coordinates.</p>';map=null;}}

const fallsButton=document.getElementById('cr-show-falls'),trailButton=document.getElementById('cr-show-trail'),fallsPanel=document.getElementById('cr-falls-panel'),trailPanel=document.getElementById('cr-trail-panel'),loadTrailButton=document.getElementById('cr-load-trail-map'),trailEmbedShell=document.getElementById('cr-embed-shell');
function showEvidence(view){
 if(!fallsButton||!trailButton||!fallsPanel||!trailPanel)return;
 const trail=view==='trail';
 fallsButton.setAttribute('aria-pressed',String(!trail));trailButton.setAttribute('aria-pressed',String(trail));
 fallsPanel.hidden=trail;trailPanel.hidden=!trail;
 if(!trail&&map&&typeof map.invalidateSize==='function')requestAnimationFrame(()=>map.invalidateSize());
}
fallsButton?.addEventListener('click',()=>showEvidence('falls'));
trailButton?.addEventListener('click',()=>showEvidence('trail'));
loadTrailButton?.addEventListener('click',()=>{
 if(!trailEmbedShell||trailEmbedShell.dataset.loaded==='true')return;
 // Officially supported Trailforks trail widget, embedded by NTN in its South Trails map.
 // We do NOT scrape proprietary GPS vertices or manufacture a route from parking.
 const iframe=document.createElement('iframe');
 iframe.title='Trailforks map of Carp River Falls Trail, NTN South Trails (trail 766002)';
 iframe.src='https://www.trailforks.com/widgets/trail/?trailid=766002&map=1&titleshow=1&info=1&elevation=0&showphotos=0&width=100%25&height=500px';
 iframe.loading='eager';
 iframe.referrerPolicy='strict-origin-when-cross-origin';
 iframe.className='cr-trail-embed';
 const fallback=document.createElement('p');
 fallback.className='cr-trail-fallback';
 fallback.append('If the trail map is unavailable, ');
 const link=document.createElement('a');link.href='https://www.trailforks.com/trails/carp-river-falls/';link.rel='noopener noreferrer';link.target='_blank';link.textContent='open the mapped trail directly';
 fallback.append(link,'.');
 trailEmbedShell.replaceChildren(iframe,fallback);
 trailEmbedShell.dataset.loaded='true';
});

function render(){const selected=inputs.find(x=>x.checked)?.value||'carp',item=cases[selected];heading.textContent=item.title;description.textContent=item.copy;steps.replaceChildren();for(const text of item.steps){let li=document.createElement('li');li.textContent=text;steps.appendChild(li);}seasonNote.textContent=seasons[season.value]||seasons.dry;answer.dataset.risk=item.risk;if(selected!=='carp')showEvidence('falls');if(map){const id=selected==='gorge'?'carp':selected;const pin=markers[id];if(pin){map.panTo(item.map);map.setZoom(id==='upper'?12:14);pin.openPopup();}}}
for(const input of inputs)input.addEventListener('change',render);season.addEventListener('change',render);
document.getElementById('cr-copy')?.addEventListener('click',()=>{const selected=inputs.find(x=>x.checked)?.value||'carp',x=cases[selected];const out=['Carp River Falls · Marquette decision','Choice: '+x.title,x.copy,...x.steps.map((step,i)=>(i+1)+'. '+step),'Season: '+seasonNote.textContent,'Official trail manager: https://www.noquetrails.org/south-trails/','Parking/crossing: https://www.travelmarquette.com/outdoor-adventure/waterfalls/','Mapped NTN trail segment (not full route): https://www.trailforks.com/trails/carp-river-falls/','Guide: '+location.href].join('\n');if(navigator.clipboard?.writeText){navigator.clipboard.writeText(out).then(()=>{const el=document.getElementById('cr-copied');if(el)el.textContent='Plan copied.';}).catch(()=>window.prompt('Copy this plan:',out));}else window.prompt('Copy this plan:',out);});
render();
})();
