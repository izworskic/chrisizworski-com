const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const T=require("../api/national-white-christmas")._test;

test("ACIS annual snow rows keep missing data missing and trace as zero",()=>{
  const rows=T.annualSnowRows({data:[["1991-12-25","M"],["1992-12-25","T"],["1993-12-25","1.2"],["1994-12-25","0.4"]]});
  assert.deepEqual(rows,[
    {year:1991,value:null},
    {year:1992,value:0},
    {year:1993,value:1.2},
    {year:1994,value:0.4}
  ]);
});

test("historical White Christmas summary uses the one-inch threshold and resilience minimum",()=>{
  assert.equal(T.HISTORY_RADIUS_MILES,175);
  const rows=[];
  for(let y=1991;y<=2020;y++)rows.push({year:y,value:y%2===0?1:0});
  for(let y=2021;y<=2025;y++)rows.push({year:y,value:2});
  const s=T.historicalSummary(rows);
  assert.equal(s.valid_years,30);
  assert.equal(s.white_years,15);
  assert.equal(s.probability,50);
  assert.equal(s.definition,"At least 1 inch of snow depth on December 25");
  assert.equal(s.recent_valid_years,10);
  assert.equal(s.recent_white_years,8);
  assert.equal(s.recent_probability,80);
  assert.equal(T.historicalSummary(rows.slice(0,14)),null);
});

test("December outlook selection prefers monthly December then NDJ over broader seasonal bands",()=>{
  const payload={results:[
    {layerId:0,attributes:{cat:"Above",prob:50,valid_seas:"OND"}},
    {layerId:1,attributes:{cat:"Below",prob:40,valid_seas:"NDJ"}},
    {layerId:2,attributes:{cat:"Above",prob:60,valid_seas:"DJF"}}
  ]};
  assert.equal(T.chooseDecemberOutlook(payload).valid_period,"NDJ");
  assert.equal(T.containsDecember("SON"),false);
  assert.equal(T.containsDecember("OND"),true);
  assert.equal(T.containsDecember("DEC"),true);
});

test("CPC influence is capped and directional rather than treated as Christmas forecast probability",()=>{
  assert.ok(T.outlookAdjustment({category:"Below",probability:90},"temperature")<=7);
  assert.ok(T.outlookAdjustment({category:"Above",probability:90},"temperature")>=-7);
  assert.ok(T.outlookAdjustment({category:"Above",probability:90},"precipitation")<=4);
  assert.equal(T.outlookAdjustment({category:"EC",probability:33},"temperature"),0);
});

test("early-season estimate remains climatology-led and rounds to five points",()=>{
  const now=new Date("2026-09-02T12:00:00Z");
  const target=new Date("2026-12-25T12:00:00Z");
  const model=T.probabilityModel({
    history:{probability:46},
    cpc:{temperature:{category:"Below",probability:50},precipitation:{category:"Above",probability:40}},
    pack:{kind:"depth",value:30,unit:"in",distance_miles:5,station:"Test"},
    forecast:{available:true,snow_signal:true,rain_signal:false,max_temperature_f:20,min_temperature_f:5},
    target,now
  });
  assert.equal(model.stage,"climatology-led");
  assert.equal(model.confidence,"low");
  assert.equal(model.probability%5,0);
  assert.ok(model.probability>=45&&model.probability<=55);
  assert.equal(model.factors.some(f=>f.id==="pack"),false);
  assert.equal(model.factors.some(f=>f.id==="nws"),false);
});

test("snowpack outside sixty miles never changes the local Christmas estimate",()=>{
  const now=new Date("2026-12-10T12:00:00Z");
  const target=new Date("2026-12-25T12:00:00Z");
  const base=T.probabilityModel({history:{probability:40},cpc:{},pack:null,forecast:null,target,now});
  const far=T.probabilityModel({history:{probability:40},cpc:{},pack:{kind:"depth",value:24,unit:"in",distance_miles:61,station:"Far"},forecast:null,target,now});
  assert.equal(far.raw_probability,base.raw_probability);
  assert.equal(far.factors.some(f=>f.id==="pack"),false);
});

test("nearby pack and NWS Christmas forecast can dominate inside final week",()=>{
  const now=new Date("2026-12-21T12:00:00Z");
  const target=new Date("2026-12-25T12:00:00Z");
  const snowy=T.probabilityModel({
    history:{probability:30},cpc:{},
    pack:{kind:"depth",value:5,unit:"in",distance_miles:12,station:"Near"},
    forecast:{available:true,snow_signal:true,rain_signal:false,max_temperature_f:28,min_temperature_f:18},
    target,now
  });
  const warm=T.probabilityModel({
    history:{probability:70},cpc:{},
    pack:{kind:"depth",value:.2,unit:"in",distance_miles:12,station:"Near"},
    forecast:{available:true,snow_signal:false,rain_signal:true,max_temperature_f:48,min_temperature_f:39},
    target,now
  });
  assert.equal(snowy.stage,"short-range-forecast-led");
  assert.ok(snowy.probability>30);
  assert.ok(warm.probability<70);
  assert.ok(snowy.factors.some(f=>f.id==="nws"));
});

test("verdict language avoids guarantees at every probability band",()=>{
  for(const p of [5,30,50,70,90]){
    const v=T.verdict({probability:p});
    assert.doesNotMatch(v.headline,/guarantee|certain|definitely/i);
  }
});

test("main White Christmas page is canonical, tasteful, transparent and privacy-safe",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../public/national-tools/white-christmas/index.html"),"utf8");
  assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski\.com\/national-tools\/white-christmas\/">/);
  assert.match(html,/at least 1 inch of snow on the ground on December 25/i);
  assert.match(html,/rounded to 5-point increments/i);
  assert.match(html,/not an official NOAA Christmas forecast/i);
  assert.match(html,/loading="lazy"/);
  assert.match(html,/White Christmas Result/);
  const event=html.split("\n").find(line=>line.includes("White Christmas Result"))||"";
  assert.doesNotMatch(event,/latitude|longitude|query|place|postal/i);
});

test("supporting White Christmas pages own distinct map and Michigan intents",()=>{
  const map=fs.readFileSync(path.join(__dirname,"../public/white-christmas-probability-map/index.html"),"utf8");
  const mi=fs.readFileSync(path.join(__dirname,"../public/white-christmas-michigan/index.html"),"utf8");
  assert.match(map,/White Christmas Probability Map/);
  assert.match(map,/1991-2020/);
  assert.match(map,/climatology, not this year's answer/i);
  assert.match(mi,/White Christmas Michigan/);
  assert.match(mi,/34\.7% historical probability/);
  assert.match(mi,/51\.1% historical probability/);
  assert.match(mi,/45\.7% historical probability/);
  assert.match(mi,/About 96% historically/);
});

test("White Christmas API is keyless and keeps source families distinct",()=>{
  const src=fs.readFileSync(path.join(__dirname,"../api/national-white-christmas.js"),"utf8");
  assert.match(src,/data\.rcc-acis\.org/);
  assert.match(src,/cpc_sea_temp_outlk/);
  assert.match(src,/api\.weather\.gov/);
  assert.match(src,/national-snow/);
  assert.doesNotMatch(src,/API_KEY|apiKey|Authorization|Bearer/);
});
