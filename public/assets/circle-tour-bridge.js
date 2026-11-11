/* Circle Tour independent tool bridge: read-only registry links, no specialist mutation. */
(function(root){
  'use strict';
  const CATALOG='/assets/circle-tour-tool-catalog.json';
  const IDS=['1','2','3','4','5','6','7','8','9','10','11','12','31','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30'];
  const STOPS=new Set(IDS);
  const THEMES=new Set(['all','parks','falls','water','ships','history','logistics','seasonal']);
  const ROAD_HOSTS=new Set(['511wi.gov','mdotjboss.state.mi.us','511on.ca','511mn.org']);
  const LIMIT=6;
  // Visitor handoffs, not independent specialist tools or live access reports.
  const OFFICIAL_STOPS=Object.freeze({
    "2": {
      "question": "Wisconsin Point beach, or a look around Superior's harbor?",
      "context": "Wisconsin Point runs nearly three miles along Lake Superior. The city explains beach access, the protected dunes and which roads have overnight parking restrictions.",
      "url": "https://www.superiorwi.gov/226/Wisconsin-Point",
      "sourceLabel": "Visit Wisconsin Point and read beach rules",
      "caution": "Before swimming, check current beach advisories. Follow posted access and parking restrictions."
    },
    "4": {
      "question": "See Ashland's murals on foot, or explore more of Chequamegon Bay?",
      "context": "Ashland's historic Main Street offers an eight-block outdoor mural walk. The local mural guide shows where to start and helps turn a quick town stop into a self-guided history walk.",
      "url": "https://www.visitashland.com/murals/",
      "sourceLabel": "Walk Ashland's downtown mural route",
      "caution": "Outdoor murals may be visible year-round, but shops, guided tours and lakefront facilities have separate hours."
    },
    "17": {
      "question": "Looking for a pleasant Highway 17 break in White River?",
      "context": "Winnie the Pooh Park sits beside the famous bear statue and the town's visitor information centre. It's a small local-history stop near the highway, rather than a wilderness trail.",
      "url": "https://whiteriver.ca/winnie-the-pooh-park",
      "sourceLabel": "Explore White River's Winnie the Pooh Park",
      "caution": "The park and the seasonal visitor information centre are different. Check office hours if you need staffed services."
    },
    "19": {
      "question": "Just a short Nipigon river walk, or the trail all the way toward Red Rock?",
      "context": "The township describes easy shoreline sections close to Nipigon and a rugged 10.1-kilometre one-way recreation trail. The full route requires more time and a separate return plan.",
      "url": "https://www.nipigon.net/play-explore/things-to-do/trails-walks/item/114-nipigon-river-recreation-trail",
      "sourceLabel": "Choose a section of the Nipigon River trail",
      "caution": "Check for trail work and conditions before setting out. Do not assume a return shuttle or passable trail."
    },
    "21": {
      "question": "High Falls on the easy path, or the longer hike to Middle Falls?",
      "context": "Minnesota DNR describes a one-mile round-trip paved and boardwalk route to High Falls. Middle Falls is a challenging 4.5-mile round-trip hike, not a second roadside pullout.",
      "url": "https://www.dnr.state.mn.us/state-parks/grand-portage/things-to-do.html",
      "sourceLabel": "Compare Grand Portage's two falls",
      "caution": "Published trail distances are not a report of current access. Follow DNR notices and on-site signs."
    },
    "24": {
      "question": "A half-mile along Cascade Falls, or the longer climb up Lookout Mountain?",
      "context": "Minnesota DNR maps the Cascade River Lower Loop at 0.5 mile and the steep Lookout Mountain Loop at 3.5 miles. The first follows the basalt gorge; the second climbs toward views of the Sawtooths.",
      "url": "https://www.dnr.state.mn.us/state-parks/virtual-tours/cascade-river/dialup.html",
      "sourceLabel": "Explore Cascade River's falls and overlooks",
      "extraSources": [
        {
          "label": "See DNR trail distances and parking map (PDF)",
          "url": "https://files.dnr.state.mn.us/maps/state_parks/spk00133.pdf"
        }
      ],
      "caution": "The cliffs and river are slippery. These are published routes, not a current trail or parking status report."
    },
    "25": {
      "question": "The short Temperance gorge, a Carlton Peak hike, or a Lutsen lift ride?",
      "context": "Temperance River Gorge Trail is 0.25 mile one-way; Carlton Peak is a steep three miles one-way from the Highway 61 trailhead. Lutsen Mountains is a separate resort whose lifts and gondola have their own schedule.",
      "url": "https://files.dnr.state.mn.us/maps/state_parks/spk00268.pdf",
      "sourceLabel": "Compare Temperance River trails (DNR PDF)",
      "extraSources": [
        {
          "label": "Check Lutsen Mountains operating hours",
          "url": "https://www.lutsen.com/mountain-info/hours-of-operation"
        }
      ],
      "caution": "Minnesota DNR warns not to swim in the Temperance River. The park map cannot confirm resort operations or today's trail conditions."
    },
    "26": {
      "question": "Shovel Point cliffs, or the longer hike to Baptism River's High Falls?",
      "context": "At Tettegouche, Shovel Point is about 1.2 miles round trip with many stairs, while the High Falls outing is about three miles round trip from the visitor center.",
      "url": "https://www.dnr.state.mn.us/state-parks/itineraries/north-shore-waterfall-itinerary.html",
      "sourceLabel": "Compare Tettegouche's hikes",
      "caution": "An earlier bridge reopening is not proof every route is open today. Check posted park and trail alerts."
    }
  });
  function officialStopGuide(id){return Object.hasOwn(OFFICIAL_STOPS,String(id))?OFFICIAL_STOPS[String(id)]:null;}
  // Researched arrival points. Name searches may resolve a general place or street,
  // never a surveyed parking pin. Exact addresses originate with the land manager.
  const OFFICIAL_ARRIVALS=Object.freeze({
    "2": [
      {
        "label": "Wisconsin Point · Lot 1",
        "kind": "search",
        "destination": "Wisconsin Point Lot 1, Superior, Wisconsin, USA",
        "note": "The city identifies Lot 1 as the threshold for its 11 p.m.–4 a.m. restriction farther along Wisconsin Point Road. Use designated access areas; confirm the actual lot entrance on signs.",
        "sourceUrl": "https://www.superiorwi.gov/226/Wisconsin-Point",
        "sourceLabel": "City of Superior access and parking rules"
      }
    ],
    "4": [
      {
        "label": "Mural walk · Ellis Avenue at Main Street",
        "kind": "search",
        "destination": "Ellis Avenue and Main Street, Ashland, Wisconsin, USA",
        "note": "Ashland's mural walk begins at Ellis and Main, then runs west through downtown. This is the walking start, not a reserved parking lot. The visitor map marks public parking areas.",
        "sourceUrl": "https://www.visitashland.com/files/Downtown-Map-legal.pdf",
        "sourceLabel": "Visit Ashland downtown parking map"
      }
    ],
    "17": [
      {
        "label": "Winnie the Pooh Park · Highway 17",
        "kind": "search",
        "destination": "Winnie the Pooh Park, White River, Ontario, Canada",
        "note": "The township places the park just off Highway 17 beside its tourist information centre and Winnie the Pooh statue. Follow the signed park driveway; office hours are separate.",
        "sourceUrl": "https://www.whiteriver.ca/winnie-the-pooh-park",
        "sourceLabel": "Township of White River park entrance"
      }
    ],
    "19": [
      {
        "label": "Nipigon Marina · shoreline walk",
        "choiceLabel": "Nipigon Marina · easier shoreline",
        "kind": "search",
        "destination": "Nipigon Marina, Nipigon, Ontario, Canada",
        "note": "Parks Canada directs walkers to park at Nipigon Marina, then walk south across the road bridge to the trailhead. The near-river path is the shorter option.",
        "sourceUrl": "https://www.parcs.canada.ca/amnc-nmca/on/super/activ/experiences/randonnees-hiking/nipigon",
        "sourceLabel": "Parks Canada Nipigon-side trail directions"
      },
      {
        "label": "Red Rock · Lloyd's Lookout or full trail",
        "choiceLabel": "Red Rock · lookout or full trail",
        "kind": "search",
        "destination": "Third Street, Red Rock, Ontario, Canada",
        "note": "Parks Canada lists Lloyd's Lookout as a 2.6 km return from Red Rock; the full trail to Nipigon is 10.1 km one way: arrange a return ride or shuttle before setting out. Take Highway 628 about 7 km, then the signed turn to Third Street. The map may resolve the street, not the trailhead gate.",
        "sourceUrl": "https://www.parcs.canada.ca/amnc-nmca/on/super/activ/experiences/randonnees-hiking/nipigon",
        "sourceLabel": "Parks Canada Red Rock trailhead directions"
      }
    ],
    "21": [
      {
        "label": "Grand Portage State Park · visitor center",
        "kind": "address",
        "destination": "9393 East Highway 61, Grand Portage, MN 55605, USA",
        "note": "The DNR visitor-center/rest-area parking is the start for the one-mile High Falls walk. The Middle Falls trail branches before the boardwalk; do not drive toward the falls themselves.",
        "sourceUrl": "https://files.dnr.state.mn.us/maps/state_parks/spk00173.pdf",
        "sourceLabel": "Minnesota DNR Grand Portage visitor map (2025)"
      }
    ],
    "24": [
      {
        "label": "Cascade River Wayside · falls loop",
        "choiceLabel": "Short falls walk · highway wayside",
        "kind": "search",
        "destination": "Cascade River Wayside, Highway 61, Lutsen, Minnesota, USA",
        "note": "The falls-side trailhead is at Highway 61 near the river, around milepost 99.9. MnDOT reported wayside parking and crossing construction in 2026. Check current barriers; do not assume either side is open.",
        "sourceUrl": "https://olmwebservices.dot.state.mn.us/news/2026/05/27-d1-cascade.html",
        "sourceLabel": "MnDOT dated Cascade Wayside construction notice"
      },
      {
        "label": "Cascade River State Park · park office",
        "choiceLabel": "Park office · check longer hikes",
        "kind": "address",
        "destination": "3481 West Highway 61, Lutsen, MN 55612, USA",
        "note": "This DNR park-office address is not the falls wayside and not the same entrance. It is not a guaranteed Lookout Mountain trailhead. DNR describes the Lookout hike from a day-use parking area: check the official map or ask staff where to start.",
        "sourceUrl": "https://files.dnr.state.mn.us/maps/state_parks/spk00133.pdf",
        "sourceLabel": "Minnesota DNR park map (2020)"
      }
    ],
    "25": [
      {
        "label": "Temperance River · Highway 61 northeast-side lot",
        "choiceLabel": "Gorge and Carlton Peak trails",
        "kind": "search",
        "destination": "Temperance River Gorge Trailhead parking, Highway 61, Schroeder, Minnesota, USA",
        "note": "The DNR starts both the 0.25-mile gorge trail and the Carlton Peak route at the Highway 61 lot on the northeast side of the river. Map search is not a surveyed parking pin: use the DNR diagram and roadside signs.",
        "sourceUrl": "https://files.dnr.state.mn.us/maps/state_parks/spk00268.pdf",
        "sourceLabel": "Minnesota DNR parking and trail map (2026)"
      },
      {
        "label": "Lutsen Mountains · separate resort",
        "choiceLabel": "Lutsen Mountains resort",
        "kind": "address",
        "destination": "467 Ski Hill Road, Lutsen, MN 55612, USA",
        "note": "The resort's own entrance is up Ski Hill Road, not at Temperance River. Lutsen advises gondola-base and overflow parking as directed by attendants; verify lift service before driving up.",
        "sourceUrl": "https://www.lutsen.com/faqs",
        "sourceLabel": "Lutsen Mountains operator parking instructions"
      }
    ],
    "26": [
      {
        "label": "Tettegouche · visitor center",
        "kind": "address",
        "destination": "5702 Highway 61, Silver Bay, MN 55614, USA",
        "note": "Minnesota DNR's visitor center is the published starting point for the Shovel Point path and the roughly three-mile High Falls hike. Choose the trail after arrival and check alerts.",
        "sourceUrl": "https://www.dnr.state.mn.us/state-parks/itineraries/north-shore-waterfall-itinerary.html",
        "sourceLabel": "Minnesota DNR hiking itinerary and trailhead"
      }
    ]
  });
  function officialArrivals(id){return Object.hasOwn(OFFICIAL_ARRIVALS,String(id))?OFFICIAL_ARRIVALS[String(id)]:[];}
  // An external travel preference must not silently turn into a different kind of outing.
  const OFFICIAL_INTERESTS=Object.freeze({
    '2':['parks','water'],'4':['history'],'17':['history'],
    '19':['parks','water'],'21':['parks','falls'],'24':['parks','falls'],
    '25':['parks','falls'],'26':['parks','falls']
  });
  function guideForInterest(id,theme){
    const guide=officialStopGuide(id),interest=safeTheme(theme);
    return guide&&(interest==='all'||OFFICIAL_INTERESTS[String(id)]?.includes(interest))?guide:null;
  }
  function chooseArrival(id,index=0){
    const locations=officialArrivals(id),n=Number(index);
    if(!locations.length)return null;
    const chosen=Number.isInteger(n)&&n>=0&&n<locations.length?n:0;
    return {stopId:String(id),index:chosen,total:locations.length,arrival:locations[chosen],
      mapUrl:arrivalMapUrl(locations[chosen])};
  }
  function arrivalMapUrl(entry){
    if(!entry||!['address','search'].includes(entry.kind)||typeof entry.destination!=='string'
      ||entry.destination.length<10||entry.destination.length>180)return '';
    const query=encodeURIComponent(entry.destination);
    return entry.kind==='address'
      ?'https://www.google.com/maps/dir/?api=1&destination='+query+'&travelmode=driving'
      :'https://www.google.com/maps/search/?api=1&query='+query;
  }
  function safeDate(v){
    if(typeof v!=='string'||!/^\d{4}-\d\d-\d\d$/.test(v))return '';
    const d=new Date(v+'T12:00:00Z');
    return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v?v:'';
  }
  function safeTheme(v){return THEMES.has(v)?v:'all';}
  function safeToolUrl(value){
    try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&!u.search
      &&(u.hostname==='chrisizworski.com'||u.hostname.endsWith('.chrisizworski.com'))?u.href:'';}
    catch{return '';}
  }
  function safeRoadUrl(value){
    try{const u=new URL(value);return u.protocol==='https:'&&ROAD_HOSTS.has(u.hostname)&&!u.username&&!u.password&&!u.port&&!u.hash?u.href:'';}
    catch{return '';}
  }
  function rankConnections(catalog,opts={}){
    const selected=[...new Set((Array.isArray(opts.selectedIds)?opts.selectedIds:[]).map(String).filter(x=>STOPS.has(x)))];
    const focused=STOPS.has(String(opts.focusStop))?String(opts.focusStop):'';
    const scope=focused?[focused]:selected;
    const theme=safeTheme(opts.theme),date=safeDate(opts.date),month=date?Number(date.slice(5,7)):null;
    const region=['wi','mi','on','mn'].includes(opts.region)?opts.region:'all';
    const route=Array.isArray(catalog?.routeOrder)?catalog.routeOrder.map(String):IDS;
    const entries=(Array.isArray(catalog?.connections)?catalog.connections:[]).filter(item=>{
      if(!item||!item.toolId||!safeToolUrl(item.url)||!Array.isArray(item.stopIds)
        ||!item.stopIds.some(s=>STOPS.has(String(s))))return false;
      if(theme!=='all'&&item.theme!==theme)return false;
      if(scope.length)return item.stopIds.some(s=>scope.includes(String(s)));
      return region==='all'||item.stopIds.some(s=>catalog.stopRegion?.[s]===region);
    });
    const items=entries.map(item=>{
      const matching=item.stopIds.filter(s=>scope.includes(String(s)));
      const first=matching.length?matching.sort((a,b)=>scope.indexOf(a)-scope.indexOf(b))[0]:item.stopIds[0];
      const inSeason=!month||!Array.isArray(item.seasons)||item.seasons.includes(month);
      const index=scope.length?scope.indexOf(first):route.indexOf(first);
      return {...item,firstStop:first,inSeason,rank:Math.max(0,index)+(!inSeason?route.length:0)};
    }).sort((a,b)=>a.rank-b.rank||a.toolId.localeCompare(b.toolId));
    return {items,total:items.length,scope,focused,theme,date,month,region};
  }
  function roadChecks(catalog,opts={}){
    const scope=Array.isArray(opts.scope)?opts.scope:[];
    const regions=new Set(scope.map(id=>catalog.stopRegion?.[id]).filter(Boolean));
    // Border stops require source checks on both sides of the crossing, not one state's coverage.
    if(scope.some(id=>['13','14'].includes(String(id)))){regions.add('mi');regions.add('on');}
    if(scope.some(id=>['20','21'].includes(String(id)))){regions.add('mn');regions.add('on');}
    if(!scope.length&&opts.region&&opts.region!=='all')regions.add(opts.region);
    return (Array.isArray(catalog.roadChecks)?catalog.roadChecks:[])
      .filter(x=>(!regions.size||regions.has(x.region))&&safeRoadUrl(x.url));
  }
  function buildReturnHref(current,context={}){
    const url=new URL(current),date=safeDate(context.date),theme=safeTheme(context.theme);
    if(date)url.searchParams.set('ctDate',date);else url.searchParams.delete('ctDate');
    if(theme!=='all')url.searchParams.set('ctTheme',theme);else url.searchParams.delete('ctTheme');
    const focus=String(context.focusStop||'');
    if(STOPS.has(focus))url.searchParams.set('ctStop',focus);else url.searchParams.delete('ctStop');
    // The arrival is meaningful only alongside its explicit Circle Tour stop.
    const options=context.arrivalChoices||{},index=Object.hasOwn(options,focus)?Number(options[focus]):0;
    const chosen=STOPS.has(focus)?chooseArrival(focus,index):null;
    if(chosen&&chosen.total>1&&chosen.index>0)url.searchParams.set('ctArrival',String(chosen.index));
    else url.searchParams.delete('ctArrival');
    return url.href;
  }

  /**
   * Decision progression is a pure consumer of the approved catalog.
   * An applied preset already supplies ordered selected IDs; never reverse them twice.
   * It neither predicts access nor changes any independent specialist.
   */
  function planNextDecision(catalog, options = {}) {
    const selected=[...new Set((Array.isArray(options.selectedIds)?options.selectedIds:[]).map(String).filter(id=>STOPS.has(id)))];
    const published=options.itinerary && ['7','10','15'].includes(String(options.itinerary));
    const direction=published && options.direction==='clockwise' ? 'clockwise' : published ? 'counterclockwise' : '';
    // CircleTourPage.selectedIds() and the saved plan query already contain the actual
    // applied itinerary order, including clockwise reversal and its endpoint semantics.
    // The bridge is not a second route engine and must never reorder these IDs.
    const ordered=selected;
    const explicit=STOPS.has(String(options.focusStop))?String(options.focusStop):'';
    const stopId=explicit || ordered[0] || '';
    const index=ordered.indexOf(stopId);
    const date=safeDate(options.date);
    const theme=safeTheme(options.theme);
    const noChoice={kind:'choose-stop',stopId:'',position:0,total:0,source:'route',
      primary:null,alternatives:[],otherThemesAvailable:false,prevStopId:'',nextStopId:'',
      inSavedTrip:false,orderedStops:[],date,theme,direction};
    if(!stopId)return noChoice;
    const matches=rankConnections(catalog,{focusStop:stopId,date,theme}).items
      .slice().sort((a,b)=>Number(b.inSeason)-Number(a.inSeason)
        ||a.stopIds.length-b.stopIds.length||a.toolId.localeCompare(b.toolId));
    const allForStop=rankConnections(catalog,{focusStop:stopId,date,theme:'all'}).items;
    const primary=matches[0]||null;
    return {
      kind:primary?'next-check':'no-specialist',
      stopId,position:index>=0?index+1:0,total:ordered.length,
      source:explicit?'explicit-stop':ordered.length?'selected-trip':'route',
      inSavedTrip:index>=0,
      orderedStops:ordered,direction,date,theme,primary,alternatives:matches.slice(1),
      otherThemesAvailable:!matches.length&&allForStop.length>0,
      prevStopId:index>0?ordered[index-1]:'',
      nextStopId:index>=0&&index+1<ordered.length?ordered[index+1]:'',
      evidence:'Registered specialist link and editorial caveat only; no live access, travel-time, ticket or road verdict'
    };
  }

  const helpers={rankConnections,roadChecks,buildReturnHref,planNextDecision,safeDate,safeTheme,safeToolUrl,safeRoadUrl,officialStopGuide,officialStops:OFFICIAL_STOPS,officialArrivals,arrivalMapUrl,chooseArrival,guideForInterest};
  if(typeof module!=='undefined'&&module.exports)module.exports=helpers;
  if(!root?.document)return;
  const document=root.document,host=document.querySelector('[data-circle-tour-bridge]');
  if(!host)return;
  const $=id=>document.getElementById(id);
  const state={catalog:null,showAll:false,focusStop:'',date:'',theme:'all',region:'all',selectedIds:[],arrivalChoices:Object.create(null)};
  const params=new URLSearchParams(root.location.search);
  state.focusStop=STOPS.has(params.get('ctStop'))?params.get('ctStop'):'';
  state.date=safeDate(params.get('ctDate'));
  state.theme=safeTheme(params.get('ctTheme'));
  // Restore an explicitly shared arrival only if it belongs to the shared stop.
  if(state.focusStop&&/^[1-9]\d*$/.test(params.get('ctArrival')||'')){
    const requested=Number(params.get('ctArrival'));
    if(chooseArrival(state.focusStop,requested)?.index===requested)
      state.arrivalChoices[state.focusStop]=requested;
  }
  function el(tag,cls,text){
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(text!==undefined)n.textContent=text;
    return n;
  }
  function link(label,url,cls){
    const a=el('a',cls||'ctb-link',label);
    a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
  }
  function track(action,meta={}){
    try{root.CircleTourPage?.track?.('tool-bridge-'+action,{source:'circle-tour',...meta});}catch{}
  }
  function selectedIds(){
    const live=root.CircleTourPage?.selectedIds?.();
    return (Array.isArray(live)?live:state.selectedIds).map(String).filter(x=>STOPS.has(x));
  }
  function remember(){
    root.history.replaceState(null,'',buildReturnHref(root.location.href,state));
  }
  function controls(){
    if($('ctb-stop'))$('ctb-stop').value=state.focusStop;
    if($('ctb-date'))$('ctb-date').value=state.date;
    if($('ctb-theme'))$('ctb-theme').value=state.theme;
  }
  function renderRail(scope,activeStop){
    const rail=$('ctb-route');if(!rail)return;
    rail.replaceChildren();
    if(!scope.length){rail.append(el('span','ctb-route-empty','Choose a stop or select stops in the trip planner above.'));return;}
    rail.append(el('span','ctb-route-prefix',scope.length+' route stop'+(scope.length===1?'':'s')));
    scope.slice(0,9).forEach(id=>{
      const name=$('stop-'+id)?.querySelector('.stop-name')?.textContent.trim()||'Stop '+id;
      const chip=el('button','ctb-route-chip',name);chip.type='button';chip.setAttribute('aria-pressed',String(id===activeStop));
      chip.addEventListener('click',()=>{state.focusStop=id;state.showAll=false;remember();render();track('choose-route-stop',{stop:id});});rail.append(chip);
    });
    if(scope.length>9)rail.append(el('span','ctb-route-more','+'+(scope.length-9)+' more'));
    // Reveal the current selected stop inside this horizontal rail without moving the page.
    const current=rail.querySelector('button[aria-pressed="true"]');
    if(current){
      const left=current.offsetLeft,right=left+current.offsetWidth;
      if(right>rail.scrollLeft+rail.clientWidth)rail.scrollLeft=right-rail.clientWidth+12;
      else if(left<rail.scrollLeft)rail.scrollLeft=Math.max(0,left-12);
    }
  }
  function renderRoad(opts){
    const box=$('ctb-road');if(!box)return;
    box.replaceChildren();
    for(const source of roadChecks(state.catalog,opts)){
      const li=el('li');
      li.append(link(source.name,source.url,'ctb-road-link'),el('span','ctb-road-note',source.note));
      box.append(li);
    }
    if(!box.children.length)box.append(el('li','ctb-road-note','No official source links in this region; check the highway authority directly.'));
  }

  // Sense of place is an interpretive layer, independent of the specialist's live/access evidence.
  // Display only site-exact licensed records: never a generic landscape or AI-generated substitute.
  function renderPlaceStory(model,host){
    const story=root.CircleTourPlaceStoryData?.selectPlaceStory?.(model.stopId);
    if(!story||story.placeId!==model.stopId||!Array.isArray(story.photos))return;
    const section=el('section','ctb-place-story');
    section.setAttribute('aria-label','Landscape and story of '+story.name);
    section.append(el('p','ctb-place-kicker','THE PLACE BEHIND THE PLAN'));
    const layout=el('div','ctb-place-layout'),gallery=el('div','ctb-place-gallery');
    const validImage=url=>typeof url==='string'&&/^https:\/\/thumb\.wikimedia\.org\/wikipedia\/commons\/thumb\//.test(url);
    const validSource=url=>typeof url==='string'&&/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(url);
    for(const photo of story.photos.slice(0,2)){
      if(photo.placeId!==model.stopId||photo.status!=='verified-licensed'||!validImage(photo.imageURL)
        ||!validSource(photo.sourceURL)||!/^https:\/\/creativecommons\.org\//.test(photo.licenseURL))continue;
      const figure=el('figure','ctb-place-photo');
      const img=el('img');img.src=photo.imageURL;img.alt=photo.alt;
      img.loading='lazy';img.decoding='async';img.width=photo.width||960;img.height=photo.height||720;
      img.addEventListener('error',()=>{
        figure.remove();
        if(!gallery.children.length){gallery.remove();section.classList.add('ctb-place-image-failed');}
        else if(gallery.children.length===1)gallery.classList.add('ctb-place-single-photo');
      });
      const caption=el('figcaption'),captionText=el('span','ctb-place-caption',photo.caption);
      const credit=el('span','ctb-place-credit','Photo: ');
      const artist=el('a','',photo.photographer);artist.href=photo.sourceURL;
      artist.target='_blank';artist.rel='noopener noreferrer';
      const license=el('a','',photo.licenseName);license.href=photo.licenseURL;
      license.target='_blank';license.rel='noopener noreferrer';
      credit.append(artist,document.createTextNode(' · '),license);
      caption.append(captionText,credit);figure.append(img,caption);gallery.append(figure);
    }
    const prose=el('div','ctb-place-copy');
    prose.append(el('h4','ctb-place-title',story.eyebrow),
      el('p','ctb-place-prose',story.story),
      el('p','ctb-place-character',story.character));
    const why=el('p','ctb-place-why',story.why);prose.append(why);
    const source=link('Read the park’s own description',story.sourceURL,'ctb-place-source');
    source.addEventListener('click',()=>track('place-story-source-open',{stop:model.stopId}));
    prose.append(source);
    if(gallery.children.length)layout.append(gallery);
    layout.append(prose);section.append(layout);
    section.append(el('p','ctb-place-disclosure','These are dated landscape photographs, not today’s weather, access or trail conditions.'));
    host.append(section);
  }

  function renderDecision(model){
    const host=$('ctb-decision');if(!host)return;
    host.replaceChildren();
    const eyebrow=el('p','ctb-stage-label',model.stopId
      ?model.inSavedTrip?'YOUR TRIP · STOP '+model.position+' OF '+model.total
        :'EXPLORING STOP '+model.stopId+' · NOT IN YOUR SAVED TRIP'
      :'START WITH A PLACE');
    host.append(eyebrow);
    if(!model.stopId){
      host.append(el('h3','ctb-stage-title','Where do you want to stop?'),
        el('p','ctb-stage-explainer','Choose a stop above, or add stops in the original planner. We will show one next decision and what remains unknown, not a generic list of links.'));
      const start=el('a','ctb-secondary-link','Explore the 31 stops');
      start.href='#stop-1';host.append(start);
      return;
    }
    const name=$('stop-'+model.stopId)?.querySelector('.stop-name')?.textContent.trim()||'Stop '+model.stopId;
    host.append(el('h3','ctb-stage-title',name));
    if(model.direction){
      host.append(el('p','ctb-stage-path','Applied published '+model.direction+' itinerary · following the original saved stop sequence, not a driving-time estimate.'));
    }else if(model.inSavedTrip&&model.total>1){
      host.append(el('p','ctb-stage-path','Following your selection order, not a verified driving sequence.'));
    }
    if(model.kind==='next-check'){
      host.append(el('p','ctb-stage-prefix','ONE USEFUL NEXT CHECK'));
      host.append(el('p','ctb-stage-question',model.primary.decision));
      const unknown=el('div','ctb-stage-unknown');
      unknown.append(el('strong','', 'What this does not establish'),
        el('p','',model.primary.caveat));
      host.append(unknown);
      if(model.date&&!model.primary.inSeason){
        host.append(el('p','ctb-stage-season','The date you entered falls outside this tool’s usual listed months. Verify seasonal service and access directly; this is not a closure verdict.'));
      }
      const actions=el('div','ctb-stage-actions');
      const check=link('Check '+model.primary.name,model.primary.url,'ctb-link ctb-stage-primary');
      check.addEventListener('click',()=>{
        track('next-check-open',{destination:model.primary.toolId,stop:model.stopId,
          theme:model.primary.theme,season:model.primary.inSeason?'usual':'outside-usual'});
      });
      const stop=el('a','ctb-secondary-link','Review stop details');
      stop.href='#stop-'+model.stopId;
      actions.append(check,stop);host.append(actions);
      if(model.alternatives.length){
        host.append(el('p','ctb-stage-alt',model.alternatives.length+' other approved check'+(model.alternatives.length===1?'':'s')+' for this stop. Open “Other specialist checks” below to compare.'));
      }
    }else{
      const guide=guideForInterest(model.stopId,model.theme);
      const otherInterest=!!officialStopGuide(model.stopId)&&!guide;
      if(guide){
        host.append(el('p','ctb-stage-prefix','MAKE THE MOST OF THIS STOP'));
        host.append(el('p','ctb-stage-question',guide.question));
        host.append(el('p','ctb-stage-explainer',guide.context));
        host.append(el('p','ctb-stage-unknown',guide.caution));
      }else{
        host.append(el('p','ctb-stage-question','There is no connected guide for this interest at this stop.'));
        host.append(el('p','ctb-stage-unknown','The full stop guide below is still available; no missing specialist link implies a closure.'));
      }
      const options=el('div','ctb-stage-actions');
      if(guide){
        const primary=link(guide.sourceLabel,guide.url,'ctb-link ctb-stage-primary');
        primary.addEventListener('click',()=>track('official-stop-source-open',{stop:model.stopId}));
        options.append(primary);
        for(const item of guide.extraSources||[]){
          const extra=link(item.label,item.url,'ctb-secondary-link');
          extra.addEventListener('click',()=>track('official-stop-source-open',{stop:model.stopId}));
          options.append(extra);
        }
      }
      if(model.otherThemesAvailable||otherInterest){
        const reset=el('button','ctb-stage-reset',otherInterest?'See other outings at this stop':'See other interests at this stop');
        reset.type='button';
        reset.addEventListener('click',()=>{state.theme='all';state.showAll=false;remember();render();track('interest-recovered',{stop:model.stopId});});
        options.append(reset);
      }
      const stop=el('a','ctb-secondary-link','Use the original stop guide');
      stop.href='#stop-'+model.stopId;options.append(stop);host.append(options);
      if(guide){
        const locations=officialArrivals(model.stopId);
        if(locations.length){
          const arrivalSection=el('section','ctb-arrivals');
          arrivalSection.setAttribute('aria-label','How to reach the starting point');
          arrivalSection.append(
            el('p','ctb-arrivals-label','WHERE TO START'),
            el('p','ctb-arrivals-intro','Choose a starting point. The map link and source follow your choice. A map search may show a street or landmark, not a guaranteed parking space.')
          );
          // Only one arrival is actionable at a time; the selector changes both
          // the map destination and its controlling source, without moving keyboard focus.
          const selected=el('div','ctb-arrival ctb-arrival-selected');
          const choices=[];
          if(locations.length>1){
            const switcher=el('div','ctb-arrival-choices');
            switcher.setAttribute('role','group');
            switcher.setAttribute('aria-label','Choose a starting point for '+name);
            locations.forEach((arrival,index)=>{
              const choice=el('button','ctb-arrival-choice',arrival.choiceLabel||arrival.label);
              choice.type='button';
              choice.addEventListener('click',()=>{
                state.arrivalChoices[model.stopId]=index;
                state.focusStop=model.stopId;
                remember();
                showArrival(index);
                track('arrival-choice',{stop:model.stopId,index});
              });
              choices.push(choice);switcher.append(choice);
            });
            arrivalSection.append(switcher);
          }
          const showArrival=index=>{
            const chosen=chooseArrival(model.stopId,index);
            if(!chosen)return;
            for(const [i,control] of choices.entries())
              control.setAttribute('aria-pressed',String(i===chosen.index));
            selected.replaceChildren(
              el('h4','ctb-arrival-title',chosen.arrival.label),
              el('p','ctb-arrival-note',chosen.arrival.note)
            );
            const actions=el('div','ctb-arrival-actions');
            const map=link(chosen.arrival.kind==='address'?'Directions to published address':'Find starting area on Google Maps',
              chosen.mapUrl,'ctb-link ctb-arrival-map');
            map.addEventListener('click',()=>track('arrival-map-open',{stop:model.stopId,kind:chosen.arrival.kind,index:chosen.index}));
            const source=link('Check starting point source',chosen.arrival.sourceUrl,'ctb-secondary-link ctb-arrival-source');
            source.addEventListener('click',()=>track('arrival-source-open',{stop:model.stopId,index:chosen.index}));
            actions.append(map,source);selected.append(actions);
          };
          selected.setAttribute('aria-live','polite');
          selected.setAttribute('aria-atomic','true');
          arrivalSection.append(selected);
          showArrival(state.arrivalChoices[model.stopId]||0);
          host.append(arrivalSection);
        }
      }
    }
    renderPlaceStory(model,host);
    if(model.total>1){
      const nav=el('div','ctb-stage-navigation');
      const prev=el('button','ctb-nav-button','Previous planned stop');
      prev.type='button';prev.disabled=!model.prevStopId;
      const next=el('button','ctb-nav-button','Next planned stop');
      next.type='button';next.disabled=!model.nextStopId;
      const move=id=>{state.focusStop=id;state.showAll=false;remember();render();track('step-stop',{stop:id});};
      prev.addEventListener('click',()=>{if(model.prevStopId)move(model.prevStopId);});
      next.addEventListener('click',()=>{if(model.nextStopId)move(model.nextStopId);});
      nav.append(prev,next);host.append(nav);
    }else if(!model.inSavedTrip&&state.selectedIds.length){
      host.append(el('p','ctb-stage-path','This is outside your selected itinerary. Clear Route focus above to return to the first selected stop.'));
    }
  }
  function render(){
    if(!state.catalog)return;
    state.selectedIds=selectedIds();
    controls();
    const routeUrl=new URL(root.location.href);
    const decision=planNextDecision(state.catalog,{selectedIds:state.selectedIds,focusStop:state.focusStop,
      theme:state.theme,date:state.date,region:state.region,
      itinerary:routeUrl.searchParams.get('itinerary'),direction:routeUrl.searchParams.get('direction')});
    renderDecision(decision);
    const ranked=rankConnections(state.catalog,{selectedIds:state.selectedIds,focusStop:state.focusStop,
      theme:state.theme,date:state.date,region:state.region});
    const box=$('ctb-results');if(!box)return;
    box.replaceChildren();
    for(const item of (state.showAll?ranked.items:ranked.items.slice(0,LIMIT))){
      const article=el('article','ctb-entry');
      const header=el('div','ctb-entry-head'),id=item.firstStop;
      const stopName=$('stop-'+id)?.querySelector('.stop-name')?.textContent.trim()||'Stop '+id;
      const anchor=el('a','ctb-stop-link','Stop '+id+' · '+stopName);
      anchor.href='#stop-'+id;
      header.append(anchor,el('span','ctb-theme-name',item.theme));
      article.append(header,el('h3','ctb-entry-title',item.decision),el('p','ctb-entry-caveat',item.caveat));
      if(ranked.date&&!item.inSeason)article.append(el('p','ctb-season-caution','Outside typical listed season. Verify dates and access with the specialist.'));
      const actions=el('div','ctb-entry-actions');
      const handoff=link('Open '+item.name,item.url,'ctb-link');
      handoff.addEventListener('click',()=>track('handoff',{destination:item.toolId,stop:id,theme:item.theme}));
      actions.append(handoff);article.append(actions);box.append(article);
    }
    const count=ranked.total;
    if($('ctb-status'))$('ctb-status').textContent=count
      ?count+' approved connection'+(count===1?'':'s')+' · '+(ranked.scope.length?'matched to your route':'all-route discovery')
      :'No approved specialist matches this stop and interest. The base itinerary and independent guide links still work.';
    if($('ctb-more')){
      $('ctb-more').hidden=count<=LIMIT;
      $('ctb-more').textContent=state.showAll?'Show fewer':'Show all '+count+' connections';
    }
    renderRail(decision.orderedStops.length?decision.orderedStops:state.selectedIds,decision.stopId);
    renderRoad({scope:decision.stopId?[decision.stopId]:state.selectedIds,region:state.region});
  }
  function populate(){
    const input=$('ctb-stop');if(!input)return;
    IDS.forEach(id=>{
      const name=$('stop-'+id)?.querySelector('.stop-name')?.textContent.trim();
      if(!name)return;
      const option=el('option','',id+' · '+name);
      option.value=id;input.append(option);
    });
  }
  function attach(){
    populate();
    function change(field,value){
      state[field]=value;state.showAll=false;remember();render();
      track('selection',{dimension:field,scope:state.focusStop?'stop':state.selectedIds.length?'trip':'all'});
    }
    $('ctb-stop')?.addEventListener('change',e=>change('focusStop',STOPS.has(e.target.value)?e.target.value:''));
    $('ctb-date')?.addEventListener('change',e=>change('date',safeDate(e.target.value)));
    $('ctb-theme')?.addEventListener('change',e=>change('theme',safeTheme(e.target.value)));
    $('ctb-more')?.addEventListener('click',()=>{state.showAll=!state.showAll;render();});
    $('ctb-copy')?.addEventListener('click',async()=>{
      const url=buildReturnHref(root.location.href,state),msg=$('ctb-copy-status');
      try{
        if(!root.navigator.clipboard?.writeText)throw Error('clipboard not available');
        await root.navigator.clipboard.writeText(url);
        if(msg)msg.textContent='Circle Tour return link copied.';
      }catch{
        root.prompt?.('Copy your return link:',url);
        if(msg)msg.textContent='Copy the return link shown above.';
      }
      track('return-link',{hasPlan:state.selectedIds.length>0});
    });
    root.addEventListener('circle-tour:trip-change',event=>{
      state.selectedIds=(event.detail?.ids||[]).map(String);
      // An explicitly inspected stop must not be silently erased when the itinerary changes.
      // An out-of-plan stop is disclosed by the decision card and can be cleared by the visitor.
      remember();render();
    });
    root.addEventListener('circle-tour:stop-open',event=>{
      const id=String(event.detail?.id);
      if(!STOPS.has(id))return;
      state.focusStop=id;remember();render();
    });
    root.addEventListener('circle-tour:filter-change',event=>{
      state.region=event.detail?.region||'all';
      if(!state.focusStop&&!state.selectedIds.length)render();
    });
  }
  async function init(){
    attach();state.selectedIds=selectedIds();controls();
    try{
      const response=await root.fetch(CATALOG,{credentials:'same-origin'});
      if(!response.ok)throw Error('catalog request unavailable');
      const data=await response.json();
      if(data.schemaVersion!==1||data.owner!=='circle-tour'||data.connectionPolicy!=='approved-only'
        ||!Array.isArray(data.connections))throw Error('invalid catalog');
      state.catalog=data;
      $('ctb-fallback')?.setAttribute('hidden','');
      render();track('ready',{approved:data.connections.length});
    }catch{
      if($('ctb-status'))$('ctb-status').textContent='The independent tool connections are temporarily unavailable. The original Circle Tour map, stops and itineraries remain available.';
      track('unavailable');
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})(typeof window==='undefined'?null:window);
