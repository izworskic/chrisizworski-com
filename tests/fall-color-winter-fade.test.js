const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync("public/fall-color/index.html","utf8");
const start=html.indexOf("<script>\nconst C=");
const end=start<0?-1:html.indexOf("</script>",start);
assert.ok(start>=0&&end>start,"Michigan map's original inline runtime remains present");
const javascript=html.slice(start+"<script>".length,end);
const script=new vm.Script(javascript,{filename:"public/fall-color/index.html#MichiganMap"});
const logic=javascript.slice(0,javascript.indexOf("// ---- live ----"));
const context={Date,Math,console};
vm.runInNewContext(logic+'\nconst now=new Date("2026-10-08T12:00:00Z"); const SEP1=new Date("2026-09-01T12:00:00Z"); globalThis.fixture={stageOf,colorOf,fmt,dayIndex,REGIONS,washAlpha:undefined};',context);
const {stageOf,colorOf,fmt,dayIndex,REGIONS}=context.fixture;

test("Michigan inline script compiles without changing page metadata, APIs or map hooks",()=>{
 assert.ok(script);
 assert.equal(REGIONS.length,8);
 assert.match(javascript,/fetch\("\/api\/fall-color-conditions"\)/);
 assert.match(javascript,/fetch\("\/api\/fall-color-report"\)/);
 assert.match(javascript,/buildMap\(\)/);
 assert.match(javascript,/renderAll\(\)/);
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski.com\/fall-color\/"/);
 assert.ok(html.includes('id="scrub"')&&html.includes('id="fallSeasonStatus"')&&html.includes('id="fallPreviewNext"'));
});

test("eight Michigan locations progress peak -> amber -> rust/brown -> bare -> winter gray",()=>{
 const C={maple:"#8E301C",amber:"#9E5F13",rust:"#9C4E27",russet:"#75512F",bare:"#888178",offseason:"#777A76"};
 for(const r of REGIONS){
   const pe=dayIndex(...r.peakEnd),b=dayIndex(...r.bare);
   assert.equal(stageOf(r,pe).phase,"peak");
   assert.equal(colorOf(99,"peak"),C.maple);
   const fading=stageOf(r,pe+1);
   assert.equal(fading.phase,"falling");
   assert.ok([C.amber,C.rust,C.russet].includes(colorOf(fading.pct,fading.phase)),r.id+" after-peak color");
   assert.equal(stageOf(r,b+2).phase,"down");
   assert.equal(colorOf(0,"down"),C.russet);
   assert.equal(stageOf(r,b+7).phase,"bare");
   assert.equal(colorOf(0,"bare"),C.bare);
   assert.equal(stageOf(r,b+15).phase,"offseason");
   assert.equal(colorOf(0,"offseason"),C.offseason);
   assert.notEqual(colorOf(0,"offseason"),colorOf(7,"green"));
 }
});

test("date axis reaches December correctly and winter has an explicit season status, not synthetic live color",()=>{
 assert.equal(fmt(0),"Sep 1");
 assert.equal(fmt(61),"Nov 1");
 assert.equal(fmt(98),"Dec 8");
 assert.match(javascript,/const winterCalendar=\(tm<9&&!\(tm===8&&td>=20\)\)/);
 assert.match(javascript,/let winterMode=winterCalendar,previewMode=false/);
 assert.match(javascript,/if\(winterMode\)return \{\.\.\.stageOf\(r,98\),phase:"offseason",pct:0,live:false,projected:false\}/);
 assert.match(javascript,/if\(!previewMode&&selIdx>todayFromSep1/);
 assert.match(javascript,/fallPreviewNext"\)\.addEventListener\("click"/);
 assert.match(javascript,/fallSeasonStatus"\)\.addEventListener\("click"/);
 assert.match(javascript,/scrub\.max="98"/);
 assert.match(javascript,/scrub\.min=String\(winterCalendar\?0:Math\.min\(0,todayFromSep1\)\)/);
 assert.match(javascript,/Michigan's main fall-color season has ended/);
 assert.match(javascript,/winterMode=false;previewMode=true;selIdx=0/);
 assert.match(javascript,/winterMode=false;selIdx=\+e\.target\.value;renderAll\(\)/); // Slider preserves an active preview.
 assert.match(javascript,/if\(winterCalendar\)\{renderLiveStrip\(\);\}/);
 assert.match(javascript,/if\(!winterCalendar\)fetch\("\/api\/fall-color-report"\)/);
 assert.match(javascript,/if\(winterMode\)\{[\s\S]*?Michigan fall color has ended/);
 assert.match(javascript,/Fall "\+nextPreviewYear\+" preview uses typical timing only/);
 assert.match(javascript,/\(previewMode\|\|winterCalendar\)\?stageOf\(r,selIdx\)/);
 assert.match(javascript,/winterMode=true;previewMode=false;selIdx=98/);
});
