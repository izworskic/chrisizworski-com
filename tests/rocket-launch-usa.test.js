'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const model = require('../lib/rocket-launch-usa');
const api = require('../api/rocket-launch-usa');

const FIXED = Date.parse('2026-10-31T18:00:00Z');
function raw(id, locationId, net, precision = 'Minute', status = 'Go for Launch') {
  return {
    id, name: 'Falcon 9 Block 5 | Mission ' + id.slice(0, 4),
    net, net_precision: { name: precision }, status: { name: status },
    last_updated: new Date(Date.now() - 3600000).toISOString(),
    pad: {
      name: 'Space Launch Complex 4E', latitude: 34.63, longitude: -120.61,
      location: { id: locationId, name: 'Official launch range' }
    },
    rocket: { configuration: { full_name: 'Falcon 9 Block 5' } }
  };
}
function response(data, status = 200, type = 'json') {
  return {
    ok: status >= 200 && status < 400,
    status,
    headers: { get: () => null },
    json: async () => data,
    text: async () => type === 'html' ? data : JSON.stringify(data)
  };
}
function mockRes() {
  return {
    headers: {}, statusCode: 200, body: null,
    setHeader(k,v){this.headers[k]=v;},
    status(code){this.statusCode=code;return this;},
    json(body){this.body=body;return this;}
  };
}
test('all six verified U.S. coastal regions and seven provider location IDs exist', () => {
  assert.deepEqual(model.REGIONS.map(x => x.id),
    ['california','florida','texas','virginia','alaska','hawaii']);
  const ids=model.REGIONS.flatMap(x=>x.ids);
  assert.equal(ids.length,7);
  assert.equal(new Set(ids).size,7);
  assert.deepEqual(ids.slice().sort((a,b)=>a-b),[1,11,12,21,25,27,143]);
  for(const region of model.REGIONS){
    assert.ok(region.authority.startsWith('https://'));
    assert.ok(region.access.startsWith('https://'));
    assert.ok(region.context.length>50);
    assert.ok(region.sites.every(x => x.source));
  }
});
test('provider queries are region-limited, bounded and cached at CDN', () => {
  const queries=api._test.LAUNCH_QUERIES;
  assert.equal(queries.length,2);
  assert.deepEqual(queries.map(x=>x.ids),[[11,12,27],[1,21,25,143]]);
  assert.ok(queries.every(x=>x.limit<=36));
  for(const q of queries) {
    const parsed=new URL(api._test.queryUrl(q));
    assert.equal(parsed.host,'ll.thespacedevs.com');
    assert.equal(parsed.searchParams.get('location__ids'),q.ids.join(','));
    assert.equal(parsed.searchParams.get('format'),'json');
  }
});
test('launch normalizer rejects unknown countries, pads and completed missions', () => {
  const t='2026-11-05T15:10:00Z';
  const launch=raw('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',143,t);
  assert.equal(model.regionForLaunch(launch),'texas');
  assert.equal(model.normalizeUsLaunch(launch,FIXED).region,'texas');
  assert.equal(model.normalizeUsLaunch(raw('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',900,t),FIXED),null);
  assert.equal(model.normalizeUsLaunch(raw('cccccccc-cccc-4ccc-8ccc-cccccccccccc',11,t,'Minute','Launch Successful'),FIXED),null);
  assert.equal(model.normalizeUsLaunch(raw('dddddddd-dddd-4ddd-8ddd-dddddddddddd',11,t,'Day'),FIXED).tbdTime,true);
});
test('Surf Beach outside official 8AM–6PM hours cannot offer directions', () => {
  const r=model.REGIONS.find(x=>x.id==='california');
  const beach=r.sites.find(x=>x.id==='surf-beach');
  const l={net:'2026-11-03T02:21:00Z',netPrecision:'minute'}; // 7:21 PM Pacific (PDT)
  const x=model.viewDecision(r,beach,l);
  assert.equal(x.state,'hours');
  assert.equal(x.directionsAllowed,false);
  assert.match(x.reason,/8 a\.m.–6 p\.m./i);
  const day=model.viewDecision(r,beach,{net:'2026-11-03T20:21:00Z',netPrecision:'minute'});
  assert.equal(day.state,'verify');
  assert.doesNotMatch(day.label,/open now/i);
});
test('restricted military range and Boca Chica sites never offer navigation',()=>{
  for(const id of ['texas','alaska','hawaii']){
    const r=model.REGIONS.find(x=>x.id===id);
    for(const s of r.sites.filter(x=>x.kind==='range-restricted')){
      const d=model.viewDecision(r,s,null);
      assert.equal(d.state,'restricted');
      assert.equal(d.directionsAllowed,false);
    }
  }
  const fl=model.REGIONS.find(x=>x.id==='florida');
  assert.equal(model.viewDecision(fl,fl.sites[0],null).state,'specialist');
  assert.equal(fl.specialist,'/national-tools/space-coast-launch/');
});
test('NASA Wallops Visitor Center stays event-specific, not assumed open after hours',()=>{
  const r=model.REGIONS.find(x=>x.id==='virginia');
  const site=model.viewDecision(r,r.sites.find(x=>x.id==='wallops-visitor'),
    {net:'2026-11-06T02:00:00Z',netPrecision:'minute'});
  assert.equal(site.state,'mission');
  assert.match(site.reason,/not automatically open/i);
  assert.equal(site.label,'NASA must announce launch-specific opening');
});
test('Starbase official beach and road page parser separates general access from road advisory',()=>{
  const html='<html><body>'+('a'.repeat(1200))+
    '<div id="beach-closure" class="beach"><div class="cms-big-text">Boca Chica Beach is open.</div></div>'+
    '<div id="road-closure"><div class="cms-big-text">Road Delay</div><div class="cms-small-text-api">Description: Masseys to Production<br>Date: November 1 11:59 PM to November 2 4:00 AM</div></div></body></html>';
  const v=model.parseStarbaseAccess(html);
  assert.equal(v.state,'open-general');
  assert.equal(v.roadState,'advisory');
  assert.match(v.description,/November 1/);
  assert.equal(model.parseStarbaseAccess(html.replace('Beach is open.','Beach is closed.')).state,'closed');
  assert.equal(model.parseStarbaseAccess('<html/>').state,'unknown');
  assert.equal(model.parseStarbaseAccess('<html/>'+'x'.repeat(300000)).state,'unknown');
});
test('sky comparison needs both valid weather layers and a meaningful difference',()=>{
  const place=(id,percent,level='good')=>({
    id,name:id,cloudStatus:'ok',cloudCoverPercent:percent,assessment:{level}});
  assert.equal(api._test.skyCompare([place('one',20),place('two',55)]).winner,'one');
  assert.equal(api._test.skyCompare([place('one',20),place('two',37)]).state,'similar');
  assert.equal(api._test.skyCompare([place('one',20),{...place('two',80),cloudStatus:'stale-grid'}]).state,'unknown');
  assert.equal(api._test.skyCompare([place('one',20),place('two',70,'poor')]).state,'unknown');
});
test('date-only launch cannot trigger a local forecast or invented countdown',async()=>{
  const r=model.REGIONS.find(x=>x.id==='texas');
  const out=await api._test.weatherFor(r,{net:'2026-11-10T00:00:00Z',netPrecision:'day'},FIXED);
  assert.equal(out.level,'unknown');
  assert.equal(out.places.length,0);
});
test('national API provides all coasts, exact launch selection, partial feed health and source-based road notices',async()=>{
  const original=global.fetch;
  const t=new Date(Date.now()+2*3600000).toISOString();
  const day=new Date(Date.now()+4*86400000).toISOString();
  const idCa='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const idTx='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const idWa='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const primary={results:[
    raw(idCa,11,t),
    raw('dddddddd-dddd-4ddd-8ddd-dddddddddddd',12,day,'Day'),
    raw('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',11,day,'Minute','Launch Successful')
  ],count:3};
  const sparse={results:[
    raw(idTx,143,t),raw(idWa,21,day,'Day'),
    raw('ffffffff-ffff-4fff-8fff-ffffffffffff',1,day,'Month')
  ],count:3};
  const starbase='<html>'+('s'.repeat(1200))+
    '<div id="beach-closure"><div class="cms-big-text">Boca Chica Beach is closed.</div></div>'+
    '<div id="road-closure"><div class="cms-big-text">Road Delay</div><div class="cms-small-text-api">Description: Highway 4 testing closure</div></div></html>';
  const period={
    startTime:new Date(Date.now()-3600000).toISOString(),
    endTime:new Date(Date.now()+5*3600000).toISOString(),
    shortForecast:'Mostly Sunny',windSpeed:'9 mph',probabilityOfPrecipitation:{value:12}
  };
  const grid={properties:{updateTime:new Date(Date.now()-3600000).toISOString(),
    skyCover:{uom:'wmoUnit:percent',values:[{
      validTime:new Date(Date.now()-3600000).toISOString()+'/PT5H',value:40
    }]}}};
  global.fetch=async url=>{
    url=String(url);
    if(url.startsWith('https://ll.thespacedevs.com/')){
      const u=new URL(url);
      return response(u.searchParams.get('location__ids')==='11,12,27'?primary:sparse);
    }
    if(url==='https://www.starbase.texas.gov/beach-road-access')return response(starbase,200,'html');
    if(url.startsWith('https://api.weather.gov/points/')){
      const code=url.includes('26.0740')?'A':'B';
      return response({properties:{
        forecastHourly:'https://api.weather.gov/gridpoints/BRO/'+code+'/forecast/hourly',
        forecastGridData:'https://api.weather.gov/gridpoints/BRO/'+code
      }});
    }
    if(url.endsWith('/forecast/hourly'))return response({properties:{periods:[period]}});
    if(url.startsWith('https://api.weather.gov/gridpoints/'))return response(grid);
    throw new Error('Unexpected URL: '+url);
  };
  try{
    const res=mockRes();
    await api({method:'GET',query:{region:'texas',launchId:idTx}},res);
    assert.equal(res.statusCode,200);
    assert.equal(res.body.ok,true);
    assert.equal(res.body.regions.length,6);
    assert.equal(res.body.selectedLaunchId,idTx);
    assert.equal(res.body.selectedRegion,'texas');
    assert.deepEqual(res.body.coverage.locationIds,[1,11,12,21,25,27,143]);
    assert.equal(res.body.access.liveOfficialNotice.state,'closed');
    assert.equal(res.body.access.liveOfficialNotice.roadState,'advisory');
    assert.equal(res.body.access.sites.find(x=>x.id==='boca-chica').directionsAllowed,false);
    assert.equal(res.body.weather.places.length,2);
    assert.equal(res.body.weather.places[0].cloudCoverPercent,40);
    assert.equal(res.body.weather.comparison.state,'similar');
    assert.equal(res.headers['X-Robots-Tag'],'noindex, nofollow');
    assert.match(res.headers['Cache-Control'],/s-maxage=1800/);
    const wallops=mockRes();
    await api({method:'GET',query:{region:'virginia'}},wallops);
    assert.equal(wallops.statusCode,200);
    assert.equal(wallops.body.selectedRegion,'virginia');
    assert.equal(wallops.body.weather.level,'unknown');
    const invalid=mockRes();
    await api({method:'GET',query:{region:'antarctica'}},invalid);
    assert.equal(invalid.statusCode,400);
    const fake=mockRes();
    await api({method:'GET',query:{region:'texas',launchId:'../../etc/passwd'}},fake);
    assert.equal(fake.statusCode,400);
  }finally{global.fetch=original;}
});
test('failure of a provider group degrades to partial rather than an invented national zero',async()=>{
  const original=global.fetch;
  const t=new Date(Date.now()+5*86400000).toISOString();
  const idTx='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  global.fetch=async url=>{
    url=String(url);
    if(url.includes('ll.thespacedevs.com')){
      const u=new URL(url);
      if(u.searchParams.get('location__ids')==='11,12,27')return response({},503);
      return response({results:[raw(idTx,143,t,'Day')],count:1});
    }
    if(url.includes('starbase.texas.gov'))return response({},503);
    throw new Error('Unexpected: '+url);
  };
  try{
    const res=mockRes();
    await api({method:'GET',query:{region:'texas'}},res);
    assert.equal(res.statusCode,200);
    assert.equal(res.body.coverage.partial,true);
    assert.equal(res.body.regions.find(r=>r.id==='california').feedState,'unavailable');
    assert.equal(res.body.regions.find(r=>r.id==='texas').launches.length,1);
    assert.equal(res.body.access.liveOfficialNotice.state,'unknown');
  }finally{global.fetch=original;}
});
test('site has one canonical, a national directory card, sitemap entry and six region buttons',()=>{
  const base=path.resolve(__dirname,'..');
  const html=fs.readFileSync(path.join(base,'public/synced-national-tools/rocket-launch-live/index.html'),'utf8');
  const dir=fs.readFileSync(path.join(base,'public/synced-national-tools/index.html'),'utf8');
  const map=fs.readFileSync(path.join(base,'public/sitemap.xml'),'utf8');
  const conf=JSON.parse(fs.readFileSync(path.join(base,'vercel.json'),'utf8'));
  const apiClient=fs.readFileSync(path.join(base,'public/synced-national-tools/rocket-launch-live/app.js'),'utf8');
  assert.match(html,/rel="canonical" href="https:\/\/chrisizworski.com\/national-tools\/rocket-launch-live\/"/);
  assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
  assert.equal((html.match(/class="rl-region-btn"/g)||[]).length,6);
  assert.match(html,/basemaps.cartocdn.com/);
  assert.match(dir,/data-tool-id="rocket-launch-usa"/);
  assert.match(map,/https:\/\/chrisizworski.com\/national-tools\/rocket-launch-live\//);
  assert.ok(conf.rewrites.findIndex(x=>x.source==='/national-tools/rocket-launch-live/')>=0);
  assert.ok(conf.rewrites.findIndex(x=>x.source==='/national-tools/rocket-launch-live/')<
    conf.rewrites.findIndex(x=>x.source==='/national-tools/:path*'));
  assert.ok(!/NPS_API_KEY|NASA_API_KEY|LL2_API_KEY/.test(apiClient));
  const blocks=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length,1);
  assert.doesNotThrow(()=>JSON.parse(blocks[0][1]));
});
