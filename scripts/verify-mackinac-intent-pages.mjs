import fs from "node:fs";
const htmlEsc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const pages=[
  ["day-trip","Mackinac Island Day Trip Planner"],
  ["with-kids","Mackinac Island With Kids Planner"],
  ["2-day-itinerary","2-Day Mackinac Island Itinerary Planner"],
  ["ferry-planner","Mackinac Island Ferry Planner"],
  ["from-detroit","Detroit to Mackinac Island Trip Planner"],
  ["from-chicago","Chicago to Mackinac Island Trip Planner"],
  ["from-traverse-city","Traverse City to Mackinac Island"],
  ["from-grand-rapids","Grand Rapids to Mackinac Island"],
  ["limited-walking","Mackinac Island With Less Walking Planner"],
  ["bike-day","Mackinac Island Bike Day & M-185 Planner"],
  ["fall","Mackinac Island Fall Trip Planner"]
];
let fail=false;
for(const [slug,title] of pages){
  const file="public/mackinac-island/"+slug+"/index.html";
  if(!fs.existsSync(file)){console.error("missing",file);fail=true;continue;}
  const html=fs.readFileSync(file,"utf8");
  const checks=[
    [html.includes("<title>"+htmlEsc(title)+" | Chris Izworski</title>"),"unique title"],
    [html.includes('rel="canonical" href="https://chrisizworski.com/mackinac-island/'+slug+'/'),"canonical"],
    [html.includes("Build this trip live"),"planner CTA"],
    [html.includes("Truth boundary:"),"truth boundary"],
    [html.includes("application/ld+json")&&html.includes("FAQPage"),"structured FAQ data"],
    [html.includes('name="robots" content="index,follow,max-image-preview:large'),"indexing metadata"],
    [html.includes("Michael Barera / Wikimedia Commons"),"image attribution"],
    [html.length>7000,"substantive content"],
    [!html.includes("utm_source"),"clean links"]
  ];
  for(const [ok,label] of checks)if(!ok){console.error(slug+" failed "+label);fail=true;}
}
const main=fs.readFileSync("public/mackinac-island/index.html","utf8");
for(const [slug] of pages)if(!main.includes('/mackinac-island/'+slug+'/')){console.error("main missing internal link "+slug);fail=true;}
const sitemap=fs.readFileSync("public/sitemap.xml","utf8");
for(const [slug] of pages)if(!sitemap.includes('https://chrisizworski.com/mackinac-island/'+slug+'/')){console.error("sitemap missing "+slug);fail=true;}
if(fail)process.exit(1);
console.log("PASS: Mackinac intent pages are substantive, canonical, internally linked and discoverable.");

const ferry=fs.readFileSync("public/mackinac-island/ferry-planner/index.html","utf8");
if(!ferry.includes("?intent=ferry-planner#main")){console.error("ferry planner CTA must land on date/city/time controls");process.exit(1);}

const originSeeds={
  "from-detroit":"Detroit%2C%20MI",
  "from-chicago":"Chicago%2C%20IL",
  "from-traverse-city":"Traverse%20City%2C%20MI",
  "from-grand-rapids":"Grand%20Rapids%2C%20MI"
};
for(const [slug,encoded] of Object.entries(originSeeds)){
  const html=fs.readFileSync("public/mackinac-island/"+slug+"/index.html","utf8");
  if(!html.includes("?intent=ferry-planner&amp;from="+encoded+"#main")&&!html.includes("?intent=ferry-planner&from="+encoded+"#main")){
    console.error(slug+" missing preseeded origin CTA");fail=true;
  }
}
if(fail)process.exit(1);

for(const [slug,needle] of [["limited-walking","Official Mackinac accessibility guide"],["bike-day","Current Mackinac e-bike rules"]]){
  const html=fs.readFileSync("public/mackinac-island/"+slug+"/index.html","utf8");
  if(!html.includes(needle)){console.error(slug+" missing source-backed intent content");fail=true;}
}
if(fail)process.exit(1);
