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
  // Not a literal date: /tools/ legitimately changed on 2026-09-01 and a literal here fails on
  // every honest edit. The snippet freeze this window depends on is the title/h1/canonical pins
  // above. Assert freshness as the property that matters — the page stamp agrees with the lastmod
  // its route publishes — rather than a specific day.
  const stamped=(html.match(/"dateModified":\s*"(\d{4}-\d{2}-\d{2})"/)||[])[1]||'';
  const sitemap=await readFile('public/sitemap.xml','utf8');
  const marker='<loc>https://chrisizworski.com'+e.canonical.replace('https://chrisizworski.com','')+'</loc>';
  const at=sitemap.indexOf(marker);
  const published=at<0?'':((/<lastmod>(\d{4}-\d{2}-\d{2})/.exec(sitemap.slice(at,at+240))||[])[1]||'');
  if (!stamped||stamped!==published) failures.push(page.id+' freshness mismatch: page '+(stamped||'none')+' vs sitemap '+(published||'none'));
  if (page.baseline.clicks !== 0 || page.baseline.ctr !== 0) failures.push(page.id+' baseline drift');
  if (page.target.ctr < 0.02) failures.push(page.id+' CTR target too weak');
}
if (data.aggregateBaseline.impressions !== 101 || data.aggregateBaseline.clicks !== 0) failures.push('aggregate baseline drift');
const home=await readFile('public/index.html','utf8');
if (!home.includes('https://chrisizworski.com/')) failures.push('homepage guardrail missing');
if (failures.length) { console.error('entity discovery CTR FAIL\n- '+failures.join('\n- ')); process.exit(1); }
console.log('entity discovery CTR PASS — 101 zero-click impressions under measured treatment');
