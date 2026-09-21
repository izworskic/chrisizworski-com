const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");const path=require("node:path");
const root=path.resolve(__dirname,"..");const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Detroit Outdoors ships as a canonical daily journal",()=>{
 const html=read("public/detroit-outdoors/index.html");
 assert.match(html,/<title>Detroit Outdoors Today \| Chris Izworski<\/title>/);
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/detroit-outdoors\/"/);
 assert.match(html,/max-image-preview:large/);
 assert.match(html,/ca-pub-8222782620788075/);
 assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
 assert.match(html,/A daily read on the few places where the day is actually doing something useful/i);
 assert.match(html,/Fraunces/);
 assert.match(html,/Newsreader/);
 assert.doesNotMatch(html,/hero-media/);
 assert.doesNotMatch(html,/opportunity detector/i);
 assert.doesNotMatch(html,/front page for Detroit/i);
});

test("Detroit Outdoors foregrounds prose, not giant media or software cards",()=>{
 const html=read("public/detroit-outdoors/index.html");
 const css=read("public/assets/detroit-outdoors.css");
 const client=read("public/assets/detroit-outdoors.js");
 assert.match(html,/id="desk-note"/);
 assert.match(html,/id="opportunity-list"/);
 assert.match(client,/edition\.notes/);
 assert.match(client,/place-note/);
 assert.match(css,/font-family:"Newsreader"/);
 assert.match(css,/font-family:"Fraunces"/);
 assert.match(css,/\.read-body\{font-size:19px/);
 assert.doesNotMatch(css,/\.lead-media/);
 assert.doesNotMatch(client,/hero-img/);
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
 assert.match(route,/small daily outdoors journal/);
 assert.match(route,/plain, exact, unhurried, observant and local/);
 assert.match(route,/field journal edited by a very good regional newspaper/);
 assert.match(route,/The main read should be 130 to 190 words/);
 assert.match(route,/Each place note should be 35 to 65 words/);
 assert.match(route,/Return JSON only/);
 assert.match(route,/detroit-outdoors:edition:v2/);
 assert.match(route,/edition:\{headline:editorial\.headline,read:editorial\.read,notes:editorial\.notes\|\|\{\}\}/);
 assert.match(route,/Do not mention scores, models, APIs, JEV/);
});

test("Detroit Outdoors reuses existing engines and gates generated copy",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/michiganoutdoorsnow\.chrisizworski\.com/);
 assert.match(route,/api\/opportunities\?scope=all/);
 assert.match(route,/api\/fall-color-conditions/);
 assert.match(route,/ANTHROPIC_API_KEY/);
 assert.match(route,/claude-sonnet-4-6/);
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