import {renderFieldNotes} from '../recipes/field-notes.mjs';
import {renderPassageLog} from '../recipes/passage-log.mjs';
import {slugOK,https,validIso,kinds} from './safety.mjs';

export const RECIPES = Object.freeze({
  'field-notes': {render:renderFieldNotes, decision:'Interpret dated wildlife and seasonal records'},
  'passage-log': {render:renderPassageLog, decision:'Interpret a documented maritime passage'}
});
const DIMENSIONS = new Set(['decision','hierarchy','interaction','interpretation']);
const MODES = new Set(['enhance-existing','candidate-only']);
const words = value => String(value || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !['the','and','near','from','this','that','with','what','when','where','into'].includes(w));

/** Local registry relevance only; NOT age-segment search demand, click forecasts, or live status. */
export function inspectNetwork(query, registry, limit=8) {
  const tokens = [...new Set(words(query))];
  if (!tokens.length) throw Error('Provide a meaningful query.');
  const tools = (registry?.tools || []).map(tool => {
    const name = new Set(words(tool.name + ' ' + tool.id));
    const intent = new Set(words(tool.primaryIntent));
    const area = new Set(words([...(tool.geographies || []),tool.cluster].join(' ')));
    const overlap = tokens.filter(t=>name.has(t)||intent.has(t)||area.has(t));
    const score = tokens.reduce((sum,t)=>sum+(name.has(t)?5:0)+(intent.has(t)?3:0)+(area.has(t)?1:0),0);
    return {id:tool.id,name:tool.name,canonical:tool.canonical,primaryIntent:tool.primaryIntent,score,matchedTerms:overlap};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  return {query,method:'token overlap against local registry, not keyword research',possibleOwners:tools.slice(0,limit),warning:'Similarity is exploratory only. Inspect live behavior, owning repos, actual Google queries, and cannibalization groups before changing search ownership.'};
}
export function starter({recipe,slug,place,title,question}) {
  if (!RECIPES[recipe]) throw Error('Unknown recipe: '+recipe);
  if (!slugOK(slug)) throw Error('Slug must be lowercase kebab-case.');
  return {schemaVersion:1,status:'research-draft',slug,recipe,title:title||'Draft experience title',place:place||'Place not selected',question:question||'Visitor decision not yet researched',mode:'candidate-only',intentOwner:null,closestTools:[],distinctiveness:[],sources:[],records:[],constraints:{noNewCanonical:true,noPublicRoute:true,doNotInferLiveStatus:true},notes:'Fill the evidence, owner, and two-tool originality comparison. Previews are noindex; no automatic publication.'};
}
export function validateSpec(spec,registry) {
  const errors=[];
  if (!spec || typeof spec!=='object' || Array.isArray(spec)) return ['Specification must be an object.'];
  if (spec.schemaVersion!==1) errors.push('schemaVersion must be 1');
  if (!slugOK(spec.slug)) errors.push('slug must be lowercase kebab-case');
  if (!RECIPES[spec.recipe]) errors.push('recipe must be one of '+Object.keys(RECIPES).join(', '));
  for (const field of ['title','place','question']) if(typeof spec[field]!=='string'||spec[field].trim().length<8)errors.push(field+' must be a descriptive string');
  if (!MODES.has(spec.mode)) errors.push('mode must be enhance-existing or candidate-only');
  if (spec.status!=='review-ready') errors.push('status must be review-ready; drafts are not buildable');
  if (!spec.constraints?.noNewCanonical || !spec.constraints?.noPublicRoute || !spec.constraints?.doNotInferLiveStatus) errors.push('all three preview safety constraints must be true');
  const owners = new Set((registry?.tools||[]).map(t=>t.id));
  if (!Array.isArray(spec.closestTools)||new Set(spec.closestTools).size!==2||spec.closestTools.length!==2||spec.closestTools.some(x=>!owners.has(x))) errors.push('closestTools must name two distinct existing registry IDs');
  if (spec.mode==='enhance-existing' && !owners.has(spec.intentOwner)) errors.push('enhance-existing requires a valid existing intentOwner');
  if (!Array.isArray(spec.distinctiveness)||spec.distinctiveness.length<2||new Set((spec.distinctiveness||[]).map(x=>x.dimension)).size<2)errors.push('at least two distinct originality dimensions required');
  for(const d of (Array.isArray(spec.distinctiveness)?spec.distinctiveness:[]))if(!DIMENSIONS.has(d.dimension)||typeof d.reason!=='string'||d.reason.trim().length<30)errors.push('each originality dimension needs an allowed name and specific 30+ character reason');
  if(!Array.isArray(spec.sources)||!Array.isArray(spec.records))errors.push('sources and records must be arrays');
  const urls = new Set();
  for(const [i,s] of (Array.isArray(spec.sources)?spec.sources:[]).entries()) {
    if(!https(s.url)||typeof s.label!=='string'||s.label.trim().length<4)errors.push('source '+i+' needs HTTPS URL and label');
    else urls.add(s.url);
  }
  const ids = new Set();
  for (const [i,r] of (Array.isArray(spec.records)?spec.records:[]).entries()) {
    if (!slugOK(r.id)||ids.has(r.id))errors.push('record '+i+' needs unique kebab-case id');
    ids.add(r.id);
    if(typeof r.title!=='string'||r.title.trim().length<4||typeof r.summary!=='string'||r.summary.trim().length<12)errors.push('record '+i+' needs title and specific summary');
    if(!kinds.has(r.kind))errors.push('record '+i+' invalid evidence kind');
    if(!validIso(r.issuedAt))errors.push('record '+i+' requires timezone-aware issuedAt');
    if(!https(r.sourceUrl)||!urls.has(r.sourceUrl))errors.push('record '+i+' must link a declared HTTPS source');
    if(r.kind==='forecast'&&(!validIso(r.validUntil)||Date.parse(r.validUntil)<Date.parse(r.issuedAt)))errors.push('forecast '+i+' requires valid validUntil after issue');
    if(r.kind==='observation'&&validIso(r.issuedAt)&&Date.parse(r.issuedAt)>Date.now()+300000)errors.push('observation '+i+' cannot have a future issuedAt');
    if(r.kind==='observation'&&(!(r.maxAgeHours>0)||!Number.isFinite(r.maxAgeHours)))errors.push('observation '+i+' requires finite positive maxAgeHours');
    if(r.kind==='official-notice'&&(typeof r.scope!=='string'||r.scope.trim().length<5))errors.push('official notice '+i+' must state its access/notice scope');
    if(r.from!==undefined&&typeof r.from!=='string'||r.to!==undefined&&typeof r.to!=='string')errors.push('record '+i+' from/to must be text');
  }
  return errors;
}
export function compile(spec,registry) {
  const errors=validateSpec(spec,registry);
  if(errors.length)throw Error('Foundry validation failed:\n- '+errors.join('\n- '));
  const html=RECIPES[spec.recipe].render(spec);
  const lookup=new Map(registry.tools.map(t=>[t.id,t]));
  const report={
    schemaVersion:1,slug:spec.slug,recipe:spec.recipe,mode:spec.mode,intentOwner:spec.intentOwner||null,
    status:'generated-review-preview',newCanonicalCreated:false,sourceVerification:'NOT VERIFIED',browserQA:'NOT VERIFIED',
    production:'NOT DEPLOYED',searchOutcome:'NOT MEASURED',
    recordCount:spec.records.length,sourceCount:spec.sources.length,
    closestTools:spec.closestTools.map(id=>({id,canonical:lookup.get(id).canonical})),
    distinctiveness:spec.distinctiveness,
    hardGates:{
      sourceTruth:'REVIEW REQUIRED: URLs and timestamps structurally validated; source content not independently verified',
      visualDistinctiveness:'REVIEW REQUIRED: compare rendered first screen and interaction with both existing tools',
      publicRelease:'BLOCKED: preview intentionally noindex; existing ownership and site-wide CI required'
    },
    nextActions:['Research two external comparison experiences and record checked URLs','Verify each actual source claim, data rights, source time and route/access boundary','Browser QA at 360/390/768/1440, no-JS, keyboard, empty/stale/error and actual media','Run owning repository full CI and standard Experience OS v1.2.1 release evidence workflow','Do not publish a new route without registry/SEO/canonical ownership approval']
  };
  return {html,report};
}
