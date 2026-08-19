import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s);
const replaceRequired = (text, oldValue, newValue, label) => {
  if (!text.includes(oldValue)) throw new Error(`Missing patch target: ${label}`);
  return text.replace(oldValue, newValue);
};
const replaceRegex = (text, re, newValue, label) => {
  if (!re.test(text)) throw new Error(`Missing regex patch target: ${label}`);
  return text.replace(re, newValue);
};

// 1) Replace the AI-style hero with an externally hosted, documented real Michigan boat-launch photograph.
let boatHtml = read('public/michigan-boat-launches/index.html');
const realHero = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Lake_erie_metropark_boat_launch.JPG/1280px-Lake_erie_metropark_boat_launch.JPG';
boatHtml = replaceRequired(
  boatHtml,
  'https://chrisizworski.com/assets/michigan-boat-launches/hero.jpg',
  realHero,
  'boat OG hero'
);
boatHtml = replaceRegex(
  boatHtml,
  /<img src="\/assets\/michigan-boat-launches\/hero\.jpg" alt="[^"]+" width="1536" height="1024">/,
  `<img src="${realHero}" alt="Concrete public boat-launch ramps at Lake Erie Metropark in Michigan" width="1280" height="853" fetchpriority="high">`,
  'boat hero image element'
);
boatHtml = replaceRegex(
  boatHtml,
  /<figcaption>A Saginaw Bay launch at first light\.[\s\S]*?<\/figcaption>/,
  '<figcaption>Lake Erie Metropark, Michigan boat launch. Real photograph by Dwight Burdette via <a href="https://commons.wikimedia.org/wiki/File:Lake_erie_metropark_boat_launch.JPG" target="_blank" rel="noopener">Wikimedia Commons</a>, licensed <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>. This guide covers 42 Great Lakes launches statewide.</figcaption>',
  'boat hero caption'
);

// Upgrade the existing Leaflet launch markers from name/conditions dots to decision cards.
boatHtml = replaceRegex(
  boatHtml,
  /        var pop='<strong>'\+loc\.name\+'<\/strong><br>'\+loc\.lake;[\s\S]*?        m\.bindPopup\(pop\);/,
`        var card=null;
        Array.prototype.forEach.call(document.querySelectorAll('.loc-card'),function(c){
          var n=c.querySelector('.loc-name');if(!card&&n&&n.textContent.trim()===loc.name)card=c;
        });
        var meta=card&&card.querySelector('.loc-meta')?card.querySelector('.loc-meta').textContent.trim():loc.lake;
        var notes=card&&card.querySelector('.loc-notes')?card.querySelector('.loc-notes').textContent.trim():'';
        var signal='Regional observation unavailable';
        if(st){
          var tF=cToF(st.water_t),wMph=msToMph(st.wind_spd);
          var pieces=[];
          if(waveFt!=null)pieces.push(waveFt+' ft waves');
          if(MODE==='beach'&&tF!=null)pieces.push(tF+'\\u00b0F water');
          if(MODE==='launch'&&wMph!=null)pieces.push(wMph+' mph wind');
          signal=(pieces.length?pieces.join(' &middot; '):'observation available')+' at '+(BUOY_NAMES[st.id]||('NDBC '+st.id));
        }
        var pop='<div class="launch-map-popup"><strong>'+loc.name+'</strong><br><span>'+meta+'</span>';
        if(notes)pop+='<p style="margin:7px 0 5px;line-height:1.35">'+notes+'</p>';
        pop+='<strong style="font-size:11px">Regional screening signal</strong><br>'+signal;
        pop+='<br><span style="font-size:10px;color:#777">Not ramp, harbor or boating-safety truth. Verify local access and marine conditions.</span>';
        pop+='<div style="margin-top:8px"><a href="#'+loc.slug+'">Open launch details</a> &middot; <a href="https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(loc.lat+','+loc.lng)+'" target="_blank" rel="noopener">Directions</a></div>';
        pop+='<div style="margin-top:5px"><a href="https://www.michigan.gov/dnr/things-to-do/boating" target="_blank" rel="noopener">Verify access with Michigan DNR</a></div></div>';
        m.bindPopup(pop,{maxWidth:330});
        m.on('click',function(){
          var panel=document.getElementById('launch-map-insight');if(!panel)return;
          panel.innerHTML='<strong>'+loc.name+'</strong><span>'+meta+'</span><p>'+notes+'</p><div class="lmi-signal"><b>Regional signal:</b> '+signal+'</div><div class="lmi-actions"><a href="#'+loc.slug+'">View launch details</a><a href="https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(loc.lat+','+loc.lng)+'" target="_blank" rel="noopener">Directions</a><a href="https://www.michigan.gov/dnr/things-to-do/boating" target="_blank" rel="noopener">Verify access</a></div><small>Regional NDBC context only; confirm ramp/local notices and the marine forecast before going.</small>';
          panel.setAttribute('data-selected-launch',loc.slug);
          if(window.va)try{window.va('event',{name:'Boat Launch Map Insight',launch:loc.slug});}catch(e){}
        });` ,
  'boat marker popup block'
);
write('public/michigan-boat-launches/index.html', boatHtml);

