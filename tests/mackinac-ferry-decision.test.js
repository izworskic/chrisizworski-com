const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");

const file=path.join(__dirname,"../public/assets/mackinac-ferry-decision.js");
const js=fs.readFileSync(file,"utf8");
const context={window:{}};
vm.runInNewContext(js,context,{filename:file});
const compare=context.window.MackinacFerryPrice;
const base={date:"2026-10-17",origin:"lower",trip:"day",nights:0,adults:2,kids:2,infants:0,age4:0,bikes:1,parking:"standard",priority:"balanced",military:false};
const get=(options,id,port="mackinaw")=>options.find(x=>x.id===id&&x.port===port);

test("family 2026 base fares include two paid children, bicycle and correct port parking",()=>{
 const v=compare(base);assert.equal(v.status,"ok");
 const arnold=get(v.options,"arnold");const sheplers=get(v.options,"sheplers");
 assert.equal(arnold.subtotal,153);assert.equal(arnold.fees,null);
 assert.equal(sheplers.subtotal,168);assert.equal(sheplers.fees,8);assert.equal(sheplers.total,176);
 assert.equal(v.options[0].port,"mackinaw");
});
test("military discount applies to eligible paid travelers and excludes unknown Arnold checkout fees",()=>{
 const v=compare({...base,military:true});
 assert.equal(get(v.options,"arnold").subtotal,109);
 assert.equal(get(v.options,"sheplers").subtotal,116);
 assert.equal(get(v.options,"sheplers").total,124);
 assert.equal(get(v.options,"arnold").fees,null);
});
test("young children count toward Shepler ticket booking fees and age 4 is free on Shepler",()=>{
 const v=compare({...base,infants:1,age4:1});
 const s=get(v.options,"sheplers");
 assert.equal(s.passenger,132);
 assert.equal(s.fees,12);
 assert.equal(s.total,180);
 assert.equal(s.priceUncertain,false);
 const a=get(v.options,"arnold");
 assert.equal(a.priceUncertain,true);
 assert.equal(a.subtotal-a.minSubtotal,25);
});
test("Arnold classic child price is a range because official fare pages contradict each other",()=>{
 const v=compare({...base,date:"2026-07-15",origin:"upper",priority:"classic"});
 const classic=get(v.options,"classic","stignace");
 assert.ok(classic);
 assert.equal(v.options[0].id,"classic");
 assert.equal(classic.priceUncertain,true);
 assert.equal(classic.subtotal-classic.minSubtotal,38);
});
test("classic service isn't offered after September 6 or from Mackinaw City",()=>{
 const fall=compare(base);
 assert.ok(!fall.options.some(x=>x.id==="classic"));
 const summer=compare({...base,date:"2026-07-15"});
 assert.ok(!summer.options.some(x=>x.id==="classic"&&x.port==="mackinaw"));
});
test("rejects invalid summer-to-winter overnight, past winter, and unverified 2027 rates",()=>{
 for(const params of [
  {...base,trip:"overnight",nights:1,date:"2026-10-31"},
  {...base,date:"2026-11-11"},
  {...base,date:"2027-06-18"},
 ]){const v=compare(params);assert.equal(v.status,"season");assert.equal(v.options.length,0);}
});
test("route ranking obeys origin and cost preferences",()=>{
 const south=compare({...base,origin:"lower",priority:"balanced"});
 assert.equal(south.options[0].port,"mackinaw");
 const north=compare({...base,origin:"upper",priority:"balanced"});
 assert.equal(north.options[0].port,"stignace");
 const noParking=compare({...base,parking:"none"});
 assert.equal(get(noParking.options,"arnold").parkCost,0);
});
test("page generator imports standalone HTML module; HTML contains family fields and weather disclosure",()=>{
 const generator=fs.readFileSync(path.join(__dirname,"../scripts/generate-mackinac-intent-pages.mjs"),"utf8");
 const experience=fs.readFileSync(path.join(__dirname,"../scripts/mackinac-ferry-experience.mjs"),"utf8");
 assert.match(generator,/ferryExperienceMarkup/);
 assert.match(generator,/mackinac-ferry-decision\.js/);
 for(const pattern of [/id="ferry-age4"/,/id="ferry-infants"/,/id="ferry-kids"/,/id="ferry-military"/,/openstreetmap\.org/,/marine\.weather\.gov/])assert.match(experience,pattern);
});
