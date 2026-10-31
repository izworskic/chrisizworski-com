/**
 * EXPERIENCE_OS_V1 v1.2 evidence record contract.
 * Strictly structural. Passing this checker is NOT proof that a source is true,
 * a public page works, that an agency has opened a trail, or that conversion improved.
 * No network access, no dependencies, no production changes.
 */
import fs from 'node:fs';
import path from 'node:path';

const MUST_SCENARIOS=['initial','alternative','reverse','no-js','no-tiles','stale-data'];
const MUST_FAILURES=['no-js','no-tiles','no-image','stale-data'];
const VIEWPORTS=[360,390,768,1440];
const SUBJECTS=new Set(['route-guidance','park-access','weather-context','river-flow','parking-rule','photo-provenance','other']);
const KINDS=new Set(['official-reference','official-notice','observation','forecast','editorial','unverified','no-data']);
const CAPABILITIES={
 'official-reference':new Set(['route-guidance','parking-rule','other']),
 'official-notice':new Set(['park-access','route-guidance','parking-rule','other']),
 'observation':new Set(['river-flow','weather-context','other']),
 'forecast':new Set(['weather-context','other']),
 'editorial':new Set(['other']),
 'unverified':new Set(['park-access','route-guidance','parking-rule','weather-context','other']),
 'no-data':new Set(['river-flow','park-access','weather-context','other']),
};
const VALID_STATES={
 'official-reference':'SUPPORTED','official-notice':'SUPPORTED',
 'observation':'SUPPORTED','forecast':'SUPPORTED',
 'editorial':'EDITORIAL','unverified':'UNVERIFIED','no-data':'NO_DATA',
};
const RELEASE_LEVELS=['implemented','verified','deployed','live','measured'];
const matchDate=s=>typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s+'T00:00:00Z'));
const httpsUrl=s=>{
 try {const u=new URL(s);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password;}
 catch {return false;}
};
const isSha=s=>typeof s==='string'&&/^[0-9a-f]{40}$/i.test(s);
const isText=s=>typeof s==='string'&&s.trim().length>=8;
const safeRel=s=>typeof s==='string'&&!path.isAbsolute(s)&&!s.includes('..')&&/^[a-zA-Z0-9_./-]+$/.test(s);
const normUrl=s=>{try{const u=new URL(s);u.hash='';u.search='';return u.toString();}catch{return null;}};

