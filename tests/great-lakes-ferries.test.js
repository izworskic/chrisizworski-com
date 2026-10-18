import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const routes=[
 "put-in-bay-ferry","lake-michigan-ferry/lake-express","lake-michigan-ferry/ss-badger",
 "isle-royale-ferry-comparison","chi-cheemaun-ferry","pelee-island-ferry","beaver-island-ferry","toronto-islands-ferry"
];
const base="https://chrisizworski.com/";
const configs=new Map();
for(const path of routes){
 const html=fs.readFileSync("public/"+path+"/index.html","utf8");
 const json=html.match(/<script type="application\/json" id="ferry-config">([\s\S]*?)<\/script>/);
 assert.ok(json,"Embedded route data missing: "+path);
 configs.set(path,JSON.parse(json[1]));
}

test("Eight independently indexable routes use one engine, with original Mackinac preserved",()=>{
 assert.equal(configs.size,8);
 const sitemap=fs.readFileSync("public/sitemap.xml","utf8");
 const tools=fs.readFileSync("public/tools/index.html","utf8");
 for(const path of [...routes,"great-lakes-ferries"]){
  const html=fs.readFileSync("public/"+path+"/index.html","utf8");
  const url=base+path+"/";
  assert.ok(html.includes('rel="canonical" href="'+url+'"'),"Canonical: "+path);
  assert.ok(sitemap.includes("<loc>"+url+"</loc>"),"Sitemap: "+path);
  assert.ok(tools.includes('href="/'+path+'/"'),"Tools directory: "+path);
  assert.ok(html.includes("/assets/great-lakes-ferry.css"),"Shared CSS: "+path);
  if(path!=="great-lakes-ferries")assert.ok(html.includes("/assets/great-lakes-ferry.js"),"Shared engine: "+path);
 }
 assert.ok(fs.readFileSync("public/mackinac-island/ferry-planner/index.html","utf8").includes('id="ferry-form"'));
 assert.ok(fs.readFileSync("public/great-lakes-ferries/index.html","utf8").includes("/mackinac-island/ferry-planner/"));
});

test("All routes cite official HTTPS sources and do not invent real-time availability",()=>{
 for(const [path,c] of configs){
  assert.ok(c.options.length>=1,"No ferry options: "+path);
  assert.ok(c.sources.length>=2,"No operator sources: "+path);
  assert.ok(c.sources.every(s=>/^https:\/\//.test(s[1])),"Non-HTTPS source: "+path);
  assert.equal(c.currency==="USD"||c.currency==="CAD",true);
  for(const o of c.options){
   assert.ok(o.name&&o.description,"Incomplete choice: "+path);
   if(o.pricing)for(const [key,val] of Object.entries(o.pricing))assert.ok(Number.isFinite(val)&&val>=0,key+" invalid: "+path);
  }
  const html=fs.readFileSync("public/"+path+"/index.html","utf8");
  assert.ok(html.includes("does not retrieve ticket inventory"),"Availability guard missing: "+path);
 }
});

function interact(path,date,{adults=2,kids=0,vehicle=0,roundtrip=true}={}){
 const config=configs.get(path),elements={};
 const element=(value="")=>({value,addEventListener(type,fn){this[type]=fn}});
 for(const [id,value] of Object.entries({"trip-date":date,"adult-count":String(adults),"child-count":String(kids),"vehicle-count":String(vehicle),"trip-type":roundtrip?"roundtrip":"oneway","child-label":"","vehicle-field":"","individual-note":""}))elements[id]=element(value);
 elements["ferry-results"]={innerHTML:"",scrollIntoView(){}};
 elements["ferry-config"]={textContent:JSON.stringify(config)};
 elements["ferry-form"]={addEventListener(){},querySelectorAll(){return ["trip-date","adult-count","child-count","vehicle-count","trip-type"].map(k=>elements[k])}};
 const code=fs.readFileSync("public/assets/great-lakes-ferry.js","utf8");
 vm.runInNewContext(code,{document:{getElementById:id=>elements[id]},Intl,Date,Number,String,JSON,Math,RegExp},{timeout:2000});
 // The browser pre-fills the current local date, so select the test date afterward.
 elements["trip-date"].value=date;
 elements["adult-count"].value=String(adults);
 elements["child-count"].value=String(kids);
 elements["vehicle-count"].value=String(vehicle);
 elements["trip-type"].value=roundtrip?"roundtrip":"oneway";
 elements["trip-date"].change();
 return elements["ferry-results"].innerHTML;
}

test("Lake Express computes documented fare+fuel+port fees, not a free vehicle",()=>{
 const html=interact("lake-michigan-ferry/lake-express","2026-10-18",{adults:2,vehicle:1});
 // 2 x $219 round-trip adult; $256 auto; 3 x $30 posted fees = $784.
 assert.match(html,/\$784\.00/);
 assert.match(html,/published/i);
});

test("Winter and seasonal gates are conservative",()=>{
 assert.match(interact("lake-michigan-ferry/ss-badger","2026-10-18"),/Outside the published season/);
 assert.match(interact("pelee-island-ferry","2026-10-18"),/Kingsville/);
 const toronto=interact("toronto-islands-ferry","2026-10-18");
 assert.match(toronto,/Ward.s Island/);
 assert.doesNotMatch(toronto,/Centre Island ferry/);
 const august=interact("toronto-islands-ferry","2026-08-18",{adults:1,kids:1});
 assert.match(august,/\$9\.57/);
 assert.match(august,/August 2026/);
 const future=interact("beaver-island-ferry","2027-07-01");
 assert.match(future,/2026 reference information only/);
 assert.doesNotMatch(future,/\$67\.00/);
});

test("Chi-Cheemaun published 2026 fares change with peak season",()=>{
 const offpeak=interact("chi-cheemaun-ferry","2026-10-18",{adults:2,vehicle:1});
 assert.match(offpeak,/\$149\.70/);
 const peak=interact("chi-cheemaun-ferry","2026-07-18",{adults:2,vehicle:1});
 assert.match(peak,/\$170\.40/);
});

test("Vehicle restriction and incomplete fares do not produce false totals",()=>{
 const pib=interact("put-in-bay-ferry","2026-10-18",{vehicle:1});
 assert.match(pib,/Miller Ferry/);
 assert.doesNotMatch(pib,/Jet Express from Port Clinton/);
 assert.match(pib,/\$82\.00/); // Two adults round trip, plus a $23 each-way vehicle fare.
 const royale=interact("isle-royale-ferry-comparison","2026-07-01");
 assert.match(royale,/cannot provide a same-day round trip/i);
 assert.match(royale,/Published fare lookup required/);
});