'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const skills = ["editorial-diagrams","design-reconnaissance","interactive-2d-scenes","public-data-scout","stitch-concept-review"];
test('agent capability skills are identical for Codex Claude and Copilot', () => {
  for (const name of skills) {
    const value = read(`.agents/skills/${name}/SKILL.md`);
    assert.equal(value, read(`.claude/skills/${name}/SKILL.md`));
    assert.equal(value, read(`.github/skills/${name}/SKILL.md`));
    assert.ok(value.startsWith(`---\nname: ${name}\n`));
    for (const marker of ['Experience OS','Experience Investment','Foundry','Auto ads','NOT VERIFIED','Do not auto-merge']) {
      assert.ok(value.toLowerCase().includes(marker.toLowerCase()), name+': '+marker);
    }
    assert.ok(!value.includes(String.fromCharCode(8211)) && !value.includes(String.fromCharCode(8212)));
  }
});
test('new capabilities remain opt-in, documented and source-aware', () => {
  const agents=read('AGENTS.md'), guide=read('docs/AGENT_CAPABILITY_LIBRARY.md');
  for(const name of skills) {
    assert.ok(agents.includes(name),name);
    assert.ok(guide.includes(name),name);
  }
  assert.ok(agents.includes('Opt-in specialist skills'));
  assert.ok(guide.includes('not automatically enabled'));
  assert.ok(guide.includes('npm run verify:all'));
});
