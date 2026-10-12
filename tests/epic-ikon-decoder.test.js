const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const E=require("../public/assets/epic-ikon-2026-27.js");
const find=name=>{const r=E.resorts.find(x=>x.name===name);assert.ok(r,"missing "+name);return r.id;};
const check=(pass,resort,date,more={})=>E.evaluate({pass,resort:find(resort),date,...more});
test("version, coverage, unique IDs, sources",()=>{
 assert.equal(E.SEASON,"2026/27");
 assert.ok(E.resorts.length>=70);
 assert.equal(new Set(E.resorts.map(x=>x.id)).size,E.resorts.length);
 for(const r of E.resorts)assert.ok(["epic","ikon"].includes(r.brand));
 assert.ok(E.EPIC_URL.includes("epicpass.com"));assert.ok(E.IKON_URL.includes("ikonpass.com"));
});
test("Epic: holiday restriction is resort-specific, full pass unrestricted",()=>{
 assert.equal(check("epicLocal","Vail","2026-12-31",{usedDays:0}).reason,"blackout");
 assert.equal(check("epicLocal","Breckenridge","2026-12-31").status,"YES");
 assert.equal(check("epic","Vail","2026-12-31").status,"YES");
 assert.equal(check("epicLocal","Park City","2027-01-16").status,"NO");
 assert.equal(check("epicLocal","Okemo","2027-01-16").status,"YES");
});
test("Epic Local ten-day shared premium pool and unknown usage fail closed",()=>{
 const v=check("epicLocal","Vail","2027-01-19",{usedDays:""});
 assert.equal(v.status,"CHECK");assert.equal(v.group,"epic-local-premium");
 assert.equal(check("epicLocal","Beaver Creek","2027-01-19",{usedDays:10}).reason,"exhausted");
 assert.equal(check("epicLocal","Whistler Blackcomb","2027-01-19",{usedDays:9}).status,"YES");
});
test("Epic Day access variant and remaining days mandatory",()=>{
 assert.equal(check("epicDay","Vail","2026-12-31",{epicDayTotal:4,epicPeak:"no",usedDays:0}).status,"NO");
 assert.equal(check("epicDay","Vail","2026-12-31",{epicDayTotal:4,epicPeak:"yes",usedDays:0}).status,"YES");
 assert.equal(check("epicDay","Vail","2026-12-31",{epicDayTotal:4,epicPeak:"yes"}).status,"CHECK");
 assert.equal(check("epicDay","Vail","2026-12-31",{epicDayTotal:4,epicPeak:"yes",usedDays:4}).status,"NO");
 assert.equal(check("epicDay","Vail","2026-12-31",{epicDayTotal:4,usedDays:0}).status,"UNKNOWN");
});
test("Ikon Base New Year's is different from Epic and Aspen Base is Snowmass-only",()=>{
 assert.equal(check("ikonBase","Snowmass","2026-12-31",{usedDays:0}).status,"YES");
 assert.equal(check("ikonBase","Snowmass","2026-12-30",{usedDays:0}).reason,"blackout");
 assert.equal(check("ikonBase","Aspen Mountain","2026-12-31",{usedDays:0}).status,"NO");
 assert.equal(check("ikon","Aspen Highlands","2026-12-31",{usedDays:0}).status,"YES");
});
test("Ikon Alta/Snowbird shared pool and exclusion",()=>{
 assert.equal(check("ikonBase","Alta","2027-03-02",{usedDays:0}).status,"NO");
 const a=check("ikon","Alta","2027-03-02",{usedDays:0});
 assert.equal(a.status,"YES");assert.equal(a.group,"alta-snowbird");
 assert.equal(check("ikon","Snowbird","2027-03-02",{usedDays:7}).status,"NO");
 assert.equal(check("ikonBase","Snowbird","2027-03-02",{usedDays:5}).status,"NO");
});
test("Reservations are required even for a full Ikon Pass",()=>{
 const input={usedDays:0};
 assert.equal(check("ikon","Deer Valley","2027-02-16",input).status,"ACTION");
 assert.equal(check("ikon","Deer Valley","2027-02-16",{...input,reservationMade:"no"}).status,"ACTION");
 assert.equal(check("ikon","Deer Valley","2027-02-16",{...input,reservationMade:"yes"}).status,"YES");
 assert.equal(check("ikon","Loon Mountain","2027-02-16",{...input,reservationMade:"yes"}).status,"YES");
 assert.equal(check("ikonBase","Jackson Hole","2027-02-16",input).status,"NO");
});
test("Ikon Session global pool, restrictions and exclusivity",()=>{
 const a={sessionTotal:2,usedDays:0};
 assert.equal(check("ikonSession","Copper Mountain","2026-12-31",a).status,"YES");
 assert.equal(check("ikonSession","Copper Mountain","2026-12-30",a).status,"NO");
 assert.equal(check("ikonSession","Copper Mountain","2026-12-31",{sessionTotal:2,usedDays:2}).status,"NO");
 assert.equal(check("ikonSession","Jackson Hole","2026-12-31",a).status,"NO");
 assert.equal(check("ikonSession","Copper Mountain","2026-12-31").status,"UNKNOWN");
});
test("Unmodeled region, invalid date, cross-brand and unsupported pass must not be green",()=>{
 assert.equal(E.evaluate({pass:"epic",resort:find("Vail"),date:"2027-02-30"}).status,"UNKNOWN");
 assert.equal(E.evaluate({pass:"epic",resort:"never-verified",date:"2027-02-20"}).status,"UNKNOWN");
 assert.equal(E.evaluate({pass:"epic",resort:find("Vail"),date:"2027-08-01"}).status,"UNKNOWN");
 assert.equal(E.evaluate({pass:"epicMilitary",resort:find("Vail"),date:"2027-01-01"}).status,"UNKNOWN");
 assert.equal(check("ikon","Vail","2027-01-01").status,"NO");
});
test("Blackout search and comparison preserve exact resort and date",()=>{
 const q={pass:"epicLocal",resort:find("Vail"),date:"2026-12-31",usedDays:0};
 const x=E.nextDate(q,10);
 assert.equal(x.date,"2027-01-01");
 assert.equal(x.status,"YES");
 const c=E.compare(q);assert.equal(c.length,Object.keys(E.PASS_NAMES).length);
 assert.equal(c.find(x=>x.pass==="epic").status,"YES");
 assert.equal(c.find(x=>x.pass==="epicLocal").status,"NO");
});
test("Comparison does not reuse days consumed or reservations belonging to another pass",()=>{
 const a=E.compare({pass:"epicLocal",resort:find("Vail"),date:"2027-01-19",usedDays:10,reservationMade:"yes",epicDayTotal:7,epicPeak:"yes"});
 assert.equal(a.find(x=>x.pass==="epicLocal").status,"NO");
 assert.equal(a.find(x=>x.pass==="epic").status,"YES");
 assert.equal(a.find(x=>x.pass==="epicDay").status,"UNKNOWN");
 const b=E.compare({pass:"ikon",resort:find("Deer Valley"),date:"2027-01-19",usedDays:0,reservationMade:"yes"});
 assert.equal(b.find(x=>x.pass==="ikon").status,"YES");
 assert.equal(b.find(x=>x.pass==="ikonBase").status,"NO");
});
test("Seeded 20,000-draw Monte Carlo safety regression: no green across hard gates",()=>{
 let state=1729;const random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296};
 const names=Object.keys(E.PASS_NAMES),d0=Date.parse("2026-11-01T12:00:00Z");
 let total=0,green=0,red=0,unknown=0;
 for(let i=0;i<20000;i++){
   const r=E.resorts[Math.floor(random()*E.resorts.length)];
   const p=names[Math.floor(random()*names.length)];
   const date=new Date(d0+86400000*Math.floor(random()*211)).toISOString().slice(0,10);
   const days=[undefined,0,1,2,4,5,7,10][Math.floor(random()*8)];
   const args={pass:p,resort:r.id,date,usedDays:days,epicDayTotal:4,epicPeak:random()<.5?"yes":"no",sessionTotal:3,reservationMade:random()<.5?"yes":"no"};
   const out=E.evaluate(args);
   assert.ok(["YES","NO","CHECK","ACTION","UNKNOWN"].includes(out.status));
   if(out.status==="YES"){
     green++;
     assert.equal(r.brand,p.startsWith("epic")?"epic":"ikon");
     if(out.limit!==null&&out.limit!==undefined&&Number.isFinite(Number(out.limit)))assert.ok(Number(days)<Number(out.limit),"false green on exhausted pass");
     if(p==="epicLocal"&&r.epicLocalRestricted)assert.equal(E.epicBlackouts.has(date),false);
     if(p==="epicDay"&&args.epicPeak==="no")assert.equal(E.epicBlackouts.has(date),false);
     if(p==="ikonBase"||p==="ikonSession")assert.equal(E.ikonBlackouts.has(date),false);
     if(r.reservation)assert.equal(args.reservationMade,"yes");
   }else if(out.status==="NO")red++;else unknown++;
   total++;
 }
 assert.equal(total,20000);assert.ok(green>1000);assert.ok(red>1000);assert.ok(unknown>0);
});
test("Search, ads and identity contracts in the emitted HTML source",()=>{
 const html=readFileSync(path.join(__dirname,"../public/epic-ikon-pass/index.html"),"utf8");
 assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski.com\/epic-ikon-pass\/">/);
 assert.match(html,/https:\/\/chrisizworski.com\/#person/);
 assert.match(html,/Built by Chris Izworski/);
 assert.equal((html.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g)||[]).length,1);
 assert.match(html,/G-Y5D2V2W7HN/);
 assert.match(html,/aria-live="polite"/);
 assert.match(html,/name="description"/);
});