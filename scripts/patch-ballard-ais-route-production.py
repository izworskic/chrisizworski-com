from pathlib import Path
import json

old='24b49044a7065145c632c92a7a90f110da6df0c3'
new='3e4eaf1a96640bda66b4ec8df79679ff8c059048'

p=Path('package.json')
data=json.loads(p.read_text())
data['dependencies']['national-ballard-locks']=f'github:izworskic/national-ballard-locks#{new}'
p.write_text(json.dumps(data,indent=2)+'\n')

# Update extracted Ballard contract.
t=Path('tests/ballard-locks-extracted.test.js')
s=t.read_text()
if old not in s:
    raise SystemExit('old Ballard pin missing')
s=s.replace(old,new)
s=s.replace("  assert.ok(tour.includes('https://tiles.openfreemap.org/styles/liberty'));\n", "  assert.ok(tour.includes('id=\"tour-ais-underlay\"'));\n  assert.ok(tour.includes('style:{version:8,sources:{},layers:[]}'));\n")
s=s.replace("  assert.ok(tour.includes('data-live-panel=\"ais\"'));\n", "  assert.ok(!tour.includes('data-live-panel=\"ais\"'));\n")
anchor="  assert.ok(tour.includes('https://embed.myshiptracking.com/embed?myst'));\n"
extra="""  assert.ok(tour.includes('id=\"tour-map\" class=\"map map-overlay\"'));
  assert.ok(tour.indexOf('id=\"tour-ais-underlay\"') < tour.indexOf('id=\"tour-map\"'));
  assert.ok(tour.includes('const routeViews='));
  assert.ok(tour.includes('function setAisView(key)'));
  assert.ok(tour.includes('map.jumpTo({center:v.center,zoom:v.zoom})'));
  assert.ok(!tour.includes('id=\"map-live-panel-ais\"'));
"""
if extra.strip() not in s:
    if anchor not in s:
        raise SystemExit('extracted AIS anchor missing')
    s=s.replace(anchor,anchor+extra,1)
t.write_text(s)

# Strengthen production smoke for the combined AIS + route map.
smoke=Path('scripts/ballard-production-smoke.mjs')
ss=smoke.read_text()
old_block="""        && last.text.includes('75 min · + Ballard')
        && last.text.includes('https://tiles.openfreemap.org/styles/liberty')
        && last.text.includes('/api/ballard-locks')
        && last.text.includes('activePopup=null')
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
new_block="""        && last.text.includes('75 min · + Ballard')
        && last.text.includes('/api/ballard-locks')
        && last.text.includes('activePopup=null')
        && last.text.includes('if(activePopup&&activePopup!==popup)activePopup.remove()')
        && last.text.includes('id=\"tour-ais-underlay\"')
        && last.text.includes('id=\"tour-map\" class=\"map map-overlay\"')
        && last.text.indexOf('id=\"tour-ais-underlay\"') < last.text.indexOf('id=\"tour-map\"')
        && last.text.includes('id=\"map-live-dock\"')
        && last.text.includes('data-live-panel=\"fish\"')
        && !last.text.includes('data-live-panel=\"ais\"')
        && last.text.includes('data-live-panel=\"camera\"')
        && !last.text.includes('id=\"map-live-panel-ais\"')
        && last.text.includes('https://embed.myshiptracking.com/embed?myst')
        && last.text.includes('style:{version:8,sources:{},layers:[]}')
        && last.text.includes('const routeViews=')
        && last.text.includes('function setAisView(key)')
        && last.text.includes('map.jumpTo({center:v.center,zoom:v.zoom})')
        && last.text.includes('https://g1.ipcamlive.com/player/player.php?alias=5ababb8154afe')
        && last.text.includes('Sockeye')
        && last.text.includes('Chinook')
        && last.text.includes('Coho')
        && !last.text.includes('What this map adds');"""
if old_block not in ss:
    raise SystemExit('production smoke tour block not found')
smoke.write_text(ss.replace(old_block,new_block,1))
