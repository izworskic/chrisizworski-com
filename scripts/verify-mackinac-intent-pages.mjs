import fs from "node:fs";
const pages=[
  ["day-trip","Mackinac Island Day Trip Planner"],
  ["with-kids","Mackinac Island With Kids Planner"],
  ["2-day-itinerary","2-Day Mackinac Island Itinerary Planner"],
  ["ferry-planner","Mackinac Island Ferry Planner"]
];
let fail=false;
for(const [slug,title] of pages){
  const file="public/mackinac-island/"+slug+"/index.html";
  if(!fs.existsSync(file)){console.error("missing",file);fail=true;continue;}
  const html=fs.readFileSync(file,"utf8");
  const checks=[
    [html.includes("<title>"+title+" | Chris Izworski</title>"),"unique title"],
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