const oldHeroPath = 'public/assets/michigan-boat-launches/hero.jpg';
if (fs.existsSync(oldHeroPath)) fs.unlinkSync(oldHeroPath);
write('public/assets/michigan-boat-launches/hero-source.json', JSON.stringify({
  type: 'real-photograph',
  subject: 'Lake Erie Metropark, Michigan boat launch',
  author: 'Dwight Burdette',
  source: 'https://commons.wikimedia.org/wiki/File:Lake_erie_metropark_boat_launch.JPG',
  imageUrl: realHero,
  license: 'CC BY 3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  changed: '2026-08-18',
  note: 'Replaces the previous synthetic-looking root hero. No generative image is used for the root Boat Launch Finder hero.'
}, null, 2) + '\n');

// 2) Add a persistent launch insight panel and stronger two-way map/card actions.
let boatJs = read('public/assets/boat-launch-finder.js');
boatJs = replaceRequired(
  boatJs,
  "actions.innerHTML=`<a href=\"https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.lat+','+loc.lng)}\" target=\"_blank\" rel=\"noopener\" data-launch-action=\"directions\">Directions</a><a href=\"#locmap\" data-launch-action=\"map\">Map</a>`;",
  "actions.innerHTML=`<a href=\"https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.lat+','+loc.lng)}\" target=\"_blank\" rel=\"noopener\" data-launch-action=\"directions\">Directions</a><a href=\"#locmap\" data-launch-action=\"map\" data-launch-slug=\"${esc(loc.slug)}\">Map insight</a><a href=\"https://www.michigan.gov/dnr/things-to-do/boating\" target=\"_blank\" rel=\"noopener\" data-launch-action=\"verify\">Verify access</a>`;",
  'boat card actions'
);
boatJs = replaceRequired(
  boatJs,
  ".launch-actions{display:flex;gap:10px;margin-top:10px;padding-top:8px;border-top:1px solid #eee7dd}.launch-actions a{font:700 11px/1.3 Arial,sans-serif;letter-spacing:.2px}.loc-card[hidden]{display:none!important}.loc-card.lf-match{outline:2px solid #9fc4a2;outline-offset:1px}",
  ".launch-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;padding-top:8px;border-top:1px solid #eee7dd}.launch-actions a{font:700 11px/1.3 Arial,sans-serif;letter-spacing:.2px}.loc-card[hidden]{display:none!important}.loc-card.lf-match{outline:2px solid #9fc4a2;outline-offset:1px}.launch-map-insight{margin:10px 0 22px;padding:14px 15px;border:1px solid #d8d2c7;border-left:4px solid #2c5f2d;border-radius:6px;background:#fff}.launch-map-insight>strong{display:block;font-size:16px;color:#214a22}.launch-map-insight>span{display:block;font-size:12px;color:#777;margin-top:2px}.launch-map-insight p{font-size:13px!important;margin:7px 0!important;line-height:1.45!important}.lmi-signal{font-size:12px;margin:7px 0}.lmi-actions{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.lmi-actions a{font:700 11px/1.3 Arial,sans-serif}.launch-map-insight small{display:block;color:#777;line-height:1.4}",
  'boat map insight styles'
);
boatJs = replaceRequired(
  boatJs,
  "const mapWrap=$('#locmap-wrap');\n  if(mapWrap)mapWrap.before(panel);else $('.body')?.prepend(panel);",
  "const mapWrap=$('#locmap-wrap');\n  if(mapWrap)mapWrap.before(panel);else $('.body')?.prepend(panel);\n  const mapEl=$('#locmap');\n  if(mapEl&&!$('#launch-map-insight')){const insight=document.createElement('aside');insight.id='launch-map-insight';insight.className='launch-map-insight';insight.setAttribute('aria-live','polite');insight.innerHTML='<strong>Tap a launch marker for the useful part.</strong><span>Marker insights connect the dot to the launch record.</span><p>You’ll get the launch’s local notes, current regional NDBC context, directions and an official access-verification path.</p><small>Regional observations screen a trip; they do not verify a ramp, harbor or safe boating conditions.</small>';mapEl.after(insight);}",
  'boat insight panel creation'
);
boatJs = replaceRequired(
  boatJs,
  "document.addEventListener('click',e=>{const a=e.target.closest('[data-launch-action]');if(a)emit('Boat Launch Action',{action:a.dataset.launchAction});});",
  "document.addEventListener('click',e=>{const a=e.target.closest('[data-launch-action]');if(!a)return;emit('Boat Launch Action',{action:a.dataset.launchAction});if(a.dataset.launchAction==='map'&&a.dataset.launchSlug){const idx=locations.findIndex(x=>x.slug===a.dataset.launchSlug);setTimeout(()=>{const markers=$$('#locmap .leaflet-interactive');if(idx>=0&&markers[idx])markers[idx].dispatchEvent(new MouseEvent('click',{bubbles:true}));},250);}});\n  let markerTries=0;const markerA11y=setInterval(()=>{markerTries++;const markers=$$('#locmap .leaflet-interactive');if(markers.length>=locations.length||markerTries>12){clearInterval(markerA11y);markers.slice(0,locations.length).forEach((node,i)=>{const loc=locations[i];node.setAttribute('tabindex','0');node.setAttribute('role','button');node.setAttribute('aria-label',`Open map insight for ${loc.name}`);node.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();node.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});});}},400);",
  'boat action tracking'
);
write('public/assets/boat-launch-finder.js', boatJs);

