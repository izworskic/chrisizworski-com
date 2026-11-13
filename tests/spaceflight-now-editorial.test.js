'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {
  articleUrl,parseRss,missionKey,matchArticle,selectCoverage,
  readFeed,editorialDesk
}=require('../lib/spaceflight-now-editorial');

const now=Date.parse('2026-11-02T12:00:00Z');
const ussf={id:'54d471e8-695c-4fa7-a3cf-dbd8b389e8ae',
  name:'Falcon 9 Block 5 | USSF-432',mission:'USSF-432',
  rocket:'Falcon 9 Block 5',region:'california',net:'2026-11-04T01:28:00Z'};
const ussf_other={...ussf,id:'aaaa1111-695c-4fa7-a3cf-dbd8b389e8ae',name:'Falcon 9 | USSF-431',mission:'USSF-431'};
const vulcan={id:'bbbb1111-695c-4fa7-a3cf-dbd8b389e8ae',
  name:'Vulcan VC6L | Amazon Leo (LV-01)',rocket:'Vulcan VC6L',
  mission:'Amazon Leo (LV-01)',region:'florida',net:'2026-11-13T00:00:00Z'};
const vulcan_other={...vulcan,id:'cccc1111-695c-4fa7-a3cf-dbd8b389e8ae',mission:'Amazon Leo (LV-02)'};

const entries=[
  ['SpaceX launches USSF-432 mission on Falcon 9',
    'https://spaceflightnow.com/2026/11/01/spacex-launches-ussf-432-mission-on-falcon-9/',
    'Sun, 01 Nov 2026 14:00:00 +0000',
    'Space Force mission USSF-432 at Vandenberg'],
  ['United Launch Alliance announces mid-November return to flight for Vulcan rocket',
    'https://spaceflightnow.com/2026/10/28/united-launch-alliance-announces-mid-november-return-to-flight-for-vulcan-rocket/',
    'Wed, 28 Oct 2026 22:46:41 +0000',
    'The Vulcan rocket will carry Amazon Leo satellites.'],
  ['SpaceX to fly Starlink 15-17',
    'https://spaceflightnow.com/2026/11/01/spacex-to-fly-starlink-15-17/',
    'Sun, 01 Nov 2026 13:00:00 +0000',
    'The 15-17 mission'],
  ['Space station astronauts conduct a spacewalk',
    'https://spaceflightnow.com/2026/11/01/space-station-astronauts-conduct-a-spacewalk/',
    'Sun, 01 Nov 2026 10:00:00 +0000',
    'Work at the International Space Station']
];
const item=([title,url,date,desc])=>'<item><title><![CDATA['+title+
  ']]></title><link>'+url+'</link><pubDate>'+date+
  '</pubDate><description><![CDATA['+desc+']]></description></item>';
const rss='<?xml version="1.0"?><rss version="2.0"><channel><title>Spaceflight Now</title>'+
  entries.map(item).join('')+'</channel></rss>';

