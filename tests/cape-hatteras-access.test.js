const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {parseNpsStatus,normalizeDirection,openNowFromHours,rampAccessSummary,scoreRamp}=require("../lib/cape-hatteras-access");
const {parseSurfText,surfContextForRamp}=require("../api/cape-hatteras-access");

const fixture=`
<h2>Bodie Island</h2><p>Updated</p><p>September 11, 2026 at 4:16 PM</p>
<h3>Ramp 2</h3><p>North: Open to pedestrians</p><p>Hours: Ramp open to ORVs from 6:30 a.m. to 9:00 p.m.</p><p>South: Open to ORVs for 2.00 miles</p><p>Hours: Ramp open to ORVs from 6:30 a.m. to 9:00 p.m.</p>
<h3>Ramp 4</h3><p>North: Closed</p><p>South: Open to ORVs for 0.20 miles</p><p>Hours: Ramp open to ORVs from 6:30 a.m. to 9:00 p.m.</p>
<h2>Hatteras Island</h2>
<h3>Ramp 27</h3><p>North: Open to ORVs for 0.22 miles</p><p>Hours: Ramp open to ORVs from 6:30 a.m. to 9:00 p.m.</p><p>South: Open to pedestrians</p>
<h3>Ramp 43</h3><p>North: Open to ORVs</p><p>Hours: Ramp open to ORVs from 6:30 a.m. to 9:00 p.m.</p><p>South: Open to ORVs</p><p>Hours: Ramp open to ORVs from 6:30 a.m. to 9:00 p.m.</p>
<h3>Ramp 44</h3><p>North: Open</p><p>Hours: Ramp open to ORVs from 6:30 a.m. to 9:00 p.m.</p><p>South: Open to ORVs</p><p>Hours: Ramp open to ORVs from 6:30 a.m. to 9:00 p.m.</p>
<h2>Ocracoke Island</h2>
<h3>Ramp 59</h3><p>North: Open to pedestrians</p><p>South: Open to ORVs</p><p>Hours: Ramp open to ORVs from 7:00 a.m. to 9:00 p.m.</p>
<h3>Ramp 63</h3><p>North: Open to ORVs</p><p>Hours: Ramp open to ORVs from 7:00 a.m. to 9:00 p.m.</p><p>South: Open to ORVs for 0.24 miles</p><p>Hours: Ramp open to ORVs from 7:00 a.m. to 9:00 p.m.</p>
<h3>Ramp 67</h3><p>North: Open to ORVs</p><p>South: Open to ORVs</p>
`;

test("direction normalization preserves pedestrian-only rather than calling it closed",()=>{
 const d=normalizeDirection({status_raw:"Open to pedestrians",hours:"",notes:""});
 assert.equal(d.state,"pedestrian_only");
});

test("explicit closed status stays closed",()=>{
 const d=normalizeDirection({status_raw:"Closed",hours:"",notes:""});
 assert.equal(d.state,"closed");
});

test("ORV mileage is parsed without inventing unreported mileage",()=>{
 const d=normalizeDirection({status_raw:"Open to ORVs for 0.22 miles",hours:"",notes:""});
 assert.equal(d.state,"orv_open_limited");
 assert.equal(d.mileage,0.22);
 const open=normalizeDirection({status_raw:"Open to ORVs",hours:"",notes:""});
 assert.equal(open.mileage,null);
});

test("NPS parser keeps direction semantics and update timestamp",()=>{
 const parsed=parseNpsStatus(fixture);
 assert.equal(parsed.official_updated,"September 11, 2026 at 4:16 PM");
 const r2=parsed.ramps.find(r=>r.id==="2");
 assert.equal(r2.directions.find(d=>d.direction==="North").state,"pedestrian_only");
 assert.equal(r2.directions.find(d=>d.direction==="South").state,"orv_open_limited");
 const r4=parsed.ramps.find(r=>r.id==="4");
 assert.equal(r4.directions.find(d=>d.direction==="North").state,"closed");
});

test("parser refuses to call a tiny one-ramp document high confidence",()=>{
 const parsed=parseNpsStatus('<h2>Hatteras Island</h2><h3>Ramp 44</h3><p>South: Open to ORVs</p>');
 assert.equal(parsed.parser_quality,"failed");
});

