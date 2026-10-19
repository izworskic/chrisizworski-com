import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditHtml, runManifest } from '../scripts/tool-quality-factory.mjs';

const paragraph = ('The river level is rising gradually today, so compare the latest gauge report before planning your trip. ').repeat(15);
const goodHtml = '<!doctype html><html lang="en"><head>'+
'<meta name="viewport" content="width=device-width, initial-scale=1">'+
'<title>Michigan River Conditions: Compare Water Levels Today</title>'+
'<meta name="description" content="Check changing river conditions and compare recent observations before you plan a trip.">'+
'<link rel="canonical" href="https://chrisizworski.com/river/">'+
'<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>'+
'</head><body><main><h1>Michigan River Conditions</h1><p>'+paragraph+
'</p><a href="/tools/">See more tools</a></main>'+
'<footer>Built by Chris Izworski</footer></body></html>';
const options = { canonical:'https://chrisizworski.com/river/',identity:'chris-izworski' };
test('valid initial HTML passes deterministic contract',()=>{
  const r=auditHtml(goodHtml.replace('</head>','<meta name="author" content="Chris Izworski"></head>')
    .replace('{"@context"', '{"@id":"https://chrisizworski.com/#person","@context"'),options);
  assert.equal(r.errors,0);
  assert.equal(r.warnings,0);
  assert.ok(r.measurements.initialWordCount > 120);
});
test('missing indexable content cannot be hidden in scripts',()=>{
  const html=goodHtml.replace('<p>'+paragraph+'</p>','<script>document.body.innerHTML = '+JSON.stringify(paragraph)+'</script>');
  const r=auditHtml(html,options);
  assert.ok(r.issues.some(i=>i.code==='initial-answer-empty'));
});
test('wrong canonical and invalid JSON-LD fail',()=>{
  const html=goodHtml.replace('https://chrisizworski.com/river/', 'https://chrisizworski.com/unrelated/')
    .replace('{"@context":"https://schema.org","@type":"WebPage"}','{bad json}');
  const r=auditHtml(html,options);
  assert.ok(r.issues.some(i=>i.code==='canonical-mismatch'));
  assert.ok(r.issues.some(i=>i.code==='json-ld-invalid'));
});
test('noindex, missing H1, and JavaScript navigation are detected',()=>{
  const html=goodHtml.replace('<head>','<head><meta name="robots" content="noindex">')
    .replace(/<h1>.*?<\/h1>/,'').replace('href="/tools/"','href="javascript:go()"');
  const r=auditHtml(html,options);
  assert.ok(r.issues.some(i=>i.code==='noindex'));
  assert.ok(r.issues.some(i=>i.code==='h1-missing'));
  assert.ok(r.issues.some(i=>i.code==='noncrawlable-links'));
});
test('manifest mode loads local pages and returns a summary',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'quality-factory-'));
  try {
    await writeFile(join(dir,'page.html'),goodHtml);
    const result=await runManifest([{file:'page.html',canonical:options.canonical}],{cwd:dir});
    assert.equal(result.summary.total,1);
    assert.equal(result.summary.failed,0);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
