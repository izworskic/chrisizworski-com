#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const contract=JSON.parse(await readFile(path.join(root,"benchmarks/national-search-hubs.json"),"utf8"));
const checks=[];
function add(name,ok,detail=""){checks.push({name,ok:Boolean(ok),detail})}
function count(re,s){return (s.match(re)||[]).length}

for(const hub of contract.hubs){
  const file=path.join(root,"public",hub.route.replace(/^\//,""),"index.html");
  const html=await readFile(file,"utf8");
  add(hub.route+" canonical",html.includes('rel="canonical" href="https://chrisizworski.com'+hub.route+'"'));
  add(hub.route+" indexable",html.includes('name="robots" content="index,follow'));
  add(hub.route+" creator entity",html.includes("https://chrisizworski.com/#person"));
  add(hub.route+" shared location UI",html.includes("data-national-hub=")&&html.includes("national-hubs.js"));
  add(hub.route+" crawlable depth",count(/<h2>/g,html)>=2&&count(/<p/g,html)>=5);
  add(hub.route+" no doorway city template",!/(city pages|zip pages|near you in \{)/i.test(html));
  add(hub.route+" no universal safety claim",!/\b(is|are|looks) safe\b/i.test(html));
  for(const tool of hub.primaryTools)add(hub.route+" links "+tool,html.includes('data-hub-tool="'+tool+'"'));
}
const contents=await Promise.all(contract.hubs.map(async hub=>({
  route:hub.route,
  html:await readFile(path.join(root,"public",hub.route.replace(/^\//,""),"index.html"),"utf8")
})));
for(let i=0;i<contents.length;i++)for(let j=i+1;j<contents.length;j++){
  const a=contents[i].html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().toLowerCase();
  const b=contents[j].html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().toLowerCase();
  const aw=new Set(a.split(" ").filter(w=>w.length>4));
  const bw=new Set(b.split(" ").filter(w=>w.length>4));
  const overlap=[...aw].filter(w=>bw.has(w)).length/Math.max(1,Math.min(aw.size,bw.size));
  add(contents[i].route+" distinct from "+contents[j].route,overlap<0.58,"overlap="+overlap.toFixed(2));
}
const passed=checks.filter(c=>c.ok).length;
const score=Math.round(100*passed/checks.length);
const failures=checks.filter(c=>!c.ok);
console.log(JSON.stringify({score,minimumScore:contract.minimumScore,checks,failures},null,2));
if(process.argv.includes("--check")&&(score<contract.minimumScore||failures.length))process.exit(1);