export function validateReleaseRecord(record,{repoRoot=null,checkSite=false}={}){
 const issues=[];
 const bad=(code,description)=>issues.push({code,description});
 if(!record||typeof record!=='object'||Array.isArray(record))return {ok:false,issues:[{code:'record',description:'Expected a JSON record object'}]};
 if(record.schemaVersion!=='1.2')bad('schemaVersion','Use schemaVersion "1.2"');
 const p=record.project||{};
 if(!/^[a-z0-9][a-z0-9-]{2,80}$/.test(p.slug||''))bad('project.slug','A stable lowercase, hyphenated slug is required');
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(p.ownerRepo||''))bad('project.ownerRepo','A real owner/repository is required');
 if(!httpsUrl(p.canonical)||!p.canonical.endsWith('/'))bad('project.canonical','An exact HTTPS canonical ending with / is required');
 if(!safeRel(p.pageFile))bad('project.pageFile','A repository-relative source HTML path is required');
 if(!isText(p.visitorDecision))bad('project.visitorDecision','State the decision, not the name of a library or page');
 if(!isText(p.primaryAction))bad('project.primaryAction','State a concrete next visitor action');
 if(!['draft','released'].includes(record.recordStatus))bad('recordStatus','Use draft or released');

 const claims=record.claims;
 if(!Array.isArray(claims)||claims.length<2)bad('claims','Include at least two source/unknown claims');
 else {
  const ids=new Set();
  for(const c of claims){
   if(!c||!isText(c.id)||ids.has(c.id))bad('claims.id','Each claim needs a unique descriptive ID');
   if(c?.id)ids.add(c.id);
   if(!KINDS.has(c?.kind))bad('claims.kind',String(c?.id)+': unknown evidence kind');
   if(!SUBJECTS.has(c?.subject))bad('claims.subject',String(c?.id)+': unknown subject');
   if(!httpsUrl(c?.sourceUrl))bad('claims.sourceUrl',String(c?.id)+': exact HTTPS source link required');
   if(!matchDate(c?.checkedDate))bad('claims.checkedDate',String(c?.id)+': checkedDate needs YYYY-MM-DD');
   if(!isText(c?.limitation))bad('claims.limitation',String(c?.id)+': explain what the source cannot prove');
   if(KINDS.has(c?.kind)&&c.state!==VALID_STATES[c.kind])bad('claims.state',String(c?.id)+': kind '+c.kind+' must use state '+VALID_STATES[c.kind]);
   if(CAPABILITIES[c?.kind]&&!CAPABILITIES[c.kind].has(c.subject))bad('claims.scope',String(c?.id)+': '+c.kind+' cannot support '+c.subject);
   if(c?.kind==='official-notice'&&c?.subject==='park-access'&&!isText(c.accessScope))bad('claims.accessScope',String(c?.id)+': official access claim needs exact named access scope');
   if(c?.kind==='forecast'&&(!Number.isInteger(c.maxAgeMinutes)||c.maxAgeMinutes<=0))bad('claims.forecastAge',String(c?.id)+': forecast must specify an expiry policy in minutes');
   if(c?.kind==='observation'){
    const m=c.measurement;
    if(!m||!Number.isFinite(m.value)||typeof m.unit!=='string'||!m.unit.trim()||
       !isText(m.stationId)||typeof m.observedAt!=='string'||!Number.isFinite(Date.parse(m.observedAt)))
      bad('claims.observationProvenance',String(c?.id)+': observed measurement requires value, unit, station ID and timestamp; a monitoring site alone is not a live observation');
   }
  }
  // A forecast does not establish a trail opening, and a no-data gauge cannot establish flow.
  const hasParkClaim=claims.some(c=>c?.subject==='park-access');
  if(hasParkClaim&&!claims.some(c=>c?.subject==='park-access'&&['official-notice','unverified','no-data'].includes(c.kind)))
   bad('claims.accessTruth','Park access must be an official scoped notice or explicitly unknown');
 }
 const state=record.decisionState||{};
 if(!isText(state.selectedIdField))bad('decisionState.selectedIdField','Identify the single selected ID field');
 if(!isText(state.sourceOfTruth))bad('decisionState.sourceOfTruth','Describe the decision-engine source of truth');
 if(!Array.isArray(state.linkedSurfaces)||!state.linkedSurfaces.includes('answer'))bad('decisionState.linkedSurfaces','Include the primary answer and all connected surfaces');
 if(!isText(state.unavailableBehavior))bad('decisionState.unavailableBehavior','State what happens when the selected feature is unavailable');

 const scenarios=record.scenarios;
 if(!Array.isArray(scenarios))bad('scenarios','Provide representative changed-state and failure scenarios');
 else {
  for(const kind of MUST_SCENARIOS){
   const a=scenarios.filter(x=>x?.kind===kind);
   if(a.length===0)bad('scenarios.'+kind,'Required '+kind+' scenario missing');
   for(const s of a){
    if(!isText(s.expectedVisibleAnswer))bad('scenarios.expectedVisibleAnswer',kind+': describe a visitor-visible meaningful answer');
    if(!isText(s.sourceAndSafety))bad('scenarios.sourceAndSafety',kind+': explain status/unknown source behavior');
   }
  }
 }
 const failures=record.failures||{};
 for(const kind of MUST_FAILURES){
  if(!isText(failures[kind]))bad('failures.'+kind,'Explain an actionable '+kind+' fallback');
 }
 const qa=record.qa||{};
 if(!Array.isArray(qa.viewports)||VIEWPORTS.some(v=>!qa.viewports.includes(v)))bad('qa.viewports','Include 360, 390, 768, 1440px checks');
 if(!['PENDING','PASSED','FAILED'].includes(qa.browserStatus))bad('qa.browserStatus','Browser status must be PENDING, PASSED or FAILED');
 if(qa.browserStatus==='PASSED'&&!httpsUrl(qa.browserRun))bad('qa.browserRun','Passed browser QA needs a real run URL');
 if(qa.browserStatus==='PASSED'&&(!Array.isArray(qa.screenshotEvidence)||qa.screenshotEvidence.length===0||!qa.screenshotEvidence.every(httpsUrl)))
  bad('qa.screenshots','Passed browser QA needs an inspected screenshot evidence URL');
 const images=record.photos||[];
 if(!Array.isArray(images))bad('photos','Photos must be an array, which can be empty');
 else for(const im of images){
  if(!httpsUrl(im?.sourceUrl)||!isText(im?.depictedSubject)||!isText(im?.author)||!isText(im?.license)||!httpsUrl(im?.creditUrl))
   bad('photos.provenance','Each photo requires actual subject, author, license, image source and credit link');
  if(!['exact','contextual'].includes(im?.subjectMatch))bad('photos.subjectMatch','Label exact subject versus contextual photo');
  if(im?.subjectMatch==='contextual'&&!isText(im.disclosure))bad('photos.disclosure','Contextual imagery must visibly disclose the actual subject');
 }
 const release=record.release||{};
 let priorConfirmed=true;
 for(const step of RELEASE_LEVELS){
  const row=release[step]||{};
  const allowed=step==='measured'?['CONFIRMED','NOT_MEASURED','PENDING']:['CONFIRMED','PENDING','NOT_VERIFIED'];
  if(!allowed.includes(row.status))bad('release.'+step,'Use a valid explicit release evidence status');
  if(row.status==='CONFIRMED'){
   if(!priorConfirmed)bad('release.order',step+' cannot be confirmed while preceding stage is unverified');
   if(!httpsUrl(row.evidenceUrl))bad('release.'+step+'.url',step+' needs a checked evidence URL');
   if(!matchDate(row.checkedDate))bad('release.'+step+'.date',step+' needs a date checked');
   if(step==='deployed'&&!isSha(row.commitSha))bad('release.deployed.sha','Deployed claim needs an exact 40-character production commit');
   if(step==='live'&&normUrl(row.publicUrl)!==normUrl(p.canonical))bad('release.live.canonical','Live claim must refer to this public canonical');
   if(step==='measured'&&!isText(row.comparisonWindow))bad('release.measured.window','Visitor outcomes require a comparable measured window');
  } else if(step!=='measured') priorConfirmed=false;
 }
 if(record.recordStatus==='released'){
  for(const step of ['implemented','verified','deployed','live'])
   if(release[step]?.status!=='CONFIRMED')bad('recordStatus.release','Released records must prove '+step+' or stay draft');
 }
 if(checkSite) {
  if(!repoRoot)bad('checkSite','A local repoRoot is required for on-disk discovery checks');
  else issues.push(...auditSite(record,repoRoot));
 }
 return {ok:issues.length===0,issues,counts:{claims:Array.isArray(claims)?claims.length:0,scenarios:Array.isArray(scenarios)?scenarios.length:0,photos:Array.isArray(images)?images.length:0}};
}

