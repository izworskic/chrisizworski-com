/* Circle Tour independent tool bridge: read-only registry links, no specialist mutation. */
(function(root){
  'use strict';
  const CATALOG='/assets/circle-tour-tool-catalog.json';
  const IDS=['1','2','3','4','5','6','7','8','9','10','11','12','31','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30'];
  const STOPS=new Set(IDS);
  const THEMES=new Set(['all','parks','falls','water','ships','history','logistics','seasonal']);
  const ROAD_HOSTS=new Set(['511wi.gov','mdotjboss.state.mi.us','511on.ca','511mn.org']);
  const LIMIT=6;
  // Exact-place primary-source handoffs for stops without a released independent tool.
  // These are editorial references, NEVER specialist connections or live access reports.
  const OFFICIAL_STOPS=Object.freeze({
    '2': {question:'Would you rather stroll Wisconsin Point or spend time in the harbor?',
      context:'Wisconsin Point has a long public beach and a lighthouse view. The City of Superior publishes the access rules and protection requirements.',
      url:'https://superiorwi.gov/226/Wisconsin-Point',sourceLabel:'City of Superior Wisconsin Point guide',
      caution:'The city guide is not a current beach advisory. Follow posted restrictions and check local water-quality notices before swimming.'},
    '4': {question:'Make Ashland a lakeshore-and-murals break, or a longer Chequamegon Bay visit?',
      context:'Ashland has a historic Main Street, murals and a Lake Superior waterfront. Start with the local destination guide to choose what fits.',
      url:'https://www.visitashland.com/',sourceLabel:'Ashland visitor guide',
      caution:'A regional visitor guide does not verify today's opening hours, reservations or shoreline conditions.'},
    '17': {question:'Looking for an easy stop on Highway 17?',
      context:'White River’s Winnie the Pooh Park is a town-history stop near the tourist information centre, not a wilderness hike.',
      url:'https://www.whiteriver.ca/winnie-the-pooh-park',sourceLabel:'Township of White River park guide',
      caution:'Check current visitor-centre hours and site notices with the township; this is not a live status check.'},
    '19': {question:'A short Nipigon river walk, or the much longer clifftop trail?',
      context:'The Township of Nipigon describes short shoreline sections and a rugged one-way recreation trail toward Red Rock. Choose your effort before setting off.',
      url:'https://www.nipigon.net/play-explore/things-to-do/trails-walks/item/114-nipigon-river-recreation-trail',sourceLabel:'Township of Nipigon trail guide',
      caution:'This is an official trail description, not confirmation of trail condition, a shuttle, or a safe return route.'},
    '21': {question:'An accessible High Falls outing, or the much longer Middle Falls hike?',
      context:'Minnesota DNR describes a one-mile round-trip paved/boardwalk route to High Falls, distinct from the demanding 4.5-mile Middle Falls hike.',
      url:'https://www.dnr.state.mn.us/state-parks/grand-portage/things-to-do.html',sourceLabel:'Minnesota DNR Grand Portage guide',
      caution:'Check the DNR’s latest visitor notices. A published route description is not a current trail-clearance report.'},
    '24': {question:'See Cascade River’s falls from the river overlooks, or give the shore and forest more time?',
      context:'The Cascade River drops through a rocky gorge toward Lake Superior; Minnesota DNR also describes shoreline and longer hiking choices.',
      url:'https://www.dnr.state.mn.us/state-parks/virtual-tours/cascade-river/dialup.html',sourceLabel:'Minnesota DNR Cascade River overview',
      caution:'This is a descriptive DNR virtual tour, not a current park alert. Check conditions and stay back from slippery cliff edges.'},
    '25': {question:'A short view of the Temperance River gorge, or a longer Carlton Peak hike?',
      context:'Minnesota DNR’s mapped guide distinguishes the short gorge trail from the steep, longer Carlton Peak route. Lutsen activities require their own operating check.',
      url:'https://files.dnr.state.mn.us/maps/state_parks/spk00268.pdf',sourceLabel:'Minnesota DNR Temperance River map',
      caution:'The published map is not a current trail or ski-lift status. DNR warns against swimming in the Temperance River.'},
    '26': {question:'A short Shovel Point shoreline walk, or a longer trip to High Falls?',
      context:'Minnesota DNR distinguishes the lakeshore viewpoints from the Baptism River waterfall routes at Tettegouche.',
      url:'https://www.dnr.state.mn.us/state-parks/park.html?id=spk00269',sourceLabel:'Minnesota DNR Tettegouche park page',
      caution:'Check current park alerts and trail notes; past bridge work or a published route does not prove every path is open today.'}
  });
  function officialStopGuide(stopId){
    return Object.hasOwn(OFFICIAL_STOPS,String(stopId))?OFFICIAL_STOPS[String(stopId)]:null;
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

  const helpers={rankConnections,roadChecks,buildReturnHref,planNextDecision,safeDate,safeTheme,safeToolUrl,safeRoadUrl,officialStopGuide,officialStops:OFFICIAL_STOPS};
  if(typeof module!=='undefined'&&module.exports)module.exports=helpers;
  if(!root?.document)return;
  const document=root.document,host=document.querySelector('[data-circle-tour-bridge]');
  if(!host)return;
  const $=id=>document.getElementById(id);
  const state={catalog:null,showAll:false,focusStop:'',date:'',theme:'all',region:'all',selectedIds:[]};
  const params=new URLSearchParams(root.location.search);
  state.focusStop=STOPS.has(params.get('ctStop'))?params.get('ctStop'):'';
  state.date=safeDate(params.get('ctDate'));
  state.theme=safeTheme(params.get('ctTheme'));
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
      const guide=officialStopGuide(model.stopId);
      if(guide){
        host.append(el('p','ctb-stage-prefix','A GOOD PLACE TO START'));
        host.append(el('p','ctb-stage-question',guide.question));
        host.append(el('p','ctb-stage-explainer',guide.context));
        host.append(el('p','ctb-stage-unknown',guide.caution));
        host.append(el('p','ctb-stage-path','This is an official or local visitor reference, not one of our independent tools or a live access check.'));
      }else{
        host.append(el('p','ctb-stage-question','We do not have a connected guide for this interest at this stop.'));
        host.append(el('p','ctb-stage-unknown','That does not mean the place is closed or uninteresting. The original stop guide remains available.'));
      }
      const options=el('div','ctb-stage-actions');
      if(guide){
        const officialLink=link('Explore '+guide.sourceLabel,guide.url,'ctb-link ctb-stage-primary');
        officialLink.addEventListener('click',()=>track('official-stop-source-open',{stop:model.stopId}));
        options.append(officialLink);
      }
      if(model.otherThemesAvailable){
        const reset=el('button','ctb-stage-reset','See other interests at this stop');
        reset.type='button';
        reset.addEventListener('click',()=>{state.theme='all';state.showAll=false;remember();render();track('interest-recovered',{stop:model.stopId});});
        options.append(reset);
      }
      const stop=el('a','ctb-secondary-link','Read the full stop guide');
      stop.href='#stop-'+model.stopId;options.append(stop);host.append(options);
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
