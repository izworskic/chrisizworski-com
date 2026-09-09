from pathlib import Path
import json

old='39ba975a099c28bedf965019510312c4c086174f'
new='be4bfe2cd3a1a35339049e7c4faa74b62c4a8e80'

p=Path('package.json')
data=json.loads(p.read_text())
if old not in data['dependencies']['national-ballard-locks']:
    raise SystemExit('old Ballard pin missing')
data['dependencies']['national-ballard-locks']=f'github:izworskic/national-ballard-locks#{new}'
p.write_text(json.dumps(data,indent=2)+'\n')

t=Path('tests/ballard-locks-extracted.test.js')
s=t.read_text()
if old not in s: raise SystemExit('old extracted test pin missing')
s=s.replace(old,new)
anchor="  assert.ok(tour.includes('function setAisView(key)'));\n"
checks="  assert.ok(tour.includes('function syncAisToMap()'));\n  assert.ok(tour.includes(\"map.on('moveend',syncAisToMap)\"));\n  assert.ok(tour.includes('interactive:true'));\n  assert.ok(tour.includes('class=\"ais-clip\"'));\n  assert.ok(tour.includes('left:-42px'));\n  assert.ok(tour.includes('width:calc(100% + 84px)'));\n  assert.ok(tour.includes(\"closeOnClick:false\"));\n  assert.ok(tour.includes(\"map.panBy([shiftX,shiftY]\"));\n"
if 'function syncAisToMap()' not in s:
    if anchor not in s: raise SystemExit('extracted test anchor missing')
    s=s.replace(anchor,anchor+checks,1)
t.write_text(s)

smoke=Path('scripts/ballard-production-smoke.mjs')
ss=smoke.read_text()
anchor2="        && last.text.includes('function setAisView(key)')\n"
checks2="        && last.text.includes('function syncAisToMap()')\n        && last.text.includes(\"map.on('moveend',syncAisToMap)\")\n        && last.text.includes('interactive:true')\n        && last.text.includes('class=\"ais-clip\"')\n        && last.text.includes('left:-42px')\n        && last.text.includes('width:calc(100% + 84px)')\n        && last.text.includes(\"closeOnClick:false\")\n        && last.text.includes(\"map.panBy([shiftX,shiftY\")\n"
if 'function syncAisToMap()' not in ss:
    if anchor2 not in ss: raise SystemExit('production smoke anchor missing')
    ss=ss.replace(anchor2,anchor2+checks2,1)
smoke.write_text(ss)
