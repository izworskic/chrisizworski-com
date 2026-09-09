from pathlib import Path
import json

old='cf4b8468176055068883a77fa9a253e27b612d9a'
new='24b49044a7065145c632c92a7a90f110da6df0c3'

p=Path('package.json')
data=json.loads(p.read_text())
data['dependencies']['national-ballard-locks']=f'github:izworskic/national-ballard-locks#{new}'
p.write_text(json.dumps(data,indent=2)+'\n')

t=Path('tests/ballard-locks-extracted.test.js')
s=t.read_text()
if old not in s:
    raise SystemExit('old Ballard pin missing from extracted test')
s=s.replace(old,new)
anchor="  assert.ok(tour.includes('/api/ballard-locks'));\n});"
expanded="""  assert.ok(tour.includes('/api/ballard-locks'));
  assert.ok(tour.includes('id=\"map-live-dock\"'));
  assert.ok(tour.includes('data-live-panel=\"fish\"'));
  assert.ok(tour.includes('data-live-panel=\"ais\"'));
  assert.ok(tour.includes('data-live-panel=\"camera\"'));
  assert.ok(tour.includes('https://embed.myshiptracking.com/embed?myst'));
  assert.ok(tour.includes('https://g1.ipcamlive.com/player/player.php?alias=5ababb8154afe'));
  assert.ok(!tour.includes('What this map adds'));
});"""
if anchor not in s:
    raise SystemExit('tour extracted-test anchor missing')
t.write_text(s.replace(anchor,expanded,1))

smoke=Path('scripts/ballard-production-smoke.mjs')
ss=smoke.read_text()
anchor="""        && last.text.includes('activePopup=null')
        && last.text.includes('if(activePopup&&activePopup!==popup)activePopup.remove()');"""
expanded="""        && last.text.includes('activePopup=null')
        && last.text.includes('if(activePopup&&activePopup!==popup)activePopup.remove()')
        && last.text.includes('id=\"map-live-dock\"')
        && last.text.includes('data-live-panel=\"fish\"')
        && last.text.includes('data-live-panel=\"ais\"')
        && last.text.includes('data-live-panel=\"camera\"')
        && last.text.includes('https://embed.myshiptracking.com/embed?myst')
        && last.text.includes('https://g1.ipcamlive.com/player/player.php?alias=5ababb8154afe')
        && last.text.includes('Sockeye')
        && last.text.includes('Chinook')
        && last.text.includes('Coho')
        && !last.text.includes('What this map adds');"""
if anchor not in ss:
    raise SystemExit('tour production-smoke anchor missing')
smoke.write_text(ss.replace(anchor,expanded,1))
