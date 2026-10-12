/* Epic / Ikon V3 Vail vertical slice. Published place facts; no live operation or routing claims. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.EpicIkonV3=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const SOURCES=Object.freeze({
    mountain:'https://www.vail.com/the-mountain/about-the-mountain/mountain-info.aspx',
    trail:'https://www.vail.com/the-mountain/about-the-mountain/trail-map.aspx',
    arrival:'https://www.vail.com/explore-the-resort/about-the-resort/getting-here.aspx',
    lessons:'https://www.vail.com/plan-your-trip/ski-and-ride-lessons/know-before-you-go.aspx',
    operations:'https://www.vail.com/the-mountain/mountain-conditions/terrain-and-lift-status',
    parking:'https://www.vail.gov/government/departments/transportation-services/parking-information',
    roads:'https://www.cotrip.org/',
    policy:'https://www.epicpass.com/info/peak-restricted-dates.aspx'
  });
  const MEDIA=Object.freeze([
    {id:'vail-ski-scene-2009',exactSubject:'Vail Ski Resort trails and snowy ridges',season:'WINTER',captureDate:'2009-12-24',src:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Vail_Ski_Resort_I_(33672235356).jpg?width=1280',alt:'Winter skiing terrain at Vail Ski Resort, photographed in December 2009',photographer:'Joe Lin',sourcePage:'https://commons.wikimedia.org/wiki/File:Vail_Ski_Resort_I_(33672235356).jpg',license:'CC BY 2.0',licenseUrl:'https://creativecommons.org/licenses/by/2.0/',rights:'CC',editorialPurpose:'MOUNTAIN',why:'See a real winter scene at Vail; not evidence of current snow or open lifts'},
    {id:'vail-front-side-2005',exactSubject:'Vail Front Side photographed from Red Sandstone Road',season:'WINTER',captureDate:'2005-02-13',src:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Vail_front_side.jpg?width=960',alt:'Front Side of Vail Ski Resort rising above the town in February 2005',photographer:'David Benbennick',sourcePage:'https://commons.wikimedia.org/wiki/File:Vail_front_side.jpg',license:'CC BY-SA 3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/',rights:'CC',editorialPurpose:'TERRAIN',why:'Shows how the Front Side and the town sit together; historic photograph'},
    {id:'vail-lionshead-2009',exactSubject:'Buildings at Lionshead Village, Vail',season:'SUMMER',captureDate:'2009-08-11',src:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Buildings_at_Lionshead_Village_(3826589153).jpg?width=720',alt:'Buildings in Lionshead Village at Vail during summer 2009',photographer:'Pattie (Pirate Alice)',sourcePage:'https://commons.wikimedia.org/wiki/File:Buildings_at_Lionshead_Village_(3826589153).jpg',license:'CC BY-SA 2.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/2.0/',rights:'CC',editorialPurpose:'ARRIVAL',why:'Shows the actual pedestrian village streetscape, explicitly not a winter scene'}
  ]);
  const PLACES=Object.freeze([
    {id:'den',kind:'AIRPORT',name:'Denver International Airport (DEN)',lat:39.8608,lon:-104.6727,sourceUrl:'https://mapcarta.com/Denver_International_Airport',note:'A regional flight gateway. I-70 access and transfer arrangements require independent checking; no drive time is assumed.'},
    {id:'ege',kind:'AIRPORT',name:'Eagle County Regional Airport (EGE)',lat:39.64247,lon:-106.91519,sourceUrl:'https://mapcarta.com/23186346',note:'A closer regional airport geographically; compare flight and ground transfer availability separately.'},
    {id:'vail-parking',kind:'PARKING',name:'Vail Village Parking Structure',lat:39.64224,lon:-106.37256,sourceUrl:'https://mapcarta.com/W432160774',note:'The town lists the Vail Village parking structure at 241 S Frontage Rd E and a transit center at the site. This point marks the garage, not the lift entrance.'},
    {id:'lionshead-center',kind:'VILLAGE',name:'Lionshead Village Welcome Center',lat:39.64427,lon:-106.38662,sourceUrl:'https://mapcarta.com/W695501225',note:'A verified village reference point, not a precise lift or lesson meeting pin. Lionshead serves Eagle Bahn Gondola and has its own children’s lesson location.'},
    {id:'golden-peak',kind:'ARRIVAL_BASE',name:'Golden Peak Lodge',lat:39.63896,lon:-106.36937,sourceUrl:'https://mapcarta.com/W224523104',note:'A verified lodge reference, not an exact lesson lineup. Golden Peak has separate adult and children’s meeting points; confirm the booking instructions.'}
  ]);
  const BASE_URL='/epic-ikon-pass/';
  function commitment(verdict) {
    if(!verdict||!verdict.status||verdict.status==='UNKNOWN')return {code:'NOT_YET_VERIFIABLE',label:'Not yet verifiable',next:'Complete the exact pass product, date and mandatory options before planning a purchase.'};
    if(verdict.status==='NO')return {code:'BLOCKED',label:'Do not commit on this pass/date',next:'Change the modeled date or confirm another pass you actually hold. A photograph cannot override an exclusion.'};
    if(verdict.status==='CHECK')return {code:'NEEDS_ACTION',label:'Day allowance needs checking',next:'Confirm the applicable resort or shared day bank in your pass account.'};
    if(verdict.status==='ACTION')return {code:'NEEDS_ACTION',label:'Reservation still required',next:'Complete the operator/pass reservation requirement before committing.'};
    return {code:'RULES_ALLOW_PLAN',label:'Rules allow planning, not booking certainty',next:'Verify official lift operation, transport, parking, lessons and any reservations before committing.'};
  }
  function chosenArrival(profile) {
    if(profile.ability==='novice'||profile.ability==='mixed')return {title:'Start with your lesson confirmation',text:'Golden Peak and Lionshead have distinct adult and children’s ski school check-ins. The location on the booking confirmation controls; never assume that the nearest gondola is the right lesson entrance.',source:SOURCES.lessons};
    if(profile.arrival==='town')return {title:'Vail Village is your first area to investigate',text:'Consider Vail Village for pedestrian village access and its mountain entry, then verify the exact lift, transportation and lodging position directly. This is area fit, not hotel availability or ski-in/ski-out verification.',source:SOURCES.arrival};
    if(profile.arrival==='transit')return {title:'Check Lionshead and the free in-town transit link',text:'Lionshead is a separate pedestrian village served by Eagle Bahn Gondola; the town offers a free connection to Vail Village. Confirm the transit schedule, your lodging location and lesson point.',source:SOURCES.arrival};
    return {title:'Choose the actual ski-day base before the hotel',text:'Vail Village, Lionshead and Golden Peak are different arrival decisions. Match your group’s first lift, equipment and lesson check-in before treating a lodging address as convenient.',source:SOURCES.arrival};
  }
  function createPhoto(asset,feature) {
    const figure=document.createElement('figure');
    figure.className='v3-media'+(feature?' v3-media-lead':'');
    const image=document.createElement('img');
    image.src=asset.src;image.alt=asset.alt;image.decoding='async';
    image.loading=feature?'eager':'lazy';
    if(feature)image.fetchPriority='high';
    image.onerror=function(){figure.classList.add('v3-media-failed');image.removeAttribute('src');};
    const cap=document.createElement('figcaption');
    const a=document.createElement('a');a.href=asset.sourcePage;a.target='_blank';a.rel='noopener noreferrer';a.textContent=asset.exactSubject+' · '+asset.photographer+' · '+asset.captureDate;
    const lic=document.createElement('a');lic.href=asset.licenseUrl;lic.target='_blank';lic.rel='noopener noreferrer license';lic.textContent=asset.license;
    cap.append(a,document.createTextNode(' · '),lic,document.createTextNode('. Historical '+asset.season.toLowerCase()+' photo, not current conditions.'));
    figure.append(image,cap);return figure;
  }
  let map=null,markers=[],mode='arrival',mapLib=null;
  function describePin(p){
    const title=document.getElementById('v3-pin-title'),info=document.getElementById('v3-pin-description'),link=document.getElementById('v3-pin-source');
    if(!title)return;title.textContent=p.name;info.textContent=p.note;link.href=p.sourceUrl;
  }
  function viewPoints(m){return m==='region'?PLACES.filter(p=>p.kind==='AIRPORT'||p.id==='vail-parking'):PLACES.filter(p=>p.kind!=='AIRPORT')}
  function updateMapMode(m){
    mode=m;
    document.querySelectorAll('[data-v3-map]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.v3Map===m));});
    const field=document.getElementById('v3-map-canvas');
    field.hidden=m==='terrain';
    document.getElementById('v3-terrain-link').hidden=m!=='terrain';
    if(m==='terrain')return;
    const pts=viewPoints(m);describePin(pts[0]);
    if(!map)return;
    for(const marker of markers)marker.remove();markers=[];
    for(const p of pts){
      const button=document.createElement('button');button.type='button';button.className='v3-map-pin';button.textContent=p.kind==='AIRPORT'?'✈':'•';button.setAttribute('aria-label','Explore '+p.name);
      button.addEventListener('click',()=>describePin(p));
      const marker=new mapLib.Marker({element:button,anchor:'center'}).setLngLat([p.lon,p.lat]).addTo(map);
      markers.push(marker);
    }
    if(m==='region')map.fitBounds([[-107.08,39.50],[-104.48,40.04]],{padding:26,duration:0,maxZoom:10});
    else map.fitBounds([[-106.395,39.635],[-106.364,39.650]],{padding:40,duration:0,maxZoom:15});
    map.resize();
  }
  async function openMap(m){
    updateMapMode(m);
    if(m==='terrain'||map)return;
    const status=document.getElementById('v3-map-status');
    status.textContent='Loading the geographic reference map. The arrival instructions below work without it.';
    try{
      if(!mapLib){
        const css=document.createElement('link');css.rel='stylesheet';css.href='https://cdn.jsdelivr.net/npm/maplibre-gl@6.3.0/dist/maplibre-gl.css';document.head.append(css);
        mapLib=await import('https://cdn.jsdelivr.net/npm/maplibre-gl@6.3.0/dist/maplibre-gl.mjs');
      }
      if(!document.getElementById('v3-slice')||document.getElementById('v3-slice').hidden)return;
      map=new mapLib.Map({container:'v3-map-canvas',style:'https://tiles.openfreemap.org/styles/liberty',center:[-106.38,39.64],zoom:12,attributionControl:true});
      map.addControl(new mapLib.NavigationControl({showCompass:false}),'top-right');
      map.on('load',()=>{status.textContent='Planning map: point locations, not travel routes, lift or trail navigation.';updateMapMode(mode);});
      map.on('error',()=>{status.textContent='Map tiles unavailable. Use the written locations and official arrival guide below.';});
    }catch{
      status.textContent='Interactive map unavailable. See the named arrival points and official resort guide below.';
    }
  }
  function getProfile(){
    return {origin:document.getElementById('v3-origin').value,ability:document.getElementById('v3-ability').value,arrival:document.getElementById('v3-arrival').value};
  }
  function update(args,verdict){
    if(typeof document==='undefined')return;
    const section=document.getElementById('v3-slice');if(!section)return;
    section.hidden=args.resort!=='vail';
    document.body.dataset.v3Resort=args.resort;
    if(section.hidden)return;
    const gallery=document.getElementById('v3-gallery');
    if(!gallery.dataset.ready){for(const [i,a] of MEDIA.entries())gallery.append(createPhoto(a,i===0));gallery.dataset.ready='1';}
    const c=commitment(verdict),prof=getProfile(),fit=chosenArrival(prof);
    document.getElementById('v3-commit').textContent=c.label;
    document.getElementById('v3-action').textContent=c.next;
    document.getElementById('v3-location-title').textContent=fit.title;
    document.getElementById('v3-location-copy').textContent=fit.text;
    document.getElementById('v3-location-source').href=fit.source;
    document.getElementById('v3-date-verdict').textContent=(args.date||'Selected date')+' · '+(verdict.status||'UNKNOWN')+' · '+(verdict.title||'');
    document.getElementById('v3-arrival-journey').textContent=prof.origin==='fly'?'Arrival plan: pick DEN or EGE based on actual flight and transfer options; then confirm I-70 status and which Vail base suits the booking.':prof.origin==='drive'?'Driving plan: verify current COtrip conditions and Colorado requirements before travel. Parking and your ski-school base are separate choices.':'Already nearby: verify the town shuttle/parking and lesson check-in; no drive or walk time is assumed.';
    const next=window.PassDecoder.nextDate(args,30);
    const alternate=document.getElementById('v3-alternate');
    alternate.textContent=verdict.reason==='blackout'&&next?'First later modeled day without this blackout: '+next.date+'. Operations and accommodation remain unverified.':'No travel-time-verified alternate is being claimed. Changing to another resort requires a separate pass check.';
    document.getElementById('v3-changedate').hidden=!(verdict.reason==='blackout'&&next);
    document.getElementById('v3-changedate').dataset.date=next?.date||'';
  }
  function init(){
    if(typeof document==='undefined')return;
    const section=document.getElementById('v3-slice');if(!section)return;
    for(const id of ['v3-origin','v3-ability','v3-arrival'])document.getElementById(id).addEventListener('change',()=>{
      const E=window.PassDecoder;
      const args={pass:document.getElementById('pass').value,resort:document.getElementById('resort').value,date:document.getElementById('ski-date').value,usedDays:document.getElementById('used-days').value,reservationMade:document.getElementById('reservation').value,epicDayTotal:document.getElementById('epicday-total').value,epicPeak:document.getElementById('epic-peak').value,sessionTotal:document.getElementById('session-total').value};
      update(args,E.evaluate(args));
    });
    document.querySelectorAll('[data-v3-map]').forEach(b=>b.addEventListener('click',()=>{window.gtag?.('event','map_arrival_open',{resort_id:'vail',mode:b.dataset.v3Map});openMap(b.dataset.v3Map);}));
    document.getElementById('v3-changedate').addEventListener('click',()=>{
      const day=document.getElementById('v3-changedate').dataset.date;
      if(!day)return;document.getElementById('ski-date').value=day;document.getElementById('pass-form').requestSubmit();
    });
    document.getElementById('v3-trail').addEventListener('click',()=>window.gtag?.('event','official_trail_map_open',{resort_id:'vail'}));
    document.getElementById('v3-brief').addEventListener('click',()=>{
      const u=new URL(BASE_URL,location.origin),ids={pass:'pass',resort:'resort',date:'ski-date'};
      for(const [k,id]of Object.entries(ids))u.searchParams.set(k,document.getElementById(id).value);
      const extras={used:'used-days',reservation:'reservation',days:'epicday-total',peak:'epic-peak',session:'session-total',intent:'visit-style',origin:'v3-origin',ability:'v3-ability',arrival:'v3-arrival'};
      for(const [k,id]of Object.entries(extras)){const value=document.getElementById(id).value;if(value&&value!=='unknown'&&value!=='first')u.searchParams.set(k,value);}
      const text=document.getElementById('v3-date-verdict').textContent+'\n'+document.getElementById('v3-commit').textContent+'\n'+document.getElementById('v3-action').textContent+'\n'+document.getElementById('v3-location-copy').textContent+'\nNot a live operation, booking, routing or safety confirmation.\nOfficial sources: '+Object.values(SOURCES).join(' ')+'\n'+u.href;
      if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).then(()=>{document.getElementById('v3-brief-note').textContent='Source-linked brief copied. No account or booking details included.';}).catch(()=>{document.getElementById('v3-brief-note').textContent='Copy the plan link from your browser: '+u.href;});}else{document.getElementById('v3-brief-note').textContent='Copy the plan link from your browser: '+u.href;}
      window.gtag?.('event','trip_brief_share',{resort_id:'vail'});
    });
    const params=new URLSearchParams(location.search);
    for(const [id,key,values]of [['v3-origin','origin',['fly','drive','nearby']],['v3-ability','ability',['novice','intermediate','advanced','mixed']],['v3-arrival','arrival',['town','transit','drive','uncertain']]]){
      const v=params.get(key);if(values.includes(v))document.getElementById(id).value=v;
    }
    const mapHost=document.getElementById('v3-map-canvas');
    if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&!section.hidden){observer.disconnect();openMap('arrival');}},{rootMargin:'150px'});observer.observe(mapHost);}
    document.querySelectorAll('[data-v3-source]').forEach(a=>{a.href=SOURCES[a.dataset.v3Source]||SOURCES.arrival;});
    updateMapMode('arrival');
  }
  return Object.freeze({SOURCES,MEDIA,PLACES,commitment,chosenArrival,update,init});
});