// 3) Upgrade shipwreck regional anchors into linked story/record insights.
let wreckJs = read('public/assets/shipwreck-explorer.js');
wreckJs = replaceRequired(
  wreckJs,
  "const records=rows.map(row=>{const c=$$('td',row).map(x=>x.textContent.trim());return {row,name:c[0],lake:c[1],year:Number(c[2])||0,type:c[3],causeText:c[4],place:c[5],depth:c[6],deaths:Number(c[7])||0,accessText:c[8],era:era(c[2]),access:access(c[8]),cause:cause(c[4])};});",
  "const records=rows.map((row,i)=>{const c=$$('td',row).map(x=>x.textContent.trim());const id='wreck-'+norm(c[0]+'-'+c[2]).replace(/ /g,'-')+'-'+i;row.id=id;return {row,id,name:c[0],lake:c[1],year:Number(c[2])||0,type:c[3],causeText:c[4],place:c[5],depth:c[6],deaths:Number(c[7])||0,accessText:c[8],era:era(c[2]),access:access(c[8]),cause:cause(c[4])};});",
  'shipwreck record IDs'
);
wreckJs = replaceRequired(
  wreckJs,
  "#wrTable tr.we-focus{outline:2px solid #9fc4a2;outline-offset:-2px}.wreck-link{font-size:11px;margin-left:5px;font-weight:normal;white-space:nowrap}",
  "#wrTable tr.we-focus{outline:2px solid #9fc4a2;outline-offset:-2px}.wreck-link{font-size:11px;margin-left:5px;font-weight:normal;white-space:nowrap}.we-insight{margin-top:10px;padding:13px 14px;border:1px solid #ddd6cb;border-left:4px solid #2c5f2d;border-radius:6px;background:#fff}.we-insight h3{margin:0 0 4px;font-size:16px;color:#214a22}.we-insight .we-insight-meta{font-size:11px;color:#777}.we-insight p{font-size:12px!important;line-height:1.5!important;margin:7px 0!important}.we-insight-list{margin:8px 0 0;padding-left:18px}.we-insight-list li{margin:5px 0;font-size:12px;line-height:1.35}.we-insight-list a{font-weight:bold}.we-insight-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:9px}.we-insight-actions a{font:700 11px/1.3 Arial,sans-serif}",
  'shipwreck insight styles'
);
wreckJs = replaceRequired(
  wreckJs,
  "<p class=\"we-status\" id=\"we-status\" aria-live=\"polite\"></p><div class=\"we-summary\" id=\"we-summary\"></div><div class=\"we-map\" id=\"we-map\" role=\"img\" aria-label=\"Regional map of filtered Great Lakes shipwreck records\"></div><p class=\"we-map-note\"><strong>Map precision:</strong>",
  "<p class=\"we-status\" id=\"we-status\" aria-live=\"polite\"></p><div class=\"we-summary\" id=\"we-summary\"></div><div class=\"we-map\" id=\"we-map\" role=\"img\" aria-label=\"Regional map of filtered Great Lakes shipwreck records\"></div><aside class=\"we-insight\" id=\"we-insight\" aria-live=\"polite\"><h3>Tap a regional marker to open the story underneath it.</h3><div class=\"we-insight-meta\">Markers group documented wreck records around named places.</div><p>The insight card will show vessels, era span, causes, recorded loss of life and access context, with links directly into the database below.</p></aside><p class=\"we-map-note\"><strong>Map precision:</strong>",
  'shipwreck insight panel markup'
);
wreckJs = replaceRequired(
  wreckJs,
  "const q=$('#we-q'),lake=$('#we-lake'),eraEl=$('#we-era'),causeEl=$('#we-cause'),accessEl=$('#we-access'),status=$('#we-status'),summary=$('#we-summary');",
  "const q=$('#we-q'),lake=$('#we-lake'),eraEl=$('#we-era'),causeEl=$('#we-cause'),accessEl=$('#we-access'),status=$('#we-status'),summary=$('#we-summary'),insight=$('#we-insight');",
  'shipwreck insight reference'
);
const oldRenderMap = "function renderMap(list){loadLeaflet(()=>{if(!window.L)return;if(!map){map=L.map('we-map',{scrollWheelZoom:false}).setView([45.3,-84.8],5);L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:'&copy; OpenStreetMap, &copy; CARTO',subdomains:'abcd'}).addTo(map);}if(layer)layer.remove();layer=L.layerGroup().addTo(map);const groups=new Map();list.forEach(r=>{const a=anchorFor(r.place);if(!a)return;const key=a.label;if(!groups.has(key))groups.set(key,{...a,rs:[]});groups.get(key).rs.push(r);});const bounds=[];groups.forEach(g=>{const m=L.circleMarker([g.lat,g.lng],{radius:Math.min(13,5+Math.sqrt(g.rs.length)*2),weight:1.5,fillOpacity:.72}).addTo(layer);m.bindPopup(`<strong>${esc(g.label)}</strong><br>${g.rs.length} filtered record${g.rs.length===1?'':'s'}<br><span style=\"font-size:10px\">regional anchor, not wreck coordinates</span>`);bounds.push([g.lat,g.lng]);});if(bounds.length)map.fitBounds(bounds,{padding:[25,25],maxZoom:7});});}";
const newRenderMap = `function groupInsight(g){const sorted=[...g.rs].sort((a,b)=>b.deaths-a.deaths||a.year-b.year||a.name.localeCompare(b.name));const years=g.rs.map(r=>r.year).filter(Boolean);const first=years.length?Math.min(...years):null,last=years.length?Math.max(...years):null;const deaths=g.rs.reduce((n,r)=>n+r.deaths,0);const causes=[...new Set(g.rs.map(r=>r.causeText).filter(Boolean))].slice(0,3);const accessMix=[...new Set(g.rs.map(r=>r.accessText).filter(Boolean))].slice(0,3);const sample=sorted.slice(0,5);const list=sample.map(r=>\`<li><a href="#\${esc(r.id)}" data-wreck-row="\${esc(r.id)}">\${esc(r.name)}</a> — \${r.year||'year unknown'} · \${esc(r.causeText||'cause not listed')} · \${esc(r.accessText||'access not listed')}</li>\`).join('');const fitz=g.rs.find(r=>/edmund fitzgerald/i.test(r.name));return \`<h3>\${esc(g.label)}</h3><div class="we-insight-meta">\${g.rs.length} filtered record\${g.rs.length===1?'':'s'} · regional story anchor, not wreck coordinates</div><p><strong>Why this marker matters:</strong> \${first&&last?\`records span \${first}–\${last}\`:'record dates vary'}; \${deaths.toLocaleString()} recorded death\${deaths===1?'':'s'} across the visible records. \${causes.length?\`Common listed causes here include \${esc(causes.join(', '))}.\`:''}</p>\${accessMix.length?\`<p><strong>Access context:</strong> \${esc(accessMix.join(' · '))}. Treat the source/agency record as authoritative before any site visit or dive.</p>\`:''}<ol class="we-insight-list">\${list}</ol><div class="we-insight-actions"><a href="#wrTable">Open filtered database</a>\${fitz?'<a href="/edmund-fitzgerald/" data-wreck-detail="fitzgerald">Read Fitzgerald story</a>':''}</div>\`;}\n  function renderGroupInsight(g){if(!insight)return;insight.innerHTML=groupInsight(g);emit('Shipwreck Map Insight',{anchor:norm(g.label),records:g.rs.length});}\n  function renderMap(list){loadLeaflet(()=>{if(!window.L)return;if(!map){map=L.map('we-map',{scrollWheelZoom:false}).setView([45.3,-84.8],5);L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:'&copy; OpenStreetMap, &copy; CARTO',subdomains:'abcd'}).addTo(map);}if(layer)layer.remove();layer=L.layerGroup().addTo(map);const groups=new Map();list.forEach(r=>{const a=anchorFor(r.place);if(!a)return;const key=a.label;if(!groups.has(key))groups.set(key,{...a,rs:[]});groups.get(key).rs.push(r);});const bounds=[];groups.forEach(g=>{const sorted=[...g.rs].sort((a,b)=>b.deaths-a.deaths||a.year-b.year);const sample=sorted.slice(0,3).map(r=>\`<a href="#\${esc(r.id)}" data-wreck-row="\${esc(r.id)}">\${esc(r.name)} (\${r.year||'?'})</a>\`).join('<br>');const deaths=g.rs.reduce((n,r)=>n+r.deaths,0);const m=L.circleMarker([g.lat,g.lng],{radius:Math.min(13,5+Math.sqrt(g.rs.length)*2),weight:1.5,fillOpacity:.72}).addTo(layer);m.bindPopup(\`<strong>\${esc(g.label)}</strong><br>\${g.rs.length} filtered record\${g.rs.length===1?'':'s'} · \${deaths.toLocaleString()} recorded death\${deaths===1?'':'s'}<div style="margin-top:6px;line-height:1.45">\${sample}</div><div style="margin-top:6px"><a href="#we-insight">Open marker insight</a> · <a href="#wrTable">Database</a></div><span style="display:block;margin-top:5px;font-size:10px;color:#777">regional anchor, not wreck coordinates</span>\`,{maxWidth:330});m.on('click',()=>renderGroupInsight(g));m.on('popupopen',()=>{const el=m.getElement();if(el){el.setAttribute('role','button');el.setAttribute('aria-label',\`Open shipwreck insight for \${g.label}\`);}});bounds.push([g.lat,g.lng]);});if(bounds.length)map.fitBounds(bounds,{padding:[25,25],maxZoom:7});});}`;
wreckJs = replaceRequired(wreckJs, oldRenderMap, newRenderMap, 'shipwreck renderMap');
wreckJs = replaceRequired(
  wreckJs,
  "document.addEventListener('click',e=>{const a=e.target.closest('[data-wreck-detail]');if(a)emit('Shipwreck Detail Open',{wreck:a.dataset.wreckDetail});});",
  "document.addEventListener('click',e=>{const detail=e.target.closest('[data-wreck-detail]');if(detail)emit('Shipwreck Detail Open',{wreck:detail.dataset.wreckDetail});const rowLink=e.target.closest('[data-wreck-row]');if(rowLink){const row=document.getElementById(rowLink.dataset.wreckRow);if(row){records.forEach(r=>r.row.classList.remove('we-focus'));row.classList.add('we-focus');setTimeout(()=>row.classList.remove('we-focus'),4500);}emit('Shipwreck Map Record Open',{record:'table-row'});}});",
  'shipwreck record-link interaction'
);
write('public/assets/shipwreck-explorer.js', wreckJs);

