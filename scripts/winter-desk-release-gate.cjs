#!/usr/bin/env node
/* Pre-publication gate for the Lake Superior Winter Field Assignment Desk.
 * Offline checks are a prerequisite, never a substitute for a source review
 * or real-browser proof. A preview PASS is not a public release authorization.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const base=path.join(root,'previews/great-lakes-winter-desk');
const published=path.join(root,'public/great-lakes-winter-field-desk');
const ids=['gooseberry-upper','munising-snowshoe','meyers-lakeshore'];
const args=new Set(process.argv.slice(2));
const publicMode=args.has('--release');
if(args.has('--preview')&&publicMode)throw Error('Choose preview or release, not both');
function read(file){return fs.readFileSync(path.join(base,file),'utf8')}
function json(file){return JSON.parse(read(file))}
const violations=[],blockers=[],checks=[];
function requireCheck(ok,label){checks.push({label,passed:!!ok});if(!ok)violations.push(label)}
function daysAgo(stamp){
  const time=new Date(stamp).getTime();
  return Number.isFinite(time)?(Date.now()-time)/3600000:Infinity;
}
try{
  const html=read('index.html'),core=read('core.js'),app=read('app.js');
  const arrival=json('arrival-evidence.json'),route=json('route-access-evidence.json');
  const conditions=json('source-checks.json'),notices=json('operator-notice-monitor.json');
  const publishedHtml=fs.readFileSync(path.join(published,'index.html'),'utf8');
  const pageGraph=JSON.parse((publishedHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)||[])[1]||'{}');
  const pageNodes=Array.isArray(pageGraph['@graph'])?pageGraph['@graph']:[];
  const personId='https://chrisizworski.com/#person';
  const person=pageNodes.find(node=>node['@type']==='Person'&&node['@id']===personId);
  const page=pageNodes.find(node=>node['@type']==='WebPage'&&node['@id']==='https://chrisizworski.com/great-lakes-winter-field-desk/#page');
  requireCheck(!!person&&person.name==='Chris Izworski'&&page?.author?.['@id']===personId&&page?.publisher?.['@id']===personId,
    'published pilot contains Person graph and page author and publisher references');
  requireCheck(/name="robots" content="noindex,nofollow,noarchive"/.test(publishedHtml)&&!/rel="canonical"|pagead2\.googlesyndication/i.test(publishedHtml),
    'published research pilot remains noindex without canonical or injected ads');
  requireCheck(/© 2026 Chris Izworski/.test(publishedHtml),'published pilot has visible credited footer');
  for(const name of ['source-checks.json','operator-notice-monitor.json']){
    requireCheck(read(name)===fs.readFileSync(path.join(published,name),'utf8'),
      'reviewed '+name+' is identical in preview and published pilot');
  }

  requireCheck(/name="robots" content="noindex,nofollow,noarchive"/.test(html),'preview remains intentionally noindex');
  requireCheck(!/rel="canonical"|pagead2\.googlesyndication/i.test(html),'no accidental canonical or ad insertion');
  requireCheck(/id="quick-outing"/.test(html)&&/id="route-access"/.test(html)&&/id="arrival-title"/.test(html),'real first-screen answer plus access and parking desk');
  requireCheck(/<noscript>/.test(html)&&/id="arrival-evidence-link"/.test(html),'static source and arrival fallback');
  requireCheck(route.schemaVersion===1&&route.operatorAccessReady===false,'operator access is not auto-certified');
  requireCheck(arrival.schemaVersion===1&&Object.keys(arrival.places||{}).length===3,'all three exact parking records exist');
  requireCheck(conditions.schemaVersion===1&&conditions.accessVerified===false,'conditions do not assert route access');
  requireCheck(notices.schemaVersion===1&&notices.accessVerified===false,'official phrase scan does not assert route access');
  for(const id of ids){
    const routeRow=route.routes?.[id],arrivalRow=arrival.places?.[id],condition=conditions.places?.[id],notice=notices.places?.[id];
    requireCheck(!!routeRow&&routeRow.routeId===id&&Array.isArray(routeRow.observations),'exact-route identity '+id);
    requireCheck(!!arrivalRow&&arrivalRow.routeOpenToday===false&&arrivalRow.verifiedArrivalCoordinates===false,'no invented parking/open claim '+id);
    requireCheck(!!condition&&condition.operatorAccess==='NOT_DETERMINED','conditions never open a trail '+id);
    requireCheck(!!notice&&notice.operatorAccess==='NOT_DETERMINED','notice presence never opens a trail '+id);
  }
  requireCheck(/routeAccess\(/.test(core)&&/routeAccess\(state\.routeDocument/.test(app),'selected-day access model is wired into UI');
  requireCheck(/arrivalEvidence\(/.test(core)&&/operatorNotice\(/.test(core),'arrival and operator statements remain separate evidence');
  const officialObservations=ids.reduce((n,id)=>n+(route.routes?.[id]?.observations?.length||0),0);
  if(officialObservations===0)blockers.push('No date-scoped exact-trail operating reports have been reviewed for visitor access');
  if(daysAgo(conditions.generatedAt)>24)blockers.push('Checked-in conditions snapshot is older than 24 hours');
  if(daysAgo(notices.generatedAt)>24)blockers.push('Checked-in official statement snapshot is older than 24 hours');
  blockers.push('Human review of original photo licensing, visitor arrival and seasonal access is not signed off');
  blockers.push('No approved public route with canonical, site-network ads and production smoke exists');
}catch(err){violations.push('Missing or invalid preview source: '+err.message)}
const report={
  schemaVersion:1,mode:publicMode?'release':'preview',
  structuralPass:violations.length===0,
  status:violations.length?'FAIL':publicMode?'HOLD':'PREVIEW_PASS',
  publicLaunchApproved:false,
  checks:checks.length,failed:violations,releaseBlockers:blockers,
  note:'Passing preview checks never establishes trail opening, road plowing, ice safety, or authorization to publish.'
};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(violations.length)process.exitCode=1;
else if(publicMode)process.exitCode=3;
