#!/usr/bin/env node
// Internal, review-only map export. Do not deploy to public/ or advertise directions.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {audit,buildResearchOverlay}=require('../lib/sleeping-giant/geometry-reconciliation.cjs');
const dest=path.resolve(process.argv[2]||'artifacts/sleeping-giant');
const report=audit();
if(report.navigatorEligible||report.signedJunctionsCertified!==0||report.verifiedRoadToTrailLinks!==0)
 throw new Error('Cannot export a navigation-eligible research map');
const order=['top-of-the-giant','head-of-the-giant','nanabosho-lookout','sea-lion'];
const overlays=order.map(routeId=>buildResearchOverlay(routeId,{withCoordinates:true}));
const features=overlays.flatMap(o=>o.sections.map((s,i)=>({
 type:'Feature',geometry:s.researchGeometry,properties:{
   routeId:o.routeId,sectionOrder:i,trail:s.trail,officialTripDistanceKm:o.officialReturnKm,
   onMappedTrailMode:s.modeOnMappedTrail,sourceObjectId:s.sourceObjectId,sourceOgfId:s.sourceOgfId,
   researchOnly:true,turnByTurnEligible:false,activeTrailOpen:false,parkingConnectorMapped:false,
   computedSectionKm:s.calculatedOneWaySectionKm,
   source:'Ontario Trail Network, LIO Open04 layer 19 (no simplification, six-decimal rounding)'
 }
})));
const geo={type:'FeatureCollection',metadata:{title:'Sleeping Giant internal source geometry QA ONLY',
 generatedAtSourceReview:'2026-10-29',source:report.source,
 disclaimer:'Route lines omit a verified car-park connector and do not certify legal junction coordinates or current access.',
 publicDirectionsEligible:false,onlinePublishingApproved:false,osmParkingAttribution:report.parking.mappedParkingResearchPoint.attribution,
 ontarioLicence:'https://www.ontario.ca/page/open-government-licence-ontario'},features};
const data={report,overlays};
const safe=JSON.stringify(data).replace(/</g,'\\u003c');

