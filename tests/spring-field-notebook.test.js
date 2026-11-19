const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('public/michigan-spring-awakening-field-guide/index.html');
const css = read('public/assets/spring-field-notebook.css');
const js = read('public/assets/michigan-spring-awakening-field-guide.js');

test('historical notebook provides an honest static spring answer and keeps canonical guide intact', () => {
  assert.match(html, /id="spring-field-notebook"/);
  assert.match(html, /<h2 id="sp-notebook-heading">What should you look and listen for\?/);
  assert.match(html, /traditional seasonal guideposts, not live bloom dates or verified wildlife sightings/i);
  assert.match(html, /id="sp-notebook-chapters"[\s\S]*?href="#vernal-pool-wood-frog"/);
  assert.match(html, /href="https:\/\/phenology\.chrisizworski\.com\/frog-chorus"/);
  assert.equal((html.match(/<article class="wf-story"/g) || []).length, 12);
  assert.equal((html.match(/<figure class="wf-photo wf-hero-photo"/g) || []).length, 3);
  assert.ok(html.indexOf('id="spring-field-notebook"') < html.indexOf('class="wf-hero-spring-montage wf-shell"'));
  assert.ok(html.indexOf('id="spring-field-notebook"') < html.indexOf('class="wf-lede"'), 'field decision must precede long essay');
  assert.match(html, /rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-spring-awakening-field-guide\/"/);
  assert.match(html, /"author":\{"@id":"https:\/\/chrisizworski\.com\/#person"\}/);
  assert.match(css, /@media\(max-width:610px\)/);
  assert.match(css, /button\[aria-pressed=true\]/);
  assert.doesNotMatch(css, /@import|url\(/, 'notebook must not add network or font dependencies');
});

class FakeNode {
  constructor(attributes={}) {
    this.attributes={...attributes};
    this.listeners={};
    this.textContent='';
    this.children=[];
    this.style={};
    this.classList={add(){},remove(){}};
    this.value='';
  }
  getAttribute(key){return this.attributes[key] || null;}
  setAttribute(key,val){this.attributes[key]=String(val);}
  removeAttribute(key){delete this.attributes[key];if(Object.prototype.hasOwnProperty.call(this,key))delete this[key];}
  addEventListener(event,cb){this.listeners[event]=cb;}
  dispatch(event,payload={}){if(this.listeners[event])this.listeners[event](payload);}
  click(){this.dispatch('click');}
  replaceChildren(){this.children=[];}
  appendChild(node){this.children.push(node);}
}
function mount() {
  const ids={};
  const get=id=>ids[id] || (ids[id]=new FakeNode());
  const months=['march','april','may'].map(month=>new FakeNode({'data-sp-month':month}));
  const categories=['all','wildflower'].map(cat=>new FakeNode({'data-pheno-filter':cat}));
  const stories=['vernal','wildflower'].map(cat=>new FakeNode({'data-pheno-cat':cat}));
  const notebook=get('spring-field-notebook');
  notebook.querySelectorAll = query => query==='[data-sp-month]' ? months : [];
  get('sp-notebook-region').value='43.5';
  get('sp-lat-slider').value='43.5';
  let onReady;
  const document={
    getElementById:get,
    createElement:()=>new FakeNode(),
    querySelectorAll:query => query==='[data-pheno-filter]' ? categories : query==='.wf-story[data-pheno-cat]' ? stories : [],
    querySelector:query => query==='[data-pheno-filter="all"]' ? categories[0] : null,
    addEventListener:(type,cb)=>{if(type==='DOMContentLoaded')onReady=cb;}
  };
  vm.runInNewContext(js,{document}, {filename:'michigan-spring-awakening-field-guide.js'});
  assert.equal(typeof onReady,'function');
  onReady();
  return {get,months,categories,stories};
}
test('month and region selections change field cue, evidence chapters and tracker, then reverse', () => {
  const v=mount();
  const title=()=>v.get('sp-notebook-title').textContent;
  const names=()=>v.get('sp-notebook-chapters').children.map(li=>li.children[0]?.textContent || li.textContent);
  assert.match(title(),/first chorus/i);
  assert.ok(names().some(name=>/Wood Frog/.test(name)));
  const original=names();
  v.months[2].click();
  assert.match(title(),/woodland bloom/i);
  assert.ok(names().some(name=>/Trillium/.test(name)));
  assert.match(v.get('sp-notebook-next').href,/bloom-tracker/);
  const midCue=v.get('sp-notebook-cue').textContent;
  const select=v.get('sp-notebook-region');
  select.value='46.4';
  select.dispatch('change');
  assert.match(v.get('sp-zone-name').textContent,/Upper Peninsula/);
  assert.notEqual(v.get('sp-notebook-cue').textContent,midCue);
  assert.equal(v.get('sp-lat-slider').value,'46.4');
  v.months[0].click();
  assert.match(title(),/tapping/i);
  assert.equal(v.get('sp-notebook-next').href,'/michigan-maple-sap-run/');
  assert.equal(v.get('sp-notebook-next').target,undefined);
  select.value='43.5';
  select.dispatch('change');
  v.months[1].click();
  assert.match(title(),/first chorus/i);
  assert.deepEqual(names(),original);
  assert.equal(v.months[1].getAttribute('aria-pressed'),'true');
  assert.equal(v.months[0].getAttribute('aria-pressed'),'false');
});
test('a notebook chapter remains reachable after using the original category filter',()=>{
  const v=mount();
  v.categories[1].click();
  assert.equal(v.stories[0].style.display,'none');
  const link=new FakeNode();
  link.closest=()=>link;
  v.get('sp-notebook-chapters').dispatch('click',{target:link});
  assert.equal(v.stories[0].style.display,'');
  assert.equal(v.categories[0].getAttribute('aria-pressed'),'true');
});
