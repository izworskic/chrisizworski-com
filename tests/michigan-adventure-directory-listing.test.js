import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const toolsHtml = await readFile(new URL('../public/tools/index.html', import.meta.url), 'utf8');
const finderHtml = await readFile(new URL('../public/michigan-destinations/index.html', import.meta.url), 'utf8');

test('Michigan Adventure Finder is an actual searchable, year-round Michigan trip planner', () => {
  const planners = toolsHtml.match(/<section class="tool-group" id="trip-planners-group"[\s\S]*?<\/section>/)?.[0];
  assert.ok(planners, 'Michigan trip planner section exists');
  assert.equal((toolsHtml.match(/data-tool-id="michigan-adventure-finder"/g) || []).length, 1, 'exactly one catalog entry');
  assert.match(planners, /<div class="tool-grid">\s*<div class="tool-card" data-tool-id="michigan-adventure-finder"/, 'first entry must use the standard directory card structure');
  const position = planners.indexOf('<div class="tool-card" data-tool-id="michigan-adventure-finder"');
  const next = planners.indexOf('<div class="tool-card" data-tool-id="mackinac-island"', position);
  const card = position >= 0 && next > position ? planners.slice(position, next) : '';
  assert.ok(card, 'discoverable native directory card');
  assert.match(card, /data-tool-id="michigan-adventure-finder"/);
  assert.match(card, /data-tags="[^"]*\bplanning\b[^"]*"/);
  assert.match(card, /data-tags="[^"]*\bnature\b[^"]*"/);
  assert.match(card, /href="\/michigan-destinations\/"/);
  assert.match(card, /Michigan Adventure Finder/);
  const months = card.match(/data-months="([^"]+)"/)?.[1].split(',').map(Number);
  assert.deepEqual(months, [1,2,3,4,5,6,7,8,9,10,11,12]);
  assert.ok(planners.indexOf('data-tool-id="michigan-adventure-finder"') < planners.indexOf('data-tool-id="mackinac-island"'), 'visible at top of trip planner directory');
});

test('Michigan Adventure Finder directory link resolves to the existing indexable page', () => {
  assert.match(finderHtml, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-destinations\/"/);
  assert.match(finderHtml, /id="destination-map"/);
  assert.match(finderHtml, /id="destinations"/);
  assert.equal((finderHtml.match(/<article class="destination"/g)||[]).length, 20);
});

test('search and in-season filtering include the featured card without changes to filter code', () => {
  assert.match(toolsHtml, /querySelectorAll\('\.tool-card\[data-tags\]'\)/);
  assert.match(toolsHtml, /getAttribute\('data-months'\)/);
  assert.match(toolsHtml, /function matches\(c\)/);
  assert.match(toolsHtml, /getAttribute\('data-inseason'\)/);
});
