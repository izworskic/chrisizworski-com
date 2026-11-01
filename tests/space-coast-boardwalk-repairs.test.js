'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {
  CURATED,EVIDENCE_REVIEW_DATE,verifiedNpsNewsUrl,numbersInBoardwalkMentions,
  kindFor,normalizeNewsRelease,repairNewsResponse,archivedOnlyResponse,facilityEvidence
}=require('../lib/space-coast-boardwalk-repairs');
const api=require('../api/space-coast-boardwalk-repairs');
const NOW=Date.parse('2026-11-01T22:00:00Z');

test('independently reviewed NPS project history never certifies 2026 physical opening',()=>{
  assert.equal(CURATED.length,3);
  assert.equal(EVIDENCE_REVIEW_DATE,'2026-11-01');
  const items=archivedOnlyResponse(NOW,'api-not-configured');
  assert.equal(items.newsApiStatus,'api-not-configured');
  assert.equal(items.history.length,3);
  assert.deepEqual(items.history.map(x=>x.publishedOn),['2026-09-04','2025-11-19','2024-12-04']);
  assert.deepEqual(items.history.map(x=>x.category),['planning','historic-access','contract']);
  assert.ok(items.history.every(x=>x.url.startsWith('https://www.nps.gov/cana/learn/news/')));
  assert.ok(items.history.every(x=>!x.hasOwnProperty('currentPhysicalOpening')));
  assert.equal(items.currentFacilityInspectionFeedVerified,false);
  assert.equal(items.currentBoardwalkOpeningFeedVerified,false);
  assert.equal(items.canDeterminePresentWalkability,false);
  const number3=items.facilityEvidence.find(x=>x.number===3);
  assert.equal(number3.historicalSpecificEvidence.length,1);
  assert.equal(number3.historicalSpecificEvidence[0].facilityClaim,'historic-photo-caption-only');
  assert.equal(number3.currentInspectionStatus,'not-verified');
  assert.equal(number3.currentOpeningStatus,'not-verified');
  assert.equal(number3.currentAccessiblePassageStatus,'not-verified');
  assert.equal(items.facilityEvidence.find(x=>x.number===8).historicalSpecificEvidence.length,0);
});

test('news API records require trustworthy park URLs, exact park codes and nonfuture dates',()=>{
  const good={
    id:'news-guid',parkCode:'cana',releaseDate:'2026-10-30',
    title:'Repairs completed at Playalinda Boardwalk #11',
    abstract:'The NPS reports historic work at the numbered boardwalk.',
    url:'https://www.nps.gov/cana/learn/news/boardwalk-11-repair.htm'
  };
  const normalized=normalizeNewsRelease(good,NOW);
  assert.equal(normalized.publishedOn,'2026-10-30');
  assert.deepEqual(normalized.boardwalkNumbers,[11]);
  assert.equal(normalized.category,'historic-work');
  assert.equal(normalized.facilityClaim,'publication-metadata-only-not-inspection');
  assert.deepEqual(normalizeNewsRelease({...good,releaseDate:'2026-12-01'},NOW),null);
  assert.deepEqual(normalizeNewsRelease({...good,parkCode:'yell'},NOW),null);
  assert.deepEqual(normalizeNewsRelease({...good,url:'https://evil.example/cana/learn/news/foo'},NOW),null);
  assert.deepEqual(normalizeNewsRelease({...good,url:'javascript:alert(1)'},NOW),null);
  assert.deepEqual(normalizeNewsRelease({...good,url:'https://www.nps.gov/otherpark/learn/news/a.htm'},NOW),null);
  assert.deepEqual(normalizeNewsRelease({...good,title:'Otters at the seashore',abstract:''},NOW),null);
  assert.deepEqual(normalizeNewsRelease({...good,releaseDate:'2023-01-01'},NOW),null);
  assert.equal(verifiedNpsNewsUrl('https://home.nps.gov/cana/learn/news/example.htm'),
    'https://home.nps.gov/cana/learn/news/example.htm');
});

test('exact numbered boardwalk mentions do not infer physical facility status from nearby lot numbers',()=>{
  assert.deepEqual(numbersInBoardwalkMentions('Boardwalks #1-7 are repaired'),[1,2,3,4,5,6,7]);
  assert.deepEqual(numbersInBoardwalkMentions('Boardwalk 12 through 14'),[12,13,14]);
  assert.deepEqual(numbersInBoardwalkMentions('Boardwalk 2 and Boardwalk #10'),[2,10]);
  assert.deepEqual(numbersInBoardwalkMentions('Parking Lots #8-13 closed, beach north of Eddy Creek'),[]);
  assert.deepEqual(numbersInBoardwalkMentions('Boardwalk 15 is out of range'),[]);
  assert.deepEqual(numbersInBoardwalkMentions('May 18, 2026: storm resilience planning'),[]);
  assert.equal(kindFor('Boardwalk construction contract awarded'),'contract');
  assert.equal(kindFor('Proposed boardwalk repair and replacement'),'planning');
  assert.equal(kindFor('Playalinda boardwalk reopened in May'),'historic-access');
  assert.equal(kindFor('Boardwalk replacement completed'),'historic-work');
});

