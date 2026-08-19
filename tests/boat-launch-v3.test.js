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
    flagcomments:null,
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
  assert.equal(boat.reviewStatus(a),'source-qualified');
  assert.deepEqual(boat.sourceId(a),{
    id:'global:6cd4ab1e-bda1-4c15-aa4f-a4b961476872',
    sourceId:'6cd4ab1e-bda1-4c15-aa4f-a4b961476872',
    idType:'globalid'
  });
  const normalized=boat.normalizeFeature({attributes:a},Date.UTC(2026,7,17));
  assert.equal(normalized.facilityId,null);
  assert.equal(normalized.globalId,a.globalid);
  assert.equal(normalized.verificationStatus,'source-qualified');
  assert.equal(normalized.detailsUnderReview,false);
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

test('DNR InProgress record remains visible but explicitly provisional',()=>{
  const a=attrs({flag:'InProgress',flagcomments:'Confirm hours and parking.'});
  assert.equal(boat.reviewStatus(a),'dnr-review-in-progress');
  assert.equal(boat.eligibleAttributes(a),true);
  const normalized=boat.normalizeFeature({attributes:a});
  assert.equal(normalized.verificationStatus,'dnr-review-in-progress');
  assert.equal(normalized.detailsUnderReview,true);
  assert.equal(normalized.reviewNote,'Confirm hours and parking.');
});

test('Review Needed, unknown flags, reference-only, unnamed and coordinate-less records stay withheld',()=>{
  assert.equal(boat.reviewStatus(attrs({flag:'Flag'})),'withhold');
  assert.equal(boat.eligibleAttributes(attrs({flag:'Flag'})),false);
  assert.equal(boat.eligibleAttributes(attrs({flag:'FutureStatus'})),false);
  assert.equal(boat.eligibleAttributes(attrs({referenceonly:'Yes'})),false);
  assert.equal(boat.eligibleAttributes(attrs({name:null})),false);
  assert.equal(boat.eligibleAttributes(attrs({latitude:null})),false);
  assert.equal(boat.eligibleAttributes(attrs({facilityid:null,globalid:null,OBJECTID:null})),false);
});

test('DNR query no longer contains the nullable facilityid gate',()=>{
  const decoded=decodeURIComponent(boat.queryUrl()).replace(/\+/g,' ');
  assert.match(decoded,/bas_type='Boating Access Site'/);
  assert.doesNotMatch(decoded,/facilityid IS NOT NULL/);
  assert.match(decoded,/latitude IS NOT NULL/);
  assert.match(decoded,/longitude IS NOT NULL/);
});

test('destination geocoder query is sanitized and capped',()=>{
  assert.equal(geo.cleanQuery('  Bay    City, MI  '),'Bay City, MI');
  assert.equal(geo.cleanQuery('x'.repeat(150)).length,100);
});

test('geocoder rejects nearby out-of-state results and accepts Michigan candidates',()=>{
  const picked=geo.chooseCandidate([
    {display_name:'Chicago, Illinois, United States',lat:'41.8781',lon:'-87.6298',type:'city',address:{state:'Illinois','ISO3166-2-lvl4':'US-IL'}},
    {display_name:'Bay City, Bay County, Michigan, United States',lat:'43.5945',lon:'-83.8889',type:'city',address:{state:'Michigan','ISO3166-2-lvl4':'US-MI'}}
  ]);
  assert.equal(picked.display_name,'Bay City, Bay County, Michigan, United States');
  assert.equal(geo.chooseCandidate([{display_name:'Toledo, Ohio',lat:'41.65',lon:'-83.54',type:'city',address:{state:'Ohio'}}]),null);
});

test('geocoder prefers a useful Michigan named-place candidate',()=>{
  const picked=geo.chooseCandidate([
    {display_name:'Michigan feature, Michigan, United States',lat:'43.5',lon:'-84.0',type:'yes',class:'misc',address:{state:'Michigan'}},
    {display_name:'Saginaw Bay, Michigan, United States',lat:'43.8',lon:'-83.7',type:'bay',class:'natural',address:{state:'Michigan'}}
  ]);
  assert.equal(picked.display_name,'Saginaw Bay, Michigan, United States');
});
