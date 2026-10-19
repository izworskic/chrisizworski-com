#!/usr/bin/env node
// Portable no-dependency first-response HTML audit. Not a ranking prediction.
import fs from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const strip = html => String(html || '')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<(script|style|svg|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
  .replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi, ' ')
  .replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi, ' ')
  .replace(/\s+/g, ' ').trim();
function attr(tag, key) {
  const re = new RegExp('(?:^|\\s)' + key + '\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))', 'i');
  const m = re.exec(tag); return m ? (m[1] ?? m[2] ?? m[3] ?? '') : '';
}
function tags(html, name) {
  return [...html.matchAll(new RegExp('<' + name + '\\b[^>]*>', 'gi'))].map(m => m[0]);
}
function meta(html, key) {
  return attr(tags(html, 'meta').find(t => attr(t, 'name').toLowerCase() === key) || '', 'content').trim();
}
function canonical(html) {
  const t = tags(html, 'link').find(t => attr(t,'rel').toLowerCase().split(/\s+/).includes('canonical'));
  return attr(t || '', 'href').trim();
}
const wordCount = s => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
export function auditHtml(html, o = {}) {
  const issues = [];
  const err = (code, explanation) => issues.push({level:'error',code,explanation});
  const warn = (code, explanation) => issues.push({level:'warning',code,explanation});
  const title = strip((/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [,''])[1]);
  const description = meta(html,'description');
  const pageCanonical = canonical(html);
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => strip(m[1])).filter(Boolean);
  const main = (/<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html) || [,''])[1];
  const words = wordCount(strip(main || html));
  const linked = tags(html,'a').filter(t => /^(https?:\/\/|\/|#)/i.test(attr(t,'href')));
  const ld = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  const imgs = tags(html,'img');
  if (o.status && (o.status < 200 || o.status >= 300)) err('http-status','Response status: ' + o.status);
  if (/noindex/i.test(meta(html,'robots')) || /noindex/i.test(o.xRobotsTag || '')) err('noindex','Page or HTTP headers block indexing');
  if (!title) err('title-missing','No initial HTML title');
  else if (title.length > 65 || title.length < 25) warn('title-length','Review title of ' + title.length + ' characters (not a Google hard limit)');
  if (!description) err('description-missing','Missing initial meta description');
  else if (description.length > 165) warn('description-length','Description length is ' + description.length + ' characters');
  if (!pageCanonical) err('canonical-missing','Missing canonical URL');
  else try {
    const found = new URL(pageCanonical,o.url || o.canonical || 'https://example.invalid/').href;
    if (o.canonical && found !== new URL(o.canonical).href) err('canonical-mismatch','Found ' + found + '; expected ' + o.canonical);
  } catch { err('canonical-invalid','Canonical URL is invalid'); }
  if (!h1s.length) err('h1-missing','Missing readable H1');
  else if (h1s.length > 1) warn('multiple-h1','Found ' + h1s.length + ' H1 headings');
  if (!/<html\b[^>]*\blang\s*=/i.test(html)) warn('language-missing','Missing html lang');
  if (!meta(html,'viewport')) warn('viewport-missing','Missing mobile viewport');
  if (words < 25) err('initial-answer-empty','Less than 25 words in initial HTML after removing scripts/styles');
  else if (words < 120) warn('initial-answer-thin','Only ' + words + ' initial HTML words; check that the answer does not depend on JavaScript');
  if (!linked.length) warn('links-missing','No discoverable anchor href links');
  if (!ld.length) warn('structured-data-absent','No JSON-LD; only add truthful, applicable schema');
  ld.forEach((block,i)=>{try { JSON.parse(block); } catch { err('json-ld-invalid','Invalid JSON-LD block ' + (i+1)); }});
  const noAlt = imgs.filter(t => !/\balt\s*=/i.test(t)).length;
  if (noAlt) warn('image-alt',noAlt+' img tags omit alt (empty alt allowed for decorative images)');
  const jsLinks = tags(html,'a').filter(t => /^javascript:/i.test(attr(t,'href'))).length;
  if (jsLinks) warn('noncrawlable-links',jsLinks+' javascript: navigation links');
  if (o.identity === 'chris-izworski') {
    if (!html.includes('https://chrisizworski.com/#person')) err('person-id','Missing canonical creator Person ID');
    if (!/Chris Izworski/i.test(strip(html))) warn('visible-creator','No visible creator attribution');
  }
  const errors = issues.filter(i => i.level === 'error').length;
  const warnings = issues.filter(i => i.level === 'warning').length;
  return {name:o.name || o.file || o.url || 'unknown',source:o.file || o.url || '',
    status:errors ? 'FAIL' : warnings ? 'REVIEW' : 'PASS',
    score:Math.max(0,100-18*errors-5*warnings),errors,warnings,
    measurements:{title,titleLength:title.length,descriptionLength:description.length,
      canonical:pageCanonical,h1:h1s[0] || '',initialWordCount:words,
      crawlableAnchorCount:linked.length,jsonLdBlocks:ld.length,imageCount:imgs.length},issues};
}
export async function runManifest(items, {cwd = process.cwd()} = {}) {
  if (!Array.isArray(items) || !items.length) throw new Error('Expected a nonempty JSON array of pages');
  const reports=[];
  for (const entry of items) {
    if (!entry.file && !entry.url) throw new Error('Manifest entry requires file or url');
    let html, status, xRobotsTag;
    if (entry.file) html=await fs.readFile(resolve(cwd,entry.file),'utf8');
    else {
      const u=new URL(entry.url);
      if (u.protocol !== 'https:' || !u.hostname.includes('.')) throw new Error('Only public HTTPS URLs supported');
      const response=await fetch(u,{signal:AbortSignal.timeout(15000)});
      html=await response.text(); status=response.status;
      xRobotsTag=response.headers.get('x-robots-tag') || '';
    }
    reports.push(auditHtml(html,{...entry,status,xRobotsTag}));
  }
  return {createdAt:new Date().toISOString(),
    policy:'Initial HTML checklist, not a Google ranking or traffic forecast',
    summary:{total:reports.length,failed:reports.filter(r=>r.errors).length,
      review:reports.filter(r=>!r.errors && r.warnings).length,
      passed:reports.filter(r=>!r.errors && !r.warnings).length},reports};
}
const flag=(key,fallback='')=>{
  const prefix='--'+key+'=';
  return process.argv.find(v=>v.startsWith(prefix))?.slice(prefix.length) ?? fallback;
};
async function main() {
  const manifest=flag('manifest'),file=flag('file'),url=flag('url');
  if (!manifest && !file && !url) throw new Error('Supply --manifest=path, --file=path or --url=https://...');
  const pages=manifest?JSON.parse(await fs.readFile(resolve(manifest),'utf8')):
    [{file:file || undefined,url:url || undefined,canonical:flag('canonical') || undefined,identity:flag('identity') || undefined}];
  const result=await runManifest(pages);
  for (const r of result.reports) {
    console.log(r.status+' ['+r.score+'/100] '+r.name+' ('+r.errors+' errors, '+r.warnings+' warnings)');
    r.issues.forEach(i=>console.log('  '+i.level.toUpperCase()+' '+i.code+': '+i.explanation));
  }
  if (flag('out')) await fs.writeFile(resolve(flag('out')),JSON.stringify(result,null,2)+'\n');
  console.log('Audited '+result.summary.total+'; failures: '+result.summary.failed+'; reviews: '+result.summary.review);
  const level=flag('fail-on','error');
  if (!['error','warning','never'].includes(level)) throw new Error('Invalid --fail-on: '+level);
  if (level==='warning' ? result.reports.some(r=>r.errors || r.warnings) : level==='error' && result.summary.failed) process.exitCode=1;
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().catch(e=>{console.error('Quality audit incomplete: '+e.message);process.exitCode=2;});
}