test("operating hours are applied separately from access status",()=>{
 const summerNoon=new Date("2026-09-13T16:00:00Z");
 const summerNight=new Date("2026-09-14T02:30:00Z");
 assert.equal(openNowFromHours("Ramp open to ORVs from 6:30 a.m. to 9:00 p.m.",summerNoon),true);
 assert.equal(openNowFromHours("Ramp open to ORVs from 6:30 a.m. to 9:00 p.m.",summerNight),false);
 assert.equal(openNowFromHours("Open 24 hours",summerNight),true);
});

test("tide cannot make a pedestrian-only ramp eligible for ORV ranking",()=>{
 const ramp={id:"99",area:"Hatteras Island",directions:[{direction:"North",state:"pedestrian_only",hours:"",mileage:null}]};
 const result=scoreRamp(ramp,{tide:{events:[{type:"L",time:new Date(Date.now()+3600000).toISOString()}]},nps_quality:"high"});
 assert.equal(result.eligible,false);
 assert.equal(result.score,null);
});

test("closed ramp is never ORV eligible regardless of favorable conditions",()=>{
 const ramp={id:"99",area:"Hatteras Island",directions:[{direction:"South",state:"closed",hours:"",mileage:null}]};
 const result=scoreRamp(ramp,{tide:{events:[{type:"L",time:new Date(Date.now()+3600000).toISOString()}]},weather:{wind_mph:2},surf:{height_max_ft:1},transport:{status:"verified"},nps_quality:"high"});
 assert.equal(result.eligible,false);
});

test("surf parser keeps north and south of Cape Hatteras distinct",()=>{
 const text=`Hatteras Island-\n.RIP CURRENT RISK...\nNorth of Cape Hatteras...High\nSouth of Cape Hatteras...Low\n.SURF HEIGHT...3 to 5 feet\n.WINDS...Southwest winds 10 to 15 mph\n$$\nOcracoke Island-\n.RIP CURRENT RISK...Moderate\n.SURF HEIGHT...Around 4 feet\n$$`;
 const parsed=parseSurfText(text);
 assert.equal(parsed.hatteras_north_rip_current_risk,"high");
 assert.equal(parsed.hatteras_south_rip_current_risk,"low");
 assert.equal(parsed.ocracoke_rip_current_risk,"moderate");
 assert.equal(surfContextForRamp({id:"49",area:"Hatteras Island"},parsed).rip_current_risk,"low");
 assert.equal(surfContextForRamp({id:"27",area:"Hatteras Island"},parsed).rip_current_risk,"high");
 assert.equal(surfContextForRamp({id:"44",area:"Hatteras Island"},parsed).rip_current_risk,null);
});

test("production page keeps official access, tide convenience and ocean safety separate",()=>{
 const page=fs.readFileSync("public/national-tools/cape-hatteras-beach-access/index.html","utf8");
 assert.match(page,/Field signs are the final authority/);
 assert.match(page,/does not prove the sand is safe or driveable/);
 assert.match(page,/pedestrian-only/i);
 assert.match(page,/High NWS rip-current risk/);
 assert.doesNotMatch(page,/Safe driving window|safe to drive until/i);
});

test("map only pins registry entries with finite verified coordinates",()=>{
 const page=fs.readFileSync("public/national-tools/cape-hatteras-beach-access/index.html","utf8");
 assert.match(page,/Number\.isFinite\(Number\(reg\?\.lat\)\)/);
 assert.match(page,/No missing coordinates are interpolated/);
});

test("inline application script parses",()=>{
 const page=fs.readFileSync("public/national-tools/cape-hatteras-beach-access/index.html","utf8");
 const scripts=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.trim()&&!s.trim().startsWith('{"@context"'));
 assert.ok(scripts.length>=1);
 for(const script of scripts)new vm.Script(script);
});

test("search metadata stays inside repository SERP limits",()=>{
 const page=fs.readFileSync("public/national-tools/cape-hatteras-beach-access/index.html","utf8");
 const title=page.match(/<title>([^<]+)<\/title>/)[1];
 const description=page.match(/<meta name="description" content="([^"]+)"/)[1];
 assert.ok(title.length<=60,`title ${title.length}`);
 assert.ok(description.length<=158,`description ${description.length}`);
 assert.match(page,/rel="canonical" href="https:\/\/chrisizworski\.com\/national-tools\/cape-hatteras-beach-access\/"/);
});
