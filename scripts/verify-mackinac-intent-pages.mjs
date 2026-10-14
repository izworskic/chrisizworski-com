import fs from "node:fs";
const retired=["plan","where-to-stay","dining","things-to-do","events","around-the-straits","day-trip","with-kids","2-day-itinerary","from-detroit","from-chicago","from-traverse-city","from-grand-rapids","limited-walking","bike-day","fall"];
const html=fs.readFileSync("public/mackinac-island/ferry-planner/index.html","utf8");
const map=fs.readFileSync("public/sitemap.xml","utf8");
const redirects=JSON.parse(fs.readFileSync("vercel.json","utf8")).redirects||[];
const bad=[];const assert=(pass,msg)=>{if(!pass)bad.push(msg)};
for(const key of ['id="ferry-form"','id="ferry-results"','id="ferry-kids"','id="ferry-age4"','id="ferry-military"','/assets/mackinac-ferry-decision.js','/assets/mackinac-ferry-decision.css','openstreetmap.org','sheplersferry.com','arnoldtransitcompany.com'])assert(html.includes(key),"missing "+key);
assert(html.includes('rel="canonical" href="https://chrisizworski.com/mackinac-island/ferry-planner/"'),"ferry canonical mismatch");
assert(!html.includes('/assets/mackinac-hub.js'),"old hub client still loaded");
assert(!html.includes('data-mackinac-planner-cta'),"retired trip CTA still loaded");
assert(!html.includes('href="/mackinac-island/"'),"retired root linked from ferry");
for(const slug of retired){assert(!fs.existsSync("public/mackinac-island/"+slug+"/index.html"),"retired page present "+slug);assert(!map.includes("<loc>https://chrisizworski.com/mackinac-island/"+slug+"/</loc>"),"retired sitemap entry "+slug)}
assert(!map.includes("<loc>https://chrisizworski.com/mackinac-island/</loc>"),"retired root sitemap");
assert(map.includes("<loc>https://chrisizworski.com/mackinac-island/ferry-planner/</loc>"),"ferry sitemap missing");
assert(redirects.some(r=>r.source.startsWith("/mackinac-island{")&&r.destination==="/mackinac-island/ferry-planner/"),"root redirect missing");
assert(redirects.some(r=>retired.every(s=>r.source.includes(s))&&r.destination==="/mackinac-island/ferry-planner/"),"retired redirect missing");
if(bad.length){bad.forEach(x=>console.error("Mackinac ferry-only: "+x));process.exit(1)}console.log("PASS: Mackinac ferry-only release; 16 subpages retired.");