// 4) Add a map-specific evaluation loss function and gate.
fs.mkdirSync('benchmarks', {recursive:true});
write('benchmarks/map-insight-quality.json', JSON.stringify({
  version: '1.0.0',
  created: '2026-08-18',
  objective: 'Replace synthetic-looking media and convert map dots into linked, trustworthy decision/story insights without sacrificing canonical ownership, safety boundaries, privacy, or the existing record-rich pages.',
  maxScore: 100,
  target: {minimumEffectiveScore:95, maximumLoss:5, fatalPenaltyAllowed:false},
  baseline: {
    score: 43,
    loss: 57,
    dimensions: {
      authenticMedia: 0,
      boatMarkerInsight: 8,
      shipwreckMarkerInsight: 5,
      trustAndSourceBoundary: 15,
      searchIntegrity: 10,
      measurementAndAccessibility: 5
    },
    note: 'Structural baseline of the just-merged release: root hero was synthetic-looking; launch popups exposed name/lake/regional observations but no durable insight card; shipwreck markers exposed only anchor label and record count.'
  },
  dimensions: [
    {key:'authenticMedia',weight:20},
    {key:'boatMarkerInsight',weight:25},
    {key:'shipwreckMarkerInsight',weight:25},
    {key:'trustAndSourceBoundary',weight:15},
    {key:'searchIntegrity',weight:10},
    {key:'measurementAndAccessibility',weight:5}
  ],
  fatalPenalties: [
    'The Boat Launch Finder root hero is generated/synthetic or lacks traceable real-photo provenance.',
    'A boat marker is presented as a launch safety rating or its NDBC station as ramp/harbor truth.',
    'A shipwreck regional anchor is represented as an exact wreck, navigation, or dive coordinate.',
    'Marker interactions remain decorative/count-only with no linked underlying record or next action.',
    'Either parent canonical changes, thin child URLs are created, personal/precise-location data is collected, or Circle Tour PR #51 is modified.'
  ]
}, null, 2)+'\n');

