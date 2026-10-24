'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {embedURL,mount}=require('../public/assets/seaway-cameras');
const feeds=JSON.parse(fs.readFileSync('data/seaway/places.json','utf8')).cameras;
// Small DOM fixture checks the player lifecycle without making video requests.
function fixture(){
  class Node{
    constructor(tag='div'){this.tagName=tag;this.children=[];this.attrs={};this.dataset={};this.handlers={};}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=nodes;}
    setAttribute(key,value){this.attrs[key]=value;}
    addEventListener(type,fn){this.handlers[type]=fn;}
    click(){this.handlers.click?.();}
  }
  const nodes=Object.fromEntries(['seawayCameraPlayer','stopSeawayCamera','seawayCameraStatus','seawayCameraTitle','seawayCameraDirect','seawayCameraSource'].map(id=>[id,new Node()]));
  const buttons=feeds.map(c=>{const n=new Node('button');n.dataset.seawayCamera=c.id;return n;});
  const root={querySelector:s=>nodes[s.slice(1)],querySelectorAll:()=>buttons};
  const selected=[];
  const controller=mount({root,feeds,document:{createElement:tag=>new Node(tag)},onSelect:c=>selected.push(c.id)});
  return {nodes,buttons,controller,selected};
}
test('camera page load makes no iframe and source URLs stay available',()=>{
  const {nodes,controller}=fixture();assert.equal(controller.isLoaded(),false);
  assert.equal(nodes.seawayCameraPlayer.children[0].tagName,'div');
  assert.equal(nodes.seawayCameraDirect.href,feeds[0].directUrl);assert.equal(nodes.seawayCameraSource.href,feeds[0].source);
});
test('an explicit camera action loads one approved player and switching removes the previous frame',()=>{
  const {nodes,buttons,controller,selected}=fixture();buttons[0].click();
  const first=nodes.seawayCameraPlayer.children[0];assert.equal(first.tagName,'iframe');assert.equal(first.loading,'lazy');assert.equal(first.referrerPolicy,'strict-origin-when-cross-origin');assert.equal(first.allowFullscreen,true);
  assert.equal(new URL(first.src).hostname,'www.youtube-nocookie.com');
  buttons[2].click();assert.equal(nodes.seawayCameraPlayer.children.length,1);assert.notEqual(nodes.seawayCameraPlayer.children[0],first);assert.equal(controller.selected().id,feeds[2].id);
  assert.deepEqual(selected,[feeds[0].id,feeds[2].id]);assert.equal(nodes.seawayCameraDirect.href,feeds[2].directUrl);
  assert.equal(buttons[2].attrs['aria-pressed'],'true');assert.equal(buttons[0].attrs['aria-pressed'],'false');
});
test('stop and hidden-tab teardown remove the stream; unchanged URL state keeps a playing frame stable',()=>{
  const {nodes,buttons,controller}=fixture();buttons[0].click();const frame=nodes.seawayCameraPlayer.children[0];
  controller.select(feeds[0].id,{notify:false});assert.equal(nodes.seawayCameraPlayer.children[0],frame);
  controller.stop('Stopped while hidden');assert.equal(controller.isLoaded(),false);assert.equal(nodes.seawayCameraPlayer.children[0].tagName,'div');assert.equal(nodes.seawayCameraStatus.textContent,'Stopped while hidden');
  buttons[0].click();assert.equal(controller.isLoaded(),true);assert.equal(nodes.stopSeawayCamera.hidden,false);nodes.stopSeawayCamera.click();assert.equal(controller.isLoaded(),false);assert.equal(nodes.stopSeawayCamera.hidden,true);
});
test('unknown camera IDs cannot change a playing stream; closing needs no extra navigation',()=>{
  const {nodes,buttons,controller}=fixture();buttons[3].click();const frame=nodes.seawayCameraPlayer.children[0];
  assert.equal(controller.select('https://example.invalid',{load:true}),false);assert.equal(nodes.seawayCameraPlayer.children[0],frame);
  nodes.stopSeawayCamera.click();assert.equal(controller.isLoaded(),false);assert.equal(nodes.seawayCameraPlayer.dataset.loaded,'false');
  for(const id of ['https://example.invalid/a','abc','abcdefghijk?url=evil'])assert.throws(()=>embedURL(id));
});
test('four camera choices open directly without camera bubbles or map-jump controls',()=>{
  assert.equal(feeds.length,4);
  for(const c of feeds){assert.equal(c.area,undefined);assert.equal(c.lat,undefined);assert.equal(c.directUrl,'https://www.youtube.com/watch?v='+c.youtubeId);}
  for(const slug of ['st-lawrence-seaway','eisenhower-lock']){
    const html=fs.readFileSync('public/'+slug+'/index.html','utf8');
    assert.ok(html.indexOf('id="seawayCameras"')>html.indexOf('id="regionReports"'));assert.ok(html.indexOf('id="seawayCameras"')>html.indexOf('Freshness and coverage vary along the river.'));assert.ok(html.indexOf('id="seawayCameras"')<html.indexOf('id="viewing-plan"'));
    assert.match(html,/not show Eisenhower Lock or any lock chamber/);assert.match(html,/seaway-cameras\.js/);assert.doesNotMatch(html,/locateSeawayCamera|legend-camera|Load this camera|Camera area/);
    const placeholder=html.split('id="seawayCameraPlayer"')[1].split('class="seaway-camera-actions"')[0];assert.doesNotMatch(placeholder,/<iframe/);
  }
});
