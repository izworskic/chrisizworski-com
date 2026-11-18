'use strict';
// /michigan-gardening/ this-week desk: search, this month's garden jobs and starred
// garden tools sit under the title, then the questions, then the photo welcome.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/michigan-gardening/index.html'),'utf8');
const hub=fs.readFileSync(path.join(root,'public/assets/garden-tools/garden-hub.js'),'utf8');

test('desk order: title, search, month jobs, starred tools, questions, welcome, planner, suite',()=>{
  const at=m=>{const i=html.indexOf(m);assert.ok(i>0,`missing ${m}`);return i;};
  const order=['<h1>','<div class="garden-desk">','id="garden-find-wrap"','<section class="garden-month" data-garden-month','<section class="starred-tools" data-tool-stars',
    'id="garden-questions"','<section class="garden-welcome"','id="plant-now"','id="gardening-tools-suite"'].map(at);
  assert.deepEqual(order,[...order].sort((a,b)=>a-b));
});

test('the search box is no longer inside the questions section',()=>{
  const door=html.slice(html.indexOf('id="garden-questions"'),html.indexOf('<section class="garden-welcome"'));
  assert.doesNotMatch(door,/id="garden-find"/);
});

test('month jobs come from the planner list and stay hidden without it',()=>{
  assert.match(html,/<section class="garden-month" data-garden-month[^>]* hidden>/);
  assert.match(html,/<ul id="pnJobs">/);
  assert.match(hub,/#pnJobs li\[data-months\]/);
  assert.match(hub,/timeZone:'America\/Detroit'/);
});

test('garden guide cards are starred by link, saved locally',()=>{
  assert.match(html,/data-cards="article\.guide-card" data-title="h3 a" data-id="href"/);
  assert.match(html,/<script defer src="\/assets\/tool-stars\.js\?v=\w+"><\/script>/);
  const js=fs.readFileSync(path.join(root,'public/assets/tool-stars.js'),'utf8');
  assert.match(js,/section\.dataset\.id==='href'/);
});
