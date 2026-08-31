const test=require('node:test');
const assert=require('node:assert/strict');
const rivers=require('../api/national-rivers.js')._test;
const context=require('../api/national-river-context.js')._test;

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

test('USGS bbox search stays under 25 square degrees and at seven decimals or fewer',()=>{
  for(const lat of [0,44.276408,71,-71]){
    for(const lon of [-179,-84.238613,0,179]){
      for(const span of rivers.SEARCH_SPANS){
        const box=rivers.bbox(lat,lon,span);
        assert.ok(box.product<=25.000001,JSON.stringify({lat,lon,span,box}));
        for(const value of box.value.split(',')){
          const decimals=(String(value).split('.')[1]||'').length;
          assert.ok(decimals<=7,`${box.value} has >7 decimals`);
        }
      }
    }
  }
  assert.equal(rivers.bbox(44.276408,-84.238613,0.6).value,'-84.838613,43.676408,-83.638613,44.876408');
});

test('Site Service RDB parser extracts active gauge metadata without fabrication',()=>{
  const body=[
    '# US Geological Survey',
    'agency_cd\tsite_no\tstation_nm\tsite_tp_cd\tdec_lat_va\tdec_long_va',
    '5s\t15s\t50s\t7s\t16s\t16s',
    'USGS\t04135700\tSOUTH BRANCH AU SABLE RIVER NEAR LUZERNE, MI\tST\t44.61473849\t-84.455575',
    'USGS\t04142000\tRIFLE RIVER NEAR STERLING, MI\tST\t44.0725203\t-84.0199939'
  ].join('\n');
  const sites=rivers.parseSiteRdb(body);
  assert.equal(sites.length,2);
  assert.equal(sites[0].id,'04135700');
  assert.equal(sites[1].name,'RIFLE RIVER NEAR STERLING, MI');
  assert.equal(sites[1].latitude,44.0725203);
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

test('normalizer excludes metadata-only sites that have no live discharge',()=>{
  const sites=[{id:'04157000',name:'SAGINAW RIVER',latitude:43.43,longitude:-83.94,distance_miles:2.5}];
  const payload={value:{timeSeries:[series({code:'00010'})]}};
  assert.deepEqual(rivers.normalize(payload,sites),[]);
});

test('river context accepts only bounded numeric USGS site IDs',()=>{
  assert.deepEqual(context.validSiteIds('04135700,04142000,bad,04135700'),['04135700','04142000']);
  assert.equal(context.validSiteIds('1,2,3').length,0);
  assert.equal(context.validSiteIds('04135700,04142000,04152500,04153300,04153500,04154000,04155000').length,6);
});