const {catalog,plan}=require('../lib/sleeping-giant/route-engine.cjs');
const {evaluateAccess}=require('../lib/sleeping-giant/visitor-access-engine.cjs');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cards=catalog.routes.map((r,i)=>{
 const details=evaluateAccess({routeId:r.id});
 const duration=r.officialDurationMinutes?
   (r.officialDurationMinutes.min===r.officialDurationMinutes.max?
    'About '+r.officialDurationMinutes.min+' minutes':
    r.officialDurationMinutes.min/60+'–'+r.officialDurationMinutes.max/60+' hours walking'):
   'Complete duration unknown';
 const mode=r.bikePermission==='official_documented'?
   r.bikeApproachRoundTripKm+' km bike + '+r.bikeHikeRemainingRoundTripKm+' km walk (both return)':
   'No complete cycling option documented';
 const parkSource=r.officialBasis.map(key=>'<a href="'+esc(catalog.sources[key])+'" target="_blank" rel="noopener noreferrer">Official source</a>').join(' ');
 const maps=order.includes(r.id)?'<button class="inspect-route" data-view="'+esc(r.id)+'" type="button">Inspect government-mapped trail sections</button>':
   '<span class="pending-map">Detailed GIS shape not yet reconstructed</span>';
 return ['<article class="route-card" data-route-id="'+esc(r.id)+'" style="order:'+i+'">',
  '<div class="route-eyebrow">Sleeping Giant · '+esc(r.difficulty)+'</div>',
  '<h3>'+esc(r.name)+'</h3>',
  '<p class="route-distance">'+r.roundTripKm+' km return</p>',
  '<p class="route-copy">'+esc(r.caution)+'</p>',
  '<p class="route-modes">'+esc(mode)+'</p>',
  '<p class="route-time">'+esc(duration)+'</p>',
  '<p class="route-access">'+esc(details.lot?'Signed South Kabeyun lot exists; exact parking point and current access not verified.':'Named access only; exact parking unverified.')+'</p>',
  '<p class="route-status" data-status="'+esc(r.id)+'">Choose your outing above for a planning comparison.</p>',
  '<div class="route-links">'+parkSource+'</div>',maps,'</article>'].join('');
}).join('\n');
const matrix={};
for(const hours of [2,4,6,8,10,12])for(const mode of ['hike','bike-hike'])for(const interest of ['summit','short-walk','geology','beach']){
 const result=plan({hours,mode,interest,remainingDaylightMinutes:null});
 if(!result.planningOnly||result.liveTrailStatus!==false)throw Error('A planning matrix may not imply live status');
 matrix[[hours,mode,interest].join('|')]=result.results.map(r=>({id:r.id,classification:r.classification,reason:r.duration.status}));
}
const matrixJson=JSON.stringify({plans:matrix,reviewedAt:catalog.reviewedAt,navigationEligible:false,liveAccess:false}).replace(/</g,'\\u003c');
const controlsHtml=[
 '<section class="visitor-choices" aria-labelledby="choice-title"><div><span class="section-eyebrow">The journey before the route</span><h2 id="choice-title">What kind of day do you have?</h2>',
 '<p>Official return distances, travel modes and known unknowns. This does not check real-time weather, parking, or trail status.</p></div>',
 '<div class="visitor-filters">',
 '<label for="visitor-interest">What draws you?<select id="visitor-interest"><option value="summit">High overlooks</option><option value="short-walk">A shorter walk</option><option value="geology">Rock and shoreline</option><option value="beach">A beach</option></select></label>',
 '<label for="visitor-hours">Hours you have<select id="visitor-hours"><option>2</option><option>4</option><option>6</option><option selected>8</option><option>10</option><option>12</option></select></label>',
 '<label for="visitor-mode">Travel mode<select id="visitor-mode"><option value="hike">On foot</option><option value="bike-hike">Bike + hike</option></select></label>',
 '</div></section><p id="visitor-summary" class="visitor-summary" aria-live="polite">All six source-backed outings are available below. Use the selectors to compare their planning fit.</p>'
].join('\n');
const routeGallery='<section class="gallery" aria-labelledby="gallery-title"><div class="gallery-head"><span class="section-eyebrow">Park trails, not guesses</span>'+
 '<h2 id="gallery-title">Six ways to encounter the Giant</h2>'+
 '<p>The cards, route distances and official sources remain useful without JavaScript. Map selection requires JavaScript, and no map is approved for directions.</p></div>'+
 '<div id="route-gallery" class="route-gallery">'+cards+'</div></section>';