test('safe article URLs reject spoofed hosts, JS, cross-site and tracking parameters',()=>{
  assert.equal(articleUrl(entries[0][1]),entries[0][1]);
  for(const href of [
    'https://spaceflightnow.com.evil.test/2026/11/01/abc/',
    'https://spaceflightnow.com/launch-schedule/',
    'http://spaceflightnow.com/2026/11/01/abc/',
    'javascript:alert(1)',
    entries[0][1]+'?ref=123',
    'https://spaceflightnow.com:8443/2026/11/01/abc/',
  ])assert.equal(articleUrl(href),null);
});
test('RSS only yields dated, attributed metadata and discards article bodies',()=>{
  const records=parseRss(rss,now);
  assert.equal(records.length,4);
  assert.equal(records[0].title,entries[0][0]);
  assert.match(records.find(x=>x.title.includes('Vulcan')).matchingExcerpt,/Amazon Leo/);
  assert.equal(Object.prototype.hasOwnProperty.call(records[1],'body'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(records[1],'content'),false);
  assert.equal(records[0].publishedAt,'2026-11-01T14:00:00.000Z');
});
test('malformed and oversized feeds fail without pretending no launches exist',()=>{
  assert.throws(()=>parseRss('<html>not RSS</html>',now),/invalid-sfn-rss/);
  assert.throws(()=>parseRss('X'.repeat(200000),now),/invalid-sfn-rss/);
});
test('unique mission designators do not match other flights on same rocket',()=>{
  const records=parseRss(rss,now);
  assert.equal(missionKey('USSF-432'),'ussf:432');
  assert.equal(missionKey('Starlink 15-18'),'starlink:15-18');
  const matching=selectCoverage(ussf,[ussf,ussf_other],records,now);
  assert.equal(matching.length,1);
  assert.equal(matching[0].match,'mission-identifier');
  const conflicting=selectCoverage(ussf_other,[ussf,ussf_other],records,now);
  assert.equal(conflicting.length,0);
});
test('Vulcan and Amazon Leo story can be useful contextual reporting but not current mission approval',()=>{
  const records=parseRss(rss,now);
  const match=selectCoverage(vulcan,[vulcan],records,now);
  assert.equal(match.length,1);
  assert.equal(match[0].match,'related-context');
  assert.match(match[0].label,/Related/);
  // If more than one upcoming Vulcan + Amazon Leo mission is close by,
  // the article cannot safely be attributed to a particular flight.
  assert.equal(selectCoverage(vulcan,[vulcan,vulcan_other],records,now).length,0);
});
test('a different explicit Amazon Leo flight cannot be attached by generic rocket context',()=>{
  const misleading={
    title:'Vulcan prepares to launch Amazon Leo LV-02',
    matchingExcerpt:'The Vulcan rocket will carry Amazon Leo satellites.',
    url:'https://spaceflightnow.com/2026/11/01/vulcan-to-launch-amazon-leo-lv-02/',
    publishedAt:'2026-11-01T13:00:00.000Z'
  };
  assert.equal(matchArticle(misleading,vulcan,[vulcan],now),null);
});
test('articles older than freshness window or about past launches are not current evidence',()=>{
  const news={...parseRss(rss,now)[0],publishedAt:'2026-07-01T10:00:00Z'};
  assert.equal(matchArticle(news,ussf,[ussf],now),null);
  const past={...ussf,net:'2026-10-23T12:00:00Z'};
  assert.equal(matchArticle(parseRss(rss,now)[0],past,[past],now),null);
});
test('full editorial desk reports fetch timestamp, status and never invents launch verdicts',async()=>{
  const desk=await editorialDesk(ussf,[ussf],{
    now,fetcher:async(url)=>({
      ok:url==='https://spaceflightnow.com/feed/',
      headers:{get:()=>null},
      text:async()=>rss
    })
  });
  assert.equal(desk.status,'ok');
  assert.equal(desk.matchedCount,1);
  assert.equal(desk.stories[0].url,entries[0][1]);
  assert.equal(desk.sourceType,'independent-editorial-reporting');
  assert.match(desk.note,/not launch authorization/);
  assert.equal(Object.hasOwn(desk,'launchTime'),false);
  assert.equal(desk.scheduleUrl,'https://spaceflightnow.com/launch-schedule/');
});
test('website pages contain mission-selected editorial desk without altering canonical paths',()=>{
  const root=path.resolve(__dirname,'..','public','synced-national-tools');
  const nat=fs.readFileSync(path.join(root,'rocket-launch-live','index.html'),'utf8');
  const fl=fs.readFileSync(path.join(root,'space-coast-launch','index.html'),'utf8');
  assert.match(nat,/id="rl-news-desk"/);
  assert.match(nat,/id="rl-news-stories"/);
  assert.match(fl,/id="sfn-reporting-list"/);
  assert.match(fl,/https:\/\/spaceflightnow.com\/launch-schedule\//);
  assert.match(nat,/app\.js\?v=20261112-playalinda-vulcan/);
  assert.match(fl,/app\.js\?v=20261110-region-voice-v1/);
  assert.equal((nat.match(/rel="canonical"/g)||[]).length,1);
  assert.equal((fl.match(/rel="canonical"/g)||[]).length,1);
});
