(()=>{
  'use strict';
  window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};
  const PATH='/michigan-boat-launches/';
  if(location.pathname!==PATH)return;

  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>r?.querySelectorAll?[...r.querySelectorAll(s)]:[];
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const emit=(name,props={})=>{try{window.va?.('event',{name,...props});}catch{}};
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));

  const REAL_HERO={
    image:'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Lake_erie_metropark_boat_launch.JPG/1280px-Lake_erie_metropark_boat_launch.JPG',
    source:'https://commons.wikimedia.org/wiki/File:Lake_erie_metropark_boat_launch.JPG',
    license:'https://creativecommons.org/licenses/by/3.0/',
    author:'Dwight Burdette',
    place:'Lake Erie Metropark, Michigan'
  };
  const DNR_FACILITY_FINDER='https://www.michigan.gov/dnr/things-to-do/boating';
  const DNR_LAYER='https://services3.arcgis.com/Jdnp1TjADvSDxMAX/ArcGIS/rest/services/DNR_State_Sponsored_Developed_Boating_Access_Sites_Public_View/FeatureServer/0';
  const DNR_QUERY=DNR_LAYER+'/query?where='+encodeURIComponent("WaterbodyType='Great Lake'")+'&outFields='+encodeURIComponent('name,LABELNAME,waterbody,WaterbodyType,BAS_Type,DESCRIP,RAMPCODE_NEW,OWNEDBY,ADMINBY,DNRAdmin,Latitude,Longitude,nLanes,CarryDown,nPiers,nTrailerableParking,nVehicleOnlyParking,nVaultToilets,nFlushToilets,nOtherToilets,MRBIS_NAME,MRBIS_SITEID,GIA,CarrydownType,nCarryDownLaunches,Staffed,Contact,Phone')+'&returnGeometry=false&f=json';
  const PUBLIC_LAYER='https://gisagocss.state.mi.us/arcgis/rest/services/MapServices/MiLocator_AGO/MapServer/2';
  const PUBLIC_QUERY=PUBLIC_LAYER+'/query?where=1%3D1&outFields='+encodeURIComponent('NAME,LATITUDE,LONGITUDE,OWNERSHIP,TYPE,SITEID')+'&returnGeometry=false&f=json';

  const MANUAL_VERIFIED={
    'bolles-harbor-launch':{
      lat:41.87338,lng:-83.38129,confidence:'verified_secondary',
      sourceName:'Detroit River Live launch listing',
      sourceUrl:'https://www.detroitriverlive.com/launches/bolles-harbor-boat-launch'
    }
  };

  const ALIASES={
    'bay-city-state-park-launch':['bay city state recreation area','bay city state park'],
    'tawas-bay-launch':['tawas city','tawas bay'],
    'alpena-launch':['mich e ke wis','mich-e-ke-wis'],
    'mackinaw-city-launch':['mackinaw city'],
    'muskegon-state-park-launch':['muskegon state park'],
    'holland-state-park-launch':['holland state park'],
    'sterling-state-park-launch':['william c sterling state park','sterling state park'],
    'lanse-launch':['l anse township','lanse township'],
    'north-park-bay-city':['north park bay city','north park'],
    'essexville-public':['essexville'],
    'st-ignace-municipal':['st ignace'],
    'marquette-lower-harbor':['marquette lower harbor','cinder pond'],
    'munising-bay-launch':['munising bay','munising'],
    'grand-marais-harbor':['grand marais'],
    'hancock-portage':['hancock','portage waterway'],
    'copper-harbor-launch':['copper harbor'],
    'new-buffalo-launch':['new buffalo'],
    'south-haven-launch':['south haven'],
    'port-austin-launch':['port austin'],
    'port-sanilac-harbor':['port sanilac'],
    'lexington-harbor':['lexington']
  };

  function installRealHero(){
    const hero=$('.fig.hero');
    if(!hero)return;
    const img=$('img',hero),cap=$('figcaption',hero);
    if(img){
      img.src=REAL_HERO.image;
      img.alt='Real public boat-launch ramps at Lake Erie Metropark in Michigan';
      img.width=1280;img.height=853;img.removeAttribute('srcset');
      img.setAttribute('fetchpriority','high');
      img.dataset.photoSource='real-michigan-launch';
    }
    if(cap)cap.innerHTML=`${esc(REAL_HERO.place)} boat launch. Real photograph by <a href="${REAL_HERO.source}" target="_blank" rel="noopener">${esc(REAL_HERO.author)}</a>, <a href="${REAL_HERO.license}" target="_blank" rel="noopener">CC BY 3.0</a>.`;
    const og=$('meta[property="og:image"]');if(og)og.content=REAL_HERO.image;
    let tw=$('meta[name="twitter:image"]');
    if(!tw){tw=document.createElement('meta');tw.name='twitter:image';document.head.append(tw);}
    tw.content=REAL_HERO.image;
  }
  installRealHero();

  const locNode=$('#locdata');
  if(!locNode)return;
  let locations=[];
  try{locations=JSON.parse(locNode.textContent||'[]');}catch{return;}
  const byName=new Map(locations.map(x=>[x.name,x]));
  const bySlug=new Map(locations.map(x=>[x.slug,x]));
  const cards=$$('.loc-card');
  const resolvedBySlug=new Map(locations.map(loc=>[loc.slug,{
    ...loc,
    confidence:'approximate',
    sourceName:'Legacy guide coordinate — verify before routing',
    sourceUrl:DNR_FACILITY_FINDER,
    facility:null,
    matchedName:''
  }]));

  const protection=(name,notes='')=>{
    const t=(name+' '+notes).toLowerCase();
    if(/river|portage|protected basin|inside .*bay|sheltered|harbor of refuge|marina|waterway/.test(t))return 'protected';
    if(/open lake|direct shot|big water|straits|heavy current|weather windows|open-water/.test(t))return 'exposed';
    return 'mixed';
  };
  const labelProtection=v=>v==='protected'?'more protected access':v==='exposed'?'open-water exposure':'mixed exposure';
  const cardFor=loc=>cards.find(card=>card.dataset.slug===loc.slug)||null;

  const normalize=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[’']/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
  const STOP=new Set(['boat','boating','launch','launches','ramp','ramps','public','municipal','marina','access','site','facility','the','of','at']);
  const tokens=s=>normalize(s).split(/\s+/).filter(x=>x.length>1&&!STOP.has(x));
  const tokenScore=(a,b)=>{
    const A=new Set(tokens(a)),B=new Set(tokens(b));
    if(!A.size||!B.size)return 0;
    const inter=[...A].filter(x=>B.has(x)).length;
    const coverage=inter/Math.min(A.size,B.size);
    const union=new Set([...A,...B]).size;
    return .68*coverage+.32*(inter/union);
  };
  const nameSimilarity=(loc,siteName)=>{
    const candidates=[loc.name,...(ALIASES[loc.slug]||[])];
    let best=0;
    for(const raw of candidates){
      const a=normalize(raw),b=normalize(siteName);
      if(!a||!b)continue;
      if(a===b)best=Math.max(best,1);
      else if((a.includes(b)||b.includes(a))&&Math.min(a.length,b.length)>=5)best=Math.max(best,.92);
      best=Math.max(best,tokenScore(a,b));
    }
    return best;
  };
  const rad=d=>d*Math.PI/180;
  const distanceKm=(a,b)=>{
    const R=6371,dLat=rad(b.lat-a.lat),dLon=rad(b.lng-a.lng);
    const h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(h));
  };
  const distanceMi=(a,b)=>distanceKm(a,b)*0.621371;
  const lakeMatches=(loc,waterbody='')=>{
    const a=normalize(loc.lake),b=normalize(waterbody);
    if(!a||!b)return false;
    return ['michigan','huron','superior','erie'].some(x=>a.includes(x)&&b.includes(x));
  };

  function primarySite(feature){
    const a=feature?.attributes||{};
    const lat=Number(a.Latitude),lng=Number(a.Longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
    return {kind:'dnr',lat,lng,name:a.name||a.LABELNAME||a.MRBIS_NAME||'',label:a.LABELNAME||'',waterbody:a.waterbody||'',attrs:a};
  }
  function secondarySite(feature){
    const a=feature?.attributes||{};
    const lat=Number(a.LATITUDE),lng=Number(a.LONGITUDE);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
    return {kind:'public',lat,lng,name:a.NAME||'',label:a.NAME||'',waterbody:'',attrs:a};
  }
  function bestMatch(loc,sites){
    let best=null;
    for(const site of sites){
      if(!site?.name)continue;
      const ns=nameSimilarity(loc,site.name);
      const d=distanceKm(loc,site);
      if(ns<.5)continue;
      if(d>35&&ns<.9)continue;
      if(d>100)continue;
      const proximity=clamp(1-d/35,0,1);
      const lakeBoost=lakeMatches(loc,site.waterbody)?.08:0;
      const score=.78*ns+.22*proximity+lakeBoost;
      if(score<.62)continue;
      if(!best||score>best.score)best={site,score,nameScore:ns,distanceKm:d};
    }
    return best;
  }

  function resolveFromMatch(loc,match,kind){
    if(!match)return null;
    const site=match.site;
    return {
      ...loc,
      lat:site.lat,lng:site.lng,
      confidence:kind==='dnr'?'verified_exact':'authoritative_access_site',
      sourceName:kind==='dnr'?'Michigan DNR maintained boating-access data':'Michigan public boating-access GIS',
      sourceUrl:kind==='dnr'?DNR_LAYER:PUBLIC_LAYER,
      facility:site.attrs,
      matchedName:site.name,
      matchScore:match.score,
      movedMiles:distanceMi(loc,site)
    };
  }

  function confidenceLabel(res){
    if(res.confidence==='verified_exact')return 'Verified Michigan DNR access point';
    if(res.confidence==='authoritative_access_site')return 'Matched public access-site point';
    if(res.confidence==='verified_secondary')return 'Verified independent launch point';
    return 'Approximate location — verify before towing';
  }
  function confidenceClass(res){return res.confidence==='approximate'?'approx':'verified';}
  function isVerified(res){return res.confidence!=='approximate';}

  function googleDirections(res){
    if(isVerified(res))return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(res.lat+','+res.lng)}`;
    const card=cardFor(res),meta=$('.loc-meta',card)?.textContent||'Michigan';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(res.name+' '+meta)}`;
  }
  function googleSatellite(res){
    if(isVerified(res))return `https://www.google.com/maps/@?api=1&map_action=map&center=${encodeURIComponent(res.lat+','+res.lng)}&zoom=18&basemap=satellite`;
    return googleDirections(res);
  }

  function rampDescription(res){
    const a=res.facility||{};
    const code=Number(a.RAMPCODE_NEW||a.RAMPCODE);
    if(code===1)return 'hard-surface ramp designed for most trailerable watercraft';
    if(code===2)return 'hard-surface ramp where limited depth can make larger-boat launching more difficult';
    if(code===3)return 'gravel ramp best suited to smaller watercraft';
    if(String(a.CarryDown).toLowerCase()==='yes')return 'developed carry-down access';
    return 'launch setup not fully described in the matched public data';
  }
  function facilityFacts(res){
    const a=res.facility||{};
    const facts=[];
    const lanes=Number(a.nLanes),parking=Number(a.nTrailerableParking),piers=Number(a.nPiers);
    const toilets=[a.nVaultToilets,a.nFlushToilets,a.nOtherToilets].map(Number).filter(Number.isFinite).reduce((x,y)=>x+y,0);
    if(Number.isFinite(lanes)&&lanes>0)facts.push(`${lanes} launch lane${lanes===1?'':'s'}`);
    facts.push(rampDescription(res));
    if(Number.isFinite(parking)&&parking>=0)facts.push(parking>0?`${parking} trailer parking space${parking===1?'':'s'} listed`:'no trailer parking spaces listed');
    if(Number.isFinite(piers)&&piers>0)facts.push(`${piers} pier${piers===1?'':'s'} listed`);
    if(toilets>0)facts.push('restroom facilities listed');
    return facts;
  }

  function conditionData(card){
    const cond=$('.conditions:not(.loading)',card);
    const pills=cond?$$('.cond',cond):[];
    let state='unknown';
    if(pills.some(x=>x.classList.contains('caution')))state='rough';
    else if(pills.some(x=>x.classList.contains('marginal')))state='moderate';
    else if(pills.some(x=>x.classList.contains('good')))state='calm';
    const stats=pills.map(x=>x.textContent.replace(/\s+/g,' ').trim()).filter(Boolean);
    const src=$('.cond-source',card)?.textContent?.replace(/\s+/g,' ')?.trim()||'';
    return {state,stats,source:src};
  }
  function conditionState(card){return conditionData(card).state;}
  const markerColor=state=>state==='calm'?'#2e9e3f':state==='moderate'?'#e0991a':state==='rough'?'#cf3a3a':'#7a7a7a';
  function todayRead(card,res){
    const {state}=conditionData(card),p=card?.dataset.protection||'mixed';
    if(state==='calm'){
      if(p==='protected')return 'Regional lake conditions are on the milder side right now, and this access is more protected than an open-shore ramp. Conditions can change once you leave the protected water.';
      if(p==='exposed')return 'Regional lake conditions are on the milder side right now, but this launch opens toward big water. Check the marine forecast again before leaving the ramp.';
      return 'Regional lake conditions are relatively mild right now. Treat that as a starting signal, then verify the local ramp and marine forecast.';
    }
    if(state==='moderate'){
      if(p==='protected')return 'The access itself is more protected, but regional wind or waves are mixed. Expect conditions to change as you leave the river, marina or harbor.';
      if(p==='exposed')return 'This is a check-before-towing setup. Regional wind or waves are mixed, and an exposed launch can feel different from the nearest buoy.';
      return 'Regional conditions are mixed. Compare the launch exposure and a nearby alternative before committing to the tow.';
    }
    if(state==='rough'){
      if(p==='protected')return 'The launch is relatively protected, but the regional lake signal is elevated. A calm-looking ramp does not mean open-water conditions are suitable.';
      if(p==='exposed')return 'Regional wind or waves are elevated. This exposed launch deserves a hard second look; compare a more protected nearby access before towing.';
      return 'Regional wind or waves are elevated. Verify the marine forecast and compare more protected access before choosing this launch.';
    }
    return 'Live regional buoy context is not available yet. Use the launch setup, location source and official marine forecast before deciding where to tow.';
  }

  function quickRead(loc){
    const res=resolvedBySlug.get(loc.slug)||loc,card=cardFor(loc),p=card?.dataset.protection||'mixed';
    if(!isVerified(res))return `This launch is in the guide, but its exact ramp point has not been matched confidently enough to call exact. Use the Google Maps search and verify the access before towing.`;
    const a=res.facility||{};
    const lanes=Number(a.nLanes),parking=Number(a.nTrailerableParking);
    let setup=`This is a ${rampDescription(res)}`;
    if(a.waterbody)setup+=` on ${a.waterbody}`;
    setup+='.';
    if(Number.isFinite(lanes)&&lanes>0)setup+=` DNR lists ${lanes} launch lane${lanes===1?'':'s'}`;
    if(Number.isFinite(parking)&&parking>0)setup+=`${Number.isFinite(lanes)&&lanes>0?' and':' DNR lists'} ${parking} trailer parking space${parking===1?'':'s'}`;
    if((Number.isFinite(lanes)&&lanes>0)||(Number.isFinite(parking)&&parking>0))setup+='.';
    if(p==='protected')setup+=' The access is relatively protected compared with an open Great Lakes shoreline.';
    else if(p==='exposed')setup+=' It transitions quickly toward open Great Lakes water, so wind and wave context matters.';
    else setup+=' Exposure is mixed enough that local verification still matters.';
    return setup;
  }

  function personaFits(loc){
    const res=resolvedBySlug.get(loc.slug)||loc,a=res.facility||{},card=cardFor(loc),p=card?.dataset.protection||'mixed';
    const code=Number(a.RAMPCODE_NEW||a.RAMPCODE),lanes=Number(a.nLanes),parking=Number(a.nTrailerableParking);
    let trailer={label:'Verify setup',tone:'verify',why:'Facility details are incomplete; check the operator before towing a larger rig.'};
    if(code===1||lanes>0)trailer={label:'Good trailer fit',tone:'good',why:`${Number.isFinite(lanes)&&lanes>0?lanes+' lane'+(lanes===1?'':'s'):'Hard-surface access'}${Number.isFinite(parking)&&parking>0?' and '+parking+' trailer spaces':''} are listed in the matched data.`};
    else if(code===2)trailer={label:'Trailer fit with depth caution',tone:'caution',why:'The matched DNR ramp class notes limited depth for larger watercraft.'};
    else if(code===3)trailer={label:'Better for smaller boats',tone:'caution',why:'The matched DNR ramp class is gravel and intended for smaller watercraft.'};

    let paddle={label:'Verify paddle access',tone:'verify',why:'A trailer ramp is not automatically a comfortable carry-down launch.'};
    if(String(a.CarryDown).toLowerCase()==='yes')paddle={label:'Paddle-friendly access listed',tone:'good',why:`DNR lists developed carry-down access${a.CarrydownType?' ('+a.CarrydownType+')':''}.`};
    else if(p==='protected')paddle={label:'More protected water nearby',tone:'good',why:'The access is relatively protected, but verify the actual carry-down setup before arriving.'};
    else if(p==='exposed')paddle={label:'Exposure matters for paddlers',tone:'caution',why:'This access leads quickly toward open water; smaller craft should treat regional conditions as especially important.'};

    let casual={label:'Plan the arrival',tone:'verify',why:'Verify parking, fees/pass requirements and local hours before leaving home.'};
    if(Number.isFinite(parking)&&parking>0&&p==='protected')casual={label:'Straightforward setup',tone:'good',why:`Trailer parking is listed and the access is relatively protected.`};
    else if(Number.isFinite(parking)&&parking===0)casual={label:'Parking constraint',tone:'caution',why:'The matched record does not list trailer parking spaces.'};
    return {trailer,paddle,casual};
  }

  function cardMeta(loc){
    const card=cardFor(loc);
    return $('.loc-meta',card)?.textContent?.trim()||loc.lake||'Michigan Great Lakes launch';
  }
  function sourceLine(res){
    if(res.confidence==='verified_exact')return `Matched to Michigan DNR maintained boating-access data${res.matchedName?` as “${res.matchedName}”`:''}.`;
    if(res.confidence==='authoritative_access_site')return `Matched to Michigan public boating-access GIS${res.matchedName?` as “${res.matchedName}”`:''}.`;
    if(res.confidence==='verified_secondary')return 'Coordinate checked against an independent launch listing.';
    return 'The map point is approximate; do not use it as a turn-by-turn destination.';
  }

  cards.forEach(card=>{
    const name=$('.loc-name',card)?.textContent?.trim()||'';
    const loc=byName.get(name);
    if(loc){card.id=loc.slug;card.dataset.slug=loc.slug;card.dataset.name=name.toLowerCase();card.tabIndex=-1;}
    card.dataset.protection=protection(name,$('.loc-notes',card)?.textContent||'');
  });

  const style=document.createElement('style');
  style.textContent=`
    .launch-finder{margin:18px 0 24px;padding:18px;background:#fff;border:1px solid #d9d4ca;border-radius:8px;box-shadow:0 4px 18px rgba(0,0,0,.035)}
    .launch-finder h2{font-size:21px;margin:0 0 5px;color:#244d28;font-weight:normal}.launch-finder .lf-intro{font-size:14px;color:#555;margin:0 0 14px}
    .lf-grid{display:grid;grid-template-columns:1.2fr .9fr .9fr auto;gap:9px;align-items:end}.lf-field{display:grid;gap:4px}.lf-field label{font:700 10px/1.3 Arial,sans-serif;letter-spacing:.55px;text-transform:uppercase;color:#777}.lf-field input,.lf-field select{width:100%;min-height:42px;border:1px solid #cfc9be;border-radius:5px;background:#fff;padding:8px 10px;font:14px/1.3 Georgia,serif;color:#222}.lf-reset{min-height:42px;border:1px solid #2c5f2d;border-radius:5px;background:#fff;color:#2c5f2d;padding:8px 12px;cursor:pointer;font-weight:bold}
    .lf-status{margin:12px 0 0;font-size:13px;color:#555}.lf-status strong{color:#222}.lf-source-status{font-size:12px;color:#666;margin:6px 0 0}.lf-note{margin:11px 0 0;padding-top:10px;border-top:1px solid #eee7dd;font-size:12px!important;color:#777!important;line-height:1.55!important}
    .lf-picks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:13px}.lf-pick{border:1px solid #e1ddd5;border-radius:6px;padding:10px 11px;background:#faf9f6}.lf-pick strong{display:block;font-size:13px;line-height:1.3;margin-bottom:3px}.lf-pick span{font-size:11px;color:#777;line-height:1.4}.lf-pick a,.lf-pick button{display:inline-block;margin-top:5px;font-size:11px;font-weight:bold;background:none;border:0;padding:0;color:#235b91;cursor:pointer;text-decoration:underline}
    .launch-decision{margin-top:10px;padding-top:10px;border-top:1px solid #e7e1d7}.launch-decision h4{margin:0 0 5px;font:700 11px/1.3 Arial,sans-serif;letter-spacing:.55px;text-transform:uppercase;color:#5f665d}.launch-quick{font-size:13px!important;line-height:1.55!important;margin:0 0 10px!important}.launch-today{padding:10px 11px;background:#f5f8f3;border-left:3px solid #66866a;border-radius:4px;margin:9px 0}.launch-today strong{display:block;font-size:12px;margin-bottom:3px}.launch-today p{font-size:12px!important;line-height:1.45!important;margin:3px 0!important}.launch-stats{font:700 11px/1.35 Arial,sans-serif;color:#4f5a4f}.launch-confidence{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border-radius:999px;font:700 10px/1.2 Arial,sans-serif;margin:1px 0 7px}.launch-confidence.verified{background:#e8f2e8;color:#214a22}.launch-confidence.approx{background:#fff2d8;color:#744d00}.launch-fit-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:8px 0}.launch-fit{padding:8px;border:1px solid #e5e0d7;border-radius:5px;background:#fff}.launch-fit b{display:block;font-size:11px}.launch-fit span{display:block;font-size:11px;color:#666;line-height:1.35;margin-top:2px}.launch-fit.good b{color:#285f2f}.launch-fit.caution b{color:#8a5600}.launch-facts{font-size:11px;color:#555;line-height:1.45;margin:7px 0}.launch-source{font-size:10px;color:#777;line-height:1.4}.launch-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;padding-top:8px;border-top:1px solid #eee7dd}.launch-actions a,.launch-actions button{font:700 11px/1.3 Arial,sans-serif;background:none;border:0;padding:0;color:#235b91;cursor:pointer;text-decoration:underline}.nearby-launches{margin-top:9px}.nearby-launches strong{font-size:11px}.nearby-launches ul{margin:4px 0 0;padding-left:18px}.nearby-launches li{font-size:11px;line-height:1.4;margin:3px 0}.nearby-launches button{border:0;background:none;padding:0;color:#235b91;text-decoration:underline;cursor:pointer;font:inherit}
    .loc-card[hidden]{display:none!important}.loc-card.lf-match{outline:2px solid #9fc4a2;outline-offset:1px}.loc-card.lf-selected{outline:3px solid #2c5f2d;outline-offset:2px;background:#fbfdf9}.lf-selected-badge{display:inline-block;margin:0 0 8px;padding:4px 7px;border-radius:999px;background:#e8f2e8;color:#214a22;font:700 10px/1 Arial,sans-serif;text-transform:uppercase;letter-spacing:.45px}
    .launch-map-layout{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.95fr);gap:12px;align-items:stretch}.launch-map-layout #locmap{height:470px}.launch-map-insight{margin:0;padding:15px;border:1px solid #d8d2c7;border-left:4px solid #2c5f2d;border-radius:6px;background:#fff;min-height:100%;overflow:auto;max-height:470px}.launch-map-insight>strong{display:block;font-size:18px;color:#214a22}.launch-map-insight>span{display:block;font-size:12px;color:#777;margin-top:2px}.launch-map-insight p{font-size:13px!important;margin:8px 0!important;line-height:1.5!important}.lmi-signal{font-size:12px;margin:8px 0;padding:8px;background:#f5f8f3;border-radius:4px}.lmi-actions{display:flex;gap:9px;flex-wrap:wrap;margin:10px 0}.lmi-actions a{font:700 11px/1.3 Arial,sans-serif}.launch-map-insight small{display:block;color:#777;line-height:1.45}.lmi-fit{font-size:11px;line-height:1.45;margin:5px 0}.locmap-legend .approx-key{display:inline-block;width:12px;height:12px;border:2px dashed #555;border-radius:50%;vertical-align:-2px;margin:0 3px}
    @media(max-width:900px){.launch-map-layout{grid-template-columns:1fr}.launch-map-layout #locmap{height:350px}.launch-map-insight{min-height:0;max-height:none}.launch-fit-row{grid-template-columns:1fr}}
    @media(max-width:760px){.lf-grid{grid-template-columns:1fr 1fr}.lf-reset{width:100%}.lf-picks{grid-template-columns:1fr}.launch-finder{padding:15px}.lf-field:first-child{grid-column:1/-1}}
    @media(max-width:480px){.lf-grid{grid-template-columns:1fr}.lf-field:first-child{grid-column:auto}}
  `;
  document.head.append(style);

  const panel=document.createElement('section');
  panel.className='launch-finder';
  panel.setAttribute('aria-labelledby','launch-finder-title');
  panel.innerHTML=`
    <h2 id="launch-finder-title">Which Michigan Great Lakes launch fits this trip?</h2>
    <p class="lf-intro">Search the same launch records shown on the map. Each result explains the ramp setup, today’s regional conditions, who the access fits, and how confident we are in the pin.</p>
    <div class="lf-grid">
      <div class="lf-field"><label for="lf-q">Launch or county</label><input id="lf-q" type="search" autocomplete="off" placeholder="Bay City, Holland, Marquette…"></div>
      <div class="lf-field"><label for="lf-lake">Great Lake</label><select id="lf-lake"><option value="">All four lakes</option><option value="lake-michigan">Lake Michigan</option><option value="lake-huron">Lake Huron</option><option value="lake-superior">Lake Superior</option><option value="lake-erie">Lake Erie</option></select></div>
      <div class="lf-field"><label for="lf-protection">Launch character</label><select id="lf-protection"><option value="">Any exposure</option><option value="protected">More protected</option><option value="mixed">Mixed / verify locally</option><option value="exposed">Open-water exposure</option></select></div>
      <button class="lf-reset" id="lf-reset" type="button">Reset</button>
    </div>
    <p class="lf-status" id="lf-status" aria-live="polite"></p>
    <p class="lf-source-status" id="lf-source-status" aria-live="polite">Checking launch points against Michigan DNR boating-access data…</p>
    <div class="lf-picks" id="lf-picks" aria-label="Starting points"></div>
    <p class="lf-note"><strong>Use this as a screening tool, not a launch or boating safety rating.</strong> Regional conditions come from the nearest mapped NDBC station and can differ materially inside a river, marina, bay or harbor. Michigan DNR facility data is used when a confident site match is available; verify local notices, closures and the marine forecast before leaving.</p>`;
  const mapWrap=$('#locmap-wrap');
  if(mapWrap)mapWrap.before(panel);else $('.body')?.prepend(panel);

  let insight=null;
  if(mapWrap){
    insight=document.createElement('aside');
    insight.id='launch-map-insight';
    insight.className='launch-map-insight';
    insight.setAttribute('aria-live','polite');
    insight.innerHTML='<strong>Select a launch.</strong><span>The map and launch cards use the same launch ID.</span><p>You’ll get a quick ramp read, today’s regional condition interpretation, location confidence, Google Maps routing and nearby alternatives.</p><small>Regional buoy data is not ramp, marina, harbor or boating-safety truth.</small>';
  }

  const q=$('#lf-q'),lake=$('#lf-lake'),prot=$('#lf-protection'),status=$('#lf-status'),sourceStatus=$('#lf-source-status'),picks=$('#lf-picks');
  const params=new URLSearchParams(location.search);
  if(params.get('lake'))lake.value=params.get('lake');
  if(params.get('exposure'))prot.value=params.get('exposure');
  if(params.get('q'))q.value=params.get('q').slice(0,60);

  let map=null,mapLayout=null,selectedSlug='';
  const markerBySlug=new Map();
  const visible=()=>cards.filter(c=>!c.hidden);

  function nearbyFor(loc,limit=3){
    const res=resolvedBySlug.get(loc.slug)||loc,selectedCard=cardFor(loc),state=conditionState(selectedCard);
    return locations.filter(x=>x.slug!==loc.slug).map(x=>{
      const xr=resolvedBySlug.get(x.slug)||x,card=cardFor(x);
      return {loc:x,res:xr,card,distance:distanceMi(res,xr),protection:card?.dataset.protection||'mixed'};
    }).filter(x=>Number.isFinite(x.distance)&&x.distance<=90).sort((a,b)=>{
      if((state==='rough'||state==='moderate')&&selectedCard?.dataset.protection==='exposed'){
        const ap=a.protection==='protected'?0:1,bp=b.protection==='protected'?0:1;if(ap!==bp)return ap-bp;
      }
      return a.distance-b.distance;
    }).slice(0,limit);
  }

  function renderNearby(loc){
    const list=nearbyFor(loc);
    if(!list.length)return '';
    return `<div class="nearby-launches"><strong>Nearby alternatives</strong><ul>${list.map(x=>`<li><button type="button" data-launch-compare="${esc(x.loc.slug)}">${esc(x.loc.name)}</button> · ${x.distance.toFixed(1)} mi · ${esc(labelProtection(x.protection))}</li>`).join('')}</ul></div>`;
  }

  function updateCardDecision(loc){
    const card=cardFor(loc);if(!card)return;
    const res=resolvedBySlug.get(loc.slug)||loc,cond=conditionData(card),fits=personaFits(loc),facts=facilityFacts(res);
    let box=$('.launch-decision',card);
    if(!box){box=document.createElement('section');box.className='launch-decision';box.setAttribute('aria-label','Launch planning read');card.append(box);}
    box.innerHTML=`
      <span class="launch-confidence ${confidenceClass(res)}">${esc(confidenceLabel(res))}</span>
      <h4>Quick launch read</h4><p class="launch-quick">${esc(quickRead(loc))}</p>
      <div class="launch-today"><strong>Today at this launch</strong><p>${esc(todayRead(card,res))}</p><div class="launch-stats">${esc(cond.stats.length?cond.stats.join(' · '):'Regional NDBC conditions unavailable')}</div></div>
      <h4>Who this launch fits</h4><div class="launch-fit-row">
        <div class="launch-fit ${fits.trailer.tone}"><b>Trailer angler: ${esc(fits.trailer.label)}</b><span>${esc(fits.trailer.why)}</span></div>
        <div class="launch-fit ${fits.paddle.tone}"><b>Kayak / paddlecraft: ${esc(fits.paddle.label)}</b><span>${esc(fits.paddle.why)}</span></div>
        <div class="launch-fit ${fits.casual.tone}"><b>Family / casual: ${esc(fits.casual.label)}</b><span>${esc(fits.casual.why)}</span></div>
      </div>
      <div class="launch-facts"><b>Launch setup:</b> ${esc(facts.length?facts.join(' · '):'Facility details are incomplete; verify before towing.')}</div>
      <div class="launch-source">${esc(sourceLine(res))} ${cond.source?esc(cond.source)+'. ':''}Regional buoy data is screening context, not conditions at the ramp.</div>
      <div class="launch-actions">
        <a href="${googleDirections(res)}" target="_blank" rel="noopener" data-launch-action="directions">Open in Google Maps</a>
        <a href="${googleSatellite(res)}" target="_blank" rel="noopener" data-launch-action="satellite">View satellite map</a>
        <a href="#locmap" data-launch-action="map" data-launch-slug="${esc(loc.slug)}">Show on map</a>
        <a href="${DNR_FACILITY_FINDER}" target="_blank" rel="noopener" data-launch-action="verify">Verify with Michigan DNR</a>
      </div>${renderNearby(loc)}`;
  }

  function updateAllCards(){locations.forEach(updateCardDecision);}

  function updateURL(){
    const u=new URL(location.href);['q','lake','exposure'].forEach(k=>u.searchParams.delete(k));
    if(q.value.trim())u.searchParams.set('q',q.value.trim());if(lake.value)u.searchParams.set('lake',lake.value);if(prot.value)u.searchParams.set('exposure',prot.value);if(selectedSlug)u.hash=selectedSlug;
    history.replaceState(null,'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash);
  }

  const conditionRank=card=>{const s=conditionState(card);return s==='calm'?2:s==='moderate'?1:s==='rough'?0:1;};
  const protectionRank=card=>card.dataset.protection==='protected'?2:card.dataset.protection==='mixed'?1:0;
  const verifiedRank=card=>{const r=resolvedBySlug.get(card.dataset.slug);return r&&isVerified(r)?1:0;};
  function renderPicks(list){
    picks.replaceChildren();
    const ranked=[...list].sort((a,b)=>(conditionRank(b)+protectionRank(b)+verifiedRank(b))-(conditionRank(a)+protectionRank(a)+verifiedRank(a))).slice(0,3);
    ranked.forEach(card=>{
      const loc=bySlug.get(card.dataset.slug),res=resolvedBySlug.get(card.dataset.slug),d=document.createElement('div');
      d.className='lf-pick';
      d.innerHTML=`<strong>${esc(loc?.name||'Launch')}</strong><span>${esc(cardMeta(loc))} · ${esc(labelProtection(card.dataset.protection))} · ${esc(confidenceLabel(res))}</span><button type="button" data-launch-pick="${esc(card.dataset.slug)}">Read this launch</button>`;
      picks.append(d);
    });
  }

  function clearSelectedCard(){cards.forEach(card=>{card.classList.remove('lf-selected');card.removeAttribute('aria-current');$('.lf-selected-badge',card)?.remove();});}
  function markSelectedCard(card){
    clearSelectedCard();if(!card)return;card.classList.add('lf-selected');card.setAttribute('aria-current','true');
    if(!$('.lf-selected-badge',card)){const badge=document.createElement('span');badge.className='lf-selected-badge';badge.textContent='Selected launch';card.prepend(badge);}
  }

  function insightHtml(loc){
    const res=resolvedBySlug.get(loc.slug)||loc,card=cardFor(loc),cond=conditionData(card),fits=personaFits(loc),facts=facilityFacts(res);
    return `<strong>${esc(loc.name)}</strong><span>${esc(cardMeta(loc))} · ${esc(labelProtection(card?.dataset.protection||'mixed'))}</span>
      <span class="launch-confidence ${confidenceClass(res)}">${esc(confidenceLabel(res))}</span>
      <p>${esc(quickRead(loc))}</p>
      <div class="lmi-signal"><b>Today:</b> ${esc(todayRead(card,res))}<br><span>${esc(cond.stats.length?cond.stats.join(' · '):'Regional NDBC conditions unavailable')}</span></div>
      <div class="lmi-fit"><b>Trailer angler:</b> ${esc(fits.trailer.label)} · <b>Paddler:</b> ${esc(fits.paddle.label)} · <b>Casual trip:</b> ${esc(fits.casual.label)}</div>
      <div class="launch-facts"><b>Setup:</b> ${esc(facts.length?facts.join(' · '):'Verify facility details before towing.')}</div>
      ${renderNearby(loc)}
      <div class="lmi-actions"><a href="${googleDirections(res)}" target="_blank" rel="noopener">Open in Google Maps</a><a href="${googleSatellite(res)}" target="_blank" rel="noopener">Satellite view</a><a href="#${esc(loc.slug)}" data-launch-action="record" data-launch-slug="${esc(loc.slug)}">Open matching launch card</a></div>
      <small>${esc(sourceLine(res))} Regional NDBC context is not ramp, marina, harbor or boating-safety truth.</small>`;
  }
  function showInsight(loc,source='map'){if(!insight||!loc)return;insight.dataset.selectedLaunch=loc.slug;insight.innerHTML=insightHtml(loc);emit('Boat Launch Map Insight',{launch:loc.slug,source,locationConfidence:(resolvedBySlug.get(loc.slug)||loc).confidence});}

  function popupHtml(loc){
    const res=resolvedBySlug.get(loc.slug)||loc,card=cardFor(loc),cond=conditionData(card);
    const short=quickRead(loc).length>180?quickRead(loc).slice(0,177)+'…':quickRead(loc);
    return `<strong>${esc(loc.name)}</strong><br><span style="font-size:11px">${esc(cardMeta(loc))}</span><br><span style="font-size:11px;font-weight:bold">${esc(confidenceLabel(res))}</span><p style="font-size:12px;line-height:1.35;margin:6px 0">${esc(short)}</p><span style="font-size:11px"><b>Today:</b> ${esc(cond.stats.length?cond.stats.join(' · '):'regional conditions unavailable')}</span><br><a href="${googleDirections(res)}" target="_blank" rel="noopener">Google Maps</a> · <a href="#${esc(loc.slug)}" data-launch-popup-record="${esc(loc.slug)}">Full launch read</a>`;
  }
  function markerStyle(slug,selected=false){
    const loc=bySlug.get(slug),card=loc?cardFor(loc):null,res=resolvedBySlug.get(slug)||loc,color=markerColor(card?conditionState(card):'unknown');
    return {radius:selected?9:7,fillColor:color,color:selected?'#173f1d':isVerified(res)?'#fff':'#555',weight:selected?3:isVerified(res)?1.5:2,opacity:1,fillOpacity:isVerified(res)?.92:.55,dashArray:isVerified(res)?null:'4 3'};
  }
  function refreshMarker(slug){
    const marker=markerBySlug.get(slug),loc=bySlug.get(slug),res=resolvedBySlug.get(slug);if(!marker||!loc||!res)return;
    marker.setLatLng([res.lat,res.lng]);marker.setStyle(markerStyle(slug,slug===selectedSlug));marker.setPopupContent(popupHtml(loc));
  }
  function refreshAllMarkers(){locations.forEach(loc=>refreshMarker(loc.slug));}
  function syncMapToVisible({fit=true}={}){
    if(!map)return;const bounds=[];
    locations.forEach(loc=>{const marker=markerBySlug.get(loc.slug),card=cardFor(loc),res=resolvedBySlug.get(loc.slug)||loc;if(!marker||!card)return;if(card.hidden){if(map.hasLayer(marker))map.removeLayer(marker);}else{if(!map.hasLayer(marker))marker.addTo(map);bounds.push([res.lat,res.lng]);}});
    if(fit&&bounds.length)map.fitBounds(bounds,{padding:[28,28],maxZoom:9});
  }

  function selectLaunch(slug,source='map'){
    const loc=bySlug.get(slug);if(!loc)return;const card=cardFor(loc);selectedSlug=slug;markSelectedCard(card);showInsight(loc,source);refreshAllMarkers();updateURL();
    if(source.startsWith('map'))status.innerHTML=`Selected: <strong>${esc(loc.name)}</strong>. The map, launch read and Google Maps action are using the same launch record.`;
  }
  function jumpToRecord(slug){const loc=bySlug.get(slug),card=loc?cardFor(loc):null;if(!card)return;selectLaunch(slug,'map-record');card.scrollIntoView({behavior:'smooth',block:'center'});card.focus({preventScroll:true});emit('Boat Launch Map To Record',{launch:slug});}
  function focusMap(slug){const loc=bySlug.get(slug),marker=markerBySlug.get(slug),res=resolvedBySlug.get(slug);if(!map||!loc||!marker||!res)return;if(!map.hasLayer(marker))marker.addTo(map);selectLaunch(slug,'record');map.flyTo([res.lat,res.lng],Math.max(map.getZoom(),10),{duration:.45});setTimeout(()=>marker.openPopup(),480);mapLayout?.scrollIntoView({behavior:'smooth',block:'center'});emit('Boat Launch Record To Map',{launch:slug});}

  function apply(source='filter'){
    const needle=q.value.trim().toLowerCase();
    cards.forEach(card=>{const hay=(card.textContent||'').toLowerCase(),ok=(!needle||hay.includes(needle))&&(!lake.value||card.dataset.lake===lake.value)&&(!prot.value||card.dataset.protection===prot.value);card.hidden=!ok;card.classList.toggle('lf-match',ok&&!!needle&&!card.classList.contains('lf-selected'));});
    const list=visible();
    if(selectedSlug){const selected=cards.find(c=>c.dataset.slug===selectedSlug);if(selected?.hidden){selectedSlug='';clearSelectedCard();if(insight)insight.innerHTML='<strong>Selection cleared by the filters.</strong><span>Choose another visible launch.</span>';}}
    const verified=list.filter(card=>isVerified(resolvedBySlug.get(card.dataset.slug))).length;
    status.innerHTML=`Map and cards synchronized: <strong>${list.length}</strong> of ${cards.length} launches visible · <strong>${verified}</strong> have a verified/matched access point.`;
    renderPicks(list);updateURL();syncMapToVisible({fit:source!=='search'||needle.length>1});if(source!=='init')emit('Boat Launch Filter',{filter:source,results:list.length});
  }

  function buildOwnedMap(){
    if(!mapWrap||!window.L||map)return;const oldMap=$('#locmap');if(!oldMap)return;
    const fresh=document.createElement('div');fresh.id='locmap';fresh.setAttribute('aria-label','Synchronized map of Michigan boat launch access points and detailed launch records');
    mapLayout=document.createElement('div');mapLayout.className='launch-map-layout';oldMap.replaceWith(mapLayout);mapLayout.append(fresh,insight);
    map=L.map(fresh,{scrollWheelZoom:false}).setView([44.6,-85.5],6);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:'&copy; OpenStreetMap, &copy; CARTO',subdomains:'abcd',maxZoom:19}).addTo(map);
    locations.forEach(loc=>{
      const res=resolvedBySlug.get(loc.slug)||loc,marker=L.circleMarker([res.lat,res.lng],markerStyle(loc.slug,false));marker.bindPopup(popupHtml(loc),{maxWidth:340});marker.on('click',()=>selectLaunch(loc.slug,'map'));marker.on('add',()=>{const el=marker.getElement();if(!el)return;el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',`Select ${loc.name} and its matching launch record`);el.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();marker.openPopup();selectLaunch(loc.slug,'map-keyboard');}});});marker.addTo(map);markerBySlug.set(loc.slug,marker);
    });
    const legend=L.control({position:'bottomright'});legend.onAdd=()=>{const d=L.DomUtil.create('div','locmap-legend');d.innerHTML='<i style="background:#2e9e3f"></i>milder <i style="background:#e0991a"></i>mixed <i style="background:#cf3a3a"></i>elevated<br><span class="approx-key"></span>approximate pin';return d;};legend.addTo(map);
    syncMapToVisible({fit:true});refreshAllMarkers();emit('Boat Launch Linked Map Ready',{launches:markerBySlug.size});
  }
  function waitForLeaflet(){let tries=0;const timer=setInterval(()=>{tries++;if(window.L){clearInterval(timer);setTimeout(buildOwnedMap,120);}else if(tries>50){clearInterval(timer);if(insight)insight.innerHTML='<strong>Map unavailable.</strong><span>The launch cards and Google Maps links remain usable.</span>'; }},200);}

  async function fetchFeatures(url,mapper){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5500);
    try{const r=await fetch(url,{mode:'cors',signal:controller.signal,headers:{Accept:'application/json'}});if(!r.ok)throw new Error('HTTP '+r.status);const data=await r.json();return (data.features||[]).map(mapper).filter(Boolean);}finally{clearTimeout(timeout);}
  }
  function applyResolution(loc,res){
    resolvedBySlug.set(loc.slug,res);updateCardDecision(loc);refreshMarker(loc.slug);if(selectedSlug===loc.slug)showInsight(loc,'data-refresh');
  }
  async function hydrateOfficialLocations(){
    let primary=[],secondary=[];
    try{primary=await fetchFeatures(DNR_QUERY,primarySite);}catch{}
    try{secondary=await fetchFeatures(PUBLIC_QUERY,secondarySite);}catch{}
    let verified=0,moved=0;
    for(const loc of locations){
      let res=null;
      const pm=bestMatch(loc,primary);if(pm)res=resolveFromMatch(loc,pm,'dnr');
      if(!res&&MANUAL_VERIFIED[loc.slug])res={...loc,...MANUAL_VERIFIED[loc.slug],facility:null,matchedName:loc.name,movedMiles:distanceMi(loc,MANUAL_VERIFIED[loc.slug])};
      if(!res){const sm=bestMatch(loc,secondary);if(sm)res=resolveFromMatch(loc,sm,'public');}
      if(res){verified++;if((res.movedMiles||0)>.25)moved++;applyResolution(loc,res);}
    }
    updateAllCards();refreshAllMarkers();apply('official-data');
    if(primary.length||secondary.length){sourceStatus.innerHTML=`Location audit complete: <strong>${verified}</strong> of ${locations.length} launch points matched to maintained/public access data${moved?`; ${moved} map pins moved materially from the legacy coordinates`:''}. Unmatched pins are visibly labeled approximate.`;}
    else{sourceStatus.textContent='Michigan access-site data could not be reached. Pins remain labeled by confidence; use the Google Maps search and verify locally before towing.';}
    emit('Boat Launch Coordinate Audit',{verified,total:locations.length,moved});
  }

  q.addEventListener('input',()=>apply('search'));lake.addEventListener('change',()=>apply('lake'));prot.addEventListener('change',()=>apply('exposure'));$('#lf-reset')?.addEventListener('click',()=>{q.value='';lake.value='';prot.value='';apply('reset');});
  panel.addEventListener('click',e=>{const a=e.target.closest('[data-launch-pick]');if(!a)return;e.preventDefault();const slug=a.dataset.launchPick;selectLaunch(slug,'pick');jumpToRecord(slug);emit('Boat Launch Pick',{launch:slug});});
  document.addEventListener('click',e=>{
    const compare=e.target.closest('[data-launch-compare]');if(compare){e.preventDefault();const slug=compare.dataset.launchCompare;selectLaunch(slug,'compare');jumpToRecord(slug);emit('Boat Launch Alternative',{launch:slug});return;}
    const action=e.target.closest('[data-launch-action]');if(action){const slug=action.dataset.launchSlug;emit('Boat Launch Action',{action:action.dataset.launchAction});if(action.dataset.launchAction==='map'&&slug){e.preventDefault();focusMap(slug);}else if(action.dataset.launchAction==='record'&&slug){e.preventDefault();jumpToRecord(slug);}}
    const popup=e.target.closest('[data-launch-popup-record]');if(popup){e.preventDefault();jumpToRecord(popup.dataset.launchPopupRecord);}
  });

  cards.forEach(card=>{
    const observer=new MutationObserver(mutations=>{
      const conditionChanged=mutations.some(m=>{
        const target=m.target?.nodeType===1?m.target:m.target?.parentElement;
        if(target?.closest?.('.conditions'))return true;
        return [...(m.addedNodes||[])].some(n=>n.nodeType===1&&(n.matches?.('.conditions')||n.querySelector?.('.conditions')));
      });
      if(!conditionChanged)return;
      const slug=card.dataset.slug;if(!slug)return;const loc=bySlug.get(slug);updateCardDecision(loc);refreshMarker(slug);if(selectedSlug===slug)showInsight(loc,'conditions-refresh');
    });
    observer.observe(card,{childList:true,subtree:true,characterData:true,attributes:true});
  });

  updateAllCards();apply('init');waitForLeaflet();hydrateOfficialLocations();
})();
