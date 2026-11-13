import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createIndex,find}=require('../public/assets/snowmobile-junction-picker.js');

const point=(id,label,lon,lat,component)=>({
  type:'Feature',
  geometry:{type:'Point',coordinates:[lon,lat]},
  properties:{id,label,component}
});
const dnr={
  type:'FeatureCollection',
  features:[
    point('n1','LP 7 / LP 7',-84.5000,44.5000,0),
    point('n2','LP 7 / LP 32',-84.6000,44.6000,0),
    point('n3','UP 8 / UP 2',-86.0000,46.2000,1),
    point('n4','LP 7',-84.5100,44.5100,0),
  ]
};

test('search uses the current DNR router junction features, no fabricated town or trailhead coordinates',()=>{
  const rows=createIndex(dnr);
  assert.equal(rows.length,4);
  assert.deepEqual(rows[0],{
    id:'n1',label:'LP 7 / LP 7',lat:44.5,lon:-84.5,component:0,
    search:'lp 7 lp 7 n1',compact:'lp7lp7n1'
  });
  assert.equal(find(rows,'',null).count,0,'must require an explicit trail label search');
  assert.equal(find(rows,'LP7',null).count,3,'trails can be searched with or without spaces');
  assert.equal(find(rows,'lp 7',null).count,3);
  assert.equal(find(rows,'UP 8',null).matches[0].id,'n3');
  assert.equal(rows[0].lat,44.5,'coordinates must not be derived from a name');
});

test('picker cannot offer junctions outside the selected connected network',()=>{
  const rows=createIndex(dnr);
  assert.equal(find(rows,'UP',0).count,0);
  assert.equal(find(rows,'LP',0).count,3);
  assert.equal(find(rows,'UP',1).count,1);
  assert.equal(find(rows,'LP',1).count,0);
});

test('incomplete, duplicated or out-of-range junctions are excluded before display',()=>{
  const data={type:'FeatureCollection',features:[
    null,{},point('n1','Good',-85,44,0),point('n1','DUPLICATE',-85.1,44.1,0),
    point('bad1','Bad latitude',-85,99,0),point('bad2','Bad longitude',-200,44,0),
    point('bad3','Unknown component',-85,44,null),
    {type:'Feature',geometry:{type:'LineString',coordinates:[[-85,44],[-84,44]]},properties:{id:'l',label:'line',component:0}},
    {type:'Feature',geometry:{type:'Point',coordinates:[null,44]},properties:{id:'non-num',label:'no',component:0}}
  ]};
  const rows=createIndex(data);
  assert.deepEqual(rows.map(x=>x.id),['n1']);
  assert.equal(createIndex({features:null}).length,0);
  assert.equal(createIndex(null).length,0);
});

test('search is deterministic, bounded, and returns only original DNR features',()=>{
  const features=Array.from({length:50},(_,i)=>point('n'+i,'LP 7 / LP '+i,-85+i*.001,44+i*.001,0));
  const rows=createIndex({features});
  const a=find(rows,'LP 7',0,12),b=find(rows,'LP 7',0,12);
  assert.equal(a.count,50);
  assert.equal(a.matches.length,12);
  assert.deepEqual(a,b);
  assert.ok(a.matches.every(x=>rows.includes(x)));
  assert.equal(find(rows,'LP 7',0,100).matches.length,30,'limit must be capped');
  assert.equal(find(rows,'unknown',0).matches.length,0);
});

test('every regional page contains the searchable stop picker and route safety disclaimer',()=>{
  const regions=['eastern-up','keweenaw-copper-country','central-western-up','grayling-gaylord','northeast-sunrise','northwest-michigan','west-michigan'];
  const generator=readFileSync(new URL('../scripts/generate-snowmobile-region-pages.mjs',import.meta.url),'utf8');
  for(const region of regions){
    const html=readFileSync(new URL(`../public/snowmobile/regions/${region}.html`,import.meta.url),'utf8');
    for(const marker of ['id="junctionSearch"','id="junctionMatches"','id="closeRouteLoop"','id="mapMoveToggle"','id="routeResult"','id="routeModeToggle"','mapped DNR junctions','not verified trailheads']){
      assert.ok(html.includes(marker),`${region}: missing ${marker}`);
      assert.ok(generator.includes(marker),`page builder missing ${marker}`);
    }
    const picker=html.indexOf('/assets/snowmobile-junction-picker.js');
    const app=html.indexOf('/assets/snowmobile-region.js');
    assert.ok(picker>=0&&app>picker,`${region}: picker must load before route UI`);
    assert.match(html,/rel="canonical" href="https:\/\/chrisizworski.com\/snowmobile\/regions\//);
    assert.ok(html.includes('google-adsense-account'));
  }
});
