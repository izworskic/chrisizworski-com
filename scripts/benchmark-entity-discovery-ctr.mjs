#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const data = JSON.parse(await readFile('benchmarks/entity-discovery-ctr-experiment.json','utf8'));
const expected = {
  timeline: { file:'public/timeline/index.html', title:'Chris Izworski Timeline: 911, AI &amp; Public Safety', h1:'Chris Izworski Career Timeline', canonical:'https://chrisizworski.com/timeline/' },
  tools: { file:'public/tools/index.html', title:'Michigan &amp; Great Lakes Live Tools | Chris Izworski', h1:'Michigan &amp; Great Lakes Live Tools', canonical:'https://chrisizworski.com/tools/' },
  press: { file:'public/press/index.html', title:'Chris Izworski Press &amp; Media: 911, AI, Public Safety', h1:'Chris Izworski Press &amp; Media', canonical:'https://chrisizworski.com/press/' }
};
const failures=[];
for (const page of data.pages) {
  const e=expected[page.id]; const html=await readFile(e.file,'utf8');
  if (!html.includes('<title>'+e.title+'</title>')) failures.push(page.id+' title mismatch');
  if (!html.includes('>'+e.h1+'</h1>')) failures.push(page.id+' h1 mismatch');
  if (!html.includes('href=\"'+e.canonical+'\"')) failures.push(page.id+' canonical mismatch');
  if (!html.includes('2026-08-23')) failures.push(page.id+' freshness mismatch');
  if (page.baseline.clicks !== 0 || page.baseline.ctr !== 0) failures.push(page.id+' baseline drift');
  if (page.target.ctr < 0.02) failures.push(page.id+' CTR target too weak');
}
if (data.aggregateBaseline.impressions !== 101 || data.aggregateBaseline.clicks !== 0) failures.push('aggregate baseline drift');
const home=await readFile('public/index.html','utf8');
if (!home.includes('https://chrisizworski.com/')) failures.push('homepage guardrail missing');
if (failures.length) { console.error('entity discovery CTR FAIL\n- '+failures.join('\n- ')); process.exit(1); }
console.log('entity discovery CTR PASS — 101 zero-click impressions under measured treatment');
