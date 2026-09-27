from pathlib import Path
import re

repo = Path('.')
js_path = repo / 'public/assets/pictured-rocks-planner-v3.js'
html_path = repo / 'public/labs/pictured-rocks-planner/index.html'
css_path = repo / 'public/assets/pictured-rocks-planner-v3.css'
hard_test_path = repo / 'tests/pictured-rocks-carto-map.test.js'
value_test_path = repo / 'tests/pictured-rocks-map-value.test.js'
interaction_test_path = repo / 'tests/pictured-rocks-map-interaction.test.js'

js = js_path.read_text()
html = html_path.read_text()
css = css_path.read_text()

# 1) Add a persistent map decision-card renderer. This is deliberately independent
# of Leaflet popup rendering so a successful point selection always has a DOM result.
anchor = "function ensureMapPopupStyles(){"
if 'function selectMapPoint(id' not in js:
    insert = r'''function mapFitState(id){
  const blocked=currentAccessBlocks().has(id);
  const fit=currentPlannedIds().includes(id);
  return {blocked,fit,label:blocked?'Current access issue':fit?'Fits your current plan':'Optional for this plan',className:blocked?'blocked':fit?'fit':'optional'};
}
function mapDecisionHtml(id){
  const p=engine.PLACES[id],d=MAP_DETAILS[id]||{},state=mapFitState(id);
  const zone=p.side==='west'?'West / Munising':p.side==='central'?'Chapel country':'East / Grand Marais';
  const allow=Math.round(p.mins/15)*15;
  return `<div class="map-decision-card" data-map-detail="${esc(id)}">
    <div class="map-decision-top"><span class="map-decision-zone">${esc(zone)}</span><span class="park-popup-fit ${state.className}">${esc(state.label)}</span></div>
    <p class="map-decision-why">${esc(p.why)}</p>
    <div class="park-popup-meta"><span>${esc(p.effort)}</span><span>Allow ~${allow} min</span></div>
    ${d.best?`<div class="park-popup-row"><strong>Why pick it</strong><span>${esc(d.best)}</span></div>`:''}
    ${d.access?`<div class="park-popup-row"><strong>What it takes</strong><span>${esc(d.access)}</span></div>`:''}
    ${d.watch?`<div class="park-popup-row watch"><strong>Know before you go</strong><span>${esc(d.watch)}</span></div>`:''}
    ${d.source?`<a class="park-popup-link" href="${esc(d.source)}" target="_blank" rel="noopener">Official details ↗</a>`:''}
  </div>`;
}
function selectMapPoint(id,{openPopup=true,moveFocus=false}={}){
  const p=engine.PLACES[id],m=markers[id];
  if(!p)return;
  const title=$('#mapStoryTitle'),detail=$('#mapStoryText'),story=$('#mapStory');
  if(title)title.textContent=p.title;
  if(detail)detail.innerHTML=mapDecisionHtml(id);
  Object.entries(markers).forEach(([mid,marker])=>marker.setStyle(markerStyle(engine.PLACES[mid].side,mid===id)));
  if(m&&openPopup){
    m.setPopupContent(mapPopupHtml(id));
    m.openPopup();
  }
  if(story){
    story.dataset.selectedPoint=id;
    if(moveFocus){story.setAttribute('tabindex','-1');story.focus({preventScroll:true});}
    if(window.matchMedia&&window.matchMedia('(max-width:900px)').matches){requestAnimationFrame(()=>story.scrollIntoView({behavior:'smooth',block:'nearest'}));}
  }
}
'''
    if anchor not in js:
        raise SystemExit('ensureMapPopupStyles anchor not found')
    js = js.replace(anchor, insert + anchor, 1)

# 2) Make popup state reuse the same fit-state helper.
old = """  const blocked=currentAccessBlocks().has(id);\n  const fit=currentPlannedIds().includes(id);\n  const fitLabel=blocked?'Current access issue':fit?'Fits your current plan':'Optional for this plan';\n  const fitClass=blocked?'blocked':fit?'fit':'optional';"""
new = """  const state=mapFitState(id);\n  const fitLabel=state.label;\n  const fitClass=state.className;"""
if old in js:
    js = js.replace(old, new, 1)

