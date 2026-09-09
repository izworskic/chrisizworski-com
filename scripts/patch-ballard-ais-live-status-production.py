from pathlib import Path
import json

old='3e4eaf1a96640bda66b4ec8df79679ff8c059048'
new='39ba975a099c28bedf965019510312c4c086174f'

p=Path('package.json')
data=json.loads(p.read_text())
data['dependencies']['national-ballard-locks']=f'github:izworskic/national-ballard-locks#{new}'
p.write_text(json.dumps(data,indent=2)+'\n')

# Update extracted Ballard contract pin and live status requirement.
t=Path('tests/ballard-locks-extracted.test.js')
s=t.read_text()
if old not in s: raise SystemExit('old Ballard pin missing')
s=s.replace(old,new)
anchor="  assert.ok(tour.includes('https://embed.myshiptracking.com/embed?myst'));\n"
check="  assert.ok(tour.includes('LIVE AIS · positions update automatically'));\n"
if check not in s:
    if anchor not in s: raise SystemExit('extracted AIS anchor missing')
    s=s.replace(anchor,anchor+check,1)
t.write_text(s)

# Require the production tour to expose the live auto-update status.
smoke=Path('scripts/ballard-production-smoke.mjs')
ss=smoke.read_text()
anchor2="        && last.text.includes('https://embed.myshiptracking.com/embed?myst')\n"
check2="        && last.text.includes('LIVE AIS · positions update automatically')\n"
if check2 not in ss:
    if anchor2 not in ss: raise SystemExit('production smoke AIS anchor missing')
    ss=ss.replace(anchor2,anchor2+check2,1)
smoke.write_text(ss)