write('scripts/benchmark-map-insight-quality.mjs', `import fs from 'node:fs';\nconst boat=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');\nconst boatJs=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');\nconst wreck=fs.readFileSync('public/great-lakes-shipwrecks/index.html','utf8');\nconst wreckJs=fs.readFileSync('public/assets/shipwreck-explorer.js','utf8');\nconst cfg=JSON.parse(fs.readFileSync('benchmarks/map-insight-quality.json','utf8'));\nconst checks={\n authenticMedia:[20, boat.includes('Lake_erie_metropark_boat_launch.JPG')&&boat.includes('Dwight Burdette')&&boat.includes('CC BY 3.0')&&fs.existsSync('public/assets/michigan-boat-launches/hero-source.json')&&!fs.existsSync('public/assets/michigan-boat-launches/hero.jpg')],\n boatMarkerInsight:[25, boat.includes('Open launch details')&&boat.includes('Verify access with Michigan DNR')&&boat.includes('launch-map-insight')&&boatJs.includes('Map insight')&&boatJs.includes('Verify access')],\n shipwreckMarkerInsight:[25, wreckJs.includes('Why this marker matters:')&&wreckJs.includes('data-wreck-row')&&wreckJs.includes('we-insight')&&wreckJs.includes('Open filtered database')&&wreckJs.includes('recorded death')],\n trustAndSourceBoundary:[15, boat.includes('Not ramp, harbor or boating-safety truth')&&wreckJs.includes('regional anchor, not wreck coordinates')&&wreckJs.includes('source/agency record as authoritative')],\n searchIntegrity:[10, boat.includes('<link rel=\"canonical\" href=\"https://chrisizworski.com/michigan-boat-launches/\">')&&wreck.includes('<link rel=\"canonical\" href=\"https://chrisizworski.com/great-lakes-shipwrecks/\">')&&boat.includes('numberOfItems\": 42')],\n measurementAndAccessibility:[5, boatJs.includes('Boat Launch Map Insight')&&boatJs.includes('aria-label')&&wreckJs.includes('Shipwreck Map Insight')&&wreckJs.includes('aria-live')]\n};\nlet score=0;for(const [k,[w,ok]] of Object.entries(checks)){if(ok)score+=w;console.log(\\`\${ok?'PASS':'FAIL'}  \${ok?w:0}/\${w}  \${k}\\`);}\nconst loss=100-score;console.log(\\`Map insight quality candidate: \${score}/100 (loss \${loss})\\`);if(process.argv.includes('--check')&&(score<cfg.target.minimumEffectiveScore||loss>cfg.target.maximumLoss))process.exit(1);\n`);