# 3) Harden label interaction styling. Labels are visible controls on mobile, so they
# need to be tappable rather than passive annotations.
old_style = ".leaflet-tooltip.park-place-label{background:rgba(255,255,255,.96);border:1px solid rgba(22,39,42,.22);border-radius:5px;box-shadow:0 1px 4px rgba(0,0,0,.15);color:#173236;font:700 11px/1.2 Inter,system-ui,sans-serif;padding:4px 6px;white-space:nowrap}"
new_style = ".leaflet-tooltip.park-place-label{background:rgba(255,255,255,.96);border:1px solid rgba(22,39,42,.22);border-radius:5px;box-shadow:0 1px 4px rgba(0,0,0,.15);color:#173236;font:700 11px/1.2 Inter,system-ui,sans-serif;padding:6px 8px;white-space:nowrap;pointer-events:auto!important;cursor:pointer;touch-action:manipulation}"
if old_style in js:
    js = js.replace(old_style, new_style, 1)
elif 'pointer-events:auto!important;cursor:pointer;touch-action:manipulation' not in js:
    raise SystemExit('map label style target not found')

# 4) Replace implicit popup binding with explicit, tested interaction wiring.
old_marker_block = r'''    const m=L.circleMarker([pt.lat,pt.lon],markerStyle(p.side)).addTo(map);
    m.bindPopup(()=>mapPopupHtml(id),{maxWidth:340,minWidth:260,className:'park-value-popup'});
    m.bindTooltip(esc(p.title),{permanent:true,direction:'top',offset:[0,-8],opacity:.96,className:'park-place-label'});
    markers[id]=m;'''
new_marker_block = r'''    const m=L.circleMarker([pt.lat,pt.lon],{...markerStyle(p.side),interactive:true,bubblingMouseEvents:false}).addTo(map);
    m.bindPopup(mapPopupHtml(id),{maxWidth:340,minWidth:260,className:'park-value-popup'});
    m.bindTooltip(esc(p.title),{permanent:true,interactive:true,direction:'top',offset:[0,-8],opacity:.96,className:'park-place-label'});
    markers[id]=m;
    const activate=(opts={})=>selectMapPoint(id,opts);
    m.on('click',()=>activate({openPopup:true}));
    m.on('add',()=>{
      const el=m.getElement();
      if(el){
        el.setAttribute('tabindex','0');
        el.setAttribute('role','button');
        el.setAttribute('aria-label',`${p.title}: open planning details`);
        el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate({openPopup:true,moveFocus:false});}});
      }
    });
    const tip=m.getTooltip();
    if(tip){
      tip.on('click',()=>activate({openPopup:true}));
      tip.on('add',()=>{
        const el=tip.getElement();
        if(el){
          el.setAttribute('role','button');
          el.setAttribute('tabindex','0');
          el.setAttribute('aria-label',`${p.title}: open planning details`);
          el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate({openPopup:true});}});
        }
      });
    }'''
if old_marker_block in js:
    js = js.replace(old_marker_block, new_marker_block, 1)
elif "m.on('click',()=>activate" not in js:
    raise SystemExit('marker interaction block target not found')

# 5) When the planner changes, keep any selected detail card synchronized with the
# current fit/access state rather than leaving stale advice on screen.
old_render_tail = """  result.hidden=false;\n  highlightMap(p.ids);\n  if(scroll)result.scrollIntoView({behavior:'smooth',block:'start'});"""
new_render_tail = """  result.hidden=false;\n  highlightMap(p.ids);\n  const selectedStory=$('#mapStory');\n  if(selectedStory&&selectedStory.dataset.selectedPoint){selectMapPoint(selectedStory.dataset.selectedPoint,{openPopup:false});}\n  if(scroll)result.scrollIntoView({behavior:'smooth',block:'start'});"""
if old_render_tail in js:
    js = js.replace(old_render_tail, new_render_tail, 1)
elif 'selectedStory.dataset.selectedPoint' not in js:
    raise SystemExit('render synchronization target not found')

# 6) Convert the existing map-story area into the persistent selection surface.
old_story = '<aside class="map-story"><div><p class="eyebrow">Why routes fail</p><h3 id="mapStoryTitle">The park is long.</h3><p id="mapStoryText">Munising and Grand Marais are different trip bases. Chapel sits between them as a major hiking commitment. Crossing back and forth is how a good day turns into a driving day.</p></div><div class="map-legend" aria-label="Map zone legend">'
new_story = '<aside class="map-story" id="mapStory" aria-live="polite"><div><p class="eyebrow">Tap a stop</p><h3 id="mapStoryTitle">Choose a point on the map.</h3><div id="mapStoryText" class="map-story-detail"><p>Tap either a dot or its place name. This panel will show trip fit, time, effort, access, and the catch that can change the stop.</p></div></div><div class="map-legend" aria-label="Map zone legend">'
if old_story in html:
    html = html.replace(old_story, new_story, 1)
elif 'id="mapStory" aria-live="polite"' not in html:
    raise SystemExit('map story HTML target not found')

