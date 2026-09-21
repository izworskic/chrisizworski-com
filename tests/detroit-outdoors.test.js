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

test("Detroit Outdoors uses the writer as an editor rather than a template filler",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/very good local outdoor editor/);
 assert.match(route,/clear, specific, understated and readable/);
 assert.match(route,/Prefer concrete implications over adjectives/);
 assert.match(route,/Desk read: 80 to 115 words/);
 assert.match(route,/Card notes: write only for candidate IDs listed in cardBriefs/);
 assert.match(route,/Return JSON only/);
 assert.match(route,/detroit-outdoors:edition:v6/);
 assert.match(route,/placements:editorialPlan\.cardNotes/);
 assert.match(route,/Do not explain the tool, model, JEV, Gem, APIs, rankings, scores, signals, prompts or data stack/);
});


test("Detroit Outdoors lets JEV choose where prose adds value before the writer runs",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/MAX_EDITORIAL_CARD_NOTES = 3/);
 assert.match(route,/async function planEditorialPlacement/);
 assert.match(route,/Choose the editorial treatment for this one Detroit Outdoors card/);
 assert.match(route,/NO_NOTE/);
 assert.match(route,/WHY_TODAY/);
 assert.match(route,/DRIVE_DECISION/);
 assert.match(route,/NEXT_CHECK/);
 assert.match(route,/SEASONAL_CONTEXT/);
 assert.match(route,/The writer will receive only this treatment brief and sealed verified facts/);
 assert.match(route,/editorialQuestion/);
 assert.match(route,/question:x\.question/);
 assert.match(route,/You do not choose what gets written and you do not choose placement/);
 assert.match(route,/notes object may contain only candidate IDs supplied in cardBriefs/);
 assert.match(route,/If you cannot add material value beyond visibleCard, omit that candidate from notes/);
 assert.match(route,/synthesize at least two verified facts/);
 assert.match(route,/placement:\`card:\$\{x\.candidateId\}:after-weather\`/);
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

test("Detroit Outdoors rejects low-value generated card prose instead of backfilling filler",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 const client=read("public/assets/detroit-outdoors.js");
 assert.match(route,/async function reviewEditorialNote/);
 assert.match(route,/async function validateEditorialNotes/);
 assert.match(route,/fallbackId:"REJECT"/);
 assert.match(route,/Reject generic encouragement, weather restatement, score restatement, travel-time restatement/);
 assert.match(route,/const edition=await validateEditorialNotes/);
 assert.match(route,/notes:\{\}/);
 assert.doesNotMatch(route,/else if\(fallback\.notes&&fallback\.notes\[candidate\.id\]\)/);
 assert.match(client,/Why this matters/);
});
