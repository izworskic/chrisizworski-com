const test=require('node:test');
const assert=require('node:assert/strict');
const rivers=require('../api/national-rivers.js')._test;

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

test('USGS bbox search never exceeds the documented 25 square-degree limit',()=>{
  for(const lat of [0,43.6,71,-71]){
    for(const lon of [-179,-84,0,179]){
      for(const span of rivers.SEARCH_SPANS){
        assert.ok(rivers.bbox(lat,lon,span).product<=25.000001,JSON.stringify({lat,lon,span,box:rivers.bbox(lat,lon,span)}));
      }
    }
  }
  assert.ok(Math.max(...rivers.SEARCH_SPANS)<=2.5);
});

test('direct IV discovery derives gauge identity from discharge time series',()=>{
  const payload={value:{timeSeries:[
    series(),
    series({code:'00065'}),
    series({id:'04156999',name:'TEMP ONLY',code:'00010'})
  ]}};
  const sites=rivers.sitesFromPayload(payload);
  assert.equal(sites.length,1);
  assert.equal(sites[0].id,'04157000');
  assert.equal(sites[0].name,'SAGINAW RIVER AT SAGINAW, MI');
});

test('normalizer keeps direct-IV flow, stage and temperature on one gauge',()=>{
  const payload={value:{timeSeries:[
    series({values:[['900','2026-08-31T06:00:00.000-04:00'],['1000','2026-08-31T12:00:00.000-04:00']]}),
    series({code:'00065',values:[['14.5','2026-08-31T12:00:00.000-04:00']]}),
    series({code:'00010',values:[['20','2026-08-31T12:00:00.000-04:00']]})
  ]}};
  const sites=rivers.sitesFromPayload(payload);
  const [g]=rivers.normalize(payload,sites);
  assert.equal(g.id,'04157000');
  assert.equal(g.discharge_cfs,1000);
  assert.equal(g.gage_height_ft,14.5);
  assert.equal(g.water_temp_f,68);
  assert.equal(g.provisional,true);
});

test('direct IV discovery does not invent a site without discharge',()=>{
  const payload={value:{timeSeries:[series({code:'00010'})]}};
  assert.deepEqual(rivers.sitesFromPayload(payload),[]);
});


test('optional enrichment budget resolves fallback instead of holding the function open',async()=>{
  const fallback=new Map([['fallback',true]]);
  const result=await rivers.withBudget(new Promise(()=>{}),5,fallback);
  assert.equal(result,fallback);
});
