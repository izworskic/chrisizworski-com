(()=>{
  'use strict';
  window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};
  if(location.pathname!=='/great-lakes-shipwrecks/')return;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const rows=$$('#wrBody tr');
  if(!rows.length)return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const emit=(name,props={})=>{try{window.va?.('event',{name,...props});}catch{}};
  const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const era=y=>{y=Number(y)||0;return y<1800?'before-1800':y<1900?'1800s':y<1950?'1900-1949':'1950-plus';};
  const access=t=>/maritime grave|restricted|no access|protected heritage|licensed access/i.test(t)?'restricted':/tech dive/i.test(t)?'technical':/dive site/i.test(t)?'dive':'other';
  const cause=t=>{t=norm(t);if(t.includes('storm')||t.includes('squall'))return 'storm';if(t.includes('collision'))return 'collision';if(t.includes('grounding'))return 'grounding';if(t.includes('fire')||t.includes('explosion'))return 'fire';return 'other';};

  const anchors=[
    [/isle royale/i,47.98,-88.80,'Isle Royale'],[/whitefish point/i,46.77,-84.96,'Whitefish Point'],[/alger|munising/i,46.42,-86.65,'Alger County / Munising'],[/marquette/i,46.55,-87.40,'Marquette'],[/keweenaw/i,47.12,-88.57,'Keweenaw'],[/deer park/i,46.67,-85.68,'Deer Park'],[/grand marais/i,46.67,-85.98,'Grand Marais'],[/duluth/i,46.78,-92.10,'Duluth'],[/two harbors/i,47.02,-91.67,'Two Harbors'],[/gold rock|split rock|knife river|knife island/i,47.20,-91.38,'North Shore Minnesota'],[/thunder cape/i,48.34,-88.82,'Thunder Cape'],[/sand island/i,46.96,-90.89,'Apostle Islands'],[/pentwater/i,43.78,-86.43,'Pentwater'],[/south manitou/i,45.04,-86.09,'South Manitou Island'],[/racine|winnetka|sheboygan/i,43.00,-87.80,'Southern Lake Michigan'],[/green bay/i,45.15,-85.52,'Northern Lake Michigan'],[/harbor beach/i,43.84,-82.65,'Harbor Beach'],[/port huron/i,42.97,-82.42,'Port Huron'],[/lexington/i,43.27,-82.53,'Lexington'],[/rogers city/i,45.42,-83.82,'Rogers City'],[/goderich/i,43.74,-81.71,'Goderich'],[/alpena/i,45.06,-83.43,'Alpena'],[/vermilion/i,41.42,-82.36,'Vermilion'],[/port dover/i,42.79,-80.20,'Port Dover'],[/conneaut/i,41.96,-80.55,'Conneaut'],[/port stanley/i,42.67,-81.22,'Port Stanley'],[/presqu'ile/i,44.00,-77.72,'Presqu’ile'],[/hamilton/i,43.25,-79.87,'Hamilton']
  ];
  function anchorFor(place){
    const found=anchors.find(([re])=>re.test(place));
    return found?{lat:found[1],lng:found[2],label:found[3]}:null;
  }

  const records=rows.map((row,i)=>{
    const c=$$('td',row).map(x=>x.textContent.trim());
    const id='wreck-'+norm(`${c[0]}-${c[2]}`).replace(/ /g,'-')+'-'+i;
    const anchor=anchorFor(c[5]);
    row.id=id;
    if(anchor)row.dataset.mapAnchor=anchor.label;
    return {row,id,name:c[0],lake:c[1],year:Number(c[2])||0,type:c[3],causeText:c[4],place:c[5],depth:c[6],deaths:Number(c[7])||0,accessText:c[8],era:era(c[2]),access:access(c[8]),cause:cause(c[4]),anchor};
  });

  const style=document.createElement('style');
  style.textContent=`
    .wreck-explorer{margin:18px 0 24px;border:1px solid #d9d4ca;border-radius:8px;background:#fff;padding:17px}.wreck-explorer h2{margin:0 0 5px;border:0;padding:0;font-size:21px}.wreck-explorer .we-intro{font-size:13px;color:#555;margin:0 0 13px}
    .we-presets{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 12px}.we-chip{border:1px solid #cfc9be;background:#faf9f6;border-radius:999px;padding:7px 10px;font:700 11px/1 Arial,sans-serif;color:#444;cursor:pointer}.we-chip[aria-pressed="true"]{border-color:#2c5f2d;background:#e8f2e8;color:#214a22}
    .we-grid{display:grid;grid-template-columns:1.2fr repeat(4,minmax(0,.8fr));gap:8px}.we-field{display:grid;gap:4px}.we-field label{font:700 10px/1.3 Arial,sans-serif;text-transform:uppercase;letter-spacing:.45px;color:#777}.we-field input,.we-field select{min-height:40px;border:1px solid #cfc9be;border-radius:5px;padding:7px 9px;background:#fff;font:13px Georgia,serif}.we-status{font-size:12px;color:#666;margin:10px 0 0}.we-clear-map{margin-left:8px;border:1px solid #2c5f2d;background:#fff;color:#2c5f2d;border-radius:4px;padding:4px 7px;font:700 10px Arial,sans-serif;cursor:pointer}
    .we-map{height:390px;margin-top:13px;border:1px solid #ddd6cb;border-radius:5px;background:#efede8}.we-map-note{font-size:11px!important;color:#777!important;line-height:1.5!important;margin:7px 0 0!important}.we-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:12px}.we-stat{background:#faf9f6;border:1px solid #ebe6dc;border-radius:5px;padding:8px;text-align:center}.we-stat strong{font-size:17px;display:block}.we-stat span{font:10px Arial,sans-serif;color:#777;text-transform:uppercase;letter-spacing:.35px}
    #wrTable tr.we-focus{outline:3px solid #2c5f2d;outline-offset:-2px;background:#fbfdf9}#wrTable tr.we-map-set{background:#fbfdf9}.wreck-link,.wreck-map-link{font-size:11px;margin-left:5px;font-weight:normal;white-space:nowrap}.wreck-map-link{font-weight:bold}
    .we-insight{margin-top:10px;padding:13px 14px;border:1px solid #ddd6cb;border-left:4px solid #2c5f2d;border-radius:6px;background:#fff}.we-insight h3{margin:0 0 4px;font-size:17px;color:#214a22}.we-insight-meta{font-size:11px;color:#777}.we-insight p{font-size:12px!important;line-height:1.5!important;margin:7px 0!important}.we-insight-list{margin:8px 0 0;padding-left:18px}.we-insight-list li{margin:5px 0;font-size:12px;line-height:1.35}.we-insight-list a{font-weight:bold}.we-insight-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:9px}.we-insight-actions a,.we-insight-actions button{font:700 11px/1.3 Arial,sans-serif}.we-insight-actions button{border:1px solid #2c5f2d;background:#fff;color:#2c5f2d;border-radius:4px;padding:5px 7px;cursor:pointer}
    @media(max-width:850px){.we-grid{grid-template-columns:1fr 1fr 1fr}.we-field:first-child{grid-column:1/-1}}@media(max-width:600px){.we-grid{grid-template-columns:1fr 1fr}.we-map{height:310px}.we-summary{grid-template-columns:1fr 1fr}}
  `;
  document.head.append(style);

  const explorer=document.createElement('section');
  explorer.className='wreck-explorer';
  explorer.setAttribute('aria-labelledby','wreck-explorer-title');
  explorer.innerHTML=`
    <h2 id="wreck-explorer-title">Explore the Great Lakes shipwreck database</h2>
    <p class="we-intro">The map and table now control each other. Select a regional marker to reduce the table to the exact records behind that marker, or use “Show on map” from a wreck record to return to its regional story anchor.</p>
    <div class="we-presets" aria-label="Quick views">
      <button class="we-chip" data-preset="1913" aria-pressed="false">Great Storm of 1913</button><button class="we-chip" data-preset="superior" aria-pressed="false">Lake Superior</button><button class="we-chip" data-preset="huron" aria-pressed="false">Lake Huron</button><button class="we-chip" data-preset="dive" aria-pressed="false">Dive-listed wrecks</button><button class="we-chip" data-preset="fatal" aria-pressed="false">Highest loss of life</button>
    </div>
    <div class="we-grid"><div class="we-field"><label for="we-q">Vessel or place</label><input id="we-q" type="search" placeholder="Fitzgerald, Whitefish Point…"></div><div class="we-field"><label for="we-lake">Lake</label><select id="we-lake"><option value="">All lakes</option>${['Superior','Michigan','Huron','Erie','Ontario'].map(x=>`<option>${x}</option>`).join('')}</select></div><div class="we-field"><label for="we-era">Era</label><select id="we-era"><option value="">All eras</option><option value="before-1800">Before 1800</option><option value="1800s">1800s</option><option value="1900-1949">1900–1949</option><option value="1950-plus">1950+</option></select></div><div class="we-field"><label for="we-cause">Cause</label><select id="we-cause"><option value="">All causes</option><option value="storm">Storm / squall</option><option value="collision">Collision</option><option value="grounding">Grounding</option><option value="fire">Fire / explosion</option><option value="other">Other / unknown</option></select></div><div class="we-field"><label for="we-access">Access</label><select id="we-access"><option value="">All statuses</option><option value="dive">Dive site</option><option value="technical">Technical dive</option><option value="restricted">Restricted / protected</option><option value="other">Historical / other</option></select></div></div>
    <p class="we-status" id="we-status" aria-live="polite"></p><div class="we-summary" id="we-summary"></div><div class="we-map" id="we-map" role="img" aria-label="Regional map synchronized with the filtered Great Lakes shipwreck records"></div><aside class="we-insight" id="we-insight" aria-live="polite"><h3>Select a regional marker.</h3><div class="we-insight-meta">The table below will change to the exact documented wreck records represented by that marker.</div><p>Every mappable wreck record also has a “Show on map” control for the reverse trip.</p></aside><p class="we-map-note"><strong>Map precision:</strong> markers are named-place story anchors derived from the table. They are not navigation coordinates, dive coordinates, or a claim of an exact wreck position. Use cited preservation and agency sources for authoritative site information.</p>`;

  const filters=$('.filter-bar');
  if(filters)filters.before(explorer);else $('#wrTable')?.before(explorer);

  const q=$('#we-q'),lake=$('#we-lake'),eraEl=$('#we-era'),causeEl=$('#we-cause'),accessEl=$('#we-access'),status=$('#we-status'),summary=$('#we-summary'),insight=$('#we-insight'),mapNode=$('#we-map');
  let preset='',map=null,layer=null,anchorSelection='';
  const markerByAnchor=new Map(),groupByAnchor=new Map();
  const params=new URLSearchParams(location.search);
  [['wreck',q],['lake',lake],['era',eraEl],['cause',causeEl],['access',accessEl]].forEach(([k,e])=>{if(params.get(k))e.value=params.get(k).slice(0,60);});

  records.forEach(r=>{
    const strong=$('strong',r.row);
    if(!strong)return;
    if(/edmund fitzgerald/i.test(r.name)&&!$('.wreck-link',r.row)){
      const story=document.createElement('a');story.className='wreck-link';story.href='/edmund-fitzgerald/';story.textContent='story →';story.dataset.wreckDetail='fitzgerald';strong.after(story);
    }
    if(r.anchor&&!$('.wreck-map-link',r.row)){
      const mapLink=document.createElement('a');mapLink.className='wreck-map-link';mapLink.href='#we-map';mapLink.textContent='show on map →';mapLink.dataset.wreckMap=r.anchor.label;mapLink.dataset.wreckRecord=r.id;strong.after(mapLink);
    }
  });

  function baseMatches(r){
    const n=q.value.trim().toLowerCase();
    if(n&&!`${r.name} ${r.place} ${r.type}`.toLowerCase().includes(n))return false;
    if(lake.value&&r.lake!==lake.value)return false;if(eraEl.value&&r.era!==eraEl.value)return false;if(causeEl.value&&r.cause!==causeEl.value)return false;if(accessEl.value&&r.access!==accessEl.value)return false;
    if(preset==='1913'&&r.year!==1913)return false;if(preset==='superior'&&r.lake!=='Superior')return false;if(preset==='huron'&&r.lake!=='Huron')return false;if(preset==='dive'&&r.access!=='dive')return false;if(preset==='fatal'&&r.deaths<25)return false;
    return true;
  }

  function syncURL(){
    const u=new URL(location.href);['wreck','lake','era','cause','access'].forEach(k=>u.searchParams.delete(k));if(q.value.trim())u.searchParams.set('wreck',q.value.trim());if(lake.value)u.searchParams.set('lake',lake.value);if(eraEl.value)u.searchParams.set('era',eraEl.value);if(causeEl.value)u.searchParams.set('cause',causeEl.value);if(accessEl.value)u.searchParams.set('access',accessEl.value);history.replaceState(null,'',u.pathname+(u.search?'?'+u.searchParams.toString():'')+u.hash);
  }

  function updateSummary(list){
    const deaths=list.reduce((a,r)=>a+r.deaths,0),lakes=new Set(list.map(r=>r.lake)).size,dives=list.filter(r=>r.access==='dive'||r.access==='technical').length;
    summary.innerHTML=`<div class="we-stat"><strong>${list.length}</strong><span>records shown</span></div><div class="we-stat"><strong>${lakes}</strong><span>lakes</span></div><div class="we-stat"><strong>${deaths.toLocaleString()}</strong><span>deaths in records</span></div><div class="we-stat"><strong>${dives}</strong><span>dive-listed</span></div>`;
  }

  function loadLeaflet(cb){
    if(window.L){cb();return;}
    const existing=document.querySelector('script[data-we-leaflet]');
    if(existing){const timer=setInterval(()=>{if(window.L){clearInterval(timer);cb();}},100);setTimeout(()=>clearInterval(timer),8000);return;}
    const css=document.createElement('link');css.rel='stylesheet';css.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.append(css);const s=document.createElement('script');s.dataset.weLeaflet='1';s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';s.onload=cb;document.head.append(s);
  }

  function groupRecords(list){
    const groups=new Map();list.forEach(r=>{if(!r.anchor)return;const key=r.anchor.label;if(!groups.has(key))groups.set(key,{...r.anchor,rs:[]});groups.get(key).rs.push(r);});return groups;
  }

  function groupInsight(g){
    const sorted=[...g.rs].sort((a,b)=>b.deaths-a.deaths||a.year-b.year||a.name.localeCompare(b.name));
    const years=g.rs.map(r=>r.year).filter(Boolean),first=years.length?Math.min(...years):null,last=years.length?Math.max(...years):null,deaths=g.rs.reduce((n,r)=>n+r.deaths,0),causes=[...new Set(g.rs.map(r=>r.causeText).filter(Boolean))].slice(0,4),accessMix=[...new Set(g.rs.map(r=>r.accessText).filter(Boolean))].slice(0,4);
    const list=sorted.slice(0,12).map(r=>`<li><a href="#${esc(r.id)}" data-wreck-row="${esc(r.id)}">${esc(r.name)}</a> — ${r.year||'year unknown'} · ${esc(r.causeText||'cause not listed')} · ${esc(r.accessText||'access not listed')}</li>`).join('');
    const fitz=g.rs.find(r=>/edmund fitzgerald/i.test(r.name));
    const more=g.rs.length>12?`<p>${g.rs.length-12} additional selected record${g.rs.length-12===1?' is':'s are'} shown in the synchronized table below.</p>`:'';
    return `<h3>${esc(g.label)}</h3><div class="we-insight-meta"><strong>Map selection:</strong> ${g.rs.length} exact filtered table record${g.rs.length===1?'':'s'} behind this regional anchor.</div><p><strong>What the group tells you:</strong> ${first&&last?`record dates span ${first}–${last}`:'record dates vary'}; ${deaths.toLocaleString()} recorded death${deaths===1?'':'s'} across these visible records.${causes.length?` Listed causes include ${esc(causes.join(', '))}.`:''}</p>${accessMix.length?`<p><strong>Access context in these records:</strong> ${esc(accessMix.join(' · '))}. The cited source or agency remains authoritative before any site visit or dive.</p>`:''}<ol class="we-insight-list">${list}</ol>${more}<div class="we-insight-actions"><a href="#wrTable" data-wreck-view-records="1">View the ${g.rs.length} selected record${g.rs.length===1?'':'s'} below</a><button type="button" data-wreck-clear-map="1">Clear map selection</button>${fitz?'<a href="/edmund-fitzgerald/" data-wreck-detail="fitzgerald">Read Fitzgerald story</a>':''}</div>`;
  }

  function renderGroupInsight(g){if(!insight||!g)return;insight.innerHTML=groupInsight(g);emit('Shipwreck Map Insight',{anchor:norm(g.label),records:g.rs.length});}
  function markerOptions(g){const selected=anchorSelection===g.label;return {radius:selected?11:Math.min(13,5+Math.sqrt(g.rs.length)*2),weight:selected?3:1.5,color:selected?'#173f1d':'#2c5f2d',fillColor:'#2c5f2d',fillOpacity:anchorSelection&&!selected?.28:.72};}

  function renderMap(baseList){
    loadLeaflet(()=>{
      if(!window.L)return;
      if(!map){map=L.map('we-map',{scrollWheelZoom:false}).setView([45.3,-84.8],5);L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88',{attribution:'&copy; OpenStreetMap, &copy; CARTO',subdomains:'abcd'}).addTo(map);}
      if(layer)layer.remove();layer=L.layerGroup().addTo(map);markerByAnchor.clear();groupByAnchor.clear();
      const groups=groupRecords(baseList);groups.forEach((g,label)=>groupByAnchor.set(label,g));const bounds=[];
      groups.forEach(g=>{
        const sorted=[...g.rs].sort((a,b)=>b.deaths-a.deaths||a.year-b.year),sample=sorted.slice(0,4).map(r=>`${esc(r.name)} (${r.year||'?'})`).join('<br>'),deaths=g.rs.reduce((n,r)=>n+r.deaths,0);
        const marker=L.circleMarker([g.lat,g.lng],markerOptions(g)).addTo(layer);
        marker.bindPopup(`<strong>${esc(g.label)}</strong><br>${g.rs.length} table record${g.rs.length===1?'':'s'} · ${deaths.toLocaleString()} recorded death${deaths===1?'':'s'}<div style="margin-top:6px;line-height:1.45">${sample}</div><div style="margin-top:7px"><b>Select this marker to show only these records below.</b></div><span style="display:block;margin-top:5px;font-size:10px;color:#777">regional story anchor, not wreck coordinates</span>`,{maxWidth:340});
        marker.on('click',()=>selectAnchor(g.label,'map'));
        marker.on('add',()=>{const el=marker.getElement();if(!el)return;el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',`Select ${g.label} and the ${g.rs.length} matching shipwreck records`);el.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();marker.openPopup();selectAnchor(g.label,'map-keyboard');}});});
        markerByAnchor.set(g.label,marker);bounds.push([g.lat,g.lng]);
      });
      if(anchorSelection&&markerByAnchor.has(anchorSelection)){const g=groupByAnchor.get(anchorSelection);map.setView([g.lat,g.lng],Math.max(map.getZoom(),7));setTimeout(()=>markerByAnchor.get(anchorSelection)?.openPopup(),100);}else if(bounds.length){map.fitBounds(bounds,{padding:[25,25],maxZoom:7});}
    });
  }

  function currentLists(){const baseList=records.filter(baseMatches);const tableList=anchorSelection?baseList.filter(r=>r.anchor?.label===anchorSelection):baseList;return {baseList,tableList};}

  function apply(source='filter'){
    const {baseList,tableList}=currentLists(),visibleIds=new Set(tableList.map(r=>r.id));
    records.forEach(r=>{const shown=visibleIds.has(r.id);r.row.style.display=shown?'':'none';r.row.classList.toggle('we-map-set',shown&&!!anchorSelection);if(!shown)r.row.classList.remove('we-focus');});
    if(anchorSelection){status.innerHTML=`Map selection: <strong>${esc(anchorSelection)}</strong> — ${tableList.length} exact record${tableList.length===1?'':'s'} shown in the table below. <button type="button" class="we-clear-map" data-wreck-clear-map="1">Clear map selection</button>`;}else{status.textContent=`Showing ${tableList.length} of ${records.length} documented wreck records. Select a map marker to make the table show exactly what that marker represents.`;}
    updateSummary(tableList);renderMap(baseList);syncURL();if(source!=='init')emit('Shipwreck Explorer Filter',{filter:source,results:tableList.length,mapSelected:Boolean(anchorSelection)});
  }

  function clearAnchorSelection(source='clear'){
    anchorSelection='';records.forEach(r=>r.row.classList.remove('we-focus','we-map-set'));if(insight)insight.innerHTML='<h3>Map selection cleared.</h3><div class="we-insight-meta">The map again represents the full filtered table.</div><p>Select any regional marker to reduce the table to the exact wreck records behind it, or use “Show on map” from a record.</p>';apply(source);emit('Shipwreck Map Selection Cleared',{source});
  }

  function selectAnchor(label,source='map'){
    const {baseList}=currentLists(),groups=groupRecords(baseList),g=groups.get(label);if(!g)return;anchorSelection=label;renderGroupInsight(g);apply(source);emit('Shipwreck Map To Records',{anchor:norm(label),records:g.rs.length,source});
  }

  function focusAnchor(label,recordId=''){
    const marker=markerByAnchor.get(label),g=groupByAnchor.get(label);if(!map||!marker||!g)return;map.flyTo([g.lat,g.lng],Math.max(map.getZoom(),7),{duration:.45});setTimeout(()=>marker.openPopup(),480);mapNode?.scrollIntoView({behavior:'smooth',block:'center'});if(recordId){const row=document.getElementById(recordId);if(row){records.forEach(r=>r.row.classList.remove('we-focus'));row.classList.add('we-focus');}}emit('Shipwreck Record To Map',{anchor:norm(label)});
  }

  [q,lake,eraEl,causeEl,accessEl].forEach(el=>el.addEventListener(el===q?'input':'change',()=>{preset='';anchorSelection='';$$('.we-chip').forEach(b=>b.setAttribute('aria-pressed','false'));apply(el.id.replace('we-',''));}));
  $$('.we-chip').forEach(btn=>btn.addEventListener('click',()=>{const p=btn.dataset.preset;preset=preset===p?'':p;anchorSelection='';$$('.we-chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===preset)));apply('preset');emit('Shipwreck Explorer Preset',{preset:preset||'cleared'});}));

  document.addEventListener('click',e=>{
    const detail=e.target.closest('[data-wreck-detail]');if(detail)emit('Shipwreck Detail Open',{wreck:detail.dataset.wreckDetail});
    const mapLink=e.target.closest('[data-wreck-map]');if(mapLink){e.preventDefault();const label=mapLink.dataset.wreckMap,recordId=mapLink.dataset.wreckRecord||'';selectAnchor(label,'record');setTimeout(()=>focusAnchor(label,recordId),120);return;}
    const rowLink=e.target.closest('[data-wreck-row]');if(rowLink){e.preventDefault();const row=document.getElementById(rowLink.dataset.wreckRow);if(row){records.forEach(r=>r.row.classList.remove('we-focus'));row.classList.add('we-focus');row.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>row.classList.remove('we-focus'),5000);}emit('Shipwreck Map Record Open',{record:'table-row'});return;}
    const viewRecords=e.target.closest('[data-wreck-view-records]');if(viewRecords){e.preventDefault();const first=records.find(r=>r.row.style.display!=='none');(first?.row||$('#wrTable'))?.scrollIntoView({behavior:'smooth',block:'start'});emit('Shipwreck Map Records View',{anchor:norm(anchorSelection)});return;}
    if(e.target.closest('[data-wreck-clear-map]')){e.preventDefault();clearAnchorSelection('clear');}
  });

  const old=$('.filter-bar');if(old)old.hidden=true;
  apply('init');
})();
