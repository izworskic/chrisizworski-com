from pathlib import Path
import re

js_path=Path('public/assets/pictured-rocks-planner-v3.js')
html_path=Path('public/labs/pictured-rocks-planner/index.html')
css_path=Path('public/assets/pictured-rocks-planner-v3.css')
hard_path=Path('tests/pictured-rocks-carto-map.test.js')
value_path=Path('tests/pictured-rocks-map-value.test.js')
interaction_path=Path('tests/pictured-rocks-map-interaction.test.js')

js=js_path.read_text()
html=html_path.read_text()
css=css_path.read_text()

old="m.bindTooltip(esc(p.title),{permanent:true,interactive:true,direction:'top',offset:[0,-8],opacity:.96,className:'park-place-label'});"
new="m.bindTooltip(`<span class=\"map-place-hit\" data-map-point=\"${esc(id)}\" role=\"button\" tabindex=\"0\" aria-label=\"${esc(p.title)}: open planning details\">${esc(p.title)}</span>`,{permanent:true,interactive:true,direction:'top',offset:[0,-8],opacity:.96,className:'park-place-label'});"
if old in js:
    js=js.replace(old,new,1)
elif 'class="map-place-hit" data-map-point=' not in js:
    raise SystemExit('tooltip content target missing')

old_a11y=r'''    m.on('add',()=>{
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
new_a11y=r'''    const applyMarkerA11y=()=>{
      const el=m.getElement();
      if(!el||el.dataset.mapA11yReady==='1')return;
      el.dataset.mapA11yReady='1';
      el.setAttribute('tabindex','0');
      el.setAttribute('role','button');
      el.setAttribute('aria-label',`${p.title}: open planning details`);
      el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate({openPopup:true,moveFocus:false});}});
    };
    applyMarkerA11y();
    m.on('add',applyMarkerA11y);'''
if old_a11y in js:
    js=js.replace(old_a11y,new_a11y,1)
elif 'const applyMarkerA11y=' not in js:
    raise SystemExit('marker accessibility block missing')

zone_anchor="  $$('#mapZones [data-zone]').forEach(btn=>btn.addEventListener('click',()=>focusZone(btn.dataset.zone)));\n}"
delegation=r'''  $$('#mapZones [data-zone]').forEach(btn=>btn.addEventListener('click',()=>focusZone(btn.dataset.zone)));
  target.addEventListener('click',event=>{
    const hit=event.target.closest&&event.target.closest('[data-map-point]');
    if(!hit)return;
    const id=hit.dataset.mapPoint;
    if(!engine.PLACES[id])return;
    event.preventDefault();event.stopPropagation();
    selectMapPoint(id,{openPopup:true});
  });
  target.addEventListener('keydown',event=>{
    const hit=event.target.closest&&event.target.closest('[data-map-point]');
    if(!hit||!engine.PLACES[hit.dataset.mapPoint]||(event.key!=='Enter'&&event.key!==' '))return;
    event.preventDefault();event.stopPropagation();
    selectMapPoint(hit.dataset.mapPoint,{openPopup:true});
  });
}'''
if zone_anchor in js:
    js=js.replace(zone_anchor,delegation,1)
elif "target.addEventListener('click',event=>" not in js:
    raise SystemExit('map delegation anchor missing')

# Fresh mobile bundle.
html,n=re.subn(r'pictured-rocks-planner-v3\.js\?v=20260927-\d+','pictured-rocks-planner-v3.js?v=20260927-9',html,count=1)
if n!=1 and 'pictured-rocks-planner-v3.js?v=20260927-9' not in html:
    raise SystemExit('JS cache target missing')
html,n=re.subn(r'pictured-rocks-planner-v3\.css\?v=20260927-\d+','pictured-rocks-planner-v3.css?v=20260927-9',html,count=1)
if n!=1 and 'pictured-rocks-planner-v3.css?v=20260927-9' not in html:
    raise SystemExit('CSS cache target missing')

marker='/* pictured-rocks native map hit targets 20260927 */'
if marker not in css:
    css += r'''
/* pictured-rocks native map hit targets 20260927 */
#parkMap .map-place-hit{position:relative;display:flex;align-items:center;justify-content:center;min-width:44px;min-height:30px;margin:-6px -8px;padding:6px 8px;outline:0;touch-action:manipulation}
#parkMap .map-place-hit:after{content:"";position:absolute;left:-7px;right:-7px;top:-7px;bottom:-7px}
#parkMap .map-place-hit:focus-visible{outline:3px solid #63b6c2;outline-offset:2px;border-radius:5px}
'''

for path in (hard_path,value_path,interaction_path):
    if path.exists():
        t=path.read_text()
        t=t.replace('pictured-rocks-planner-v3\\.js\\?v=20260927-8','pictured-rocks-planner-v3\\.js\\?v=20260927-9')
        t=t.replace('pictured-rocks-planner-v3\\.css\\?v=20260927-8','pictured-rocks-planner-v3\\.css\\?v=20260927-9')
        path.write_text(t)

# Strengthen interaction test beyond Leaflet's event system.
t=interaction_path.read_text()
if 'native visible-label target bypasses Leaflet tooltip event ambiguity' not in t:
    t += r'''

test('hard gate: native visible-label target bypasses Leaflet tooltip event ambiguity',()=>{
  assert.match(ui,/data-map-point=/);
  assert.match(ui,/target\.addEventListener\('click'/);
  assert.match(ui,/closest\('\[data-map-point\]'/);
  assert.match(ui,/selectMapPoint\(id,\{openPopup:true\}\)/);
  assert.match(css,/map-place-hit\{[^}]*min-width:44px/);
});
'''
interaction_path.write_text(t)

js_path.write_text(js)
html_path.write_text(html)
css_path.write_text(css)
