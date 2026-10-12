'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../public/assets/epic-ikon-2026-27.js');
const {buildGuide,decideWithJev,primaryStep,PLACE_NOTES}=require('../lib/epic-ikon/guide.js');
const api=require('../api/epic-ikon-guide.js');
const here=path.resolve(__dirname,'..');
const trip=(over={})=>({pass:'epicLocal',resort:'vail',date:'2026-12-31',usedDays:'0',reservationMade:'unknown',epicDayTotal:'',epicPeak:'',sessionTotal:'',intent:'first',...over});

test('Blackout is immutable and next date never masquerades as an open resort',()=>{
 const v=buildGuide(trip());
 assert.equal(v.verdict.status,'NO');
 assert.equal(v.verdict.reason,'blackout');
 assert.equal(v.step.id,'CHANGE_DATE');
 assert.match(v.story.why,/published restriction/i);
 assert.match(v.story.intro,/Back Bowls/);
 assert.equal(v.choices[0].id,'NEXT_DATE');
 assert.match(v.choices[0].explanation,/not an opening guarantee/i);
});
test('Full Epic Vail holiday remains rules-eligible; first action verifies mountain',()=>{
 const v=buildGuide(trip({pass:'epic'}));
 assert.equal(v.verdict.status,'YES');
 assert.equal(v.step.id,'VERIFY_RESORT');
 assert.match(v.story.why,/not.*open/i);
});
test('Jackson reservation remains mandatory no matter what JEV selects',async()=>{
 const input=trip({pass:'ikon',resort:'jackson-hole',date:'2027-01-12',intent:'terrain'});
 const v=await decideWithJev(input,{decide:async request=>{
  assert.equal(request.fallbackId,'RESERVATION');
  assert.ok(!request.options['PLAN_ANYWAY']);
  return {mode:'shared-harness-jev',choiceId:'MOUNTAIN_CHARACTER',confidence:0.99};
 }});
 assert.equal(v.verdict.status,'ACTION');
 assert.equal(v.step.id,'RESERVE');
 assert.equal(v.focusId,'MOUNTAIN_CHARACTER');
 assert.match(v.story.intro,/Tram/);
});
test('JEV invented choice, errors and missing credentials never alter policy',async()=>{
 const input=trip({pass:'ikonBase',resort:'aspen-mountain',date:'2027-01-12'});
 const det=buildGuide(input);
 assert.equal(det.verdict.status,'NO');
 assert.equal(det.step.id,'CHECK_PRODUCT');
 const invalid=await decideWithJev(input,{decide:async()=>({mode:'shared-harness-jev',choiceId:'SKI_ANYWAY',confidence:1})});
 assert.equal(invalid.verdict.status,'NO');
 assert.equal(invalid.focusId,det.choices[0].id);
 const fallback=await decideWithJev(input,{decide:async()=>({mode:'deterministic',choiceId:det.choices[0].id})});
 assert.equal(fallback.verdict.status,'NO');
 assert.equal(fallback.editor,'deterministic');
});
test('Ikon Snowmass days are combined and no booking can be inferred',()=>{
 const a=buildGuide(trip({pass:'ikon',resort:'snowmass',date:'2027-01-12',usedDays:''}));
 assert.equal(a.verdict.status,'CHECK');
 assert.equal(a.step.id,'COUNT_DAYS');
 assert.match(a.story.pool,/Aspen Snowmass/);
 const b=buildGuide(trip({pass:'ikon',resort:'snowmass',date:'2027-01-12',usedDays:'7'}));
 assert.equal(b.verdict.status,'NO');
 assert.equal(b.step.id,'CHECK_ACCOUNT');
 const c=buildGuide(trip({pass:'ikonBase',resort:'snowmass',date:'2027-01-12',usedDays:'0'}));
 assert.equal(c.verdict.status,'YES');
 const d=buildGuide(trip({pass:'ikonBase',resort:'aspen-highlands',date:'2027-01-12',usedDays:'0'}));
 assert.equal(d.verdict.status,'NO');
});
test('Epic Day missing purchased days or peak option never returns YES',()=>{
 const a=buildGuide(trip({pass:'epicDay',epicDayTotal:'',epicPeak:''}));
 assert.equal(a.verdict.status,'UNKNOWN');
 assert.equal(a.step.id,'DETAILS');
});
test('Experiential source notes are curated, factual and differentiated; others have honest fallback',()=>{
 for(const id of ['vail','breckenridge','jackson-hole','snowmass','deer-valley','whistler-blackcomb']){
   assert.match(PLACE_NOTES[id].source,/^https:\/\//);
   assert.ok(PLACE_NOTES[id].setting.length>50);
 }
 const other=buildGuide(trip({pass:'epic',resort:'mt-brighton',date:'2027-01-12'}));
 assert.equal(other.verdict.status,'YES');
 assert.match(other.story.intro,/published Epic network/);
 assert.doesNotMatch(other.story.intro,/Back Bowls|Aerial Tram/i);
});
test('Official JSON route returns authoritative policy; API is server-side and POST-only',async()=>{
 function fake(method,body){
  const headers={};
  const req={method,body,headers:{}};
  const res={statusCode:200,headers,setHeader(k,v){headers[k]=v;return this},status(code){this.statusCode=code;return this},json(data){this.body=data;return this}};
  return api(req,res).then(()=>res);
 }
 const read=await fake('GET',null);
 assert.equal(read.statusCode,405);
 const output=await fake('POST',trip());
 assert.equal(output.statusCode,200);
 assert.equal(output.body.verdict.status,E.evaluate(trip()).status);
 assert.equal(output.body.step.id,'CHANGE_DATE');
 assert.equal(output.headers['Cache-Control'],'no-store, max-age=0');
 assert.doesNotMatch(JSON.stringify(output.body),/HARNESS_ACCESS_KEY|Bearer /);
});
test('V2 uses the existing canonical, identity and one deliberate JEV request, with credited place-true images',()=>{
 const html=fs.readFileSync(path.join(here,'public/epic-ikon-pass/index.html'),'utf8');
 const css=fs.readFileSync(path.join(here,'public/assets/epic-ikon-decoder.css'),'utf8');
 assert.match(html,/https:\/\/chrisizworski.com\/epic-ikon-pass\//);
 assert.match(html,/https:\/\/chrisizworski.com\/#person/);
 assert.equal((html.match(/pagead2.googlesyndication.com\/pagead\/js\/adsbygoogle.js/g)||[]).length,1);
 assert.match(html,/id="visit-style"/);
 assert.match(html,/id="experience"/);
 assert.match(html,/data-example="vail"/);
 assert.match(html,/data-example="jackson"/);
 assert.match(html,/\/api\/epic-ikon-guide/);
 assert.match(html,/form.addEventListener\("submit"/);
 assert.match(html,/guideFallback\(\)/);
 assert.match(html,/MEDIA\[resort\.value\]/);
 assert.match(html,/CC BY-SA 4\.0/);
 assert.match(html,/Representative file photo, not current conditions/);
 assert.match(css,/\.experience-main/);
 assert.match(css,/@media\(max-width:530px\)/);
 assert.match(css,/\[hidden\]\{display:none!important\}/);
 assert.match(html,/official_outbound/);
});
