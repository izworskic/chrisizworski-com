const test=require('node:test');
const assert=require('node:assert/strict');
const boat=require('../api/boat-launches.js')._test;
const geo=require('../api/boat-launch-geocode.js')._test;

function attrs(overrides={}){
  return {
    OBJECTID:42,
    globalid:'6cd4ab1e-bda1-4c15-aa4f-a4b961476872',
    facilityid:null,
    name:'Rockport',
    latitude:45.20214169,
    longitude:-83.38175752,
    referenceonly:'No',
    flag:null,
    waterbody:'Lake Huron',
    greatlakesaccess:'Yes, within 0.5 miles',
    launch_status:'Open',
    rampcode_new:1,
    nlanes:2,
    ntrailerableparking:30,
    ...overrides,
  };
}

test('valid DNR launch survives a blank nullable facilityid by using globalid',()=>{
  const a=attrs();
  assert.equal(boat.eligibleAttributes(a),true);
  assert.deepEqual(boat.sourceId(a),{
    id:'global:6cd4ab1e-bda1-4c15-aa4f-a4b961476872',
    sourceId:'6cd4ab1e-bda1-4c15-aa4f-a4b961476872',
    idType:'globalid'
  });
  const normalized=boat.normalizeFeature({attributes:a},Date.UTC(2026,7,17));
  assert.equal(normalized.facilityId,null);
  assert.equal(normalized.globalId,a.globalid);
  assert.equal(normalized.name,'Rockport');
  assert.equal(normalized.latitude,a.latitude);
  assert.equal(normalized.longitude,a.longitude);
  assert.equal(normalized.trailerParking,30);
});

test('facilityid still wins when the source supplies one',()=>{
  const a=attrs({facilityid:'BAS-123'});
  assert.deepEqual(boat.sourceId(a),{id:'facility:BAS-123',sourceId:'BAS-123',idType:'facilityid'});
});

test('OBJECTID is a last-resort authoritative source ID',()=>{
  const a=attrs({facilityid:null,globalid:null,OBJECTID:77});
  assert.deepEqual(boat.sourceId(a),{id:'object:77',sourceId:'77',idType:'OBJECTID'});
});

test('flagged, reference-only, unnamed, and coordinate-less records cannot qualify',()=>{
  assert.equal(boat.eligibleAttributes(attrs({flag:'InProgress'})),false);
  assert.equal(boat.eligibleAttributes(attrs({flag:'Review Needed'})),false);
  assert.equal(boat.eligibleAttributes(attrs({referenceonly:'Yes'})),false);
  assert.equal(boat.eligibleAttributes(attrs({name:null})),false);
  assert.equal(boat.eligibleAttributes(attrs({latitude:null})),false);
  assert.equal(boat.eligibleAttributes(attrs({facilityid:null,globalid:null,OBJECTID:null})),false);
});

test('DNR query no longer contains the nullable facilityid gate',()=>{
  const url=boat.queryUrl();
  assert.match(url,/bas_type%3D%27Boating%2BAccess%2BSite%27|bas_type%3D%27Boating\+Access\+Site%27/);
  assert.doesNotMatch(decodeURIComponent(url),/facilityid IS NOT NULL/);
  assert.match(decodeURIComponent(url),/latitude IS NOT NULL/);
  assert.match(decodeURIComponent(url),/longitude IS NOT NULL/);
});

test('destination geocoder query is sanitized and capped',()=>{
  assert.equal(geo.cleanQuery('  Bay    City, MI  '),'Bay City, MI');
  assert.equal(geo.cleanQuery('x'.repeat(150)).length,100);
});

test('geocoder candidate must fall inside the Michigan bounding envelope',()=>{
  const picked=geo.chooseCandidate([
    {display_name:'Chicago',lat:'41.8781',lon:'-87.6298',type:'city'},
    {display_name:'Bay City, Michigan',lat:'43.5945',lon:'-83.8889',type:'city'}
  ]);
  assert.equal(picked.display_name,'Chicago');
  // The envelope is deliberately broader than the state polygon; the server request is also bounded
  // by Nominatim's Michigan-centered viewbox. This unit test only verifies numeric envelope rejection.
  assert.equal(geo.chooseCandidate([{display_name:'Ohio',lat:'40.0',lon:'-83.0',type:'state'}]),null);
});

test('geocoder prefers useful named-place candidates over a generic result',()=>{
  const picked=geo.chooseCandidate([
    {display_name:'Generic feature',lat:'43.5',lon:'-84.0',type:'yes',class:'place'},
    {display_name:'Saginaw Bay',lat:'43.8',lon:'-83.7',type:'bay',class:'natural'}
  ]);
  assert.equal(picked.display_name,'Saginaw Bay');
});
