const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");const path=require("node:path");
const root=path.resolve(__dirname,"..");const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Detroit Outdoors ships as a distinct canonical daily front page",()=>{
 const html=read("public/detroit-outdoors/index.html");
 assert.match(html,/<title>Detroit Outdoors Today \| Chris Izworski<\/title>/);
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/detroit-outdoors\/"/);
 assert.match(html,/max-image-preview:large/);
 assert.match(html,/ca-pub-8222782620788075/);
 assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
 assert.match(html,/Your outdoor front page for Detroit/i);
 assert.match(html,/where to go, what to do, whether the drive is worth it/i);
 assert.doesNotMatch(html,/not a generic trip planner/i);
 assert.doesNotMatch(html,/opportunity detector/i);
});

test("Detroit Outdoors cards are decisions rather than raw condition summaries",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 const client=read("public/assets/detroit-outdoors.js");
 assert.match(route,/function storyFor/);
 assert.match(route,/function worthDrive/);
 assert.match(route,/function humanReason/);
 assert.match(route,/CHECK \+ GO/);
 assert.match(client,/Worth the drive\?/);
 assert.match(client,/The move/);
 assert.match(client,/Why today/);
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

test("Detroit Outdoors writing prompt favors readable local decision prose",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/short local outdoors column/);
 assert.match(route,/Start with the decision/);
 assert.match(route,/Do not explain the system, the tool, the model, the data stack/);
 assert.match(route,/Every sentence must help the reader make a decision/);
 assert.match(route,/Never use phrases such as 'signal stack'/);
});

test("Detroit Outdoors reuses existing engines and gates generated copy",()=>{
 const route=read("lib/detroit-outdoors/route.js");
 assert.match(route,/michiganoutdoorsnow\.chrisizworski\.com/);
 assert.match(route,/api\/opportunities\?scope=all/);
 assert.match(route,/api\/fall-color-conditions/);
 assert.match(route,/ANTHROPIC_API_KEY/);
 assert.match(route,/detroit-outdoors:editorial/);
 assert.match(route,/File photos are selected only from a small licensed allowlist/);
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