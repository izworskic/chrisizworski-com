'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {RESORTS}=require('../lib/michigan-ski/resorts');
const {SOURCES,parse,reportDate,classifyParsed,fetchOfficial,MAX_REPORT_AGE_MS}=require('../lib/michigan-ski/official-reports');
const {hubTitle,titleCanClaimOpen}=require('../lib/michigan-ski/title-gate');
const root=path.join(__dirname,'..'),at=Date.parse('2026-11-23T13:00:00Z');
test('16 approved operator reports, each parser has real HTML evidence fixture',()=>{
 const hills=RESORTS.filter(r=>r.kind==='downhill');
 assert.equal(hills.length,17);
 assert.equal(Object.keys(SOURCES).length,16);
 assert.equal(SOURCES['alpine-valley'],undefined);
 for(const [slug,source] of Object.entries(SOURCES)){
  assert.ok(hills.some(r=>r.slug===slug),slug);
  assert.ok(new URL(source.url).protocol==='https:',slug);
  assert.ok(!/onthesnow|skiresort\.info/i.test(source.url),slug);
  const file=path.join(root,'tests/fixtures/michigan-ski',slug+'.html');
  assert.ok(fs.existsSync(file),'missing '+slug+' fixture');
  const html=fs.readFileSync(file,'utf8');
  assert.ok(html.includes('Captured from '+source.url),'source evidence: '+slug);
  const parsed=parse(slug,html);
  const result=classifyParsed(parsed,at);
  assert.ok(['OPEN_PER_OPERATOR','CLOSED_PER_OPERATOR','STALE_REPORT','UNVERIFIED'].includes(result.status),slug);
  if(result.status==='OPEN_PER_OPERATOR'){
   assert.ok(result.lifts.open>0,slug);
   assert.ok(at-Date.parse(result.reportUpdatedAt)<=MAX_REPORT_AGE_MS,slug);
  }
  if(result.lifts?.total!=null)assert.ok(result.lifts.open<=result.lifts.total,slug);
  if(result.trails?.total!=null)assert.ok(result.trails.open<=result.trails.total,slug);
 }
});
test('dated operator lift reports define open/closed, never a fetch timestamp',()=>{
 const basis={reportUpdatedAt:'2026-11-23T05:00:00Z',lifts:{open:2,total:5},trails:{open:4,total:25}};
 assert.equal(classifyParsed(basis,at).status,'OPEN_PER_OPERATOR');
 assert.equal(classifyParsed({...basis,lifts:{open:0,total:5}},at).status,'CLOSED_PER_OPERATOR');
 assert.equal(classifyParsed(basis,Date.parse(basis.reportUpdatedAt)+MAX_REPORT_AGE_MS).status,'OPEN_PER_OPERATOR');
 assert.equal(classifyParsed(basis,Date.parse(basis.reportUpdatedAt)+MAX_REPORT_AGE_MS+1).status,'STALE_REPORT');
 assert.equal(classifyParsed({...basis,reportUpdatedAt:null},at).status,'UNVERIFIED');
 assert.equal(classifyParsed({...basis,lifts:null},at).status,'UNVERIFIED');
 assert.equal(classifyParsed({...basis,operatorStatusText:'ANTICIPATED OPENING DAY OF THE 2026/2027 SEASON IS DECEMBER 5th'},at).status,'UNVERIFIED');
});
test('stale 2025/26 open message and malformed operator snippets cannot claim open today',()=>{
 const html='We are OPEN for the 2025/2026 season. Season passes are available. Current Conditions. Chair Lift #1: Closed Chair Lift #2: Closed Chair Lift #3: Closed. This is not a dated 2026/27 lift report.';
 assert.notEqual(classifyParsed(parse('pine-knob',html),at).status,'OPEN_PER_OPERATOR');
 assert.equal(parse('pine-knob',html),null,'last-season OPEN prose alone is not a valid 2026/27 lift report');
 const currentFixture=fs.readFileSync(path.join(root,'tests/fixtures/michigan-ski/pine-knob.html'),'utf8');
 assert.equal(parse('pine-knob',currentFixture).operatorStatusText,null,'do not surface last-season OPEN prose from actual operator markup');
 assert.equal(classifyParsed(null,at).status,'UNVERIFIED');
 assert.equal(parse('unknown-hill',html),null);
});
test('all operator sources down returns UNVERIFIED, not a fabricated closure',async()=>{
 const down=async()=>{throw Error('source down');};
 const failed=await Promise.all(Object.keys(SOURCES).map(slug=>fetchOfficial(slug,down,at)));
 assert.ok(failed.every(x=>x.status==='UNVERIFIED'&&x.reason==='SOURCE_UNAVAILABLE'));
 assert.equal((await fetchOfficial('alpine-valley',down,at)).status,'NOT_CONNECTED');
});
test('SEO title cannot contain Open when 9 or fewer source URLs exist',()=>{
 assert.equal(hubTitle(0),'Michigan Ski Resorts 2026-27: Snow & Drive | Chris Izworski');
 assert.doesNotMatch(hubTitle(9),/\bOpen\b/i);
 assert.equal(titleCanClaimOpen(9),false);
 assert.equal(hubTitle(10),'Michigan Ski Resorts Open Today: Lifts & Snow');
 assert.equal(titleCanClaimOpen(10),true);
 const generator=fs.readFileSync(path.join(root,'scripts/generate-michigan-ski-pages.mjs'),'utf8');
 assert.ok(generator.includes('hubTitle(officialSourceCount)'));
 assert.ok(generator.includes('titleCanClaimOpen(officialSourceCount)'));
 assert.ok(generator.includes('ski-open-count'));
 assert.ok(generator.includes('ski-open-filter'));
 assert.ok(generator.includes('openingEvidence'));
 const board=fs.readFileSync(path.join(root,'public/assets/michigan-ski.js'),'utf8');
 assert.ok(board.includes("r.official?.status==='OPEN_PER_OPERATOR'"));
 assert.ok(board.includes("reportStamp(r.official?.reportUpdatedAt)"));
});
test('static 2026-27 opening table is grounded and labels unknowns',()=>{
 const generator=fs.readFileSync(path.join(root,'scripts/generate-michigan-ski-pages.mjs'),'utf8');
 for(const s of ['Not announced','Nov 23, 2026','ski-opening-evidence','openingEvidence','Projected daily skiing','Target'])assert.ok(generator.includes(s),s);
 assert.equal([...generator.matchAll(/Dec 5, 2026|Nov 26, 2026|Dec 17, 2026/g)].length,4);
 assert.doesNotMatch(generator,/OnTheSnow|Skiresort\.info/i);
});

test('date-only operator report stays date-only; no fictitious published hour',()=>{
 assert.equal(reportDate('Today’s Date: NOVEMBER 20,2026','caberfae-peaks'),'2026-11-20');
 assert.equal(reportDate('UPDATE: November 17th, 2026 | Ski Brule','ski-brule'),'2026-11-17');
 assert.equal(classifyParsed({reportUpdatedAt:'2026-11-23',lifts:{open:2,total:5},trails:{open:3,total:27}},at).status,'OPEN_PER_OPERATOR');
 const client=fs.readFileSync(path.join(root,'public/assets/michigan-ski.js'),'utf8');
 assert.ok(client.includes('(date only; time not published)'));
});

test('old season-closure prose cannot manufacture a zero-lift report',()=>{
 const html='<h1>Current Conditions</h1><p>UPDATED April 30, 2026 Another great season has come to a close. The Nordic Spa remains open through the spring season.</p>';
 const parsed=parse('mt-bohemia',html);
 assert.equal(parsed.lifts,null);
 assert.match(parsed.operatorStatusText,/Another great season has come to a close/);
 assert.equal(classifyParsed(parsed,at).status,'STALE_REPORT');
});
