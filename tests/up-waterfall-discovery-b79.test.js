'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const read=p=>fs.readFileSync(p,'utf8');
const source=JSON.parse(read('data/up-waterfall-external-identity-shorelinescout.json'));
const gis=JSON.parse(read('data/up-waterfall-reconciliation.json'));
const curated=JSON.parse(read('data/up-waterfalls.json'));
const index=JSON.parse(read('data/up-waterfall-discovery-index.json'));
const sitemap=read('public/sitemap-up-waterfalls.xml');
const hub=read('public/upper-peninsula-waterfalls/index.html');

test('B79 consumes all 291 independent named directory mentions with permanent factual provenance',()=>{
  assert.equal(source.schemaVersion,1);
  assert.equal(source.sourceAdvertisedEntries,291);
  assert.equal(source.observationCount,source.observations.length);
  assert.equal(source.observations.length,291);
  assert.equal(new Set(source.observations.map(x=>x.id)).size,291);
  assert.equal(new Set(source.observations.map(x=>x.reference)).size,291);
  for(const item of source.observations){
    assert.match(item.id,/^ss:[a-z0-9-]+$/);
    assert.ok(item.name&&item.county);
    assert.match(item.reference,/^https:\/\/shorelinescout\.com\/michigan\/waterfalls\/[a-z0-9-]+\/$/);
    assert.equal(item.id,'ss:'+item.reference.split('/').filter(Boolean).at(-1));
    assert.deepEqual(Object.keys(item),['id','name','county','river','reference']);
  }
  const duplicates=new Map();
  for(const item of source.observations){const key=(item.name+' '+item.county).toLowerCase();duplicates.set(key,(duplicates.get(key)||0)+1)}
  assert.equal(duplicates.size,282);
  assert.equal(duplicates.get('peterson falls gogebic'),2,'repeated name within county needs identity review, not silent collapse');
});

test('B79 maps evidence identities to existing GIS and curated inventory without confusing mentions with distinct falls',()=>{
  assert.equal(gis.counts.gisCandidates,161);
  assert.equal(gis.counts.pending,92);
  assert.equal(curated.waterfalls.length,80);
  assert.equal(index.counts.externalObservations,source.observations.length);
  assert.equal(index.counts.externalUniqueNameCountyGroups,282);
  assert.equal(index.counts.stateGisRecords,161);
  assert.equal(index.counts.curatedDestinations,80);
  assert.equal(index.counts.stateGisPendingAccessReview,92);
  const classes=index.counts.classification;
  assert.equal(Object.values(classes).reduce((a,b)=>a+b,0),291);
  assert.ok(classes.external_only_research>=100);
  assert.ok(classes.gis_identity_review>30);
  assert.equal(index.counts.unresolvedSourceObservations,291-classes.curated_exact_identity);
  assert.equal(index.counts.distinctGeographicFallsVerifiedByThisEngine,0);
  assert.equal(index.externalRecords.length,291);
  assert.equal(index.researchPrioritySourceIds.length,index.counts.unresolvedSourceObservations);
  assert.deepEqual(new Set(index.externalRecords.map(x=>x.sourceId)),new Set(source.observations.map(x=>x.id)));
  for(const row of index.externalRecords){
    assert.equal(row.publicationEligible,false);
    assert.equal(row.legalRouteVerifiedByThisSource,false);
    assert.ok(Number.isInteger(row.reviewPriority));
    assert.equal('lat' in row,false,'external observation has no adopted natural feature coordinate');
    assert.equal('lng' in row,false);
    assert.equal('parking' in row,false);
    assert.equal('route' in row,false);
  }
  assert.equal((sitemap.match(/<loc>/g)||[]).length,78);
  assert.equal((hub.match(/<article class="waterfall-card"/g)||[]).length,80);
  assert.ok(!sitemap.includes('upper-montreal-falls/'));
  assert.ok(!sitemap.includes('peterson-falls/'));
});

test('B79 keeps namesakes, generic tiers and duplicate source records separate',()=>{
  const get=(name,county)=>index.externalRecords.filter(x=>x.name===name&&x.county===county);
  const montreal=get('Montreal Falls','Gogebic')[0];
  const upper=get('Upper Montreal Falls','Keweenaw')[0];
  assert.ok(montreal&&upper);
  assert.equal(montreal.exactCuratedIds.includes('interstate-falls'),false);
  assert.ok(!montreal.exactGisIds.length);
  assert.notEqual(montreal.sourceId,upper.sourceId);
  assert.ok(get('Lower Montreal Falls','Keweenaw').length===1);
  assert.ok(get('Middle Montreal Falls','Keweenaw').length===1);
  const peterson=get('Peterson Falls','Gogebic');
  assert.equal(peterson.length,2);
  assert.ok(peterson.every(x=>x.category==='same_name_same_county_review'));
  assert.ok(peterson.every(x=>x.sourceDuplicateGroupSize===2));
  const wildcat=get('Wildcat Falls','Ontonagon')[0];
  assert.ok(wildcat.exactCuratedIds.includes('wildcat-falls'),'curated site evidence should not be overlooked');
  const owner=curated.waterfalls.find(x=>x.id==='wildcat-falls');
  assert.equal(owner.geocodeProvenance.notParking,true);
});

test('B79 Python reconciliation is byte-for-byte reproducible with --check; no network or server infrastructure',()=>{
  const result=cp.spawnSync('python3',['scripts/build-up-waterfall-discovery.py','--check'],{encoding:'utf8',timeout:30000});
  if(result.status!==0)throw new Error('Python discovery check exited '+result.status+'; stderr: '+result.stderr+' stdout: '+result.stdout);
  assert.match(result.stdout,/deterministic/);
  const python=read('scripts/build-up-waterfall-discovery.py');
  assert.doesNotMatch(python,/requests\.|urllib\.request|import\s+http|supabase|redis|fetch\(/i);
  assert.match(python,/def has_tier_conflict/);
  assert.match(python,/publicationEligible/);
  const imports=read('scripts/import-up-waterfall-identity-directory.py');
  assert.match(imports,/completeness marker/);
  assert.match(imports,/--reviewed/);
  assert.doesNotMatch(imports,/urllib\.request|requests\.get/);
});

test('B79 importer parses stable links and rejects incomplete paginated/duplicate source snapshots',()=>{
  const source=String.raw`import importlib.util
s=importlib.util.spec_from_file_location("importer","scripts/import-up-waterfall-identity-directory.py")
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
sample='[One Falls\\\\ \\\\ Alger County · Test Creek](https://shorelinescout.com/michigan/waterfalls/one-falls/) [Other Falls\\\\ \\\\ Baraga County](https://shorelinescout.com/michigan/waterfalls/other-falls/)\\nShowing 2 of 2 UP waterfalls'
rows=m.extract(sample,minimum=2)
assert len(rows)==2 and rows[0]["river"]=="Test Creek"
assert rows[0]["id"]=="ss:one-falls"
try:
  m.extract(sample.replace("Showing 2 of 2","Showing 1 of 2"),minimum=2)
  raise AssertionError("incomplete source must be rejected")
except ValueError: pass
print("importer safeguards valid")
`;
  const out=cp.spawnSync('python3',['-c',source],{encoding:'utf8',timeout:15000});
  assert.equal(out.status,0,out.stderr||out.stdout);
});
