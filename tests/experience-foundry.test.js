import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {starter,validateSpec,inspectNetwork,compile} from '../experience-foundry/lib/foundry.mjs';
import {qualification} from '../experience-foundry/lib/safety.mjs';

const registry={tools:[
  {id:'phenology',name:'Michigan Phenology',canonical:'https://phenology.example/',primaryIntent:'seasonal wildlife changes',geographies:['michigan']},
  {id:'birding',name:'Michigan Birding',canonical:'https://birds.example/',primaryIntent:'bird migration observations',geographies:['michigan']},
  {id:'ships',name:'Great Lakes Ships',canonical:'https://ships.example/',primaryIntent:'vessel movement through Great Lakes',geographies:['great-lakes']}
]};
function spec(recipe='field-notes'){
  return {
    schemaVersion:1,status:'review-ready',slug:'spec-test',recipe,title:'A source-led experience',
    place:'Illustrative location',question:'What changed in this explicitly synthetic test?',
    mode:'enhance-existing',intentOwner:'phenology',
    closestTools:['phenology','birding'],
    distinctiveness:[
      {dimension:'decision',reason:'Tests a dated evidence decision rather than a generic travel catalog.'},
      {dimension:'interaction',reason:'Uses evidence categories and reversible selection instead of a decorative map.'}
    ],
    constraints:{noNewCanonical:true,noPublicRoute:true,doNotInferLiveStatus:true},
    sources:[{label:'Synthetic unit-test source',url:'https://example.com/test'}],
    records:[]
  };
}
const record={id:'test-record',title:'Synthetic record',summary:'Synthetic content, not an observation of a real place.',kind:'observation',issuedAt:'2020-01-01T12:00:00Z',maxAgeHours:12,sourceUrl:'https://example.com/test'};
test('new specs are research-drafts and fail closed until reviewed',()=>{
  const s=starter({recipe:'field-notes',slug:'testing'});
  assert.equal(s.status,'research-draft');
  assert.match(validateSpec(s,registry).join(' '),/review-ready/);
});
test('registry discovery reuses existing intent owners without inventing search demand',()=>{
  const r=inspectNetwork('Michigan bird migration',registry);
  assert.equal(r.possibleOwners[0].id,'birding');
  assert.match(r.warning,/Google queries/);
});
test('field notes create noindex HTML with evidence filter and explicit stale label',()=>{
  const s=spec();s.records=[record];
  const {html,report}=compile(s,registry);
  assert.match(html,/name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(html,/Field journal/);
  assert.match(html,/evidence-filter/);
  assert.match(html,/STALE OBSERVATION/);
  assert.equal(report.newCanonicalCreated,false);
  assert.equal(report.browserQA,'NOT VERIFIED');
});
test('passage log has a distinct selection model with source-linked provenance',()=>{
  const s=spec('passage-log');s.records=[{...record,kind:'historical',from:'Illustrative origin',to:'Illustrative destination'}];
  const {html}=compile(s,registry);
  assert.match(html,/Passage archive/);
  assert.match(html,/aria-pressed="true"/);
  assert.match(html,/All dated records \(works without JavaScript\)/);
  assert.doesNotMatch(html,/class="desk"/);
  assert.doesNotMatch(html,/live AIS position[^<]*<\/strong>/);
});
test('unsafe markup is escaped in both recipes',()=>{
  for(const recipe of ['field-notes','passage-log']){
    const s=spec(recipe);s.title='<script>alert("x")</script>';
    s.records=[{...record,title:'<img src=x onerror=alert(1)>',kind:'historical'}];
    const {html}=compile(s,registry);
    assert.doesNotMatch(html,/<img src=x/);
    assert.doesNotMatch(html,/<script>alert/);
    assert.match(html,/&lt;script&gt;/);
  }
});
test('structural and scientific truth gates reject unsourced, undated and expiring forecasts',()=>{
  const s=spec();s.records=[{...record,sourceUrl:'https://other.example/',issuedAt:'2026-03-15',kind:'forecast'}];
  const e=validateSpec(s,registry).join(' ');
  assert.match(e,/timezone-aware/);
  assert.match(e,/declared HTTPS source/);
  assert.match(e,/validUntil/);
  assert.equal(qualification({...record,kind:'forecast',validUntil:'2020-01-03T00:00:00Z'}),'EXPIRED FORECAST — not current');
});
test('no duplicate owners, generic one-dimensional comparison or fabricated public route',()=>{
  const s=spec();s.closestTools=['phenology','phenology'];
  s.distinctiveness=[s.distinctiveness[0],{...s.distinctiveness[0]}];
  s.constraints.noPublicRoute=false;
  const errors=validateSpec(s,registry).join(' ');
  assert.match(errors,/two distinct/);
  assert.match(errors,/originality dimensions/);
  assert.match(errors,/preview safety/);
});
test('empty inputs render truthful no-data pages in both independent designs',()=>{
  for(const recipe of ['field-notes','passage-log']){
    const {html}=compile(spec(recipe),registry);
    assert.match(html,/No (qualified field records supplied|source-linked passages supplied)/);
    assert.match(html,/NOT A LIVE CONDITIONS REPORT/);
  }
});

test('CLI builds a noindex preview and review report, then cleans test output',()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const folder='build/experience-foundry/cli-smoke-'+process.pid+'-'+Date.now();
  const target=path.join(root,folder);
  try{
    const result=spawnSync(process.execPath,['scripts/experience-foundry.mjs','build','--spec','experience-foundry/examples/saginaw-field-notes.json','--out',folder],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr||result.stdout);
    assert.match(fs.readFileSync(path.join(target,'index.html'),'utf8'),/noindex,nofollow/);
    const review=JSON.parse(fs.readFileSync(path.join(target,'review.json'),'utf8'));
    assert.equal(review.newCanonicalCreated,false);
    assert.equal(review.sourceVerification,'NOT VERIFIED');
  } finally { fs.rmSync(target,{recursive:true,force:true}); }
});

test('scoped notices must display their scope; future observations fail',()=>{
  const s=spec('field-notes');
  s.records=[{...record,kind:'official-notice',scope:'Illustrative lock gate only'}];
  const html=compile(s,registry).html;
  assert.match(html,/Notice scope: Illustrative lock gate only/);
  s.records=[{...record,issuedAt:'2099-01-01T00:00:00Z'}];
  assert.match(validateSpec(s,registry).join(' '),/future issuedAt/);
});
