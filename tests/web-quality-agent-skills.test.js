'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const modes=['audit','performance','core-web-vitals','accessibility','seo','best-practices'];
test('web quality skill parity and explicit release safeguards',()=>{
 for(const mode of modes){
  const name='web-quality-'+mode;
  const value=read('.agents/skills/'+name+'/SKILL.md');
  assert.equal(value,read('.claude/skills/'+name+'/SKILL.md'));
  assert.equal(value,read('.github/skills/'+name+'/SKILL.md'));
  assert.ok(value.startsWith('---\nname: '+name+'\n'));
  assert.match(value,/Auto ads/);assert.match(value,/do not auto-merge/i);
  assert.match(value,/addyosmani\/web-quality-skills/);
  assert.ok(!value.includes(String.fromCharCode(8211))&&!value.includes(String.fromCharCode(8212)));
  assert.ok(read('AGENTS.md').includes(name));
  assert.ok(read('docs/WEB_QUALITY_PILOT.md').includes(name));
 }
});
