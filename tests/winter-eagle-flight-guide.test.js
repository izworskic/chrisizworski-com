'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dir=path.join(__dirname,'../public/winter-eagle-watching');
const script=fs.readFileSync(path.join(dir,'flight-guide.js'),'utf8');
const page=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const styles=fs.readFileSync(path.join(dir,'flight-guide.css'),'utf8');
class Element{
 constructor(id='div',dataset={}){
  this.id=id;this.dataset=dataset;this.attrs={};this.listeners={};this.textContent='';this.hidden=false;this.disabled=false;
  this.style={width:''};this.className='';
  this.classList={toggle:(name,active)=>{const parts=this.className.split(' ').filter(Boolean).filter(n=>n!==name);if(active)parts.push(name);this.className=parts.join(' ')},
    add:(name)=>{this.classList.toggle(name,true)},remove:(name)=>{this.classList.toggle(name,false)}};
 }
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
 click(){(this.listeners.click||[]).forEach(fn=>fn({target:this}))}
 setAttribute(name,value){this.attrs[name]=String(value)}
 getAttribute(name){return this.attrs[name]}
}
class Path extends Element{
 getTotalLength(){return 300}
 getPointAtLength(len){return {x:70+len,y:140+len*.2}}
}
function boot(reduced=false){
 const nodes=new Map();
 function get(id){if(!nodes.has(id))nodes.set(id,id==='eagle-flight-route'||id==='eagle-flight-route-b'?new Path(id):new Element(id));return nodes.get(id)}
 const tabs=['soar','pair','chase','cartwheel'].map(id=>new Element('tab-'+id,{flightStage:id}));
 const answers=['soar','pair','chase','cartwheel'].map(id=>new Element('answer-'+id,{flightAnswer:id}));
 const section=get('flight-experience');
 section.querySelectorAll=selector=>selector==='[data-flight-stage]'?tabs:selector==='[data-flight-answer]'?answers:[];
 const listeners={};
 const document={readyState:'complete',hidden:false,getElementById:get,addEventListener:(type,fn)=>{listeners[type]=fn}};
 let frames=0,canceled=0;
 const window={matchMedia:()=>({matches:reduced})};
 const sandbox={document,window,performance:{now:()=>1000},
  requestAnimationFrame:()=>{frames++;return frames},cancelAnimationFrame:()=>{canceled++}};
 vm.runInNewContext(script,sandbox,{filename:'flight-guide.js'});
 return {get,tabs,answers,window,document,frames:()=>frames,canceled:()=>canceled,listener:listeners};
}
test('source follows the woodcock interpretive model without posing as footage or live eagle activity',()=>{
 const api=require('../public/winter-eagle-watching/flight-guide.js');
 assert.deepEqual(api.STAGES.map(s=>s.id),['soar','pair','chase','cartwheel']);
 assert.equal(api.QUIZ.length,4);
 assert.match(page,/id="read-the-sky"/);
 assert.match(page,/id="eagle-flight-scene"/);
 assert.match(page,/flight-guide.js\?v=1/);
 assert.match(page,/id="flight-experience"/);
 assert.match(page,/not a real sighting/i);
 assert.match(page,/Courtship|courtship/);
 assert.match(page,/Smithsonian/);
 assert.match(page,/Cornell/);
 assert.match(styles,/prefers-reduced-motion:reduce/);
 assert.ok(!/<audio|autoplay|<iframe/i.test(page.slice(page.indexOf('id="read-the-sky"'),page.indexOf('</section>',page.indexOf('id="read-the-sky"')))));
});
test('initial sky diagram renders; selecting each behavior changes path, evidence and accessible state',()=>{
 const {get,tabs}=boot();
 assert.equal(get('eagle-flight-name').textContent,'Soaring and circling');
 assert.equal(tabs[0].getAttribute('aria-pressed'),'true');
 tabs[1].click();
 assert.equal(get('eagle-flight-name').textContent,'Two birds flying together');
 assert.equal(get('eagle-bird-b').getAttribute('visibility'),'visible');
 assert.match(get('eagle-flight-meaning').textContent,/bond/i);
 assert.equal(tabs[1].getAttribute('aria-pressed'),'true');
 tabs[2].click();
 assert.match(get('eagle-flight-name').textContent,/chase/i);
 tabs[3].click();
 assert.match(get('eagle-flight-watch').textContent,/talons/i);
 assert.match(get('eagle-flight-meaning').textContent,/Cornell.*Smithsonian/i);
 assert.equal(get('eagle-bird-b').getAttribute('visibility'),'visible');
 assert.match(get('eagle-flight-scene').getAttribute('aria-label'),/Not footage/);
});
test('play and pause only after interaction; replay restarts the selected diagram',()=>{
 const {get,frames}=boot();
 assert.equal(frames(),0,'must not autoplay');
 get('eagle-flight-play').click();
 assert.equal(get('eagle-flight-play').textContent,'Pause flight');
 assert.equal(get('eagle-flight-play').getAttribute('aria-pressed'),'true');
 assert.ok(frames()>0);
 get('eagle-flight-play').click();
 assert.equal(get('eagle-flight-play').textContent,'Play flight');
 get('eagle-flight-replay').click();
 assert.equal(get('eagle-flight-play').textContent,'Pause flight');
});
test('reduced motion has static scene without animation frames',()=>{
 const {get,tabs,frames}=boot(true);
 tabs[3].click();
 get('eagle-flight-play').click();
 assert.equal(frames(),0);
 assert.match(get('eagle-flight-play').textContent,/Static diagram/);
 assert.match(get('eagle-flight-caution').textContent,/not prove mating/i);
});
test('field quiz identifies observed movement without assigning breeding intention',()=>{
 const {get,answers,tabs}=boot();
 assert.match(get('eagle-flight-quiz-question').textContent,/circles slowly/);
 answers[0].click();
 assert.match(get('eagle-flight-quiz-feedback').textContent,/Correct/);
 assert.equal(get('eagle-flight-quiz-next').hidden,false);
 get('eagle-flight-quiz-next').click();
 assert.match(get('eagle-flight-quiz-question').textContent,/lock feet/);
 answers[2].click();
 assert.match(get('eagle-flight-quiz-feedback').textContent,/cartwheel/i);
 assert.match(get('eagle-flight-quiz-feedback').textContent,/uncertain/);
 assert.equal(answers[3].className.includes('right'),true);
 assert.equal(tabs[3].getAttribute('aria-pressed'),'true');
});
