'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const skills={
 'return-visit-loops':'wondelai/skills',
 'live-conditions-trust':'openai/plugins',
 'remembered-state':'vercel-labs/agent-skills'
};
test('return-visit skills are identical for Codex, Claude Code and Copilot',()=>{
 for(const [name,upstream] of Object.entries(skills)){
  const value=read('.agents/skills/'+name+'/SKILL.md');
  assert.equal(value,read('.claude/skills/'+name+'/SKILL.md'));
  assert.equal(value,read('.github/skills/'+name+'/SKILL.md'));
  assert.ok(value.startsWith('---\nname: '+name+'\n'));
  assert.ok(value.includes(upstream),name+' credits upstream');
  assert.match(value,/commit [0-9a-f]{40}/,name+' pins upstream commit');
  assert.match(value,/MIT/);
  for(const marker of ['AGENTS.md','Auto ads','do not auto-merge','Vercel Function','npm run verify:all']){
   assert.ok(value.toLowerCase().includes(marker.toLowerCase()),name+': '+marker);
  }
  assert.ok(!value.includes(String.fromCharCode(8211))&&!value.includes(String.fromCharCode(8212)),name+' has no en or em dash');
 }
});
test('return-visit skills are registered with explicit triggers',()=>{
 const agents=read('AGENTS.md'),claude=read('CLAUDE.md'),copilot=read('.github/copilot-instructions.md'),doc=read('docs/RETURN_VISIT_SKILLS.md');
 for(const name of Object.keys(skills)){
  for(const [label,text] of [['AGENTS.md',agents],['CLAUDE.md',claude],['copilot',copilot],['doc',doc]]){
   assert.ok(text.includes(name),label+' lists '+name);
  }
 }
 assert.ok(agents.includes('alongside Experience Investment'));
 assert.ok(!doc.includes(String.fromCharCode(8211))&&!doc.includes(String.fromCharCode(8212)));
});
