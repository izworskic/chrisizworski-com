'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {SOURCES,parse,feedHealth,refresh} = require('../lib/freighter-layup-feeds');
const {freshSeason}=require('../lib/freighter-layup-season');

test('Thunder Bay uses the independently verified official feed and article hostname', () => {
 const port=SOURCES.find(s=>s.id==='thunder-bay-port');
 assert.equal(port.url,'https://www.portthunderbay.ca/feed/');
 assert.equal(port.host,'www.portthunderbay.ca');
 assert.equal(port.mode,'publish');
 assert.equal(port.sourceClass,'port_authority');
 const protectedSource=SOURCES.find(s=>s.id==='great-lakes-now');
 assert.equal(protectedSource.url,'https://greatlakesnow.org/feed/');
 assert.equal(protectedSource.mode,'review');
});

test('reachability and dated article coverage are reported separately', () => {
 const now='2026-11-04T12:00:00.000Z';
 assert.deepEqual(feedHealth([],now),{feedState:'empty',latestArticleDate:null,latestAgeDays:null});
 assert.deepEqual(feedHealth([{date:'bad'}],now),{feedState:'undated',latestArticleDate:null,latestAgeDays:null});
 assert.deepEqual(feedHealth([{date:'Fri, 12 Jun 2026 14:37:01 +0000'}],now),{
  feedState:'dated',latestArticleDate:'2026-06-12',latestAgeDays:144
 });
});

test('fake 200 HTML response is never counted as a valid RSS feed',async()=>{
 const src=SOURCES.find(s=>s.id==='thunder-bay-port');
 const fetcher=async url=>url===src.url
  ?{ok:true,text:async()=>'<html><body>Access denied</body></html>'}
  :{ok:false,status:503};
 const result=await refresh({
  ledger:freshSeason('2026-27'),archive:{seasons:[]},
  fetcher,now:'2026-11-04T12:00:00.000Z'
 });
 const health=result.outcomes.find(x=>x.source===src.id);
 assert.equal(health.ok,false);
 assert.match(health.error,/Non-RSS response/);
 assert.equal(result.ledger.events.length,0);
});

test('real-style official RSS remains source-dated, without inventing current layups',async()=>{
 const src=SOURCES.find(s=>s.id==='thunder-bay-port');
 const rss='<?xml version="1.0"?><rss version="2.0"><channel><item>'+
  '<title>Port News</title><link>https://www.portthunderbay.ca/news/</link>'+
  '<pubDate>Fri, 12 Jun 2026 14:37:01 +0000</pubDate>'+
  '<description>Official port update</description></item></channel></rss>';
 assert.equal(parse(rss,src).length,1);
 const fetcher=async url=>url===src.url?{ok:true,text:async()=>rss}:{ok:false,status:503};
 const result=await refresh({
  ledger:freshSeason('2026-27'),archive:{seasons:[]},
  fetcher,now:'2026-11-04T12:00:00.000Z'
 });
 const health=result.outcomes.find(x=>x.source===src.id);
 assert.equal(health.ok,true);
 assert.equal(health.feedState,'dated');
 assert.equal(health.latestArticleDate,'2026-06-12');
 assert.equal(health.items,1);
 assert.equal(result.ledger.events.length,0);
});
