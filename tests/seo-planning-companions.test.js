const test = require("node:test");
const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = p => readFileSync(path.join(root,p),"utf8");
const slugs=["soo-locks/plan-your-visit","great-lakes-ship-watching-spots","mackinac-bridge-crossing-planner"];
const expectedInbound={
  "soo-locks/plan-your-visit":["public/tools/index.html","public/soo-locks/index.html","public/great-lakes-freighter-tracking/index.html"],
  "great-lakes-ship-watching-spots":["public/tools/index.html","public/soo-locks/index.html","public/great-lakes-freighter-tracking/index.html"],
  "mackinac-bridge-crossing-planner":["public/tools/index.html","public/mackinac-bridge-live/index.html","public/mackinac-bridge-tolls/index.html"]
};
for(const slug of slugs){
 test(slug+" is a deep, indexable planning companion, not a duplicate live dashboard",()=>{
  const html=read("public/"+slug+"/index.html");
  const canonical="https://chrisizworski.com/"+slug+"/";
  const title=html.match(/<title>([^<]+)<\/title>/)?.[1]?.replace(/&amp;/g,"&");
  const meta=html.match(/<meta name="description" content="([^"]+)"/)?.[1]?.replace(/&amp;/g,"&");
  assert.ok(title?.length<=60 && title.length>=30,"honest concise title");
  assert.ok(meta?.length<=158 && meta.length>=90,"intent-aligned description");
  assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'));
  assert.ok(html.length>7500,"original substantial editorial content");
  assert.ok(!/\b(?:guaranteed ship arrival|guaranteed open bridge|wait time is 0)\b/i.test(html),"no fake status");
  const ld=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  assert.equal(ld.length,1);
  const graph=ld[0]["@graph"];
  assert.equal(ld[0]["@context"],"https://schema.org");
  assert.ok(graph.some(x=>x["@type"]==="Person"&&x["@id"]==="https://chrisizworski.com/#person"));
  assert.ok(graph.some(x=>x["@type"]==="BreadcrumbList"));
  const webpage=graph.find(x=>x["@type"]==="WebPage");
  assert.equal(webpage.url,canonical);
  assert.equal(webpage.dateModified,"2026-10-11");
  const faq=graph.find(x=>x["@type"]==="FAQPage");
  assert.ok(faq?.mainEntity?.length>=3);
  for(const q of faq.mainEntity){assert.equal(q["@type"],"Question");assert.equal(q.acceptedAnswer?.["@type"],"Answer");assert.ok(q.acceptedAnswer?.text?.length>=35);assert.ok(html.includes("<summary>"+q.name+"</summary>"));}
  const sitemap=read("public/sitemap.xml");
  assert.ok(sitemap.includes("<loc>"+canonical+"</loc>\n    <lastmod>2026-10-11</lastmod>"),"in sitemap with editorial freshness");
  for(const inbound of expectedInbound[slug])assert.ok(read(inbound).includes('href="/'+slug+'/"'),inbound+" must link to "+slug);
 });
}
test("planning companions remain linked in a real network and do not replace original tools",()=>{
 const tools=read("public/tools/index.html");
 for(const slug of slugs)assert.ok(tools.includes('href="/'+slug+'/"));
 for(const slug of ["soo-locks","mackinac-bridge-live","mackinac-bridge-tolls","great-lakes-freighter-tracking"])
 assert.ok(read("public/"+slug+"/index.html").includes("<link rel=\"canonical\""),slug);
});
