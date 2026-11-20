'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('experience-investment skill is discoverable by Codex and Claude Code with identical instructions', () => {
  const codex = read('.agents/skills/experience-investment/SKILL.md');
  const claude = read('.claude/skills/experience-investment/SKILL.md');
  assert.equal(codex, claude);
  assert.match(codex, /^---\nname: experience-investment\ndescription: "[^\n]+"\n---/);
  for (const marker of ['PROPOSE', 'REVIEW', 'IMPLEMENT', 'visitor', 'two materially different concepts', 'two closest existing tools', 'first', 'no-JS', 'Penpot', 'NOT VERIFIED']) {
    assert.ok(codex.includes(marker), marker);
  }
  assert.match(codex, /do not stop at a generic plan/);
  assert.match(codex, /do not edit production/i);
  assert.match(codex, /Preserve.*canonical.*Person.*ads/i);
});

test('design choices are function-led and explicitly reject a universal Snow Totals theme', () => {
  const skill = read('.agents/skills/experience-investment/SKILL.md');
  const lenses = read('.agents/skills/experience-investment/references/DECISION_LENSES.md');
  for (const example of ['Michigan Snow Totals', 'Rideau Canal', 'UP Waterfalls']) assert.ok(lenses.includes(example), example);
  for (const job of ['happening now', 'Where should I go', 'How does it work', 'changing event']) assert.ok(lenses.includes(job), job);
  assert.match(skill, /do not force the Snow Totals 56px number/i);
  assert.match(lenses, /Relabeling a shared structure fails/);
  assert.match(lenses, /WCAG AA/);
  assert.match(skill, /visitor problems/);
});

test('review has verifiable outputs, implementation is separate, and existing rules are not overridden', () => {
  const delivery = read('.agents/skills/experience-investment/references/REVIEW_AND_DELIVERY.md');
  const guide = read('docs/EXPERIENCE_INVESTMENT_SKILL.md');
  for (const keyword of ['PROPOSE', 'REVIEW', 'IMPLEMENT', '390px', '1280px', 'no-JS', 'reduced-motion', 'NOT VERIFIED']) {
    assert.ok(delivery.includes(keyword) || (keyword === 'reduced-motion' && delivery.includes('reduced motion')), keyword);
  }
  assert.match(delivery, /Do not change source/);
  assert.match(delivery, /branch and PR/);
  assert.match(guide, /Source-only/);
  assert.match(guide, /Separate extracted repositories do not inherit/);
  assert.match(guide, /Penpot.*explicit request only/);
  assert.match(guide, /No production page is changed/);
  for (const file of [
    '.agents/skills/experience-investment/SKILL.md',
    '.claude/skills/experience-investment/SKILL.md',
    '.agents/skills/experience-investment/references/DECISION_LENSES.md',
    '.agents/skills/experience-investment/references/REVIEW_AND_DELIVERY.md',
    'docs/EXPERIENCE_INVESTMENT_SKILL.md'
  ]) assert.doesNotMatch(read(file), /[–—]/, file);
});

test('root agent instructions route major new tools and redesigns to the skill without auto-invoking Penpot', () => {
  const rootAgents = read('AGENTS.md');
  const claude = read('CLAUDE.md');
  const copilot = read('.github/copilot-instructions.md');
  for (const src of [rootAgents, claude, copilot]) {
    assert.match(src, /experience-investment/);
    assert.match(src, /Experience OS/i);
  }
  assert.match(rootAgents, /Penpot.*explicitly requested/);
  assert.match(claude, /Penpot, only when asked/);
  assert.match(copilot, /Penpot is opt-in/);
});

test('technology fit is mandatory but does not force new runtimes', () => {
  const codex = read('.agents/skills/experience-investment/SKILL.md');
  const claude = read('.claude/skills/experience-investment/SKILL.md');
  const tech = read('.agents/skills/experience-investment/references/TECHNOLOGY_FIT_REVIEW.md');
  const delivery = read('.agents/skills/experience-investment/references/REVIEW_AND_DELIVERY.md');
  const guide = read('docs/EXPERIENCE_INVESTMENT_SKILL.md');
  assert.equal(codex, claude);
  for (const item of ['Technology Fit Review', 'TECHNOLOGY_FIT_REVIEW.md']) {
    assert.ok(codex.includes(item) && guide.includes(item), item);
  }
  for (const language of ['HTML', 'JavaScript', 'Python', 'Rust', 'Java']) assert.ok(tech.includes(language), language);
  assert.match(tech, /NOT MEASURED/);
  assert.match(tech, /smallest capable stack|smallest practical option/i);
  assert.match(delivery, /Technology Fit Review/);
  assert.doesNotMatch(tech, /[–—]/);
});