write('tests/map-insight-quality.test.js', `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nconst boat=fs.readFileSync('public/michigan-boat-launches/index.html','utf8');\nconst boatJs=fs.readFileSync('public/assets/boat-launch-finder.js','utf8');\nconst wreckJs=fs.readFileSync('public/assets/shipwreck-explorer.js','utf8');\ntest('Boat Launch Finder uses a traceable real Michigan boat-launch photo',()=>{assert.match(boat,/Lake_erie_metropark_boat_launch\\.JPG/);assert.match(boat,/Dwight Burdette/);assert.match(boat,/CC BY 3\\.0/);assert.equal(fs.existsSync('public/assets/michigan-boat-launches/hero.jpg'),false);});\ntest('boat map markers open launch-specific insight and verification paths',()=>{assert.match(boat,/Open launch details/);assert.match(boat,/Verify access with Michigan DNR/);assert.match(boat,/Not ramp, harbor or boating-safety truth/);assert.match(boatJs,/launch-map-insight/);assert.match(boatJs,/Boat Launch Map Insight/);});\ntest('shipwreck regional markers expose linked records and useful story context',()=>{assert.match(wreckJs,/Why this marker matters:/);assert.match(wreckJs,/data-wreck-row/);assert.match(wreckJs,/recorded death/);assert.match(wreckJs,/Open filtered database/);assert.match(wreckJs,/regional anchor, not wreck coordinates/);});\n`);

let pkg = JSON.parse(read('package.json'));
pkg.scripts['benchmark:map-insights'] = 'node scripts/benchmark-map-insight-quality.mjs --check';
if (!pkg.scripts['verify:all'].includes('benchmark:map-insights')) pkg.scripts['verify:all'] += ' && npm run benchmark:map-insights';
write('package.json', JSON.stringify(pkg, null, 2)+'\n');

console.log('Map insight quality pass applied.');
