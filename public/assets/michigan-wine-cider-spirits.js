(()=>{
  const cards=[...document.querySelectorAll('.wf-story')];
  const chips=[...document.querySelectorAll('.wf-chip')];
  const region=document.getElementById('wf-region');
  const feature=document.getElementById('wf-feature');
  const access=document.getElementById('wcs-access');
  const seasonSelect=document.getElementById('wcs-season');
  const count=document.getElementById('wf-count');
  const empty=document.getElementById('wf-empty');
  const mapMessage=document.getElementById('wf-map-message');
  let activeTag='all',activeSeasonTab='winter',markers=new Map(),leafletMap=null;

  function revealPhotoFallback(img){
    const figure=img.closest('.wf-photo');
    if(!figure||figure.classList.contains('wf-photo-fallback'))return;
    const retry=img.dataset.retrySrc;
    if(retry&&img.dataset.retried!=='1'){
      img.dataset.retried='1';
      img.src=retry;
      return;
    }
    const card=img.closest('.wf-story');
    const title=card?.querySelector('h3')?.textContent?.trim()||img.alt||'Northern Michigan tasting room';
    figure.classList.add('wf-photo-fallback');
    const note=document.createElement('div');
    note.className='wf-photo-fallback-card';
    note.innerHTML=`<span>Northern Michigan field reference</span><strong>${title}</strong><small>Image unavailable in this browser; official tasting room and planner links remain below.</small>`;
    img.replaceWith(note);
  }
  document.querySelectorAll('.wf-photo img').forEach(img=>{
    img.addEventListener('error',()=>revealPhotoFallback(img));
    if(img.complete&&img.naturalWidth===0)revealPhotoFallback(img);
  });

  function matches(card){
    const tags=(card.dataset.tag||'').split(/\s+/);
    const features=(card.dataset.feature||'').split(/\s+/);
    const seasons=(card.dataset.seasons||'').split(/\s+/);
    const t=activeTag==='all'||tags.includes(activeTag);
    const r=!region||region.value==='all'||card.dataset.region===region.value;
    const f=!feature||feature.value==='all'||features.includes(feature.value);
    const a=!access||access.value==='all'||card.dataset.access===access.value;
    const s=!seasonSelect||seasonSelect.value==='all'||seasons.includes(seasonSelect.value);
    return t&&r&&f&&a&&s;
  }

  function apply(){
    let shown=0;
    const bounds=[];
    cards.forEach(card=>{
      const ok=matches(card);
      card.hidden=!ok;
      const marker=markers.get(card.id);
      if(ok){
        shown++;
        if(marker&&leafletMap){
          marker.addTo(leafletMap);
          bounds.push([Number(card.dataset.lat),Number(card.dataset.lng)]);
        }
      }else if(marker&&leafletMap){
        leafletMap.removeLayer(marker);
      }
    });
    if(count){
      count.textContent=`${shown} of ${cards.length} Northern Michigan anchor tasting rooms shown · verify seasonal hours, igloo bookings and group rules before driving.`;
    }
    if(empty)empty.hidden=shown!==0;
    if(leafletMap&&bounds.length>1)leafletMap.fitBounds(bounds,{padding:[28,28],maxZoom:10});
    else if(leafletMap&&bounds.length===1)leafletMap.setView(bounds[0],11);
  }

  chips.forEach(chip=>chip.addEventListener('click',()=>{
    activeTag=chip.dataset.tag||'all';
    chips.forEach(other=>other.setAttribute('aria-pressed',String(other===chip)));
    apply();
  }));
  [region,feature,access,seasonSelect].forEach(control=>control?.addEventListener('change',apply));
  document.getElementById('wf-reset')?.addEventListener('click',()=>{
    activeTag='all';
    chips.forEach(chip=>chip.setAttribute('aria-pressed',String(chip.dataset.tag==='all')));
    if(region)region.value='all';
    if(feature)feature.value='all';
    if(access)access.value='all';
    if(seasonSelect)seasonSelect.value='all';
    apply();
  });
  document.getElementById('wf-show-all')?.addEventListener('click',()=>document.getElementById('wf-reset')?.click());

  const seasonProfiles={
    winter:{
      badge:'Auto-calibrated to Michigan calendar · Winter Window (Nov 15 - Mar 31)',
      title:'Winter Igloos, Snowshoe Vineyards & Apres-Ski Distilleries',
      copy:'Automatic seasonal focus for late fall through March: bookable heated vineyard igloos (Aurora Cellars, Boyne Valley Vineyards, Rudbeckia), groomed snowshoe-and-sip loops (Brys Estate, Black Star Farms, 45 North, Pond Hill Farm), heated dog-friendly shelters (Bowers Harbor), and downtown craft distilleries open after vineyards close at 5:00 PM.',
      picks:'<strong>Top stops for Winter:</strong> <a href="#stop-2">Brys Estate</a> · <a href="#stop-5">Black Star Farms</a> · <a href="#stop-7">Aurora &amp; 45 North</a> · <a href="#stop-13">Boyne Valley Vineyards</a> · <a href="#stop-17">Pond Hill Farm</a> · <a href="#stop-12">Mammoth &amp; GT Distillery</a>',
      btnLabel:'Filter atlas to 14 Winter-ready stops ↓'
    },
    spring:{
      badge:'Auto-calibrated to Michigan calendar · Spring Blossom & Cellar Window (Apr 1 - May 31)',
      title:'Cherry Blossom Ridges, New Vintage Releases & Quiet Tasting Rooms',
      copy:'In April and May, Old Mission and Leelanau orchards burst into white cherry and apple blossom while tasting rooms pour newly bottled Riesling, Pinot Blanc, and sparkling rosés without summer crowds. Pair a morning drive up Center Road or M-22 with an afternoon orchard cidery and a warm dinner in Suttons Bay or Petoskey.',
      picks:'<strong>Top stops for Spring:</strong> <a href="#stop-1">Chateau Chantal</a> · <a href="#stop-4">2 Lads</a> · <a href="#stop-6">MAWBY Sparkling</a> · <a href="#stop-9">Two K Farms Orchard</a> · <a href="#stop-11">Left Foot Charley</a> · <a href="#stop-15">Petoskey Farms</a>',
      btnLabel:'Filter atlas to 18 Spring stops ↓'
    },
    summer:{
      badge:'Auto-calibrated to Michigan calendar · Summer Patio & Bay Breeze Window (Jun 1 - Aug 31)',
      title:'Grand Traverse & Little Traverse Bay Patios, Sparkling Lawns & Harbor Walks',
      copy:'From June through August, long Northern Michigan daylight (sunset past 9:15 PM) opens hilltop bay decks, lavender gardens, and harbor tasting rooms in Fishtown Leland, Suttons Bay, Walloon Lake, and Charlevoix. Book seated patio flights early, pace water and lunch stops, and transition to downtown lounges after 5:00 PM.',
      picks:'<strong>Top stops for Summer:</strong> <a href="#stop-2">Brys Secret Garden</a> · <a href="#stop-6">MAWBY</a> · <a href="#stop-10">VerTerra Leland</a> · <a href="#stop-14">Walloon Lake &amp; Rudbeckia</a> · <a href="#stop-16">Gypsy Distillery</a> · <a href="#stop-18">1918 Cellars Castle Farms</a>',
      btnLabel:'Filter atlas to 18 Summer patio stops ↓'
    },
    fall:{
      badge:'Auto-calibrated to Michigan calendar · Fall Harvest Crush & Color Window (Sep 1 - Nov 14)',
      title:'Autumn Vineyard Crush, Heirloom Cider Pressing & Tunnel of Trees Foliage',
      copy:'September through mid-November brings harvest crush aroma, peak hardwood color along M-22, Center Road, and M-119 (Tunnel of Trees), and fresh-pressed heirloom hard ciders. Weekend tasting rooms book out weeks ahead during October peak foliage, so anchor your route with 1 reservation stop plus 2 walk-in cideries or distilleries.',
      picks:'<strong>Top stops for Fall Harvest:</strong> <a href="#stop-1">Chateau Chantal</a> · <a href="#stop-8">Tandem Ciders</a> · <a href="#stop-9">Two K Farms</a> · <a href="#stop-14">Walloon Lake &amp; Rudbeckia</a> · <a href="#stop-17">Pond Hill Farm (M-119)</a> · <a href="#stop-11">Left Foot Charley</a>',
      btnLabel:'Filter atlas to 18 Fall harvest stops ↓'
    }
  };

  function detectCurrentSeason(){
    try{
      const edition=document.body?.dataset?.seasonEdition;
      if(edition&&seasonProfiles[edition])return edition;
      const params=new URLSearchParams(window.location.search);
      const override=params.get('season');
      if(override&&seasonProfiles[override])return override;
      const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',month:'numeric',day:'numeric'}).formatToParts(new Date());
      const month=Number(parts.find(p=>p.type==='month')?.value||1);
      const day=Number(parts.find(p=>p.type==='day')?.value||1);
      if(month===12||month<=3||(month===11&&day>=15))return 'winter';
      if(month===4||month===5)return 'spring';
      if(month>=6&&month<=8)return 'summer';
      return 'fall';
    }catch(_){
      return 'winter';
    }
  }

  function setSeasonView(seasonKey){
    const active=seasonKey in seasonProfiles?seasonKey:'winter';
    const profile=seasonProfiles[active]||seasonProfiles.winter;
    const badge=document.getElementById('wcs-season-badge');
    if(badge)badge.textContent=`All 4 seasonal guides available below · ${profile.badge.split('·')[1]?.trim()||'Michigan calendar'}`;
    document.querySelectorAll('[data-season-card]').forEach(card=>{
      const isCurrent=card.dataset.seasonCard===active;
      card.setAttribute('data-current-season',String(isCurrent));
      const pill=card.querySelector('[data-season-pill]');
      if(pill)pill.hidden=!isCurrent;
    });
  }
  setSeasonView(detectCurrentSeason());

  const modeStage={
    winter:{
      label:'MODE 01 · WINTER IGLOOS, FIREPITS & SNOWSHOE VINEYARDS',
      title:'Sip inside a heated dome or snowshoe between vineyard rows',
      copy:'From November through March, Northern Michigan wine country shifts to heated igloos, vineyard snowshoe loops, and indoor hearth lounges. On Old Mission, Brys Estate grooms 1-mile and intermediate winter snowshoe trails with spiked hot cider, and Bowers Harbor heats its covered dog-friendly pavilion. In Leelanau, Black Star Farms rents snowshoes on site for 3+ miles of trails alongside its Hearth & Vine Cafe, while Aurora Cellars, 45 North, and BluStone link along the Vine-to-Wine snowshoe corridor with bookable heated domes. In Petoskey and Harbor Springs, Boyne Valley Vineyards pairs heated igloos with complimentary snowshoe trails, Rudbeckia/Burnt Marshmallow runs hillside igloos and firepits, and Pond Hill Farm hosts a heated greenhouse tent above winter sledding and snowshoe hills.',
      alert:'Heated igloos and seated winter towers require advance reservations (often $25-$100 dome rental or food/beverage minimums) and cap groups at 6-8 guests. Always book domes before driving.'
    },
    wine:{
      label:'MODE 02 · COOL-CLIMATE VINIFERA VS. COLD-HARDY HYBRIDS',
      title:'Match the peninsula or bay to what is actually in your glass',
      copy:'Northern Michigan spans two distinct viticultural climates. Along the 45th Parallel around Traverse City, deep Grand Traverse Bay waters protect classic European vinifera: Old Mission Peninsula (11 wineries along a narrow 19-mile ridge) excels at structured Riesling, Cabernet Franc, Pinot Noir, and ice wine (Chateau Chantal, Brys, 2 Lads, Mari), while Leelanau Peninsula (30 wineries across harbor villages) adds method-champenoise sparkling wine (MAWBY) and hillside estate whites (Shady Lane, Rove, Bel Lago, VerTerra). Sixty miles north in the Tip of the Mitt AVA (Petoskey, Walloon Lake, Boyne, Charlevoix), colder winters favor cold-hardy Marquette, Frontenac Gris, La Crescent, and fruit/maple wines across 14 trail wineries.',
      alert:'Never try to combine Old Mission and Leelanau - or Charlevoix and Harbor Springs - in a single afternoon. Crossing Grand Traverse Bay or the Chain of Lakes mid-day burns 60-75 minutes of tasting hours.'
    },
    cider:{
      label:'MODE 03 · HERITAGE HARD CIDER ORCHARDS & URBAN TAPROOMS',
      title:'Dry Northern Spy, barrel-aged scrumpy, and orchard tasting rooms',
      copy:'Northwest Michigan is one of North America\'s premier heirloom apple regions. In Traverse City, Left Foot Charley pours dry Northern Spy and Cinnamon Girl hard ciders alongside contract-grown wines inside the 1885 brick cottages of The Village at Grand Traverse Commons. Up M-22 on Leelanau, Tandem Ciders crafts English-style dry and pub ciders in a rustic Suttons Bay tasting room, while Two K Farms Cidery & Winery overlooks West Grand Traverse Bay with estate-grown ciders and fruit wines. Farther north in the Petoskey region, Pond Hill Farm, Royal Farms in Ellsworth, and Maple Moon Sugarbush (the nation\'s first maple winery and cidery) anchor mixed wine-and-cider loops.',
      alert:'Hard cideries are among the most walk-in friendly stops for mixed groups and non-wine drinkers, and several (Pond Hill Farm, Royal Farms, Black Star Farms) offer real lunch or bakery food on site.'
    },
    spirits:{
      label:'MODE 04 · CRAFT DISTILLERIES, BOURBON/RYE & AFTER-5PM LOUNGES',
      title:'Solve the 5:00 PM winery closing bell with an evening spirits handoff',
      copy:'The biggest timing mistake in Northern Michigan wine country is scheduling four wineries after 1:00 PM - nearly every vineyard tasting room closes between 5:00 PM and 6:00 PM (and earlier in winter). Instead, plan 2-3 daytime vineyard or cidery stops and finish at a craft distillery lounge that stays open into the evening. In Traverse City and Bay Harbor, Mammoth Distilling pours Northern Michigan rye, bourbon, and cherry bounce cocktails, while Grand Traverse Distillery and Black Star Farms\' Spirit of the Vineyard brandies anchor the region. Around Petoskey and Boyne City, Gypsy Distillery operates a 42,000-sq-ft equestrian estate lounge above Little Traverse Bay, High Five Spirits pours Mackinac Island Rum and Petoskey Stone Gin in the walkable Gaslight District, and Muskrat Distilling anchors downtown Boyne City.',
      alert:'Designate a sober driver or book a door-to-door shuttle before tasting. Rural rideshares (Uber/Lyft) are unreliable or unavailable in Northport, Old Mission tip, Walloon Lake, and Ellsworth.'
    }
  };

  document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{
    const item=modeStage[btn.dataset.mode];
    if(!item)return;
    document.querySelectorAll('[data-mode]').forEach(other=>other.setAttribute('aria-pressed',String(other===btn)));
    document.getElementById('wcs-mode-label').textContent=item.label;
    document.getElementById('wcs-mode-title').textContent=item.title;
    document.getElementById('wcs-mode-copy').textContent=item.copy;
    document.getElementById('wcs-mode-alert').textContent=item.alert;
  }));

  async function initMap(){
    const el=document.getElementById('wf-map');
    if(!el||!window.L)return;
    try{
      leafletMap=window.L.map(el,{scrollWheelZoom:false}).setView([45.05,-85.35],8);
      let tileUrl='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      try{
        const res=await fetch('/api/carto-basemap-config',{headers:{accept:'application/json'}});
        if(res.ok){
          const cfg=await res.json();
          if(cfg?.key)tileUrl+=`?key=${encodeURIComponent(cfg.key.trim())}`;
        }
      }catch(_){}
      const layer=window.L.tileLayer(tileUrl,{
        maxZoom:18,
        attribution:'&copy; OpenStreetMap contributors &copy; CARTO'
      });
      layer.on('tileerror',()=>{
        window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
          maxZoom:18,
          attribution:'&copy; OpenStreetMap contributors'
        }).addTo(leafletMap);
      });
      layer.addTo(leafletMap);

      const groups=new Map();
      cards.forEach((card,idx)=>{
        const lat=Number(card.dataset.lat),lng=Number(card.dataset.lng);
        if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
        const key=`${lat.toFixed(4)},${lng.toFixed(4)}`;
        if(!groups.has(key))groups.set(key,{lat,lng,items:[]});
        groups.get(key).items.push({card,idx});
      });

      groups.forEach(group=>{
        const first=group.items[0];
        const multi=group.items.length>1;
        const label=multi?String(group.items.length):String(first.idx+1);
        const icon=window.L.divIcon({
          className:`wf-pin${multi?' wf-pin-multi':''}`,
          html:`<span>${label}</span>`,
          iconSize:multi?[34,34]:[28,28],
          iconAnchor:multi?[17,17]:[14,14]
        });
        const itemsHtml=group.items.map(({card,idx})=>{
          const title=card.querySelector('h3')?.textContent||`Tasting room ${idx+1}`;
          const kicker=card.querySelector('.wf-kicker')?.textContent||'';
          const src=card.dataset.evidence||'#';
          const gmap=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${group.lat},${group.lng}`)}`;
          return `<li><strong>${idx+1}. ${title}</strong><br><small>${kicker}</small><br><a href="#${card.id}">Field note ↓</a> · <a href="${src}" target="_blank" rel="noopener noreferrer">Official site ↗</a> · <a class="wcs-popup-map-link" href="${gmap}" target="_blank" rel="noopener noreferrer">Google Maps area ↗</a></li>`;
        }).join('');
        const popup=multi
          ?`<div class="wf-popup-group"><p><strong>${group.items.length} stops in this cluster</strong></p><ol>${itemsHtml}</ol></div>`
          :`<div class="wf-popup-group"><ol>${itemsHtml}</ol></div>`;
        const marker=window.L.marker([group.lat,group.lng],{icon}).bindPopup(popup);
        marker.addTo(leafletMap);
        group.items.forEach(({card})=>markers.set(card.id,marker));
      });

      if(mapMessage)mapMessage.textContent='Select any numbered pin to inspect the tasting room, official reservation/hours source, or planner handoff.';
      setTimeout(()=>leafletMap.invalidateSize(),120);
      if(window.ResizeObserver)new ResizeObserver(()=>leafletMap.invalidateSize()).observe(el);
      apply();
    }catch(_){
      if(mapMessage)mapMessage.textContent='Interactive map unavailable right now; all 18 anchor tasting rooms and 102-venue corridor links are listed below.';
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{apply();initMap();});
  else{apply();initMap();}
})();
