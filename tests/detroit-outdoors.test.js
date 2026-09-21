const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");const path=require("node:path");
const root=path.resolve(__dirname,"..");const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Detroit Outdoors restores the original card-first decision surface",()=>{
 const html=read("public/detroit-outdoors/index.html");
 const css=read("public/assets/detroit-outdoors.css");
 assert.match(html,/<title>Detroit Outdoors Today \| Chris Izworski<\/title>/);
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/detroit-outdoors\/"/);
 assert.match(html,/id="opportunity-grid"/);
 assert.match(html,/class="hero"/);
 assert.match(html,/Where the day points/);
 assert.match(html,/The short list/);
 assert.match(css,/\.grid\{display:grid;grid-template-columns:repeat\(2/);
 assert.match(css,/\.card\{/);
 assert.match(css,/\.hero\{display:grid/);
 assert.match(css,/\.hero-media\{min-height:280px/);
 assert.doesNotMatch(html,/Newsreader/);
 assert.doesNotMatch(html,/Fraunces/);
});

test("Detroit Outdoors keeps cards intelligent while replacing raw product copy with readable prose",()=>{
 const client=read("public/assets/detroit-outdoors.js");
 const html=read("public/detroit-outdoors/index.html");
 assert.match(client,/data\.edition\?\.notes\?\.\[c\.id\]/);
 assert.match(client,/c\.story&&c\.story\.whyToday/);
 assert.match(client,/card-read/);
 assert.match(client,/edition=orchestrated-v1/);
 assert.match(client,/JEV editorial placement/);
 assert.match(html,/Each card keeps the conditions visible and links to the deeper check/);
 assert.doesNotMatch(html,/A human read on the signal stack/);
 assert.doesNotMatch(html,/Comparing the live Southeast Michigan signal stack/);
});

test("Detroit Outdoors keeps safety deterministic and JEV closed-set",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/HARD_ALERT/);
 assert.match(route,/candidateFrom/);
 assert.match(route,/if\(hazard\.hard\).*suppressed:true/);
 assert.match(route,/Choose exactly one supplied option/);
 assert.match(route,/Never override a deterministic hazard suppression or activity hard stop/);
 assert.match(route,/choiceId:"HOLD"/);
 assert.doesNotMatch(route,/JEV.*legal status/i);
});

test("Detroit Outdoors lets JEV choose prose placement before the writer runs",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/function editorialPlanCatalog/);
 assert.match(route,/async function judgeEditorialPlan/);
 assert.match(route,/LEAD_ONLY/);
 assert.match(route,/FOCUSED/);
 assert.match(route,/CARD_LED/);
 assert.match(route,/FULL_BOARD/);
 assert.match(route,/QUIET_BOARD/);
 assert.match(route,/You are choosing where prose belongs, not writing prose/);
 assert.match(route,/Do not add a prose slot merely to fill space/);
 assert.match(route,/editorialPlacement=await judgeEditorialPlan/);
 assert.match(route,/writeEditorial\(ranked,fallSnapshot,hold,editorialPlacement\.plan\)/);
 assert.match(route,/editorialPlan:\{/);
 assert.match(route,/slots:\[/);
});

test("Detroit Outdoors uses one stable house-style prompt and a fast copy model",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/DETROIT_COPY_STYLE_VERSION="detroit-house-v1"/);
 assert.match(route,/DETROIT_COPY_SYSTEM/);
 assert.match(route,/seasoned Michigan outdoor editor/);
 assert.match(route,/JEV has already selected the exact editorial slots/);
 assert.match(route,/Write only the slots requested in editorialPlan/);
 assert.match(route,/Desk copy: 70 to 105 words/);
 assert.match(route,/Card copy: 28 to 45 words/);
 assert.match(route,/OUTDOORS_COPY_MODEL/);
 assert.match(route,/claude-haiku-4-5-20251001/);
 assert.match(route,/detroit-outdoors:edition:v5/);
 assert.match(route,/cleanEdition\(raw,candidates,fallback,editorialPlan\)/);
 assert.match(route,/edition:\{headline:editorial\.headline,read:editorial\.read,notes:editorial\.notes\|\|\{\}\}/);
});

test("Detroit Outdoors reuses existing engines and gates generated copy",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/michiganoutdoorsnow\.chrisizworski\.com/);
 assert.match(route,/api\/opportunities\?scope=all/);
 assert.match(route,/api\/fall-color-conditions/);
 assert.match(route,/ANTHROPIC_API_KEY/);
 assert.match(route,/claude-haiku-4-5-20251001/);
 assert.match(route,/AbortSignal\.timeout\(9000\)/);
 assert.match(route,/s-maxage=300/);
});

test("Detroit Outdoors uses the existing fall-color dispatcher instead of adding a serverless function",()=>{
 const dispatcher=read("api/fall-color.js");
 const vercel=read("vercel.json");
 assert.match(dispatcher,/"detroit-outdoors": require\("\.\.\/lib\/detroit-outdoors\/route\.js"\)/);
 assert.match(vercel,/"source": "\/api\/detroit-outdoors"/);
 assert.match(vercel,/"destination": "\/api\/fall-color\?view=detroit-outdoors"/);
});

test("Detroit Outdoors is discoverable from the tools hub and sitemap",()=>{
 const tools=read("public/tools/index.html");
 const sitemap=read("public/sitemap.xml");
 assert.match(tools,/href="\/detroit-outdoors\/"/);
 assert.match(sitemap,/https:\/\/chrisizworski\.com\/detroit-outdoors\//);
});