const html=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>Sleeping Giant | Internal Geometry Review</title>
<style>
:root{color-scheme:dark;font:16px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;background:#071c24;color:#eaf5f4}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(1000px 600px at 70% 0%,#183b43 0,transparent 80%),#071c24}
header,main,footer{max-width:1250px;margin:auto;padding:clamp(18px,4vw,46px)}
header{padding-bottom:6px}.eyebrow{font-size:.76rem;letter-spacing:.15em;font-weight:750;text-transform:uppercase;color:#99dfcb}
h1{font:clamp(2rem,4vw,3.5rem)/1.08 Georgia,serif;letter-spacing:-.035em;margin:.4rem 0}
p{max-width:78ch;color:#bcd3d4}.warning{border-left:4px solid #f9bb75;padding:.8rem 1rem;background:#283229;color:#fff1db;border-radius:4px}
.layout{display:grid;grid-template-columns:minmax(270px,1fr) minmax(0,2.1fr);gap:22px}
.panel{background:#102a32;border:1px solid #35535a;border-radius:18px;padding:23px;min-width:0}
.panel h2{font:1.4rem Georgia,serif;margin:.2rem 0 1.2rem}
select{font:inherit;width:100%;background:#0a222b;border:1px solid #789ca0;border-radius:10px;color:white;padding:.9rem}
label{display:block;margin:10px 0 8px;font-weight:650;color:#e2edeb}
.stat{padding:13px 0;border-top:1px solid #35535a;display:flex;justify-content:space-between;gap:10px}
.stat strong{font-size:1.2rem;font-variant-numeric:tabular-nums}.note{font-size:.85rem;color:#b9cbcd}
.legend{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0}.key{display:inline-flex;align-items:center;gap:7px;font-size:.84rem}
.swatch{display:inline-block;width:24px;height:4px;border-radius:4px;background:#7fe5c3}.walk{background:#f8c076}.lot{background:#fd7b7b}
svg{display:block;width:100%;aspect-ratio:1.32;border-radius:12px;background:#0b222c}
svg path.route{fill:none;stroke-width:3.2;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}
svg .grid{stroke:#28505a;stroke-width:1;fill:none}svg .marker{stroke:#082029;stroke-width:2;vector-effect:non-scaling-stroke}
svg text{font:12px system-ui,sans-serif;fill:#f5f7f3;paint-order:stroke;stroke:#0b222c;stroke-width:4px;stroke-linejoin:round}
ul{padding-left:20px;color:#c8dcdb}li{margin:.6rem 0}a{color:#8de8ce}
@media(max-width:790px){.layout{grid-template-columns:1fr}svg{aspect-ratio:1.05}}

.visitor-choices,.visitor-summary,.gallery{max-width:1250px;margin:18px auto;padding:18px clamp(18px,4vw,46px)}
.visitor-choices{display:grid;grid-template-columns:1fr 1.4fr;gap:24px;align-items:end;background:#16413d;border-radius:17px}
.visitor-choices h2,.gallery h2{font:clamp(1.6rem,2.9vw,2.4rem)/1.1 Georgia,serif;letter-spacing:-.03em;margin:7px 0}
.visitor-choices p{margin:0;color:#bfd6ce;font-size:.85rem}
.section-eyebrow{letter-spacing:.12em;text-transform:uppercase;font-weight:750;font-size:.72rem;color:#e0ae71}
.visitor-filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.visitor-filters label{font-size:.76rem;font-weight:750;margin:0;display:block}
.visitor-filters select{margin-top:7px;background:#f8f6ef;color:#163630;border:1px solid #adc2b8}
.visitor-summary{font-weight:650;font-size:.88rem;color:#afd9c9;margin-top:0}
.gallery-head p{font-size:.86rem;max-width:70ch;margin:0}
.route-gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:20px}
.route-card{border:1px solid #426361;border-radius:14px;background:#13343a;padding:18px;display:flex;flex-direction:column;gap:8px}
.route-card[data-preferred=true]{border-color:#dfaf70;box-shadow:0 0 0 1px #dfaf70}
.route-eyebrow{letter-spacing:.1em;text-transform:uppercase;font-size:.71rem;color:#d6b184}
.route-card h3{font:1.55rem/1.15 Georgia,serif;margin:4px 0}
.route-card p{font-size:.83rem;margin:0;color:#c5d9d5}
.route-card .route-distance{font:1.25rem Georgia,serif;color:#fff}
.route-card .route-modes{background:#274b47;padding:8px;border-radius:6px;color:#e4f5e9;font-size:.77rem}
.route-card .route-status{margin-top:auto;padding-top:12px;border-top:1px solid #41615e;color:#e1d0a8}
.route-card .route-status[data-kind=not_suitable]{color:#f2a98f}
.route-card .route-status[data-kind=planning_candidate]{color:#9be7c6}
.route-links{font-size:.78rem;display:flex;gap:10px;flex-wrap:wrap}
.inspect-route{border:0;border-radius:8px;padding:10px;background:#d8e5d8;color:#17342e;font-weight:750;text-align:left}
.pending-map{font-size:.72rem;color:#bacdca}
button:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid #e7b976;outline-offset:3px}
@media(max-width:920px){.visitor-choices{grid-template-columns:1fr}.route-gallery{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:620px){.visitor-filters,.route-gallery{grid-template-columns:1fr}.visitor-choices{border-radius:0}}

</style>
</head>
<body>
<header><div class="eyebrow">Internal geospatial QA · source review October 29, 2026</div>
<h1>Sleeping Giant: the trails beneath the trip</h1>
<p>Seven unsimplified Ontario Trail Network features. Four source-reconciled summit and shoreline options. This is an internal cartographic inspection of candidate trail positions, not a visitor navigation map.</p>
<div class="warning" role="note"><strong>Not for directions.</strong> The signed parking lot has no certified entrance pin or verified pedestrian connector. Mapped junction intersections are not proven on-site signs. Official Ontario Parks distances control trip planning; live trail, road and permit status are unknown.</div>
</header>
${controlsHtml}
<main class="layout">
<section class="panel" aria-labelledby="controls"><h2 id="controls">Compare an outing</h2>
<label for="route">Source geometry to review</label>
<select id="route">
<option value="top-of-the-giant">Top of the Giant</option>
<option value="head-of-the-giant">Head of the Giant</option>
<option value="nanabosho-lookout">Nanabosho Lookout</option>
<option value="sea-lion">Sea Lion Trail</option>
</select>
<div id="stats" aria-live="polite"></div>
<p class="note">The difference is an unexplained source-map gap, not an additional walkable leg or a validated travel distance.</p>
<h2>Provenance</h2>
<p class="note">Trail lines: Ontario government OTN MapServer layer 19, source IDs preserved, no server simplification. Park rules and official round-trip distances: Ontario Parks. Research parking candidate: OpenStreetMap way 151289776, as shown by Mapcarta.</p>
<p><a href="https://www.ontarioparks.ca/park/SleepingGiant/activities">Ontario Parks trail descriptions</a></p>
<p><a href="https://www.ontarioparks.ca/park/SleepingGiant/alerts">Check official park alerts</a></p>
</section>
<section class="panel" aria-labelledby="map-heading"><h2 id="map-heading">Mapped segments · not a route</h2>
<div class="legend"><span class="key"><span class="swatch"></span>Documented bikeable trail</span><span class="key"><span class="swatch walk"></span>Walking-only trail</span><span class="key"><span class="swatch lot"></span>Approximate parking area center</span></div>
<svg id="map" viewBox="0 0 700 530" role="img" aria-label="Simplified geographic outline of selected route segments; a separate research parking point. Not an approved navigation map.">
<g id="graticule"></g><g id="lines"></g><g id="pins"></g></svg>
<p class="note" id="map-notice">The parking point is intentionally NOT connected by a drawn trail. No current opening is implied.</p>
<div id="segments" aria-live="polite"></div>
</section>
</main>
${routeGallery}
<footer class="note">Ontario OTN © King's Printer for Ontario under the Open Government Licence – Ontario. Parking candidate © OpenStreetMap contributors (ODbL). Source geometry is for internal review only.</footer>
<script id="source-data" type="application/json">${safe}</script>
<script id="visitor-data" type="application/json">${matrixJson}</script>
<script>
'use strict';
const model=JSON.parse(document.getElementById('source-data').textContent);
const choice=document.getElementById('route'),map=document.getElementById('map'),lines=document.getElementById('lines'),
  pins=document.getElementById('pins'),grid=document.getElementById('graticule'),stats=document.getElementById('stats'),segments=document.getElementById('segments');
const NS='http://www.w3.org/2000/svg',labels={'top-of-the-giant':'Top of the Giant','head-of-the-giant':'Head of the Giant',
 'nanabosho-lookout':'Nanabosho Lookout','sea-lion':'Sea Lion Trail'};
function element(name,attrs,parent){const el=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);parent.appendChild(el);return el}
function paint(){
 const r=model.overlays.find(x=>x.routeId===choice.value);if(!r)return;
 const point=model.report.parking.mappedParkingResearchPoint.center;
 const values=r.sections.flatMap(s=>s.researchGeometry.coordinates).concat([point]);
 const midlat=values.reduce((s,p)=>s+p[1],0)/values.length;
 const raw=values.map(p=>[p[0]*Math.cos(midlat*Math.PI/180),p[1]]);
 const xs=raw.map(p=>p[0]),ys=raw.map(p=>p[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const width=Math.max(maxX-minX,.008),height=Math.max(maxY-minY,.008),range=Math.max(width/640,height/470);
 const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 const to=p=>[350+(p[0]*Math.cos(midlat*Math.PI/180)-cx)/range,265-(p[1]-cy)/range];
 grid.replaceChildren();lines.replaceChildren();pins.replaceChildren();
 for(let i=0;i<8;i++){const x=70+i*80;element('path',{class:'grid',d:'M'+x+' 0 V530'},grid)}
 for(let i=0;i<7;i++){const y=40+i*75;element('path',{class:'grid',d:'M0 '+y+' H700'},grid)}
 r.sections.forEach((s,i)=>{
   const coords=s.researchGeometry.coordinates;
   const d=coords.map((p,j)=>{const [x,y]=to(p);return(j?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)}).join(' ');
   const line=element('path',{class:'route',d,stroke:s.modeOnMappedTrail==='bike'?'#7fe5c3':'#f8c076','data-source-id':String(s.sourceObjectId)},lines);
   const title=element('title',{},line);title.textContent=s.trail+' ('+s.modeOnMappedTrail+'), approximate mapped geometry';
 });
 const start=r.sections[0].researchGeometry.coordinates[0],stop=r.sections.at(-1).researchGeometry.coordinates.at(-1);
 for(const [point,label,color] of [[start,'Mapped trail start','#fff'],[stop,'Mapped destination','#f8c076'],
    [model.report.parking.mappedParkingResearchPoint.center,'Approximate parking-center research point, NOT for directions','#fd7b7b']]){
   const [x,y]=to(point);const circle=element('circle',{class:'marker',cx:x,cy:y,r:5,fill:color},pins);
   const title=element('title',{},circle);title.textContent=label;
 }
 const panelRows=[['Official complete outing',r.officialReturnKm.toFixed(1)+' km'],
    ['Mapped return segments',r.mappedReturnKm.toFixed(2)+' km'],
    ['Unresolved difference',r.unmappedOrSourceDifferenceReturnKm.toFixed(2)+' km']];
 stats.replaceChildren();
 for(const [label,value] of panelRows){const div=document.createElement('div');div.className='stat';
   const t=document.createElement('span');t.textContent=label;const strong=document.createElement('strong');strong.textContent=value;
   div.append(t,strong);stats.append(div)}
 segments.replaceChildren();const heading=document.createElement('h3');heading.textContent='Source-backed component trails';segments.append(heading);
 const list=document.createElement('ul');
 for(const s of r.sections){const li=document.createElement('li');li.textContent=s.trail+' · '+s.modeOnMappedTrail+
  ' · '+s.calculatedOneWaySectionKm.toFixed(2)+' km GIS-derived · OTN #'+s.sourceObjectId;list.append(li)}segments.append(list);
}
choice.addEventListener('change',paint);paint();

const visitor=JSON.parse(document.getElementById('visitor-data').textContent);
if(visitor.navigationEligible||visitor.liveAccess)throw Error('Research map incorrectly marked usable for navigation');
const chooser={hours:document.getElementById('visitor-hours'),mode:document.getElementById('visitor-mode'),interest:document.getElementById('visitor-interest')};
const gallery=document.getElementById('route-gallery'),visitorSummary=document.getElementById('visitor-summary');
const verdict={planning_candidate:'A planning candidate; current access unknown',
 needs_verification:'Duration or access details require verification',
 not_suitable:'Not suitable for this time or travel mode'};
function refreshVisitor(){
 const key=[chooser.hours.value,chooser.mode.value,chooser.interest.value].join('|');
 const entries=visitor.plans[key];if(!entries)return;
 let ready=0;
 for(const [index,item] of entries.entries()){
  const card=gallery.querySelector('[data-route-id="'+item.id+'"]');if(!card)continue;
  card.style.order=index;
  const label=card.querySelector('[data-status]');
  label.dataset.kind=item.classification;
  label.textContent=verdict[item.classification]+(item.reason==='unknown_bike_duration'?'; no verified mixed-mode trip time':'');
  if(item.classification==='planning_candidate')ready++;
  card.dataset.preferred=String(item.classification==='planning_candidate'&&ready===1);
 }
 visitorSummary.textContent=ready?
  ready+' preliminary planning '+(ready===1?'candidate':'candidates')+
  '. Confirm park notices, parking, daylight and the actual trail before departing.':
  'No duration-certified option for that combination. Other routes remain listed for comparison; unknown trip times are not an approval.';
}
gallery.addEventListener('click',event=>{
 const btn=event.target.closest('button[data-view]');if(!btn)return;
 if(![...choice.options].some(option=>option.value===btn.dataset.view))return;
 choice.value=btn.dataset.view;
 paint();
 document.getElementById('map').scrollIntoView({block:'nearest',behavior:'auto'});
});
Object.values(chooser).forEach(input=>input.addEventListener('change',refreshVisitor));
refreshVisitor();

</script>
</body>
</html>`;
fs.mkdirSync(dest,{recursive:true});
fs.writeFileSync(path.join(dest,'geometry-reconciliation.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(dest,'research-trail-sections.geojson'),JSON.stringify(geo,null,2)+'\n');
fs.writeFileSync(path.join(dest,'geometry-review.html'),html);
console.log('Created GIS research report, source GeoJSON and self-contained HTML QA viewer. Navigation not approved.');
