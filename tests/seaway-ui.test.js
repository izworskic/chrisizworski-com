'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../public/assets/seaway-core');
const D=JSON.parse(fs.readFileSync('data/seaway/places.json','utf8'));
// Exercise the real application actions. Isolate chart drawing, network IO and
// unrelated renderers so these tests verify navigation state rather than tiles.
function fixture(){
  class Node {
    constructor(tag='div'){this.tagName=tag;this.dataset={};this.children=[];this.value='';this.textContent='';this.attrs={};}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=nodes;}
    setAttribute(k,v){this.attrs[k]=v;}
    addEventListener(){} querySelectorAll(){return [];} contains(){return false;}
    scrollIntoView(){this.scrolled=true;} focus(){}
    get text(){return [this.textContent,...this.children.map(n=>n.text)].join(' ');}
  }
  const nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
  get('vesselKind').value='all';get('viewingSide').value='all';
  const browser={location:{href:'https://chrisizworski.com/st-lawrence-seaway/'},SeawayReference:D,SeawayCore:C};
  browser.pushes=[];browser.history={pushState:(_a,_b,url)=>{browser.pushes.push(browser.location.href);browser.location.href=String(url);},replaceState:(_a,_b,url)=>{browser.location.href=String(url);}};
  const ctx={window:browser,document:{body:{dataset:{defaultRegion:'all'}},getElementById:get,createElement:tag=>new Node(tag),querySelectorAll:()=>[]},matchMedia:()=>({matches:true}),URL,Date};
  const source=fs.readFileSync('public/assets/seaway.js','utf8');const end=source.indexOf("  $('regionSelect').addEventListener");assert.ok(end>0);
  const isolate=`updateReportLine=updateList=updateRegionReports=drawShips=renderView=renderModel=drawProfile=pauseModel=()=>{};loadReports=async()=>{};
    window.actions={readURL,writeURL,setRegion,chooseShip,chooseView,chooseLock,render,applyShipFilters,clearShipFilters,data,
      receive:(scope,value)=>cache.set(scope,value),state:()=>({region,selectedShip,selectedView})};})();`;
  vm.runInNewContext(source.slice(0,end)+isolate,ctx);
  const ui=browser.actions;ui.readURL();
  const ship={mmsi:'316000001',name:'TEST FREIGHTER',seen:new Date().toISOString(),lat:44.98,lon:-74.85,regionIds:['massena'],shipType:70,speedKnots:4};
  ui.receive('all',{checkedAt:new Date().toISOString(),vessels:[ship],regions:[]});
  return {ui,get,browser,ship};
}
test('comparing both countries stays open when choosing a viewing site and survives a shared URL',()=>{
  const {ui,get,browser}=fixture();assert.equal(get('viewingSide').value,'all');
  ui.chooseView('iroquois-point',false);assert.equal(get('viewingSide').value,'all');assert.equal(new URL(browser.location.href).searchParams.get('side'),'all');
  browser.location.href='https://chrisizworski.com/st-lawrence-seaway/?side=US&view=iroquois-point';ui.readURL();
  assert.equal(get('viewingSide').value,'US');assert.equal(ui.state().selectedView,'eisenhower-center');
  browser.location.href='https://chrisizworski.com/st-lawrence-seaway/?side=invalid';ui.readURL();assert.equal(get('viewingSide').value,'all');
});
test('switching regions removes the old ship details and vessel URL selection',()=>{
  const {ui,get,browser}=fixture();ui.chooseShip('316000001',false);assert.match(get('mapSelection').text,/TEST FREIGHTER/);
  ui.setRegion('montreal',true);assert.equal(ui.state().selectedShip,null);assert.doesNotMatch(get('mapSelection').text,/TEST FREIGHTER/);assert.equal(new URL(browser.location.href).searchParams.has('vessel'),false);
});
test('ship refresh cannot take over a newly selected lock or viewing location',()=>{
  const {ui,get,browser}=fixture();ui.chooseShip('316000001',false);ui.chooseLock('eisenhower',true);ui.render();
  assert.equal(browser.pushes.length,1);assert.equal(new URL(browser.pushes[0]).searchParams.get('region'),'all');
  assert.equal(ui.state().selectedShip,null);assert.match(get('mapSelection').text,/Dwight D. Eisenhower/);assert.doesNotMatch(get('mapSelection').text,/TEST FREIGHTER/);
  ui.chooseShip('316000001',false);ui.chooseView('iroquois-point',false);ui.render();
  assert.equal(ui.state().selectedShip,null);assert.match(get('mapSelection').text,/Iroquois Point/);
});
test('filtering a selected ship out clears its details; clearing filters preserves the region',()=>{
  const {ui,get}=fixture();ui.setRegion('massena');ui.chooseShip('316000001',false);get('shipSearch').value='NO MATCH';ui.applyShipFilters();
  assert.equal(ui.state().selectedShip,null);assert.doesNotMatch(get('mapSelection').text,/TEST FREIGHTER/);
  get('vesselKind').value='cargo';ui.clearShipFilters();assert.equal(get('shipSearch').value,'');assert.equal(get('vesselKind').value,'all');assert.equal(ui.state().region,'massena');
});
test('a newer whole-river check supersedes stale regional cache without losing other region evidence',()=>{
  const {ui}=fixture();const older={checkedAt:'2026-10-24T10:00:00Z',vessels:[]},wide={checkedAt:'2026-10-24T11:00:00Z',vessels:[]};
  ui.receive('massena',older);ui.receive('all',wide);assert.equal(ui.data('massena'),wide);assert.equal(ui.data('montreal'),wide);
  const recent={checkedAt:'2026-10-24T12:00:00Z',vessels:[]};ui.receive('massena',recent);assert.equal(ui.data('massena'),recent);assert.equal(ui.data('montreal'),wide);
  ui.receive('all',{checkedAt:'2026-10-24T13:00:00Z',vessels:[],regions:[{id:'massena',state:'unavailable'}]});assert.equal(ui.data('massena'),recent);
});
test('loading, source failure, filtered results and a checked quiet river have different empty states',()=>{
  assert.match(C.emptyReportState({loading:true}).title,/Checking/);
  assert.match(C.emptyReportState({unavailable:true,filtered:true}).text,/cannot check/);
  assert.match(C.emptyReportState({filtered:true}).title,/wider search/);
  assert.match(C.emptyReportState().text,/quiet receiver/);
});