/** Optional source-file integration audit, never an external availability or browser test. */
export function auditSite(record,repoRoot){
 const issues=[];
 const bad=(code,description)=>issues.push({code,description});
 const p=record.project||{};
 if(p.ownerRepo!=='izworskic/chrisizworski-com'){bad('site.owner','Only current central-site structure is supported; use owning-repo checks elsewhere');return issues;}
 if(!safeRel(p.pageFile)){bad('site.path','Unsafe page source path');return issues;}
 const read=rel=>{try{return fs.readFileSync(path.join(repoRoot,rel),'utf8');}catch{bad('site.missing','Cannot read '+rel);return null;}};
 const html=read(p.pageFile),tools=read('public/tools/index.html'),map=read('public/sitemap.xml');
 const registryRaw=read('benchmarks/tool-network-registry.json');
 const canonical=p.canonical,slug=p.slug;
 if(html&&!html.includes('rel="canonical" href="'+canonical+'"'))bad('site.canonical','Canonical not present in page HTML');
 if(tools){
  const card='data-tool-id="'+slug+'"';
  if(tools.split(card).length-1!==1)bad('site.toolsCard','Tools directory must contain exactly one matching card');
  const block=tools.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if(!block)bad('site.itemList','Tools ItemList JSON-LD missing');
  else try{
   const graph=JSON.parse(block[1])['@graph'];
   const list=graph.find(x=>x['@type']==='ItemList');
   const items=list?.itemListElement||[];
   if(items.filter(x=>x.item?.url===canonical).length!==1)bad('site.itemList','Tools ItemList needs exactly one canonical item');
   if(list?.numberOfItems!==items.length||items.some((x,i)=>x.position!==i+1))bad('site.itemListOrder','Tools ItemList count and numeric positions inconsistent');
   // The displayed order is authoritative; enforce index alignment for this tool.
   const cards=[...tools.matchAll(/data-tool-id="([^"]+)"/g)].map(x=>x[1]);
   const cardIndex=cards.indexOf(slug),itemIndex=items.findIndex(x=>x.item?.url===canonical);
   if(cardIndex<0||itemIndex<0)bad('site.catalog','Missing card or ItemList item');
   else if(registryRaw){
    try {
     const catalog=JSON.parse(registryRaw);
     const canonicalById=new Map(catalog.tools.map(x=>[x.id,x.canonical]));
     const listUrls=new Set(items.map(x=>x.item?.url));
     const mappedCardOrder=cards.map(id=>canonicalById.get(id)).filter(url=>listUrls.has(url));
     const mappedItemOrder=items.map(x=>x.item?.url).filter(url=>mappedCardOrder.includes(url));
     if(mappedCardOrder.length===mappedItemOrder.length&&mappedCardOrder.some((url,i)=>mappedItemOrder[i]!==url))
      bad('site.catalogOrder','Tools visible cards and ItemList canonical order disagree');
    }catch {bad('site.catalogRegistry','Unable to reconcile directory order with registry');}
   }
  }catch{bad('site.itemListJSON','Invalid Tools JSON-LD');}
 }
 if(map&&map.split('<loc>'+canonical+'</loc>').length-1!==1)bad('site.sitemap','Sitemap must include exactly one canonical');
 if(registryRaw)try{
  const r=JSON.parse(registryRaw);
  if(r.tools.filter(x=>x.id===slug&&x.canonical===canonical).length!==1)bad('site.registry','Registry needs one matching ID and canonical');
  if(!r.relationships.some(x=>x.from===slug||x.to===slug))bad('site.relationship','Registry requires a directed relationship');
 }catch{bad('site.registryJSON','Invalid registry JSON');}
 return issues;
}
export const requiredExperienceScenarios=Object.freeze([...MUST_SCENARIOS]);