# 7) Fresh cache bust for phone clients.
html, n = re.subn(r'pictured-rocks-planner-v3\.js\?v=20260927-\d+', 'pictured-rocks-planner-v3.js?v=20260927-8', html, count=1)
if n != 1 and 'pictured-rocks-planner-v3.js?v=20260927-8' not in html:
    raise SystemExit('JS cache bust target not found')
html, ncss = re.subn(r'pictured-rocks-planner-v3\.css\?v=20260927-\d+', 'pictured-rocks-planner-v3.css?v=20260927-8', html, count=1)
if ncss != 1 and 'pictured-rocks-planner-v3.css?v=20260927-8' not in html:
    raise SystemExit('CSS cache bust target not found')

# 8) CSS for persistent card and minimum touch affordance. Tooltip itself is now the
# large touch target; the dot remains precise enough to preserve geographic meaning.
marker = '/* pictured-rocks map interaction hardening 20260927 */'
if marker not in css:
    css += r'''
/* pictured-rocks map interaction hardening 20260927 */
#parkMap .leaflet-tooltip.park-place-label{pointer-events:auto!important;cursor:pointer;touch-action:manipulation;min-height:30px;display:flex;align-items:center}
#parkMap .leaflet-pane>svg path.leaflet-interactive{pointer-events:auto;cursor:pointer}
.map-story:focus{outline:3px solid #63b6c2;outline-offset:3px}
.map-story-detail{color:#536468;font-size:.9rem}
.map-story-detail p{margin:0 0 10px}
.map-decision-card{margin-top:6px;color:#173236}
.map-decision-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}
.map-decision-zone{font-size:10px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:#607579}
.map-decision-why{font-size:.92rem!important;color:#334d51!important;margin:0 0 10px!important}
@media(max-width:900px){.map-story[data-selected-point]{border:2px solid #8dbdc3;box-shadow:0 8px 22px rgba(24,44,48,.12)}}
'''

# Update existing hard-gate test cache version.
hard = hard_test_path.read_text()
hard = re.sub(r'pictured-rocks-planner-v3\\\.js\\\?v=20260927-\d+', 'pictured-rocks-planner-v3\\.js\\?v=20260927-8', hard)
# Handle the literal current assertion form as well.
hard = hard.replace('pictured-rocks-planner-v3\\.js\\?v=20260927-7','pictured-rocks-planner-v3\\.js\\?v=20260927-8')
hard_test_path.write_text(hard)

# Update value test bundle expectation.
if value_test_path.exists():
    value = value_test_path.read_text().replace('pictured-rocks-planner-v3\\.js\\?v=20260927-7','pictured-rocks-planner-v3\\.js\\?v=20260927-8')
    value_test_path.write_text(value)

interaction_test_path.write_text(r'''const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ui=fs.readFileSync('public/assets/pictured-rocks-planner-v3.js','utf8');
const html=fs.readFileSync('public/labs/pictured-rocks-planner/index.html','utf8');
const css=fs.readFileSync('public/assets/pictured-rocks-planner-v3.css','utf8');

test('hard gate: selecting a point has a non-popup DOM response',()=>{
  assert.match(ui,/function selectMapPoint\(id/);
  assert.match(ui,/mapStoryTitle/);
  assert.match(ui,/mapStoryText/);
  assert.match(ui,/detail\.innerHTML=mapDecisionHtml\(id\)/);
  assert.match(html,/id="mapStory" aria-live="polite"/);
});

test('hard gate: both point and visible name are explicit controls',()=>{
  assert.match(ui,/m\.on\('click'/);
  assert.match(ui,/interactive:true,direction:'top'/);
  assert.match(ui,/tip\.on\('click'/);
  assert.match(ui,/aria-label.*open planning details/);
  assert.match(css,/park-place-label\{pointer-events:auto!important;cursor:pointer/);
});

test('hard gate: keyboard users can activate a stop',()=>{
  assert.match(ui,/setAttribute\('tabindex','0'\)/);
  assert.match(ui,/setAttribute\('role','button'\)/);
  assert.match(ui,/event\.key==='Enter'\|\|event\.key===' '/);
});

test('hard gate: selected place fit stays synchronized with planner answers',()=>{
  assert.match(ui,/dataset\.selectedPoint/);
  assert.match(ui,/selectMapPoint\(selectedStory\.dataset\.selectedPoint,\{openPopup:false\}\)/);
});

test('mobile clients receive fresh interaction assets',()=>{
  assert.match(html,/pictured-rocks-planner-v3\.js\?v=20260927-8/);
  assert.match(html,/pictured-rocks-planner-v3\.css\?v=20260927-8/);
});
''')

js_path.write_text(js)
html_path.write_text(html)
css_path.write_text(css)
