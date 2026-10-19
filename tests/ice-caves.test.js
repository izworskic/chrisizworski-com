const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const engine=()=>import('../lib/michigan-ice/caves.mjs');
test('cold accumulation separates thaw, legacy net index, and missing measurements',async()=>{
 const {thermalHistory}=await engine();const h=thermalHistory([['2026-11-01','20','20'],['2026-11-02','40','40']],'2026-11-01','2026-11-02');
 assert.equal(h.fdd,12);assert.equal(h.thaw,8);assert.equal(h.daily[1].netCold,4);
 const gap=thermalHistory([['2026-11-01','M','M'],['2026-11-02','20','20']],'2026-11-01','2026-11-02');
 assert.equal(gap.fdd,null);assert.equal(gap.validDays,1);assert.equal(gap.observedColdLowerBound,12);assert.equal(gap.daily[1].fdd,null);
 const empty=thermalHistory(null,'2026-11-01','2026-11-03');assert.equal(empty.fdd,null);assert.equal(empty.lastValid,null);assert.equal(empty.validDays,0);
});
test('November accounting does not manufacture an observed pre-season zero',async()=>{
 const {seasonFor}=await engine();const s=seasonFor(new Date('2026-10-19T10:00:00Z'));assert.equal(s.preSeason,true);assert.equal(s.start,'2026-11-01');
 assert.equal(seasonFor(new Date('2027-02-01T05:00Z')).year,2026);
});
test('forecast degree-hours integrate interval duration and reject stale or wrong units',async()=>{
 const {forecastSummary}=await engine(),now=new Date('2027-01-01T12:00Z');
 const grid={properties:{updateTime:now.toISOString(),temperature:{uom:'wmoUnit:degC',values:[{validTime:'2027-01-01T12:00:00Z/PT3H',value:5},{validTime:'2027-01-01T15:00:00Z/PT2H',value:-5}]}}};
 const f=forecastSummary(grid,now);assert.equal(f.days[0].hours,5);assert.equal(f.days[0].thawHours,3);assert.equal(f.days[0].thawDegreeHours,27);assert.equal(f.days[0].freezeDegreeHours,18);
 grid.properties.temperature.uom='wmoUnit:degF';assert.equal(forecastSummary(grid,now),null);grid.properties.temperature.uom='wmoUnit:degC';grid.properties.updateTime='2026-12-01T12:00Z';assert.equal(forecastSummary(grid,now),null);
});
test('high cold or lack of reports cannot create formed, prime or open status',async()=>{
 const {evidenceFor}=await engine(),{SITES}=await import('../lib/michigan-ice/sites.mjs');
 for(const site of SITES){const e=evidenceFor(site,{now:new Date('2027-01-15T15:00Z'),history:{complete:true,fdd:5000,daily:[]}});assert.equal(e.prime,false);assert.equal(e.state,'unconfirmed');assert.equal(e.access,'unverified');}
});
test('prime requires exact site authority, viewing scope, fresh report, reviewed access, no thaw or gaps',async()=>{
 const {evidenceFor}=await engine(),{SITES}=await import('../lib/michigan-ice/sites.mjs');const site=SITES[0],now=new Date('2027-01-15T15:00Z');
 const report={siteId:site.id,state:'formed',prime:true,observedOn:'2027-01-15',publishedOn:'2027-01-15',authority:site.manager,viewingScope:site.scope,source:site.source};
 const options={now,reports:[report],reviews:[{...report,state:'open',reviewedAt:'2027-01-15T14:00Z'}],forecast:{issuedAt:now.toISOString(),days:[{thawHours:0,hours:24}]},history:{complete:true,daily:[]}};
 assert.equal(evidenceFor(site,options).prime,true);
 assert.equal(evidenceFor(site,{...options,reports:[{...report,publishedOn:null}]}).report,null);
 assert.equal(evidenceFor(site,{...options,reports:[{...report,observedOn:'2027-01-00'}]}).report,null);
 assert.equal(evidenceFor(site,{...options,reviews:[{...options.reviews[0],source:'https://example.com/'}]}).access,'unverified');
 assert.equal(evidenceFor(site,{...options,forecast:{...options.forecast,days:[{thawHours:0,hours:3}]}}).prime,false);
 assert.equal(evidenceFor(site,{...options,reviews:[{...report,state:'closed',reviewedAt:'2027-01-15T14:00Z'}]}).prime,false);
 assert.equal(evidenceFor(site,{...options,forecast:{...options.forecast,days:[{thawHours:2}]}}).prime,false);
 assert.equal(evidenceFor(site,{...options,history:{complete:false,daily:[]}}).prime,false);
 assert.equal(evidenceFor(site,{...options,history:{complete:true,daily:[{date:'2027-01-15',valid:true,high:40}]}}).prime,false);
 assert.equal(evidenceFor(site,{...options,reports:[{...report,source:'https://example.com/fake'}]}).report,null);
 assert.equal(evidenceFor(site,{...options,reports:[{...report,viewingScope:'other cliff'}]}).report,null);
 assert.equal(evidenceFor(site,{...options,reports:[{...report,observedOn:'2027-01-16'}]}).report,null);
 assert.equal(evidenceFor(site,{...options,reports:[{...report,observedOn:'2026-01-15'}]}).report,null);
});
test('Grand Island gates remain shore-only in HTML, data, sources and planner',async()=>{
 const {SITES}=await import('../lib/michigan-ice/sites.mjs');const s=SITES.find(s=>s.id==='grand-island');assert.equal(s.gate,'shore-only');assert.match(s.scope,/mainland only/);assert.match(s.safety,/Stay off the lake ice/);
 const html=fs.readFileSync('public/michigan-ice-caves/grand-island/index.html','utf8');assert.match(html,/mainland only/);assert.match(html,/Stay off the lake ice/);assert.match(html,/No ice-crossing route/);
});
test('all six pages own canonicals and dates, and every GO page is in winter sitemap',async()=>{
 const {SITES}=await import('../lib/michigan-ice/sites.mjs'),map=fs.readFileSync('public/sitemap-winter.xml','utf8');
 for(const slug of ['',...SITES.map(s=>s.id+'/')]){const h=fs.readFileSync('public/michigan-ice-caves/'+slug+'index.html','utf8'),u='https://chrisizworski.com/michigan-ice-caves/'+slug;
 assert(h.includes('rel="canonical" href="'+u+'"'));assert(map.includes('<loc>'+u+'</loc>'));assert.match(h,/dateModified/);assert.match(h,/#person/);assert.match(h,/Built by/);assert.match(h,/app\.js/);}
 for(const f of ['public/michigan-ice/index.html','public/snowmobile/regions/eastern-up.html','public/northern-lights-michigan/munising/index.html','public/northern-lights-michigan/paradise-whitefish-point/index.html'])assert(fs.readFileSync(f,'utf8').includes('href="/michigan-ice-caves/"'));
});
test('existing legacy index does not turn all-missing records into zero cold',async()=>{
 const {afddFrom}=await import('../lib/michigan-ice/thermal.mjs');assert.equal(afddFrom([['2026-01-01','M','M']]),null);assert.equal(afddFrom([['2026-01-01','20','20'],['2026-01-02','40','40']]),4);
});
