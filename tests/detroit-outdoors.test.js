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
 assert.match(route,/detroit-outdoors:desk:v8/);
 assert.match(route,/detroit-outdoors:card:v8/);
 assert.match(route,/placements:editorialPlan\.cardNotes/);
 assert.match(route,/Do not explain the tool, model, JEV, Gem, APIs, rankings, scores, signals, prompts or data stack/);
});


test("Detroit Outdoors lets JEV choose where prose adds value before the writer runs",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.doesNotMatch(route,/MAX_EDITORIAL_CARD_NOTES/);
 assert.match(route,/async function planEditorialPlacement/);
 assert.match(route,/Choose the editorial treatment for this one Detroit Outdoors card/);
 assert.match(route,/PLACE_CONTEXT/);
 assert.match(route,/WHY_TODAY/);
 assert.match(route,/DRIVE_DECISION/);
 assert.match(route,/NEXT_CHECK/);
 assert.match(route,/SEASONAL_CONTEXT/);
 assert.match(route,/The writer will receive only this treatment brief and sealed verified facts/);
 assert.match(route,/editorialQuestion/);
 assert.match(route,/question:x\.question/);
 assert.match(route,/You do not choose what gets written and you do not choose placement/);
 assert.match(route,/notes object may contain only candidate IDs supplied in cardBriefs/);
 assert.match(route,/Every displayed card gets its own Haiku writer/);
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


test("Detroit Outdoors expands migration cards with classifier-driven authoritative context",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 const client=read("public/assets/detroit-outdoors.js");
 const css=read("public/assets/detroit-outdoors.css");
 assert.match(route,/const EDITORIAL_CONTEXT/);
 assert.match(route,/Michigan DNR Fall Birding/);
 assert.match(route,/U\.S\. Fish & Wildlife Service/);
 assert.match(route,/September and October as the best months for fall migratory birds/);
 assert.match(route,/Main Trail as good for warblers in spring and fall/);
 assert.match(route,/function editorialEvidence/);
 assert.match(route,/additiveEvidence:x\.evidence/);
 assert.match(route,/For MIGRATION_CONTEXT, explain the place and habitat significance/);
 assert.match(route,/Write 75 to 110 words that make the migration signal understandable/);
 assert.match(route,/noteSources:Object\.fromEntries/);
 assert.match(client,/data\.edition\?\.noteSources\?\.\[c\.id\]/);
 assert.match(client,/Context:/);
 assert.match(css,/\.card-source/);
});


test("Detroit Outdoors exposes safe Anthropic runtime diagnostics and production smoke coverage",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 const workflow=read(".github/workflows/detroit-anthropic-smoke.yml");
 assert.match(route,/reason:"missing ANTHROPIC_API_KEY"/);
 assert.match(route,/anthropicKeyConfigured:Boolean\(process\.env\.ANTHROPIC_API_KEY\)/);
 assert.match(route,/commitSha:process\.env\.VERCEL_GIT_COMMIT_SHA/);
 assert.match(route,/writerModel:process\.env\.OUTDOORS_WRITER_MODEL\|\|WRITER_MODEL_DEFAULT/);
 assert.doesNotMatch(route,/anthropicKey:/);
 assert.match(workflow,/ANTHROPIC_API_KEY is not configured in the production runtime/);
 assert.match(workflow,/editorialMode/);
 assert.match(workflow,/EXPECTED_SHA/);
});


test("Detroit Outdoors runs an independent Haiku job for every ranked card",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/const cardNotes=mapped\.map/);
 assert.doesNotMatch(route,/\.slice\(0,MAX_EDITORIAL_CARD_NOTES\)/);
 assert.match(route,/async function writeCardEditorial/);
 assert.match(route,/Promise\.all\(\(plan\.cardNotes\|\|\[\]\)\.map/);
 assert.match(route,/This is an independent card-writing job/);
 assert.match(route,/Directly answer the assigned question/);
 assert.match(route,/const repairPrompt=/);
 assert.match(route,/The JEV reviewer rejected the first draft/);
 assert.match(route,/cardWriters:cardResults\.map/);
 assert.match(route,/PLACE_CONTEXT/);
});

test("Detroit Outdoors gives every card verified place context before Haiku writes",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/const PLACE_CONTEXT/);
 assert.match(route,/Belle Isle is a 985-acre island park/);
 assert.match(route,/more than 700 acres of forests, fields, fens and swamps/);
 assert.match(route,/contains 11 inland lakes/);
 assert.match(route,/offers more than 12 miles of trails/);
 assert.match(route,/state-designated dark sky preserves/);
 assert.match(route,/evidence\.contextFacts\.push\(\.\.\.placeContext\.facts\)/);
 assert.match(route,/evidence\.sources\.push\(\{label:placeContext\.sourceLabel,url:placeContext\.sourceUrl\}\)/);
});

test("Detroit Outdoors separates the desk writer from per-card writers",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/async function writeDeskEditorial/);
 assert.match(route,/Card explanations are written separately by independent card writers/);
 assert.match(route,/const deskPromise=writeDeskEditorial/);
 assert.match(route,/const cardPromise=Promise\.all/);
 assert.match(route,/const \[desk,cardResults\]=await Promise\.all/);
});
