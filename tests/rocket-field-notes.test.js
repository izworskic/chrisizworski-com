'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(ROOT,x),'utf8');
const notes=require('../public/assets/rocket-field-notes.js');
const html=read('public/synced-national-tools/rocket-launch-live/index.html');
const css=read('public/assets/rocket-field-notes.css');
const script=read('public/assets/rocket-field-notes.js');

const sample=(region,rocket,id='66666666-6666-4666-8666-666666666666')=>({
  ok:true,selectedRegion:region,selectedLaunchId:id,
  selectedLaunch:{id,region,rocket,name:'Example mission',mission:'Example payload'}
});
function fakeDocument(){
  const items=new Map(),events={},storyState={};
  const getElementById=id=>{
    if(!items.has(id))items.set(id,{
      id,textContent:'',hidden:false,href:'',attributes:{},
      setAttribute(k,v){this.attributes[k]=v;},
      removeAttribute(k){delete this.attributes[k];},
      closest(selector){return selector==='[data-region-story]'?storyState:null;}
    });
    return items.get(id);
  };
  return {
    items,events,storyState,getElementById,
    addEventListener(name,listener){events[name]=listener;},
    emit(name,detail){if(events[name])events[name]({detail});}
  };
}
test('national page adds distinct coast and rocket notes without replacing mission, sources, or map',()=>{
  for(const id of ['rl-place-note-title','rl-place-note-copy','rl-place-note-watch',
    'rl-place-note-check','rl-place-note-source','rl-place-note-guide','rl-vehicle-note-title',
    'rl-vehicle-note-intro','rl-vehicle-note-source','rl-vehicle-beat-1-title','rl-vehicle-beat-2-title',
    'rl-vehicle-beat-3-title']) assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/rocket-field-notes\.js\?v=20261113-place-vehicle-v1/);
  assert.match(html,/rocket-field-notes\.css\?v=20261113-place-vehicle-v1/);
  assert.match(html,/id="rl-coast-map"/);
  assert.match(html,/id="rl-visual-rocket-photo"/);
  assert.match(html,/rel="canonical" href="https:\/\/chrisizworski.com\/national-tools\/rocket-launch-live\//);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.doesNotMatch(script,/\bfetch\(|\bXMLHttpRequest\b|\.innerHTML\s*=/);
});
test('six coast chapters are independently sourced and do not mistake beaches for public range access',()=>{
  assert.deepEqual(Object.keys(notes.PLACES).sort(),
    ['alaska','california','florida','hawaii','texas','virginia'].sort());
  for(const [region,story] of Object.entries(notes.PLACES)){
    assert(story.lead.length>135,region);
    assert(story.watch.length>75,region);
    assert(story.visit.length>75,region);
    assert.match(story.source,/^https:\/\//);
    assert.match(story.guide,/^\//);
  }
  for(const region of ['alaska','hawaii']){
    assert.match(notes.PLACES[region].visit,/not|no |closed|restricted/i);
    assert.doesNotMatch(notes.PLACES[region].visit,/drive to the pad|open for viewing|guaranteed/i);
  }
  assert.match(notes.PLACES.virginia.watch,/seconds/i);
  assert.match(notes.PLACES.california.watch,/marine layer/i);
  assert.match(notes.PLACES.texas.visit,/Highway 4/);
});
test('vehicle-specific observations only appear for a verified rocket, not a payload title',()=>{
  assert.deepEqual(Object.keys(notes.VEHICLES).sort(),
    ['falcon-9','falcon-heavy','starship','vulcan','new-glenn','alpha','sounding'].sort());
  for(const [vehicle,expected] of [
    ['Falcon 9 Block 5','falcon-9'],['Falcon Heavy','falcon-heavy'],
    ['Starship V3','starship'],['Vulcan VC6L','vulcan'],
    ['New Glenn','new-glenn'],['Firefly Alpha','alpha'],
    ['Black Brant IX','sounding'],['Terrier-Improved Malemute','sounding']
  ]) assert.equal(notes.familyFor({rocket:vehicle}),expected,vehicle);
  assert.equal(notes.familyFor({rocket:'Falcon Heavy'}),'falcon-heavy','Falcon Heavy not a Falcon 9');
  assert.equal(notes.familyFor({rocket:'Atlas V',name:'Starship experiment'}),null);
  assert.equal(notes.familyFor({rocket:'TBD',name:'Falcon 9'}),null);
  assert.equal(notes.familyFor({rocket:'Unnamed',name:'Falcon 9'}),null);
  assert.equal(notes.materialize(sample('florida','Vulcan VC6L')).family,'vulcan');
  const wrong=sample('florida','Falcon 9');
  wrong.selectedLaunchId='different-uuid';
  assert.equal(notes.materialize(wrong).vehicle,null,'a mismatched selected mission cannot get rocket notes');
  wrong.selectedLaunchId=wrong.selectedLaunch.id;wrong.selectedLaunch.region='texas';
  assert.equal(notes.materialize(wrong).vehicle,null,'a rocket from another region cannot be adopted');
  for(const v of Object.values(notes.VEHICLES)){
    assert.equal(v.beats.length,3);
    assert.match(v.source,/^https:\/\//);
    assert(v.lead.length>90);
    assert(!/guaranteed (landing|launch)/i.test(v.lead));
  }
});
test('selecting a new region or mission replaces both stories, and failed source checks clear stale notes',()=>{
  const doc=fakeDocument();
  assert.equal(notes.mount(doc),true);
  assert.match(doc.getElementById('rl-place-note-title').textContent,/Every launch coast/);
  doc.emit('rocket-viewing:data',sample('virginia','Black Brant IX'));
  assert.match(doc.getElementById('rl-place-note-title').textContent,/salt marsh/);
  assert.match(doc.getElementById('rl-vehicle-note-title').textContent,/Sounding rocket/);
  assert.match(doc.getElementById('rl-place-note-check').textContent,/selected events/);
  assert.equal(doc.getElementById('rl-place-note-source').hidden,false);
  doc.emit('rocket-viewing:data',sample('texas','Starship V3'));
  assert.match(doc.getElementById('rl-place-note-title').textContent,/strip of water/);
  assert.match(doc.getElementById('rl-vehicle-note-title').textContent,/Starship/);
  doc.emit('rocket-viewing:data',sample('alaska','Unknown rocket'));
  assert.match(doc.getElementById('rl-place-note-check').textContent,/closed to the public/);
  assert.match(doc.getElementById('rl-vehicle-note-title').textContent,/What should you watch/);
  assert.equal(doc.getElementById('rl-vehicle-note-source').hidden,true);
  doc.emit('rocket-viewing:failure',null);
  assert.match(doc.getElementById('rl-place-note-title').textContent,/Every launch coast/);
  assert.equal(doc.getElementById('rl-place-note-source').hidden,true);
  assert.equal(doc.getElementById('rl-place-note-guide').hidden,true);
  assert.equal(doc.getElementById('rl-vehicle-note-source').hidden,true);
  assert.equal(doc.storyState['data-region-story'],'none');
});
