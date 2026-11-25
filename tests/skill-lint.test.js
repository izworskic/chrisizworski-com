'use strict';
// Skill lint: every agent skill in this repository must be loadable, findable and mirrored.
// Rules follow the Agent Skills specification (github.com/agentskills/agentskills, Apache-2.0)
// plus this repository's own conventions. The test globs every skill folder, so a new skill
// is covered the moment it lands; no per-skill test is required for these checks.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const MIRRORS = ['.agents/skills', '.claude/skills', '.github/skills'];
// AGENTS.md scopes these to Codex and Claude Code only, so Copilot has no copy on purpose.
const NOT_IN_COPILOT = new Set(['experience-investment', 'penpot-design', 'rea']);
const TRIGGER = /\b(use|invoke)\b[^.]{0,60}\b(when|for|only|on)\b/i;

const listSkills = (dir) => {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
};
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const all = [...new Set(MIRRORS.flatMap(listSkills))].sort();

const outsideCode = (text) => text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');

test('skill folders exist and every skill has a SKILL.md', () => {
  assert.ok(all.length > 0, 'no skills found');
  for (const dir of MIRRORS) {
    for (const name of listSkills(dir)) {
      assert.ok(fs.existsSync(path.join(root, dir, name, 'SKILL.md')), `${dir}/${name} is missing SKILL.md`);
    }
  }
});

test('frontmatter follows the Agent Skills spec', () => {
  for (const name of all) {
    const text = read(`.agents/skills/${name}/SKILL.md`);
    assert.match(name, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${name}: name must be lowercase words joined by single hyphens`);
    assert.ok(name.length <= 64, `${name}: name over 64 characters`);
    assert.ok(text.startsWith(`---\nname: ${name}\n`), `${name}: frontmatter must open with name matching the folder`);
    const fm = text.split('\n---', 2)[0];
    const m = fm.match(/^description: (.+)$/m);
    assert.ok(m, `${name}: description missing`);
    const description = m[1].replace(/^"|"$/g, '');
    assert.ok(description.length > 0 && description.length <= 1024, `${name}: description must be 1 to 1024 characters`);
    assert.match(description, TRIGGER, `${name}: description must say when to use the skill ("Use when ...")`);
  }
});

test('no literal escape sequences or banned dashes in skill text', () => {
  for (const dir of MIRRORS) {
    for (const name of listSkills(dir)) {
      const folder = path.join(root, dir, name);
      const files = fs.readdirSync(folder, { recursive: true }).filter((f) => f.endsWith('.md'));
      for (const file of files) {
        const rel = `${dir}/${name}/${file}`;
        const text = read(rel);
        assert.ok(!outsideCode(text).includes('\\n'), `${rel}: contains a literal \\n that renders as text instead of a line break`);
        assert.ok(!text.includes('–') && !text.includes('—'), `${rel}: contains an en or em dash`);
      }
    }
  }
});

test('mirrors are identical across Codex, Claude Code and Copilot', () => {
  for (const name of all) {
    const codexPath = `.agents/skills/${name}/SKILL.md`;
    const claudePath = `.claude/skills/${name}/SKILL.md`;
    const copilotPath = `.github/skills/${name}/SKILL.md`;
    assert.ok(fs.existsSync(path.join(root, codexPath)), `${name}: missing Codex copy`);
    assert.ok(fs.existsSync(path.join(root, claudePath)), `${name}: missing Claude Code copy`);
    const codex = read(codexPath);
    assert.equal(read(claudePath), codex, `${name}: Claude Code copy differs from Codex copy`);
    if (NOT_IN_COPILOT.has(name)) {
      assert.ok(!fs.existsSync(path.join(root, copilotPath)), `${name}: listed as Codex/Claude only but a Copilot copy exists; update NOT_IN_COPILOT`);
    } else {
      assert.ok(fs.existsSync(path.join(root, copilotPath)), `${name}: missing Copilot copy (or add it to NOT_IN_COPILOT with a reason)`);
      assert.equal(read(copilotPath), codex, `${name}: Copilot copy differs from Codex copy`);
    }
  }
});