test('NPS news API is supplement only; duplicates defer to reviewed full-source claims',()=>{
  const data=[
    {
      id:'duplicate',parkCode:'cana',releaseDate:'2026-09-04',
      title:'Storm plan might have built access',
      abstract:'Playalinda public comments are open.',
      url:CURATED[0].url
    },
    {
      id:'2026-311',parkCode:'cana',releaseDate:'2026-10-31',
      title:'Historic Boardwalk #10 work completed',
      abstract:'News metadata says replacement completed at Playalinda boardwalk #10.',
      url:'https://www.nps.gov/cana/learn/news/historic-boardwalk-10-work.htm'
    },
    {
      id:'2026-312',parkCode:'yell',releaseDate:'2026-10-31',
      title:'Yellowstone boardwalk opening',
      abstract:'An unrelated NPS park.',
      url:'https://www.nps.gov/cana/learn/news/invalid.htm'
    },
    {
      id:'2026-313',parkCode:'cana',releaseDate:'2026-12-01',
      title:'Future Boardwalk #1 access',
      url:'https://www.nps.gov/cana/learn/news/future.htm'
    }
  ];
  const found=repairNewsResponse({data},NOW);
  assert.equal(found.newsApiStatus,'verified');
  assert.equal(found.history.length,4);
  assert.equal(found.history.find(x=>x.url===CURATED[0].url).title,CURATED[0].title);
  assert.equal(found.history[0].publishedOn,'2026-10-31');
  assert.equal(found.facilityEvidence.find(x=>x.number===10).historicalSpecificEvidence.length,1);
  assert.equal(found.facilityEvidence.find(x=>x.number===10).currentOpeningStatus,'not-verified');
  assert.equal(found.canDeterminePresentWalkability,false);
  assert.throws(()=>repairNewsResponse({},NOW),/data array/);
  assert.throws(()=>repairNewsResponse({data:null},NOW),/data array/);
});

test('all 14 boardwalk records default to unknown current physical/access status',()=>{
  const records=facilityEvidence(CURATED);
  assert.equal(records.length,14);
  assert.deepEqual(records.map(x=>x.number),Array.from({length:14},(_,i)=>i+1));
  assert.ok(records.every(x=>x.currentInspectionStatus==='not-verified'));
  assert.ok(records.every(x=>x.currentOpeningStatus==='not-verified'));
  assert.ok(records.every(x=>x.currentAccessiblePassageStatus==='not-verified'));
  assert.ok(records.every(x=>!x.hasOwnProperty('openedAt')));
  assert.equal(records.find(x=>x.number===14).historicalSpecificEvidence.length,0);
});

test('public API uses six-hour news cache, private server key, and graceful historical fallback',async()=>{
  let result;
  const headers={};
  const res={
    setHeader:(k,v)=>{headers[k]=v;},
    status:function(n){this.code=n;return this;},
    json:function(x){result={http:this.code,body:x};return result;}
  };
  const name=process.env.NPS_API_KEY;
  try{
    delete process.env.NPS_API_KEY;
    await api({method:'GET'},res);
    assert.equal(result.http,200);
    assert.equal(result.body.ok,true);
    assert.equal(result.body.newsApiStatus,'api-not-configured');
    assert.equal(result.body.history.length,3);
    assert.equal(result.body.currentBoardwalkOpeningFeedVerified,false);
    assert.match(headers['Cache-Control'],/s-maxage=21600/);
    assert.equal(headers['X-Robots-Tag'],'noindex, nofollow');
    await api({method:'POST'},res);
    assert.equal(result.http,405);
    assert.equal(headers.Allow,'GET');
  }finally{
    if(name===undefined)delete process.env.NPS_API_KEY;
    else process.env.NPS_API_KEY=name;
  }
});

test('front-end evidence desk uses exact NPS historical photo with source, is accessible and syntax valid',()=>{
  const root=path.join(__dirname,'../public/synced-national-tools/space-coast-launch');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const map=fs.readFileSync(path.join(root,'geo-map.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'viewing.css'),'utf8');
  assert.match(html,/id="geo-repair-history"/);
  assert.match(html,/id="geo-repair-events"/);
  assert.match(html,/id="geo-repair-status"/);
  assert.match(html,/CANA_Playalinda_NewBoardwalk_3-3\.jpg/);
  assert.match(html,/Historical photograph, not an image of current conditions/);
  assert.match(html,/geo-map\.js\?v=20261101-repair1/);
  assert.match(map,/fetch\('\/api\/space-coast-boardwalk-repairs'/);
  assert.match(map,/function renderRepairHistory\(/);
  assert.match(map,/function showLotRepairEvidence\(/);
  assert.match(map,/Current opening: NOT VERIFIED/);
  assert.match(map,/loadRepairHistoryOnce\(\)/);
  assert.match(css,/\.geo-repair-history/);
  assert.match(css,/@media\(max-width:650px\)/);
  assert.doesNotThrow(()=>new Function(map),
    'Browser-side Space Coast GIS script must parse as JavaScript');
  assert.doesNotMatch(map,/openForVisitation\s*=\s*true/);
});
