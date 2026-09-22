#!/usr/bin/env node
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const sitemapPath=path.join(root,'public/sitemap.xml');
const xml=await readFile(sitemapPath,'utf8');
const locs=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].trim());
const exactCounts=new Map();
for(const loc of locs) exactCounts.set(loc,(exactCounts.get(loc)||0)+1);
const duplicateLocs=[...exactCounts].filter(([,n])=>n>1).map(([url,count])=>({url,count}));

const detroit=new Set([
  'https://chrisizworski.com/detroit-outdoors/',
  'https://chrisizworski.com/detroit-river-freighters/',
  'https://chrisizworski.com/detroit-birding-today/',
  'https://chrisizworski.com/lake-st-clair-outdoors/',
  'https://chrisizworski.com/detroit-sunset-tonight/'
]);

const fileFor=loc=>{
  const u=new URL(loc);
  if(u.hostname!=='chrisizworski.com') return null;
  const p=decodeURIComponent(u.pathname);
  if(p==='/') return path.join(root,'public/index.html');
  if(p.endsWith('/')) return path.join(root,'public',p.slice(1),'index.html');
  if(p.endsWith('.html')) return path.join(root,'public',p.slice(1));
  return path.join(root,'public',p.slice(1),'index.html');
};
const rows=[];
for(const loc of locs){
  const file=fileFor(loc);
  if(!file) continue;
  try{await access(file)}catch{
    rows.push({loc,file:path.relative(root,file),status:'missing-file',canonical:null});
    continue;
  }
  const html=await readFile(file,'utf8');
  const match=html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)||
              html.match(/<link\s+href=["']([^"']+)["']\s+rel=["']canonical["']/i);
  const canonical=match?match[1].trim():null;
  rows.push({
    loc,
    file:path.relative(root,file),
    status:!canonical?'missing-canonical':canonical===loc?'ok':'canonical-mismatch',
    canonical
  });
}
const canonicalOwners=new Map();
for(const row of rows){
  if(!row.canonical)continue;
  const key=row.canonical.replace(/\/+$/,'').toLowerCase();
  if(!canonicalOwners.has(key))canonicalOwners.set(key,[]);
  canonicalOwners.get(key).push(row.loc);
}
const duplicateCanonicals=[...canonicalOwners.entries()]
  .filter(([,urls])=>new Set(urls).size>1)
  .map(([canonical,urls])=>({canonical,urls:[...new Set(urls)]}));
const missingCanonical=rows.filter(r=>r.status==='missing-canonical');
const mismatches=rows.filter(r=>r.status==='canonical-mismatch');
const missingFiles=rows.filter(r=>r.status==='missing-file');
const detroitIssues=rows.filter(r=>detroit.has(r.loc)&&r.status!=='ok');
const detroitMissing=[...detroit].filter(url=>!locs.includes(url));

console.log('\nSITEMAP / CANONICAL INDEXING AUDIT');
console.log('='.repeat(72));
console.log('Sitemap URLs:',locs.length);
console.log('Exact duplicate sitemap URLs:',duplicateLocs.length);
console.log('Sitemapped local pages missing files:',missingFiles.length);
console.log('Sitemapped pages missing canonical tags:',missingCanonical.length);
console.log('Sitemapped pages whose canonical differs from sitemap URL:',mismatches.length);
console.log('Multiple sitemap URLs sharing one canonical:',duplicateCanonicals.length);
console.log('Detroit cluster canonical issues:',detroitIssues.length+detroitMissing.length);
if(duplicateLocs.length) console.log('Duplicate sitemap URLs:',duplicateLocs);
if(missingCanonical.length) console.log('Missing canonical sample:',missingCanonical.slice(0,30));
if(mismatches.length) console.log('Canonical mismatch sample:',mismatches.slice(0,30));
if(duplicateCanonicals.length) console.log('Shared canonical sample:',duplicateCanonicals.slice(0,30));
if(missingFiles.length) console.log('Missing file sample:',missingFiles.slice(0,30));
if(detroitIssues.length||detroitMissing.length) console.log('Detroit issues:',{detroitIssues,detroitMissing});

const check=process.argv.includes('--check');
if(check&&(duplicateLocs.length||duplicateCanonicals.length||detroitIssues.length||detroitMissing.length)){
  console.error('audit:canonical-indexing FAIL');
  process.exitCode=1;
}else if(check){
  console.log('audit:canonical-indexing PASS');
}
