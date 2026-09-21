const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");const path=require("node:path");
const root=path.resolve(__dirname,"..");const read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("Detroit Outdoors ships as a distinct canonical opportunity desk",()=>{
 const html=read("public/detroit-outdoors/index.html");
 assert.match(html,/<title>Detroit Outdoors Today \| Chris Izworski<\/title>/);
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/detroit-outdoors\/"/);
 assert.match(html,/max-image-preview:large/);
 assert.match(html,/ca-pub-8222782620788075/);
 assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
 assert.match(html,/opportunity detector, not a generic trip planner/i);
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