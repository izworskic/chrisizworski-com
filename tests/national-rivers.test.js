const test=require('node:test');
const assert=require('node:assert/strict');
const rivers=require('../api/national-rivers.js')._test;
const context=require('../api/national-river-context.js')._test;
const index=require('../public/data/national-usgs-streamflow-sites.json');

function series({id='04157000',name='SAGINAW RIVER AT SAGINAW, MI',lat=43.43,lon=-83.94,code='00060',values=[['1000','2026-08-31T12:00:00.000-04:00']] }={}){
  return {
    sourceInfo:{
      siteName:name,
      siteCode:[{value:id}],
      geoLocation:{geogLocation:{latitude:lat,longitude:lon}}
    },
    variable:{variableCode:[{value:code}]},
    values:[{value:values.map(([value,dateTime])=>({value,dateTime,qualifiers:['P']}))}]
  };
}

test('local USGS streamflow index is national, source-backed and internally consistent',()=>{
  assert.equal(index.source_name,'USGS Site Service');
  assert.match(index.source_url,/waterservices\.usgs\.gov\/nwis\/site/);
  assert.equal(index.criteria.siteType,'ST');
  assert.equal(index.criteria.siteStatus,'active');
  assert.equal(index.criteria.hasDataTypeCd,'iv');
  assert.equal(index.criteria.parameterCd,'00060');
  assert.ok(Date.parse(index.generated_at));
  assert.ok(index.site_count>=9000,index.site_count);
  assert.equal(index.sites.length,index.site_count);
  assert.equal(new Set(index.sites.map(site=>site.id)).size,index.site_count);
  for(const site of index.sites){
    assert.ok(/^\d{5,15}$/.test(site.id),site.id);
    assert.ok(site.name,site.id);
    assert.ok(Number.isFinite(site.latitude)&&site.latitude>=-90&&site.latitude<=90,site.id);
    assert.ok(Number.isFinite(site.longitude)&&site.longitude>=-180&&site.longitude<=180,site.id);
  }
});

test('West Branch Michigan nearest-gauge lookup is local and returns real nearby USGS stations',()=>{
  const nearby=rivers.nearestSites(44.276408,-84.238613,10);
  assert.equal(nearby.length,10);
  assert.equal(nearby[0].id,'04152049');
  assert.equal(nearby[1].id,'04142000');
  assert.match(nearby[0].name,/TITTABAWASSEE RIVER AT SECORD DAM/i);
  assert.match(nearby[1].name,/RIFLE RIVER NEAR STERLING/i);
  assert.ok(nearby[0].distance_miles<18);
  for(let i=1;i<nearby.length;i++)assert.ok(nearby[i].distance_miles>=nearby[i-1].distance_miles);
});

test('normalizer keeps exact-site flow, stage and temperature on one gauge',()=>{
  const sites=[{id:'04157000',name:'SAGINAW RIVER AT SAGINAW, MI',latitude:43.43,longitude:-83.94,distance_miles:2.5}];
  const payload={value:{timeSeries:[
    series({values:[['900','2026-08-31T06:00:00.000-04:00'],['1000','2026-08-31T12:00:00.000-04:00']]}),
    series({code:'00065',values:[['14.5','2026-08-31T12:00:00.000-04:00']]}),
    series({code:'00010',values:[['20','2026-08-31T12:00:00.000-04:00']]})
  ]}};
  const [g]=rivers.normalize(payload,sites);
  assert.equal(g.id,'04157000');
  assert.equal(g.discharge_cfs,1000);
  assert.equal(g.gage_height_ft,14.5);
  assert.equal(g.water_temp_f,68);
  assert.equal(g.provisional,true);
  assert.equal(g.historical_daily_flow,null);
  assert.equal(g.nwps,null);
});

test('normalizer excludes indexed sites that do not return a live discharge reading',()=>{
  const sites=[{id:'04157000',name:'SAGINAW RIVER',latitude:43.43,longitude:-83.94,distance_miles:2.5}];
  const payload={value:{timeSeries:[series({code:'00010'})]}};
  assert.deepEqual(rivers.normalize(payload,sites),[]);
});

test('river context accepts only bounded numeric USGS site IDs',()=>{
  assert.deepEqual(context.validSiteIds('04135700,04142000,bad,04135700'),['04135700','04142000']);
  assert.equal(context.validSiteIds('1,2,3').length,0);
  assert.equal(context.validSiteIds('04135700,04142000,04152500,04153300,04153500,04154000,04155000').length,6);
});
