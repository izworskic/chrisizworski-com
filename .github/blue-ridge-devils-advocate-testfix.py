from pathlib import Path

p=Path("tests/blue-ridge-parkway-destination.test.js")
s=p.read_text()
s=s.replace('  assert.match(source,/Your selections:/);','  assert.match(source,/Serves \\$\\{servedIds\\.length\\} of \\$\\{chosen\\.size\\} selected interests/);')
s=s.replace('  assert.ok(points.every(point=>point.milepost>input.finish || point.milepost<input.gateway ? true : true));','  assert.ok(points.every(point=>point.milepost>121.4&&point.milepost<469.1));')
p.write_text(s)
